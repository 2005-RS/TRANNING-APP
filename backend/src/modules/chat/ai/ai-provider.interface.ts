import { ChatLocale } from '../types/chat.types';
import { AiProviderName } from './ai-provider-name.enum';

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export type AiMessageRole = 'system' | 'user' | 'assistant';

export interface AiChatMessage {
  role: AiMessageRole;
  content: string;
}

export interface AiChatInput {
  /** Complete, already-bounded prompt: system message, recent history, current user turn. */
  messages: readonly AiChatMessage[];
  locale: ChatLocale;
  signal?: AbortSignal;
}

export interface AiChatResult {
  content: string;
  model: string;
  truncated: boolean;
}

export interface AiProvider {
  readonly name: AiProviderName;
  generateResponse(input: AiChatInput): Promise<AiChatResult>;
}
