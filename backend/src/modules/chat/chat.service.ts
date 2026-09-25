import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AiProviderError } from './ai/ai-provider.error';
import {
  AI_PROVIDER,
  AiChatMessage,
  type AiProvider,
} from './ai/ai-provider.interface';
import { ChatConversationStore } from './chat-conversation.store';
import { ChatRateLimiter } from './chat-rate-limiter';
import {
  buildPublicSystemPrompt,
  buildSystemPrompt,
} from './chat-system-prompt';
import { ChatError } from './chat.error';
import { PublicChatQuota } from './public-chat-quota';
import {
  ChatAssistantMessage,
  ChatSubject,
  isVisitor,
  SendChatMessageInput,
} from './types/chat.types';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly inFlight = new Set<string>();

  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    private readonly conversations: ChatConversationStore,
    private readonly rateLimiter: ChatRateLimiter,
    private readonly publicQuota: PublicChatQuota,
  ) {}

  async sendMessage(
    subject: ChatSubject,
    input: SendChatMessageInput,
    signal?: AbortSignal,
  ): Promise<ChatAssistantMessage> {
    const visitor = isVisitor(subject);
    const limitKey = visitor
      ? `visitor:${subject.visitorId}`
      : `user:${subject.userId}`;
    // Visitor history is per socket so visitors sharing an IP never share a conversation.
    const ownerKey = visitor
      ? `visitor-session:${subject.sessionKey}`
      : subject.userId;

    if (this.inFlight.has(limitKey)) {
      throw new ChatError('BUSY');
    }

    const decision = this.rateLimiter.tryConsume(
      limitKey,
      visitor ? 'visitor' : 'member',
    );
    if (!decision.allowed) {
      throw new ChatError('RATE_LIMITED', decision.retryAfterMs);
    }

    if (visitor && !this.publicQuota.tryConsume()) {
      throw new ChatError('QUOTA_EXHAUSTED');
    }

    this.inFlight.add(limitKey);
    const startedAt = Date.now();
    const conversation = this.conversations.resolve(
      ownerKey,
      input.conversationId,
    );
    const audience = visitor ? 'public' : subject.role;

    try {
      const messages: AiChatMessage[] = [
        {
          role: 'system',
          content: visitor
            ? buildPublicSystemPrompt(input.locale)
            : buildSystemPrompt({ role: subject.role, locale: input.locale }),
        },
        ...this.conversations.recentTurns(conversation),
        { role: 'user', content: input.message },
      ];

      const result = await this.provider.generateResponse({
        messages,
        locale: input.locale,
        signal,
      });

      // History is only extended after a successful reply so failed turns are never replayed.
      this.conversations.appendExchange(
        conversation,
        input.message,
        result.content,
      );

      this.logger.log(
        `chat reply audience=${audience} conversation=${conversation.id} provider=${this.provider.name} model=${result.model} latencyMs=${Date.now() - startedAt} truncated=${result.truncated}`,
      );

      return {
        conversationId: conversation.id,
        messageId: randomUUID(),
        role: 'assistant',
        content: result.content,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof AiProviderError) {
        this.logger.warn(
          `chat provider failure audience=${audience} conversation=${conversation.id} provider=${this.provider.name} kind=${error.kind}`,
        );
        throw new ChatError('AI_UNAVAILABLE');
      }
      this.logger.error(
        `chat failure audience=${audience} conversation=${conversation.id} error=${error instanceof Error ? error.name : 'unknown'}`,
      );
      throw new ChatError('INTERNAL');
    } finally {
      this.inFlight.delete(limitKey);
    }
  }
}
