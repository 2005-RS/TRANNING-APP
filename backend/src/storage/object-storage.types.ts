export interface CreateUploadRequestInput {
  key: string;
  contentType: string;
  maxBytes: number;
  expiresInSeconds: number;
}

export interface SignedUploadRequest {
  method: 'POST';
  url: string;
  fields: Record<string, string>;
  expiresAt: Date;
}

export interface StoredObjectMetadata {
  key: string;
  contentLength: number;
  contentType: string | undefined;
}

export interface SignedReadUrl {
  url: string;
  expiresAt: Date;
}

export interface PutTestObjectInput {
  key: string;
  contentType: string;
  contentLength: number;
}

export interface ObjectStorageService {
  createUploadRequest(
    input: CreateUploadRequestInput,
  ): Promise<SignedUploadRequest>;
  headObject(key: string): Promise<StoredObjectMetadata | null>;
  deleteObject(key: string): Promise<void>;
  createReadUrl(key: string, expiresInSeconds: number): Promise<SignedReadUrl>;
}
