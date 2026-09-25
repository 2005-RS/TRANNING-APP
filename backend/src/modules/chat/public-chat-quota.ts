import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../config/env.validation';

/**
 * Global cap on anonymous messages per UTC day. Per-IP limits alone do not
 * bound provider cost, because anonymous callers can rotate addresses.
 * Process-local, like the rest of the chat state.
 */
@Injectable()
export class PublicChatQuota {
  private readonly limit: number;
  private day = '';
  private used = 0;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.limit = config.getOrThrow('AI_PUBLIC_DAILY_MESSAGE_LIMIT', {
      infer: true,
    });
  }

  tryConsume(): boolean {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.day) {
      this.day = today;
      this.used = 0;
    }
    if (this.used >= this.limit) {
      return false;
    }
    this.used += 1;
    return true;
  }
}
