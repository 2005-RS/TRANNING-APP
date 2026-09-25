export const CHAT_NAMESPACE = '/chat';

export const CHAT_EVENTS = {
  send: 'chat:send',
  connected: 'chat:connected',
  typing: 'chat:typing',
  response: 'chat:response',
  error: 'chat:error',
} as const;

export const CHAT_ASSISTANT_NAME = 'Training Assistant';

/** Long enough for a detailed question, short enough to bound prompt cost. */
export const CHAT_MAX_MESSAGE_LENGTH = 2000;

/** socket.io frame cap: 2000 chars × 4 UTF-8 bytes plus JSON envelope. */
export const CHAT_SOCKET_MAX_PAYLOAD_BYTES = 16_384;

/** Anonymous visitors on the public site: no account, so every limit is tighter. */
export const PUBLIC_CHAT_NAMESPACE = '/public-chat';
export const PUBLIC_CHAT_MAX_MESSAGE_LENGTH = 500;
export const PUBLIC_CHAT_MAX_CONNECTIONS_PER_IP = 3;

export const CHAT_MAX_CONNECTIONS_PER_USER = 5;
export const CHAT_MAX_CONVERSATIONS_PER_USER = 5;
export const CHAT_MAX_CONVERSATIONS_TOTAL = 10_000;
export const CHAT_CONVERSATION_TTL_MS = 2 * 60 * 60 * 1000;
export const CHAT_RATE_LIMIT_WINDOW_MS = 60_000;

export const CHAT_LOCALES = ['es', 'en'] as const;
export const CHAT_DEFAULT_LOCALE = 'es';
