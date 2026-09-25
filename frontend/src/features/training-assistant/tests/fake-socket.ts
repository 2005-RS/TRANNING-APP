type Handler = (...args: unknown[]) => void;

class FakeEmitter {
  private readonly handlers = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler): this {
    const set = this.handlers.get(event) ?? new Set<Handler>();
    set.add(handler);
    this.handlers.set(event, set);
    return this;
  }

  removeAllListeners(): this {
    this.handlers.clear();
    return this;
  }

  fire(event: string, ...args: unknown[]): void {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(...args);
    }
  }
}

type AuthCallback = (data: Record<string, unknown>) => void;

export type FakeSocketOptions = {
  auth?: (callback: AuthCallback) => void;
  [key: string]: unknown;
};

/** Minimal socket.io-client double driven by the test as if it were the server. */
export class FakeSocket extends FakeEmitter {
  readonly io = new FakeEmitter();
  readonly sent: Array<Record<string, unknown>> = [];
  connected = false;
  active = false;
  connectCalls = 0;
  disconnectCalls = 0;

  readonly url: string;
  readonly options: FakeSocketOptions;

  constructor(url: string, options: FakeSocketOptions) {
    super();
    this.url = url;
    this.options = options;
  }

  sentAt(index: number): Record<string, unknown> {
    const payload = this.sent[index];
    if (!payload) {
      throw new Error(`No chat:send payload at index ${index}`);
    }
    return payload;
  }

  connect(): this {
    this.connectCalls += 1;
    this.active = true;
    return this;
  }

  disconnect(): this {
    this.disconnectCalls += 1;
    const wasConnected = this.connected;
    this.connected = false;
    this.active = false;
    if (wasConnected) {
      this.fire('disconnect', 'io client disconnect');
    }
    return this;
  }

  emit(event: string, payload: Record<string, unknown>): this {
    if (event === 'chat:send') {
      this.sent.push(payload);
    }
    return this;
  }

  handshakeToken(): unknown {
    let token: unknown;
    this.options.auth?.((data) => {
      token = data.token;
    });
    return token;
  }

  serverAccept(): void {
    this.connected = true;
    this.fire('connect');
    this.fire('chat:connected', { assistantName: 'Training Assistant', maxMessageLength: 2000 });
  }

  serverReject(code: string): void {
    this.active = false;
    this.fire('connect_error', Object.assign(new Error(code), { data: { code } }));
  }

  serverEmit(event: string, payload: unknown): void {
    this.fire(event, payload);
  }

  drop(reason = 'transport close'): void {
    this.connected = false;
    this.fire('disconnect', reason);
  }
}

export const fakeSockets: FakeSocket[] = [];

export function createFakeSocket(url: string, options: FakeSocketOptions): FakeSocket {
  const socket = new FakeSocket(url, options);
  fakeSockets.push(socket);
  return socket;
}

export function latestSocket(): FakeSocket {
  const socket = fakeSockets[fakeSockets.length - 1];
  if (!socket) {
    throw new Error('No socket was created');
  }
  return socket;
}
