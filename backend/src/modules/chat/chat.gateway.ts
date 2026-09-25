import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { ChatConnectionAuthService } from './chat-connection-auth.service';
import { abortPendingTurns, connectError, deliverChatTurn } from './chat-turn';
import {
  CHAT_ASSISTANT_NAME,
  CHAT_EVENTS,
  CHAT_MAX_CONNECTIONS_PER_USER,
  CHAT_MAX_MESSAGE_LENGTH,
  CHAT_NAMESPACE,
} from './chat.constants';
import { ChatError, toChatErrorPayload } from './chat.error';
import { ChatService } from './chat.service';
import { parseSendChatMessage } from './dto/send-chat-message.dto';
import { ChatNamespace, ChatSocket } from './types/chat.types';

export type { ChatSocket } from './types/chat.types';

/**
 * Transport only: authentication, payload validation, and event emission.
 * Conversation logic lives in ChatService; the gateway never calls an AI provider.
 */
@WebSocketGateway({ namespace: CHAT_NAMESPACE })
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChatGateway.name);
  private readonly connectionsByUser = new Map<string, number>();

  constructor(
    private readonly connectionAuth: ChatConnectionAuthService,
    private readonly chat: ChatService,
  ) {}

  afterInit(namespace: ChatNamespace): void {
    namespace.use((socket, next) => {
      const auth = socket.handshake.auth as Record<string, unknown> | undefined;
      this.connectionAuth.authenticate(auth?.token).then(
        (principal) => {
          const open = this.connectionsByUser.get(principal.userId) ?? 0;
          if (open >= CHAT_MAX_CONNECTIONS_PER_USER) {
            next(connectError('RATE_LIMITED'));
            return;
          }
          socket.data.principal = principal;
          next();
        },
        (error: unknown) => {
          next(
            connectError(
              error instanceof ChatError ? error.code : 'UNAUTHORIZED',
            ),
          );
        },
      );
    });
  }

  handleConnection(socket: ChatSocket): void {
    const principal = socket.data.principal;
    if (!principal) {
      socket.disconnect(true);
      return;
    }

    this.connectionsByUser.set(
      principal.userId,
      (this.connectionsByUser.get(principal.userId) ?? 0) + 1,
    );
    socket.data.pending = new Set();
    socket.emit(CHAT_EVENTS.connected, {
      assistantName: CHAT_ASSISTANT_NAME,
      maxMessageLength: CHAT_MAX_MESSAGE_LENGTH,
    });
  }

  handleDisconnect(socket: ChatSocket): void {
    abortPendingTurns(socket);

    const principal = socket.data.principal;
    if (!principal) {
      return;
    }
    const remaining = (this.connectionsByUser.get(principal.userId) ?? 1) - 1;
    if (remaining > 0) {
      this.connectionsByUser.set(principal.userId, remaining);
    } else {
      this.connectionsByUser.delete(principal.userId);
    }
  }

  @SubscribeMessage(CHAT_EVENTS.send)
  async handleSend(
    @ConnectedSocket() socket: ChatSocket,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    const parsed = parseSendChatMessage(payload);
    if (!parsed.ok) {
      socket.emit(
        CHAT_EVENTS.error,
        toChatErrorPayload(parsed.code, parsed.clientMessageId),
      );
      return;
    }

    const input = parsed.value;
    const clientMessageId = input.clientMessageId ?? null;
    const principal = socket.data.principal;
    if (!principal) {
      socket.emit(
        CHAT_EVENTS.error,
        toChatErrorPayload('UNAUTHORIZED', clientMessageId),
      );
      socket.disconnect(true);
      return;
    }

    try {
      await this.connectionAuth.assertStillValid(principal);
    } catch (error) {
      const code = error instanceof ChatError ? error.code : 'UNAUTHORIZED';
      socket.emit(CHAT_EVENTS.error, toChatErrorPayload(code, clientMessageId));
      socket.disconnect(true);
      return;
    }

    await deliverChatTurn({
      socket,
      chat: this.chat,
      subject: { userId: principal.userId, role: principal.role },
      input,
      logger: this.logger,
    });
  }
}
