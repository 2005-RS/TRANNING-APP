import type { SignedUploadInstructionsDto } from '@/generated/models';

function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined' &&
      error instanceof DOMException &&
      error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

/**
 * Direct object-storage POST. Do not send the API Bearer token or cookies.
 * S3 requires policy fields first and `file` last.
 */
export async function postSignedUpload(
  upload: SignedUploadInstructionsDto,
  file: File,
  options?: { signal?: AbortSignal },
): Promise<void> {
  const form = new FormData();
  for (const [key, value] of Object.entries(upload.fields)) {
    form.append(key, value);
  }
  form.append('file', file);

  try {
    const response = await fetch(upload.url, {
      method: upload.method || 'POST',
      body: form,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: options?.signal,
    });

    if (!response.ok) {
      throw new Error('UPLOAD_FAILED');
    }
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new Error('UPLOAD_FAILED');
  }
}

export { isAbortError };
