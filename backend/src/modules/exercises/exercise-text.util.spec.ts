import { normalizeExerciseName, optionalPlainText } from './exercise-text.util';

describe('exercise text helpers', () => {
  it('trims and collapses internal whitespace without changing case', () => {
    expect(normalizeExerciseName('  Barbell   Bench Press  ')).toBe(
      'Barbell Bench Press',
    );
  });

  it('treats blank optional text as null and preserves inner line breaks', () => {
    expect(optionalPlainText('   ')).toBeNull();
    expect(optionalPlainText('Stand tall.\nLower under control.')).toBe(
      'Stand tall.\nLower under control.',
    );
  });
});
