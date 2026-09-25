import type { Namespace, Socket } from 'socket.io';
import { UserRole } from '../../users/enums/user-role.enum';
import { CHAT_EVENTS, CHAT_LOCALES } from '../chat.constants';

export type ChatLocale = (typeof CHAT_LOCALES)[number];

export type ChatErrorCode =
  | 'UNAUTHORIZED'
  | 'AUTH_EXPIRED'
  | 'INVALID_MESSAGE'
  | 'MESSAGE_TOO_LONG'
  | 'RATE_LIMITED'
  | 'BUSY'
  | 'AI_UNAVAILABLE'
  | 'QUOTA_EXHAUSTED'
  | 'INTERNAL';

export interface ChatUserContext {
  userId: string;
  role: UserRole;
}

/** Anonymous public-site visitor. Both keys are derived server-side, never from the payload. */
export interface ChatVisitorContext {
  /** Client IP; scopes rate limits and the one-reply-in-flight rule. */
  visitorId: string;
  /** socket.io socket id; scopes conversation history to one browser connection. */
  sessionKey: string;
}

export type ChatSubject = ChatUserContext | ChatVisitorContext;

export function isVisitor(subject: ChatSubject): subject is ChatVisitorContext {
  return 'visitorId' in subject;
}

export interface ChatPrincipal extends ChatUserContext {
  sessionId: string;
  /** Epoch milliseconds after which the handshake token is no longer valid. */
  tokenExpiresAt: number;
}

export interface SendChatMessageInput {
  message: string;
  conversationId?: string;
  clientMessageId?: string;
  locale: ChatLocale;
}

export interface ChatAssistantMessage {
  conversationId: string;
  messageId: string;
  role: 'assistant';
  content: string;
  createdAt: string;
}

export interface ChatConnectedPayload {
  assistantName: string;
  maxMessageLength: number;
}

export interface ChatTypingPayload {
  conversationId: string | null;
  clientMessageId: string | null;
  isTyping: boolean;
}

export interface ChatResponsePayload extends ChatAssistantMessage {
  clientMessageId: string | null;
}

export interface ChatErrorPayload {
  code: ChatErrorCode;
  message: string;
  clientMessageId: string | null;
  retryable: boolean;
  retryAfterMs?: number;
}

export interface ChatServerToClientEvents {
  [CHAT_EVENTS.connected]: (payload: ChatConnectedPayload) => void;
  [CHAT_EVENTS.typing]: (payload: ChatTypingPayload) => void;
  [CHAT_EVENTS.response]: (payload: ChatResponsePayload) => void;
  [CHAT_EVENTS.error]: (payload: ChatErrorPayload) => void;
}

export interface ChatClientToServerEvents {
  [CHAT_EVENTS.send]: (payload: unknown) => void;
}

export interface ChatSocketData {
  principal?: ChatPrincipal;
  visitorId?: string;
  pending?: Set<AbortController>;
}

export type ChatSocket = Socket<
  ChatClientToServerEvents,
  ChatServerToClientEvents,
  Record<string, never>,
  ChatSocketData
>;

export type ChatNamespace = Namespace<
  ChatClientToServerEvents,
  ChatServerToClientEvents,
  Record<string, never>,
  ChatSocketData
>;
