import { describe, expect, it } from 'vitest';
import { pickReadyDemonstration } from '@/features/exercise-demo/demo-media';

describe('pickReadyDemonstration', () => {
  it('prefers READY video over images and ignores pending media', () => {
    expect(
      pickReadyDemonstration([
        { status: 'PENDING_UPLOAD', mediaType: 'VIDEO', displayOrder: 0 },
        { status: 'READY', mediaType: 'IMAGE', displayOrder: 0 },
        { status: 'READY', mediaType: 'VIDEO', displayOrder: 2 },
        { status: 'READY', mediaType: 'VIDEO', displayOrder: 1 },
      ])?.displayOrder,
    ).toBe(1);
    expect(pickReadyDemonstration(undefined)).toBeNull();
  });
});
