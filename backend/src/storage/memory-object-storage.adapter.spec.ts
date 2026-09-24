import { MemoryObjectStorageAdapter } from './memory-object-storage.adapter';

describe('MemoryObjectStorageAdapter', () => {
  it('signs an upload without persisting an object', async () => {
    const storage = new MemoryObjectStorageAdapter();
    const signed = await storage.createUploadRequest({
      key: 'exercises/ex/media/file.mp4',
      contentType: 'video/mp4',
      maxBytes: 1024,
      expiresInSeconds: 60,
    });

    expect(signed.method).toBe('POST');
    expect(signed.fields.key).toBe('exercises/ex/media/file.mp4');
    expect(await storage.headObject('exercises/ex/media/file.mp4')).toBeNull();
  });

  it('stores, heads, signs a read URL, and deletes objects', async () => {
    const storage = new MemoryObjectStorageAdapter();
    await storage.putObject({
      key: 'exercises/ex/media/file.mp4',
      contentType: 'video/mp4',
      contentLength: 512,
    });

    await expect(
      storage.headObject('exercises/ex/media/file.mp4'),
    ).resolves.toEqual({
      key: 'exercises/ex/media/file.mp4',
      contentType: 'video/mp4',
      contentLength: 512,
    });

    const read = await storage.createReadUrl(
      'exercises/ex/media/file.mp4',
      120,
    );
    expect(read.url).toContain('file.mp4');
    expect(read.expiresAt.getTime()).toBeGreaterThan(Date.now());

    await storage.deleteObject('exercises/ex/media/file.mp4');
    await expect(
      storage.headObject('exercises/ex/media/file.mp4'),
    ).resolves.toBeNull();
  });
});
