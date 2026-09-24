import {
  ObjectStorageService,
  PutTestObjectInput,
} from './object-storage.types';
import { MemoryObjectStorageAdapter } from './memory-object-storage.adapter';

export function asWritableTestStorage(
  storage: ObjectStorageService,
): MemoryObjectStorageAdapter {
  if (!(storage instanceof MemoryObjectStorageAdapter)) {
    throw new Error('Expected in-memory object storage for this test');
  }
  return storage;
}

export async function putTestObject(
  storage: ObjectStorageService,
  input: PutTestObjectInput,
): Promise<void> {
  await asWritableTestStorage(storage).putObject(input);
}
