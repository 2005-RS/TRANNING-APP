import { hasSubstantiveCheckInResponse } from './check-in-responses.util';
import { optionalPlainText } from './check-in-text.util';

describe('check-in response helpers', () => {
  const empty = {
    sleepQuality: null,
    energyLevel: null,
    stressLevel: null,
    hungerLevel: null,
    recoveryLevel: null,
    trainingAdherencePct: null,
    nutritionAdherencePct: null,
    wins: null,
    challenges: null,
    generalNotes: null,
  };

  it('treats empty drafts as not substantive', () => {
    expect(hasSubstantiveCheckInResponse(empty)).toBe(false);
  });

  it('treats zero adherence as substantive', () => {
    expect(
      hasSubstantiveCheckInResponse({ ...empty, trainingAdherencePct: 0 }),
    ).toBe(true);
  });

  it('does not treat whitespace-only notes as a response', () => {
    expect(optionalPlainText('     ')).toBeNull();
    expect(
      hasSubstantiveCheckInResponse({
        ...empty,
        wins: optionalPlainText('     '),
      }),
    ).toBe(false);
  });

  it('preserves internal paragraph whitespace', () => {
    expect(optionalPlainText('  Line one\n\nLine two  ')).toBe(
      'Line one\n\nLine two',
    );
  });
});
