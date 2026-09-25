import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../config/env.validation';
import { CHAT_RATE_LIMIT_WINDOW_MS } from './chat.constants';

export type RateLimitDecision =
  { allowed: true } | { allowed: false; retryAfterMs: number };

export type RateLimitAudience = 'member' | 'visitor';

/** Sliding one-minute window per key, process-local (same scope as the conversation store). */
@Injectable()
export class ChatRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly limits: Record<RateLimitAudience, number>;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.limits = {
      member: config.getOrThrow('AI_RATE_LIMIT_PER_MINUTE', { infer: true }),
      visitor: config.getOrThrow('AI_PUBLIC_RATE_LIMIT_PER_MINUTE', {
        infer: true,
      }),
    };
  }

  tryConsume(
    key: string,
    audience: RateLimitAudience = 'member',
  ): RateLimitDecision {
    const limit = this.limits[audience];
    const now = Date.now();
    const windowStart = now - CHAT_RATE_LIMIT_WINDOW_MS;
    const recent = (this.hits.get(key) ?? []).filter((at) => at > windowStart);

    if (recent.length >= limit) {
      this.hits.set(key, recent);
      return {
        allowed: false,
        retryAfterMs: recent[0] + CHAT_RATE_LIMIT_WINDOW_MS - now,
      };
    }

    recent.push(now);
    if (recent.length === 1) {
      this.pruneIdle(windowStart);
    }
    this.hits.set(key, recent);
    return { allowed: true };
  }

  /** Anonymous keys (IPs) are unbounded, so drop keys with no hit inside the window. */
  private pruneIdle(windowStart: number): void {
    for (const [key, times] of this.hits) {
      if (times.length === 0 || times[times.length - 1] <= windowStart) {
        this.hits.delete(key);
      }
    }
  }
}
