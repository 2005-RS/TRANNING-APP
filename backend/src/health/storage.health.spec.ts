import { HealthCheckError } from '@nestjs/terminus';
import { ObjectStorageService } from '../storage/object-storage.types';
import { StorageHealthIndicator } from './storage.health';

function indicatorWith(
  ping: ObjectStorageService['ping'],
): StorageHealthIndicator {
  return new StorageHealthIndicator({ ping } as ObjectStorageService);
}

describe('StorageHealthIndicator', () => {
  it('reports up when ping resolves', async () => {
    const indicator = indicatorWith(jest.fn().mockResolvedValue(undefined));
    await expect(indicator.pingCheck('storage')).resolves.toEqual({
      storage: { status: 'up' },
    });
  });

  it('reports down without leaking the storage error', async () => {
    const indicator = indicatorWith(
      jest.fn().mockRejectedValue(new Error('Access Key Id leaked')),
    );
    await expect(indicator.pingCheck('storage')).rejects.toBeInstanceOf(
      HealthCheckError,
    );
    try {
      await indicator.pingCheck('storage');
    } catch (error) {
      expect(JSON.stringify(error)).not.toMatch(/Access Key Id leaked/i);
    }
  });
});
