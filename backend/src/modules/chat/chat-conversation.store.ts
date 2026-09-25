import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { EnvironmentVariables } from '../../config/env.validation';
import {
  CHAT_CONVERSATION_TTL_MS,
  CHAT_MAX_CONVERSATIONS_PER_USER,
  CHAT_MAX_CONVERSATIONS_TOTAL,
} from './chat.constants';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface StoredConversation {
  id: string;
  userId: string;
  turns: ChatTurn[];
  updatedAt: number;
}

export interface ChatConversationRef {
  readonly id: string;
  readonly userId: string;
}

/**
 * V1 conversation memory: process-local, bounded, and expiring. Chat text is
 * never written to PostgreSQL. A multi-instance deployment needs sticky
 * sessions or a shared store behind this same interface.
 */
@Injectable()
export class ChatConversationStore {
  private readonly conversations = new Map<string, StoredConversation>();
  private readonly maxTurns: number;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.maxTurns = config.getOrThrow('AI_MAX_HISTORY_MESSAGES', {
      infer: true,
    });
  }

  /** Returns the caller's conversation, or a new one when the id is unknown, expired, or owned by someone else. */
  resolve(userId: string, conversationId?: string): ChatConversationRef {
    this.pruneExpired();

    const existing = conversationId
      ? this.conversations.get(conversationId)
      : undefined;
    if (existing && existing.userId === userId) {
      this.touch(existing);
      return existing;
    }

    this.evictForNewConversation(userId);
    const created: StoredConversation = {
      id: randomUUID(),
      userId,
      turns: [],
      updatedAt: Date.now(),
    };
    this.conversations.set(created.id, created);
    return created;
  }

  recentTurns(ref: ChatConversationRef): readonly ChatTurn[] {
    const conversation = this.owned(ref);
    return conversation ? [...conversation.turns] : [];
  }

  appendExchange(
    ref: ChatConversationRef,
    userContent: string,
    assistantContent: string,
  ): void {
    const conversation = this.owned(ref);
    if (!conversation) {
      return;
    }
    conversation.turns.push(
      { role: 'user', content: userContent },
      { role: 'assistant', content: assistantContent },
    );
    if (conversation.turns.length > this.maxTurns) {
      conversation.turns.splice(0, conversation.turns.length - this.maxTurns);
    }
    this.touch(conversation);
  }

  size(): number {
    return this.conversations.size;
  }

  private owned(ref: ChatConversationRef): StoredConversation | undefined {
    const conversation = this.conversations.get(ref.id);
    return conversation?.userId === ref.userId ? conversation : undefined;
  }

  private touch(conversation: StoredConversation): void {
    conversation.updatedAt = Date.now();
    this.conversations.delete(conversation.id);
    this.conversations.set(conversation.id, conversation);
  }

  private pruneExpired(): void {
    const cutoff = Date.now() - CHAT_CONVERSATION_TTL_MS;
    for (const [id, conversation] of this.conversations) {
      if (conversation.updatedAt >= cutoff) {
        // Map order is least-recently-used first, so the rest are fresher.
        break;
      }
      this.conversations.delete(id);
    }
  }

  private evictForNewConversation(userId: string): void {
    const owned = [...this.conversations.values()].filter(
      (conversation) => conversation.userId === userId,
    );
    const overUser = owned.length - CHAT_MAX_CONVERSATIONS_PER_USER + 1;
    for (const conversation of owned.slice(0, Math.max(0, overUser))) {
      this.conversations.delete(conversation.id);
    }

    while (this.conversations.size >= CHAT_MAX_CONVERSATIONS_TOTAL) {
      const oldest = this.conversations.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.conversations.delete(oldest);
    }
  }
}
