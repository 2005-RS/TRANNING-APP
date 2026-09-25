import { useCallback, useContext, useEffect, useReducer, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { LanguageContext } from '@/i18n/language-context';
import { currentLanguage } from '@/i18n/live-copy';
import { getAccessToken } from '@/shared/lib/access-token';
import { refreshSession } from '@/shared/lib/api-mutator';
import { getApiOrigin } from '@/shared/lib/api-origin';
import {
  CHAT_EVENTS,
  CHAT_MAX_MESSAGE_LENGTH,
  CHAT_NAMESPACE,
  PUBLIC_CHAT_MAX_MESSAGE_LENGTH,
  PUBLIC_CHAT_NAMESPACE,
  type ChatClientToServerEvents,
  type ChatErrorPayload,
  type ChatResponsePayload,
  type ChatServerErrorCode,
  type ChatServerToClientEvents,
  type ChatTypingPayload,
} from '@/features/training-assistant/lib/chat-contract';

/** Backend AI timeout (30s default) plus transport slack. */
export const CHAT_REPLY_TIMEOUT_MS = 45_000;

/**
 * `member`: signed-in app, authenticates with the in-memory access token.
 * `public`: anonymous website visitor, sends no credentials at all.
 */
export type ChatMode = 'member' | 'public';

const MODE_CONFIG: Record<ChatMode, { namespace: string; maxMessageLength: number }> = {
  member: { namespace: CHAT_NAMESPACE, maxMessageLength: CHAT_MAX_MESSAGE_LENGTH },
  public: { namespace: PUBLIC_CHAT_NAMESPACE, maxMessageLength: PUBLIC_CHAT_MAX_MESSAGE_LENGTH },
};

export type ChatConnectionStatus =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'DISCONNECTED'
  | 'ERROR';

export type ChatConnectionIssue = 'SESSION_EXPIRED' | 'TOO_MANY_CONNECTIONS' | 'UNREACHABLE';

export type ChatFailureCode =
  | 'AI_UNAVAILABLE'
  | 'QUOTA_EXHAUSTED'
  | 'RATE_LIMITED'
  | 'BUSY'
  | 'MESSAGE_TOO_LONG'
  | 'INVALID_MESSAGE'
  | 'CONNECTION_LOST'
  | 'TIMEOUT'
  | 'GENERIC';

export type ChatUserMessage = {
  id: string;
  role: 'user';
  content: string;
  createdAt: string;
  status: 'sending' | 'sent' | 'failed';
  failure?: ChatFailureCode;
};

export type ChatAssistantMessage = {
  id: string;
  role: 'assistant';
  content: string;
  createdAt: string;
};

export type ChatMessage = ChatUserMessage | ChatAssistantMessage;

type ChatSocket = Socket<ChatServerToClientEvents, ChatClientToServerEvents>;

type State = {
  status: ChatConnectionStatus;
  issue: ChatConnectionIssue | null;
  messages: ChatMessage[];
  typing: boolean;
};

type Action =
  | { type: 'status'; status: ChatConnectionStatus; issue?: ChatConnectionIssue }
  | { type: 'userMessage'; message: ChatUserMessage }
  | { type: 'resend'; id: string }
  | { type: 'response'; payload: ChatResponsePayload }
  | { type: 'failed'; id: string; failure: ChatFailureCode }
  | { type: 'typing'; typing: boolean };

const initialState: State = {
  status: 'CONNECTING',
  issue: null,
  messages: [],
  typing: false,
};

function updateUserMessage(
  messages: ChatMessage[],
  id: string,
  patch: Partial<ChatUserMessage>,
): ChatMessage[] {
  return messages.map((message) =>
    message.role === 'user' && message.id === id ? { ...message, ...patch } : message,
  );
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'status':
      return { ...state, status: action.status, issue: action.issue ?? null };
    case 'userMessage':
      return { ...state, messages: [...state.messages, action.message] };
    case 'resend':
      return {
        ...state,
        messages: updateUserMessage(state.messages, action.id, {
          status: 'sending',
          failure: undefined,
        }),
      };
    case 'response': {
      const { payload } = action;
      const messages = payload.clientMessageId
        ? updateUserMessage(state.messages, payload.clientMessageId, { status: 'sent' })
        : state.messages;
      return {
        ...state,
        typing: false,
        messages: [
          ...messages,
          {
            id: payload.messageId,
            role: 'assistant',
            content: payload.content,
            createdAt: payload.createdAt,
          },
        ],
      };
    }
    case 'failed':
      return {
        ...state,
        typing: false,
        messages: updateUserMessage(state.messages, action.id, {
          status: 'failed',
          failure: action.failure,
        }),
      };
    case 'typing':
      return { ...state, typing: action.typing };
  }
}

function toFailure(code: ChatServerErrorCode): ChatFailureCode {
  switch (code) {
    case 'AI_UNAVAILABLE':
    case 'QUOTA_EXHAUSTED':
    case 'RATE_LIMITED':
    case 'BUSY':
    case 'MESSAGE_TOO_LONG':
    case 'INVALID_MESSAGE':
      return code;
    default:
      return 'GENERIC';
  }
}

function readConnectErrorCode(error: Error): string | undefined {
  const data = (error as Error & { data?: unknown }).data;
  if (typeof data === 'object' && data !== null && 'code' in data) {
    const code = (data as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

export function useTrainingAssistantChat(mode: ChatMode = 'member') {
  const { namespace, maxMessageLength } = MODE_CONFIG[mode];
  const [state, dispatch] = useReducer(reducer, initialState);
  const language = useContext(LanguageContext)?.language ?? currentLanguage();

  const socketRef = useRef<ChatSocket | null>(null);
  const localeRef = useRef(language);
  const statusRef = useRef<ChatConnectionStatus>('CONNECTING');
  const conversationIdRef = useRef<string | null>(null);
  const pendingRef = useRef<{ id: string; content: string } | null>(null);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resendAfterReconnectRef = useRef(false);
  const authRetriedRef = useRef(false);
  const recoveringRef = useRef(false);

  useEffect(() => {
    localeRef.current = language;
  }, [language]);

  const setStatus = useCallback((status: ChatConnectionStatus, issue?: ChatConnectionIssue) => {
    statusRef.current = status;
    dispatch({ type: 'status', status, issue });
  }, []);

  const clearReplyTimer = useCallback(() => {
    if (replyTimerRef.current) {
      clearTimeout(replyTimerRef.current);
      replyTimerRef.current = null;
    }
  }, []);

  const failPending = useCallback(
    (failure: ChatFailureCode) => {
      const pending = pendingRef.current;
      clearReplyTimer();
      pendingRef.current = null;
      resendAfterReconnectRef.current = false;
      if (pending) {
        dispatch({ type: 'failed', id: pending.id, failure });
      }
    },
    [clearReplyTimer],
  );

  const emitPending = useCallback(() => {
    const socket = socketRef.current;
    const pending = pendingRef.current;
    if (!socket || !pending) {
      return;
    }
    clearReplyTimer();
    replyTimerRef.current = setTimeout(() => failPending('TIMEOUT'), CHAT_REPLY_TIMEOUT_MS);
    socket.emit(CHAT_EVENTS.send, {
      message: pending.content,
      clientMessageId: pending.id,
      locale: localeRef.current,
      ...(conversationIdRef.current ? { conversationId: conversationIdRef.current } : {}),
    });
  }, [clearReplyTimer, failPending]);

  useEffect(() => {
    let disposed = false;
    const isMember = mode === 'member';
    const socket: ChatSocket = io(`${getApiOrigin()}${namespace}`, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      withCredentials: false,
      reconnection: true,
      reconnectionAttempts: 6,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 8_000,
      timeout: 10_000,
      ...(isMember
        ? { auth: (callback: (data: object) => void) => callback({ token: getAccessToken() ?? '' }) }
        : {}),
    });
    socketRef.current = socket;

    const recoverAuth = async () => {
      if (authRetriedRef.current) {
        failPending('CONNECTION_LOST');
        setStatus('ERROR', 'SESSION_EXPIRED');
        return;
      }
      authRetriedRef.current = true;
      recoveringRef.current = true;
      setStatus('RECONNECTING');
      const outcome = await refreshSession();
      if (disposed) {
        return;
      }
      if (outcome.status === 'authenticated') {
        socket.disconnect();
        recoveringRef.current = false;
        socket.connect();
        return;
      }
      recoveringRef.current = false;
      failPending('CONNECTION_LOST');
      setStatus('ERROR', outcome.status === 'unavailable' ? 'UNREACHABLE' : 'SESSION_EXPIRED');
    };

    socket.on(CHAT_EVENTS.connected, () => {
      authRetriedRef.current = false;
      setStatus('CONNECTED');
      if (resendAfterReconnectRef.current && pendingRef.current) {
        resendAfterReconnectRef.current = false;
        emitPending();
      }
    });

    socket.on(CHAT_EVENTS.typing, (payload: ChatTypingPayload) => {
      if (payload.clientMessageId && payload.clientMessageId !== pendingRef.current?.id) {
        return;
      }
      dispatch({ type: 'typing', typing: payload.isTyping });
    });

    socket.on(CHAT_EVENTS.response, (payload: ChatResponsePayload) => {
      if (payload.clientMessageId && payload.clientMessageId !== pendingRef.current?.id) {
        return;
      }
      clearReplyTimer();
      pendingRef.current = null;
      conversationIdRef.current = payload.conversationId;
      dispatch({ type: 'response', payload });
    });

    socket.on(CHAT_EVENTS.error, (payload: ChatErrorPayload) => {
      if (isMember && (payload.code === 'AUTH_EXPIRED' || payload.code === 'UNAUTHORIZED')) {
        if (pendingRef.current) {
          clearReplyTimer();
          resendAfterReconnectRef.current = true;
        }
        void recoverAuth();
        return;
      }
      if (payload.clientMessageId && payload.clientMessageId !== pendingRef.current?.id) {
        return;
      }
      failPending(toFailure(payload.code));
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') {
        if (!recoveringRef.current && !disposed) {
          setStatus('DISCONNECTED');
        }
        return;
      }
      dispatch({ type: 'typing', typing: false });
      if (!resendAfterReconnectRef.current) {
        failPending('CONNECTION_LOST');
      }
      if (reason !== 'io server disconnect') {
        setStatus('RECONNECTING');
      } else if (!recoveringRef.current) {
        setStatus('DISCONNECTED');
      }
    });

    socket.on('connect_error', (error: Error) => {
      if (socket.active) {
        setStatus(statusRef.current === 'CONNECTING' ? 'CONNECTING' : 'RECONNECTING');
        return;
      }
      const code = readConnectErrorCode(error);
      if (isMember && (code === 'UNAUTHORIZED' || code === 'AUTH_EXPIRED')) {
        void recoverAuth();
        return;
      }
      failPending('CONNECTION_LOST');
      setStatus('ERROR', code === 'RATE_LIMITED' ? 'TOO_MANY_CONNECTIONS' : 'UNREACHABLE');
    });

    socket.io.on('reconnect_attempt', () => setStatus('RECONNECTING'));
    socket.io.on('reconnect_failed', () => {
      failPending('CONNECTION_LOST');
      setStatus('ERROR', 'UNREACHABLE');
    });

    socket.connect();

    return () => {
      disposed = true;
      clearReplyTimer();
      socket.removeAllListeners();
      socket.io.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [clearReplyTimer, emitPending, failPending, mode, namespace, setStatus]);

  const send = useCallback(
    (text: string): boolean => {
      const content = text.trim();
      if (
        content.length === 0 ||
        content.length > maxMessageLength ||
        statusRef.current !== 'CONNECTED' ||
        pendingRef.current
      ) {
        return false;
      }
      const id = crypto.randomUUID();
      pendingRef.current = { id, content };
      dispatch({
        type: 'userMessage',
        message: { id, role: 'user', content, createdAt: new Date().toISOString(), status: 'sending' },
      });
      emitPending();
      return true;
    },
    [emitPending, maxMessageLength],
  );

  const retry = useCallback(
    (id: string) => {
      const message = state.messages.find(
        (item): item is ChatUserMessage => item.role === 'user' && item.id === id,
      );
      if (!message || message.status !== 'failed' || statusRef.current !== 'CONNECTED' || pendingRef.current) {
        return;
      }
      pendingRef.current = { id, content: message.content };
      dispatch({ type: 'resend', id });
      emitPending();
    },
    [emitPending, state.messages],
  );

  const reconnect = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) {
      return;
    }
    authRetriedRef.current = false;
    setStatus('CONNECTING');
    socket.connect();
  }, [setStatus]);

  return {
    maxMessageLength,
    status: state.status,
    issue: state.issue,
    messages: state.messages,
    typing: state.typing,
    awaitingReply: state.messages.some(
      (message) => message.role === 'user' && message.status === 'sending',
    ),
    send,
    retry,
    reconnect,
  };
}
