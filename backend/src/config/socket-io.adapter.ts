import type { IncomingMessage } from 'node:http';
import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';
import { CHAT_SOCKET_MAX_PAYLOAD_BYTES } from '../modules/chat/chat.constants';

export function isSocketOriginAllowed(
  origin: string | undefined,
  allowedOrigins: string[] | true,
): boolean {
  if (allowedOrigins === true || origin === undefined) {
    return true;
  }
  return allowedOrigins.includes(origin);
}

/**
 * Applies the HTTP CORS allowlist to socket.io. Browsers do not enforce CORS
 * on the WebSocket upgrade, so the Origin header is checked explicitly.
 * Requests without an Origin are non-browser clients and still need a token.
 */
export class ConfiguredSocketIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly allowedOrigins: string[] | true,
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    return super.createIOServer(port, {
      ...options,
      serveClient: false,
      maxHttpBufferSize: CHAT_SOCKET_MAX_PAYLOAD_BYTES,
      cors: {
        origin: this.allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: false,
      },
      allowRequest: (
        request: IncomingMessage,
        callback: (error: string | null | undefined, success: boolean) => void,
      ) => {
        callback(
          null,
          isSocketOriginAllowed(request.headers.origin, this.allowedOrigins),
        );
      },
    }) as Server;
  }
}
