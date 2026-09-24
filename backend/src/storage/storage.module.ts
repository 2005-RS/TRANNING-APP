import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/env.validation';
import { MemoryObjectStorageAdapter } from './memory-object-storage.adapter';
import { ObjectStorageDriver } from './object-storage-driver.enum';
import { OBJECT_STORAGE } from './object-storage.tokens';
import { S3CompatibleObjectStorageAdapter } from './s3-compatible-object-storage.adapter';

@Module({
  providers: [
    {
      provide: OBJECT_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => {
        const driver = config.getOrThrow('OBJECT_STORAGE_DRIVER', {
          infer: true,
        });
        if (driver === ObjectStorageDriver.Memory) {
          return new MemoryObjectStorageAdapter();
        }
        return new S3CompatibleObjectStorageAdapter(config);
      },
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
