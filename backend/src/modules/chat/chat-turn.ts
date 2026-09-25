import { Logger } from '@nestjs/common';
import { CHAT_EVENTS } from './chat.constants';
import { ChatError, toChatErrorPayload } from './chat.error';
import { ChatService } from './chat.service';
import {
  ChatErrorCode,
  ChatSocket,
  ChatSubject,
  SendChatMessageInput,
} from './types/chat.types';

/** Connection-level failure surfaced to the client as `connect_error` with `err.data.code`. */
export function connectError(code: ChatErrorCode): Error & { data: unknown } {
  const error = new Error(code) as Error & { data: unknown };
  error.data = { code };
  return error;
}

/**
 * Emits typing → response | safe error → typing off for one validated message.
 * Shared by the member and public gateways; the socket disconnect aborts the provider call.
 */
export async function deliverChatTurn(options: {
  socket: ChatSocket;
  chat: ChatService;
  subject: ChatSubject;
  input: SendChatMessageInput;
  logger: Logger;
}): Promise<void> {
  const { socket, chat, subject, input, logger } = options;
  const clientMessageId = input.clientMessageId ?? null;
  const controller = new AbortController();
  socket.data.pending?.add(controller);
  socket.emit(CHAT_EVENTS.typing, {
    conversationId: input.conversationId ?? null,
    clientMessageId,
    isTyping: true,
  });

  try {
    const reply = await chat.sendMessage(subject, input, controller.signal);
    socket.emit(CHAT_EVENTS.response, { ...reply, clientMessageId });
  } catch (error) {
    if (controller.signal.aborted) {
      return;
    }
    if (error instanceof ChatError) {
      socket.emit(
        CHAT_EVENTS.error,
        toChatErrorPayload(error.code, clientMessageId, error.retryAfterMs),
      );
    } else {
      logger.error(
        `chat gateway failure error=${error instanceof Error ? error.name : 'unknown'}`,
      );
      socket.emit(
        CHAT_EVENTS.error,
        toChatErrorPayload('INTERNAL', clientMessageId),
      );
    }
  } finally {
    socket.data.pending?.delete(controller);
    socket.emit(CHAT_EVENTS.typing, {
      conversationId: input.conversationId ?? null,
      clientMessageId,
      isTyping: false,
    });
  }
}

export function abortPendingTurns(socket: ChatSocket): void {
  for (const controller of socket.data.pending ?? []) {
    controller.abort();
  }
  socket.data.pending?.clear();
}
