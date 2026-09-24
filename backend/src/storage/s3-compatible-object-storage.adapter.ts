import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/env.validation';
import { ObjectStorageUnavailableException } from './object-storage.errors';
import {
  CreateUploadRequestInput,
  ObjectStorageService,
  SignedReadUrl,
  SignedUploadRequest,
  StoredObjectMetadata,
} from './object-storage.types';

export class S3CompatibleObjectStorageAdapter implements ObjectStorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.bucket = config.getOrThrow('OBJECT_STORAGE_BUCKET', { infer: true });
    const endpoint = config.get('OBJECT_STORAGE_ENDPOINT', { infer: true });

    this.client = new S3Client({
      region: config.getOrThrow('OBJECT_STORAGE_REGION', { infer: true }),
      endpoint,
      forcePathStyle: config.getOrThrow('OBJECT_STORAGE_FORCE_PATH_STYLE', {
        infer: true,
      }),
      credentials: {
        accessKeyId: config.getOrThrow('OBJECT_STORAGE_ACCESS_KEY_ID', {
          infer: true,
        }),
        secretAccessKey: config.getOrThrow('OBJECT_STORAGE_SECRET_ACCESS_KEY', {
          infer: true,
        }),
      },
    });
  }

  async createUploadRequest(
    input: CreateUploadRequestInput,
  ): Promise<SignedUploadRequest> {
    try {
      const { url, fields } = await createPresignedPost(this.client, {
        Bucket: this.bucket,
        Key: input.key,
        Expires: input.expiresInSeconds,
        Conditions: [
          { key: input.key },
          { 'Content-Type': input.contentType },
          ['content-length-range', 1, input.maxBytes],
        ],
        Fields: {
          'Content-Type': input.contentType,
        },
      });

      return {
        method: 'POST',
        url,
        fields,
        expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
      };
    } catch {
      throw new ObjectStorageUnavailableException();
    }
  }

  async headObject(key: string): Promise<StoredObjectMetadata | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      return {
        key,
        contentLength: result.ContentLength ?? 0,
        contentType: result.ContentType,
      };
    } catch (error) {
      if (isMissingObject(error)) {
        return null;
      }
      throw new ObjectStorageUnavailableException();
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      if (isMissingObject(error)) {
        return;
      }
      throw new ObjectStorageUnavailableException();
    }
  }

  async createReadUrl(
    key: string,
    expiresInSeconds: number,
  ): Promise<SignedReadUrl> {
    try {
      const url = await getSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
        { expiresIn: expiresInSeconds },
      );

      return {
        url,
        expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
      };
    } catch {
      throw new ObjectStorageUnavailableException();
    }
  }
}

function isMissingObject(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as {
    name?: unknown;
    $metadata?: { httpStatusCode?: unknown };
  };

  if (
    candidate.name === 'NotFound' ||
    candidate.name === 'NoSuchKey' ||
    candidate.name === 'NotFoundError'
  ) {
    return true;
  }

  return candidate.$metadata?.httpStatusCode === 404;
}
