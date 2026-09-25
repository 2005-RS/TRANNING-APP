import { Logger } from '@nestjs/common';
import { AiProviderName } from './ai-provider-name.enum';
import { AiProviderError } from './ai-provider.error';
import { AiChatInput, AiChatResult, AiProvider } from './ai-provider.interface';

export interface DeepSeekAiProviderOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  maxOutputTokens: number;
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 750;
/** Skip the retry when less than this much of the overall timeout remains. */
const RETRY_MIN_REMAINING_MS = 5_000;
const TEMPERATURE = 0.3;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorForStatus(status: number): AiProviderError {
  if (status === 429) {
    return new AiProviderError('rate_limited', false, status);
  }
  if (status === 401 || status === 402 || status === 403) {
    return new AiProviderError('misconfigured', false, status);
  }
  if (status === 400 || status === 422) {
    return new AiProviderError('rejected', false, status);
  }
  if (status >= 500) {
    return new AiProviderError('unavailable', true, status);
  }
  return new AiProviderError('unavailable', false, status);
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AiProviderError('aborted'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new AiProviderError('aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * DeepSeek Chat Completions (OpenAI-compatible) client.
 * Contract: POST {baseUrl}/chat/completions — https://api-docs.deepseek.com/api/create-chat-completion
 */
export class DeepSeekAiProvider implements AiProvider {
  readonly name = AiProviderName.DeepSeek;
  private readonly logger = new Logger(DeepSeekAiProvider.name);
  private readonly endpoint: string;

  constructor(
    private readonly options: DeepSeekAiProviderOptions,
    private readonly fetchImpl: FetchLike = (input, init) => fetch(input, init),
  ) {
    this.endpoint = `${options.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  }

  async generateResponse(input: AiChatInput): Promise<AiChatResult> {
    const deadline = Date.now() + this.options.timeoutMs;

    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.request(input, deadline);
      } catch (error) {
        const providerError =
          error instanceof AiProviderError
            ? error
            : new AiProviderError('unavailable');
        this.logger.warn(
          `DeepSeek request failed kind=${providerError.kind} status=${providerError.status ?? 'none'} attempt=${attempt}`,
        );

        const canRetry =
          providerError.retryable &&
          attempt < MAX_ATTEMPTS &&
          deadline - Date.now() - RETRY_DELAY_MS >= RETRY_MIN_REMAINING_MS;
        if (!canRetry) {
          throw providerError;
        }
        await delay(RETRY_DELAY_MS, input.signal);
      }
    }
  }

  private async request(
    input: AiChatInput,
    deadline: number,
  ): Promise<AiChatResult> {
    const timeout = AbortSignal.timeout(Math.max(1, deadline - Date.now()));
    const signal = input.signal
      ? AbortSignal.any([input.signal, timeout])
      : timeout;

    const classifyAbort = (): AiProviderError => {
      if (input.signal?.aborted) {
        return new AiProviderError('aborted');
      }
      if (timeout.aborted) {
        return new AiProviderError('timeout');
      }
      return new AiProviderError('unavailable', true);
    };

    let response: Response;
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({
          model: this.options.model,
          messages: input.messages,
          thinking: { type: 'disabled' },
          max_tokens: this.options.maxOutputTokens,
          temperature: TEMPERATURE,
          stream: false,
        }),
        signal,
      });
    } catch {
      throw classifyAbort();
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw errorForStatus(response.status);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      if (signal.aborted) {
        throw classifyAbort();
      }
      throw new AiProviderError('invalid_response');
    }

    return this.parse(payload);
  }

  private parse(payload: unknown): AiChatResult {
    if (!isRecord(payload) || !Array.isArray(payload.choices)) {
      throw new AiProviderError('invalid_response');
    }

    const choice: unknown = payload.choices[0];
    if (!isRecord(choice) || !isRecord(choice.message)) {
      throw new AiProviderError('invalid_response');
    }

    const content = choice.message.content;
    if (typeof content !== 'string' || content.trim() === '') {
      throw new AiProviderError('invalid_response');
    }

    return {
      content: content.trim(),
      model:
        typeof payload.model === 'string' ? payload.model : this.options.model,
      truncated: choice.finish_reason === 'length',
    };
  }
}
