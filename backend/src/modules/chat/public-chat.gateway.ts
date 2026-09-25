import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { EnvironmentVariables } from '../../config/env.validation';
import { abortPendingTurns, connectError, deliverChatTurn } from './chat-turn';
import {
  CHAT_ASSISTANT_NAME,
  CHAT_EVENTS,
  PUBLIC_CHAT_MAX_CONNECTIONS_PER_IP,
  PUBLIC_CHAT_MAX_MESSAGE_LENGTH,
  PUBLIC_CHAT_NAMESPACE,
} from './chat.constants';
import { toChatErrorPayload } from './chat.error';
import { ChatService } from './chat.service';
import { parseSendChatMessage } from './dto/send-chat-message.dto';
import { ChatNamespace, ChatSocket } from './types/chat.types';
import { resolveVisitorIp } from './visitor-ip';

/**
 * Anonymous assistant for the public website. No authentication and no user
 * data: the visitor is identified only by IP (limits) and socket id (history).
 * Handshake tokens are ignored; signed-in users get the member namespace in the app.
 */
@WebSocketGateway({ namespace: PUBLIC_CHAT_NAMESPACE })
export class PublicChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(PublicChatGateway.name);
  private readonly connectionsByVisitor = new Map<string, number>();
  private readonly enabled: boolean;
  private readonly trustProxy: boolean;

  constructor(
    private readonly chat: ChatService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.enabled = config.getOrThrow('AI_PUBLIC_CHAT_ENABLED', { infer: true });
    this.trustProxy = config.getOrThrow('TRUST_PROXY', { infer: true });
  }

  afterInit(namespace: ChatNamespace): void {
    namespace.use((socket, next) => {
      if (!this.enabled) {
        next(connectError('AI_UNAVAILABLE'));
        return;
      }
      const visitorId = resolveVisitorIp(socket.handshake, this.trustProxy);
      const open = this.connectionsByVisitor.get(visitorId) ?? 0;
      if (open >= PUBLIC_CHAT_MAX_CONNECTIONS_PER_IP) {
        next(connectError('RATE_LIMITED'));
        return;
      }
      socket.data.visitorId = visitorId;
      next();
    });
  }

  handleConnection(socket: ChatSocket): void {
    const visitorId = socket.data.visitorId;
    if (!visitorId) {
      socket.disconnect(true);
      return;
    }

    this.connectionsByVisitor.set(
      visitorId,
      (this.connectionsByVisitor.get(visitorId) ?? 0) + 1,
    );
    socket.data.pending = new Set();
    socket.emit(CHAT_EVENTS.connected, {
      assistantName: CHAT_ASSISTANT_NAME,
      maxMessageLength: PUBLIC_CHAT_MAX_MESSAGE_LENGTH,
    });
  }

  handleDisconnect(socket: ChatSocket): void {
    abortPendingTurns(socket);

    const visitorId = socket.data.visitorId;
    if (!visitorId) {
      return;
    }
    const remaining = (this.connectionsByVisitor.get(visitorId) ?? 1) - 1;
    if (remaining > 0) {
      this.connectionsByVisitor.set(visitorId, remaining);
    } else {
      this.connectionsByVisitor.delete(visitorId);
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
    if (input.message.length > PUBLIC_CHAT_MAX_MESSAGE_LENGTH) {
      socket.emit(
        CHAT_EVENTS.error,
        toChatErrorPayload('MESSAGE_TOO_LONG', input.clientMessageId ?? null),
      );
      return;
    }

    const visitorId = socket.data.visitorId;
    if (!visitorId) {
      socket.disconnect(true);
      return;
    }

    await deliverChatTurn({
      socket,
      chat: this.chat,
      subject: { visitorId, sessionKey: socket.id },
      input,
      logger: this.logger,
    });
  }
}
