import { statSync } from 'node:fs';
import { extname } from 'node:path';

export const VITAL_VIDEO_MIME = 'video/mp4';
export const VITAL_VIDEO_EXTENSION = '.mp4';
export const VITAL_MIN_BYTES = 32;
export const VITAL_MAX_BYTES = 262_144_000;

export type MediaValidationResult =
  | { ok: true; sizeBytes: number; mimeType: typeof VITAL_VIDEO_MIME }
  | { ok: false; reason: string };

export function looksLikeMp4(buffer: Buffer): boolean {
  if (buffer.length < 8) {
    return false;
  }
  return buffer.subarray(4, 8).toString('ascii') === 'ftyp';
}

export function validateVitalAnimation(
  filePath: string,
  buffer: Buffer,
): MediaValidationResult {
  const extension = extname(filePath).toLowerCase();
  if (extension !== VITAL_VIDEO_EXTENSION) {
    return {
      ok: false,
      reason: `unexpected extension ${extension || '(none)'}`,
    };
  }

  let sizeBytes = buffer.length;
  try {
    sizeBytes = statSync(filePath).size;
  } catch {
    return { ok: false, reason: 'file does not exist' };
  }

  if (sizeBytes < VITAL_MIN_BYTES) {
    return { ok: false, reason: 'file too small' };
  }
  if (sizeBytes > VITAL_MAX_BYTES) {
    return { ok: false, reason: 'file exceeds video size limit' };
  }
  if (!looksLikeMp4(buffer)) {
    return { ok: false, reason: 'content is not an MP4 (missing ftyp)' };
  }

  return { ok: true, sizeBytes, mimeType: VITAL_VIDEO_MIME };
}

export function fakeMp4Fixture(size = 64): Buffer {
  const buffer = Buffer.alloc(size);
  buffer.writeUInt32BE(size, 0);
  buffer.write('ftyp', 4, 'ascii');
  buffer.write('isom', 8, 'ascii');
  return buffer;
}
