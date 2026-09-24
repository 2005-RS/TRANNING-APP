import {
  normalizeTemplateName,
  optionalPlainText,
} from './workout-template-text.util';

describe('workout template text helpers', () => {
  it('trims and collapses internal whitespace without changing case', () => {
    expect(normalizeTemplateName('  Push   Day  ')).toBe('Push Day');
    expect(normalizeTemplateName('Lower Body Strength')).toBe(
      'Lower Body Strength',
    );
  });

  it('treats blank optional text as null', () => {
    expect(optionalPlainText('   ')).toBeNull();
    expect(optionalPlainText(undefined)).toBeNull();
    expect(optionalPlainText('Pause briefly at the bottom.')).toBe(
      'Pause briefly at the bottom.',
    );
  });
});
