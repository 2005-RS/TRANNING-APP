import { Logger } from '@nestjs/common';
import { AiProviderError } from './ai-provider.error';
import { AiChatInput } from './ai-provider.interface';
import {
  DeepSeekAiProvider,
  DeepSeekAiProviderOptions,
} from './deepseek-ai.provider';

const API_KEY = 'unit-test-deepseek-key-not-real';

const OPTIONS: DeepSeekAiProviderOptions = {
  apiKey: API_KEY,
  baseUrl: 'https://api.deepseek.test/',
  model: 'deepseek-flash',
  timeoutMs: 30_000,
  maxOutputTokens: 800,
};

const INPUT: AiChatInput = {
  locale: 'es',
  messages: [
    { role: 'system', content: 'system' },
    { role: 'user', content: 'Hola' },
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function completion(content: unknown, finishReason = 'stop') {
  return {
    id: 'cmpl-1',
    object: 'chat.completion',
    model: 'deepseek-flash',
    choices: [
      {
        index: 0,
        finish_reason: finishReason,
        message: { role: 'assistant', content },
      },
    ],
  };
}

function hangingFetch() {
  return jest.fn(
    (_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      }),
  );
}

describe('DeepSeekAiProvider', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('sends an OpenAI-compatible chat completion request and returns the reply', async () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve(jsonResponse(completion('  ¡Hola!  '))),
    );
    const provider = new DeepSeekAiProvider(OPTIONS, fetchMock);

    const result = await provider.generateResponse(INPUT);

    expect(result).toEqual({
      content: '¡Hola!',
      model: 'deepseek-flash',
      truncated: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe('https://api.deepseek.test/chat/completions');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${API_KEY}`,
    );
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'deepseek-flash',
      messages: INPUT.messages,
      thinking: { type: 'disabled' },
      max_tokens: 800,
      temperature: 0.3,
      stream: false,
    });
  });

  it('marks length-truncated replies', async () => {
    const provider = new DeepSeekAiProvider(OPTIONS, () =>
      Promise.resolve(jsonResponse(completion('partial', 'length'))),
    );
    await expect(provider.generateResponse(INPUT)).resolves.toMatchObject({
      truncated: true,
    });
  });

  it('times out with a timeout error', async () => {
    const provider = new DeepSeekAiProvider(
      { ...OPTIONS, timeoutMs: 50 },
      hangingFetch(),
    );
    await expect(provider.generateResponse(INPUT)).rejects.toMatchObject({
      kind: 'timeout',
    });
  });

  it('reports caller cancellation as aborted', async () => {
    const controller = new AbortController();
    const provider = new DeepSeekAiProvider(OPTIONS, hangingFetch());
    const pending = provider.generateResponse({
      ...INPUT,
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ kind: 'aborted' });
  });

  it('retries once on a 5xx and then succeeds', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'overloaded' }, 503))
      .mockResolvedValueOnce(jsonResponse(completion('ok')));
    const provider = new DeepSeekAiProvider(OPTIONS, fetchMock);

    await expect(provider.generateResponse(INPUT)).resolves.toMatchObject({
      content: 'ok',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('stops after the bounded retry on repeated 5xx', async () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve(jsonResponse({ error: 'down' }, 500)),
    );
    const provider = new DeepSeekAiProvider(OPTIONS, fetchMock);

    await expect(provider.generateResponse(INPUT)).rejects.toMatchObject({
      kind: 'unavailable',
      status: 500,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    [401, 'misconfigured'],
    [402, 'misconfigured'],
    [400, 'rejected'],
    [422, 'rejected'],
    [429, 'rate_limited'],
  ])('does not retry HTTP %i (%s)', async (status, kind) => {
    const fetchMock = jest.fn(() =>
      Promise.resolve(jsonResponse({ error: { message: 'x' } }, status)),
    );
    const provider = new DeepSeekAiProvider(OPTIONS, fetchMock);

    await expect(provider.generateResponse(INPUT)).rejects.toMatchObject({
      kind,
      status,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['non-JSON body', new Response('<html>oops</html>', { status: 200 })],
    ['missing choices', jsonResponse({ id: 'x' })],
    ['empty content', jsonResponse(completion('   '))],
    ['non-string content', jsonResponse(completion(null))],
  ])('rejects an invalid response (%s)', async (_label, response) => {
    const provider = new DeepSeekAiProvider(OPTIONS, () =>
      Promise.resolve(response),
    );
    await expect(provider.generateResponse(INPUT)).rejects.toMatchObject({
      kind: 'invalid_response',
    });
  });

  it('never exposes the API key or provider body in errors or logs', async () => {
    const provider = new DeepSeekAiProvider(OPTIONS, () =>
      Promise.resolve(
        jsonResponse(
          { error: { message: `Authentication Fails (${API_KEY})` } },
          401,
        ),
      ),
    );

    const error = await provider.generateResponse(INPUT).catch((e) => e);

    expect(error).toBeInstanceOf(AiProviderError);
    const serialized = `${(error as Error).message} ${JSON.stringify(error)}`;
    expect(serialized).not.toContain(API_KEY);
    expect(serialized).not.toContain('Authentication Fails');
    const logged = warn.mock.calls.flat().join(' ');
    expect(logged).not.toContain(API_KEY);
    expect(logged).not.toContain('api.deepseek.test');
  });
});
