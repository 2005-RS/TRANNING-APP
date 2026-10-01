import { Inject, Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { OBJECT_STORAGE } from '../storage/object-storage.tokens';
import { ObjectStorageService } from '../storage/object-storage.types';

const PING_TIMEOUT_MS = 1500;

@Injectable()
export class StorageHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(OBJECT_STORAGE)
    private readonly storage: ObjectStorageService,
  ) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.storage.ping(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('timeout')),
            PING_TIMEOUT_MS,
          );
        }),
      ]);
      return this.getStatus(key, true);
    } catch {
      throw new HealthCheckError('storage unavailable', {
        [key]: { status: 'down' },
      });
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}
