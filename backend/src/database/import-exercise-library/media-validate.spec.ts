import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  fakeMp4Fixture,
  looksLikeMp4,
  validateVitalAnimation,
} from './media-validate';

describe('media-validate', () => {
  it('accepts MP4 magic bytes and rejects invalid files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vital-media-'));
    const validPath = join(dir, 'bench.mp4');
    const invalidPath = join(dir, 'notes.txt');
    const valid = fakeMp4Fixture();
    writeFileSync(validPath, valid);
    writeFileSync(invalidPath, 'not a video');

    expect(looksLikeMp4(valid)).toBe(true);
    expect(validateVitalAnimation(validPath, valid)).toEqual({
      ok: true,
      sizeBytes: valid.length,
      mimeType: 'video/mp4',
    });
    expect(
      validateVitalAnimation(invalidPath, Buffer.from('not a video')).ok,
    ).toBe(false);
    expect(
      validateVitalAnimation(join(dir, 'missing.mp4'), Buffer.alloc(0)).ok,
    ).toBe(false);
  });
});
