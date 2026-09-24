import {
  ObjectStorageService,
  PutTestObjectInput,
  SignedReadUrl,
  SignedUploadRequest,
  StoredObjectMetadata,
} from './object-storage.types';

interface StoredObject {
  contentType: string;
  contentLength: number;
}

export class MemoryObjectStorageAdapter implements ObjectStorageService {
  private readonly objects = new Map<string, StoredObject>();

  async createUploadRequest(input: {
    key: string;
    contentType: string;
    maxBytes: number;
    expiresInSeconds: number;
  }): Promise<SignedUploadRequest> {
    return {
      method: 'POST',
      url: 'http://127.0.0.1/test-object-storage/upload',
      fields: {
        key: input.key,
        'Content-Type': input.contentType,
        policy: 'test-policy',
      },
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
    };
  }

  async headObject(key: string): Promise<StoredObjectMetadata | null> {
    const stored = this.objects.get(key);
    if (!stored) {
      return null;
    }

    return {
      key,
      contentLength: stored.contentLength,
      contentType: stored.contentType,
    };
  }

  async deleteObject(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async createReadUrl(
    key: string,
    expiresInSeconds: number,
  ): Promise<SignedReadUrl> {
    return {
      url: `http://127.0.0.1/test-object-storage/objects/${encodeURIComponent(key)}`,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    };
  }

  async putObject(input: PutTestObjectInput): Promise<void> {
    this.objects.set(input.key, {
      contentType: input.contentType,
      contentLength: input.contentLength,
    });
  }

  clear(): void {
    this.objects.clear();
  }
}
