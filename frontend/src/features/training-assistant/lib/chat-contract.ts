/**
 * WebSocket contract for the backend `/chat` (signed-in) and `/public-chat`
 * (anonymous visitor) namespaces (backend/src/modules/chat/types/chat.types.ts).
 * Socket events are not part of the OpenAPI document, so these types are
 * maintained by hand. Both namespaces share the same events.
 */
export const CHAT_NAMESPACE = '/chat';
export const PUBLIC_CHAT_NAMESPACE = '/public-chat';

export const CHAT_EVENTS = {
  send: 'chat:send',
  connected: 'chat:connected',
  typing: 'chat:typing',
  response: 'chat:response',
  error: 'chat:error',
} as const;

export const CHAT_MAX_MESSAGE_LENGTH = 2000;
export const PUBLIC_CHAT_MAX_MESSAGE_LENGTH = 500;

export type ChatLocale = 'es' | 'en';

export type ChatServerErrorCode =
  | 'UNAUTHORIZED'
  | 'AUTH_EXPIRED'
  | 'INVALID_MESSAGE'
  | 'MESSAGE_TOO_LONG'
  | 'RATE_LIMITED'
  | 'BUSY'
  | 'AI_UNAVAILABLE'
  | 'QUOTA_EXHAUSTED'
  | 'INTERNAL';

export type ChatSendPayload = {
  message: string;
  conversationId?: string;
  clientMessageId: string;
  locale: ChatLocale;
};

export type ChatConnectedPayload = {
  assistantName: string;
  maxMessageLength: number;
};

export type ChatTypingPayload = {
  conversationId: string | null;
  clientMessageId: string | null;
  isTyping: boolean;
};

export type ChatResponsePayload = {
  conversationId: string;
  messageId: string;
  role: 'assistant';
  content: string;
  createdAt: string;
  clientMessageId: string | null;
};

export type ChatErrorPayload = {
  code: ChatServerErrorCode;
  message: string;
  clientMessageId: string | null;
  retryable: boolean;
  retryAfterMs?: number;
};

export type ChatServerToClientEvents = {
  'chat:connected': (payload: ChatConnectedPayload) => void;
  'chat:typing': (payload: ChatTypingPayload) => void;
  'chat:response': (payload: ChatResponsePayload) => void;
  'chat:error': (payload: ChatErrorPayload) => void;
};

export type ChatClientToServerEvents = {
  'chat:send': (payload: ChatSendPayload) => void;
};
