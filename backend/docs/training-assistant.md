# Training Assistant (AI chat)

In-app assistant that explains how to use the Training App. Available to every authenticated role (CLIENT, TRAINER, ADMIN) on `/chat`, and to anonymous website visitors on `/public-chat` (see [Public website assistant](#public-website-assistant)). Implemented entirely in application code: no n8n, webhooks, or automation workflows.

```
React (features/training-assistant)
  │  socket.io, namespace /chat, handshake auth = in-memory access token
  ▼
ChatGateway            transport: handshake auth, payload validation, events
  ▼
ChatService            orchestration: rate limit, one reply in flight per user, prompt, history
  ▼
AiProvider (interface) MockAiProvider | DeepSeekAiProvider
  ▼
DeepSeek API           POST {DEEPSEEK_BASE_URL}/chat/completions (backend only)
```

Source: `backend/src/modules/chat/`, `backend/src/config/socket-io.adapter.ts`, `frontend/src/features/training-assistant/`.

## WebSocket contract

Namespace `/chat` on the API origin (default socket.io path `/socket.io`). Not part of OpenAPI; types are mirrored in `frontend/src/features/training-assistant/lib/chat-contract.ts`.

| Direction | Event | Payload |
| --- | --- | --- |
| client → server | `chat:send` | `{ message: string (1–2000 chars after trim), clientMessageId?: uuid v4, conversationId?: uuid v4, locale?: 'es' \| 'en' }` — no other fields accepted |
| server → client | `chat:connected` | `{ assistantName, maxMessageLength }` |
| server → client | `chat:typing` | `{ conversationId \| null, clientMessageId \| null, isTyping }` |
| server → client | `chat:response` | `{ conversationId, messageId, role: 'assistant', content, createdAt, clientMessageId \| null }` |
| server → client | `chat:error` | `{ code, message, clientMessageId \| null, retryable, retryAfterMs? }` |

Error codes: `UNAUTHORIZED`, `AUTH_EXPIRED`, `INVALID_MESSAGE`, `MESSAGE_TOO_LONG`, `RATE_LIMITED`, `BUSY`, `QUOTA_EXHAUSTED` (public only), `AI_UNAVAILABLE`, `INTERNAL`. Messages are fixed, generic strings; provider bodies, stack traces, URLs, and configuration never reach the client. The frontend localizes by `code`.

Handshake rejections arrive as socket.io `connect_error` with `err.message === err.data.code` (`UNAUTHORIZED`, `AUTH_EXPIRED`, `RATE_LIMITED`).

## Authentication

- Global HTTP guards (`AccessAuthGuard`, `ThrottlerGuard`) do not run for WebSocket gateways, so the gateway authenticates explicitly with the same rules: `AccessTokenService.verify` + `AuthService.requireActiveSession` + role match.
- The browser sends the in-memory access token in the socket.io handshake `auth.token`. No cookies are used on the socket (`withCredentials: false`), no token is persisted, and user id / role are always derived server-side.
- Every `chat:send` re-checks token expiry and the live refresh session. An expired token yields `AUTH_EXPIRED` and a server disconnect; the frontend runs the existing single-flight `refreshSession()`, reconnects, and resends the pending message once. A revoked session yields `UNAUTHORIZED`.
- The socket.io adapter applies the `CORS_ORIGIN` allowlist to polling CORS and checks the `Origin` header on every request (browsers do not enforce CORS on WebSocket upgrades).

## Limits

| Limit | Value | Where |
| --- | --- | --- |
| Message length | 2000 characters | `CHAT_MAX_MESSAGE_LENGTH` — enough for a detailed question, bounds prompt cost |
| Socket frame | 16 KiB | `CHAT_SOCKET_MAX_PAYLOAD_BYTES` |
| Messages per user | `AI_RATE_LIMIT_PER_MINUTE` (default 12) per sliding minute | `ChatRateLimiter` |
| Concurrent replies | 1 per user (`BUSY`) | `ChatService` |
| Sockets per user | 5 | `ChatGateway` |
| History sent to the model | last `AI_MAX_HISTORY_MESSAGES` (default 20) turns + system prompt + current turn | `ChatConversationStore` |
| Provider timeout | `AI_REQUEST_TIMEOUT_MS` (default 30000) | `DeepSeekAiProvider` |
| Output tokens | `AI_MAX_OUTPUT_TOKENS` (default 800) | `DeepSeekAiProvider` |

## Public website assistant

Namespace `/public-chat` (`PublicChatGateway`) serves anonymous visitors of the public website and `/login`. It is a separate namespace so the authenticated `/chat` contract is unchanged; both share `ChatService`, the provider, and the turn delivery in `chat-turn.ts`.

- **No identity.** Handshake auth is ignored. The visitor is keyed by client IP for limits and by socket id for history, so a reconnect starts a new conversation and visitor history never mixes with member history.
- **Separate prompt.** `buildPublicSystemPrompt(locale)` describes the platform only: no role, no user data, never quote prices, no sign-up, never ask for or accept personal data, same health rules.
- **Origin allowlist** applies as for `/chat` (engine-level `allowRequest`).
- **Client IP.** `socket.handshake.address`; with `TRUST_PROXY=true` the right-most `X-Forwarded-For` hop (the one appended by the single trusted proxy), matching Express `trust proxy = 1`.

| Limit | Value |
| --- | --- |
| Message length | 500 characters (`PUBLIC_CHAT_MAX_MESSAGE_LENGTH`) |
| Messages per IP | `AI_PUBLIC_RATE_LIMIT_PER_MINUTE` (default 4) per sliding minute |
| All visitors combined | `AI_PUBLIC_DAILY_MESSAGE_LIMIT` (default 300) per UTC day → `QUOTA_EXHAUSTED` (not retryable) |
| Sockets per IP | 3 (`RATE_LIMITED` on connect) |
| Kill switch | `AI_PUBLIC_CHAT_ENABLED=false` → connect rejected with `AI_UNAVAILABLE` |

Known limits: counters are process-local like the member limits (reset on restart, per instance); visitors behind one NAT share a per-IP budget; the per-IP socket count is checked at connect and is not atomic across simultaneous handshakes (bounded by the message limits either way).

## Persistence decision (V1)

Conversation history is **not persisted**. `ChatConversationStore` keeps bounded, per-user history in process memory (max 5 conversations per user, 2 h idle expiry, 10 000 conversations total). Reasons:

- No product requirement yet for chat history across devices or restarts.
- Chat text can contain sensitive health details; not writing it to PostgreSQL avoids a new private-data store, retention policy, and admin exposure.
- The store is an injectable service; a TypeORM-backed implementation (`ChatConversation`, `ChatMessage` + migration) can replace it without touching the gateway or providers.

Consequences: history is lost on API restart; a multi-instance deployment needs sticky sessions (or a shared store) because conversations and rate limits are process-local. Failed turns are never added to history.

## System prompt and safety

`chat-system-prompt.ts` is the single source of the assistant's behaviour. It lists only capabilities the app ships per role (from `docs/frontend/route-map.md`; update both together) and states that the app has no public sign-up, password reset, payments, subscriptions, prices, trainer chat, or email/push notifications. The model receives no user data beyond role and locale, has no tools, cannot run SQL or commands, and must answer health questions conservatively and refer to a professional.

## Providers

| `AI_PROVIDER` | Behaviour |
| --- | --- |
| `mock` (default outside production) | Deterministic keyword responses (`mock-ai.provider.ts`); no network, no cost. Rejected in production. |
| `deepseek` | DeepSeek Chat Completions, OpenAI-compatible (verified against https://api-docs.deepseek.com, 2026-09). Non-streaming, `thinking: { type: 'disabled' }`, `temperature: 0.3`. Timeout + caller cancellation (socket disconnect aborts the request), one retry on 5xx/network errors only when enough timeout budget remains, response shape validation. 401/402/403 → misconfigured, 400/422 → rejected, 429 → rate limited: none retried. Logs contain only error kind, HTTP status, and attempt number. |

Streaming (`chat:stream:start|chunk|end`) is not implemented; it would be an additional optional provider method and gateway events, leaving the request/response path unchanged.

## Local testing

### Mock AI (no cost)

1. `cd backend` and start dependencies: `docker compose up -d` (PostgreSQL 5432, MinIO 9100).
2. In `backend/.env`: `AI_PROVIDER=mock` (or leave it unset in development). Ensure `CORS_ORIGIN` includes the frontend origin (`http://localhost:5173`).
3. `npm run migration:run` (first time), then `npm run start:dev`. If port 3000 is taken by another project, run with `PORT=3100`.
4. `cd frontend`; `VITE_API_URL` must equal the backend origin (for example `http://localhost:3100`). `npm run dev` → http://localhost:5173.
5. Sign in with any seeded user, click **Training Assistant** (bottom-right), send `Hola`.
6. Expected: the header shows "En línea"/"Online"; DevTools → Network → WS shows `…/socket.io/?EIO=4&transport=websocket` to the backend origin with a `chat:send` frame followed by `chat:typing` and `chat:response`; the reply is `¡Hola! Soy Training Assistant. ¿En qué puedo ayudarte?`; the backend log shows `chat reply … provider=mock model=mock`.

### DeepSeek

In `backend/.env` only (never in the frontend, never committed):

```
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=<your key from https://platform.deepseek.com>
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-flash
# optional: AI_REQUEST_TIMEOUT_MS, AI_MAX_HISTORY_MESSAGES, AI_MAX_OUTPUT_TOKENS, AI_RATE_LIMIT_PER_MINUTE
```

Restart the backend. Startup fails fast if a DeepSeek variable is missing; production additionally requires `https` and rejects `mock`. Browser traffic is unchanged: it still only reaches the NestJS origin.

## Tests

- Backend unit: `src/modules/chat/**/*.spec.ts`, `src/config/socket-io.adapter.spec.ts`, AI cases in `src/config/env.validation.spec.ts`.
- Backend e2e (real app + PostgreSQL + socket.io client, mock AI): `test/chat.e2e-spec.ts`, including the anonymous `/public-chat` round trip.
- Frontend: `src/features/training-assistant/tests/training-assistant.spec.tsx` (fake socket; member and public placements), `src/features/public-site/tests/public-site.spec.tsx`, `tests/ai-secret-isolation.spec.ts`.
- No automated test calls the real DeepSeek API.
