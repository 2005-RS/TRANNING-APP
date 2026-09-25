import { ConfigService } from '@nestjs/config';
import {
  EnvironmentVariables,
  NodeEnvironment,
} from '../../../config/env.validation';
import { AiProviderName } from './ai-provider-name.enum';
import { AiProvider } from './ai-provider.interface';
import { DeepSeekAiProvider } from './deepseek-ai.provider';
import { MockAiProvider } from './mock-ai.provider';

export function createAiProvider(
  config: ConfigService<EnvironmentVariables, true>,
): AiProvider {
  const providerName = config.getOrThrow('AI_PROVIDER', { infer: true });

  if (providerName === AiProviderName.DeepSeek) {
    return new DeepSeekAiProvider({
      apiKey: config.getOrThrow('DEEPSEEK_API_KEY', { infer: true }),
      baseUrl: config.getOrThrow('DEEPSEEK_BASE_URL', { infer: true }),
      model: config.getOrThrow('DEEPSEEK_MODEL', { infer: true }),
      timeoutMs: config.getOrThrow('AI_REQUEST_TIMEOUT_MS', { infer: true }),
      maxOutputTokens: config.getOrThrow('AI_MAX_OUTPUT_TOKENS', {
        infer: true,
      }),
    });
  }

  if (
    config.getOrThrow('NODE_ENV', { infer: true }) ===
    NodeEnvironment.Production
  ) {
    throw new Error('AI_PROVIDER=mock is not allowed in production');
  }
  return new MockAiProvider();
}
