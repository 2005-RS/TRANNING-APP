import { ChatErrorCode, ChatErrorPayload } from './types/chat.types';

const SAFE_MESSAGES: Record<ChatErrorCode, string> = {
  UNAUTHORIZED: 'Authentication required.',
  AUTH_EXPIRED: 'Your session needs to be refreshed.',
  INVALID_MESSAGE: 'The message could not be sent.',
  MESSAGE_TOO_LONG: 'The message is too long.',
  RATE_LIMITED: 'Too many messages. Please wait a moment.',
  BUSY: 'Please wait for the current reply to finish.',
  AI_UNAVAILABLE:
    'The assistant cannot reply right now. Please try again shortly.',
  QUOTA_EXHAUSTED:
    'The public assistant reached its message limit for today. Sign in to keep chatting.',
  INTERNAL: 'Something went wrong. Please try again.',
};

const RETRYABLE: ReadonlySet<ChatErrorCode> = new Set([
  'AUTH_EXPIRED',
  'RATE_LIMITED',
  'BUSY',
  'AI_UNAVAILABLE',
  'INTERNAL',
]);

export class ChatError extends Error {
  constructor(
    readonly code: ChatErrorCode,
    readonly retryAfterMs?: number,
  ) {
    super(SAFE_MESSAGES[code]);
    this.name = 'ChatError';
  }
}

export function toChatErrorPayload(
  code: ChatErrorCode,
  clientMessageId: string | null,
  retryAfterMs?: number,
): ChatErrorPayload {
  return {
    code,
    message: SAFE_MESSAGES[code],
    clientMessageId,
    retryable: RETRYABLE.has(code),
    ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
  };
}
