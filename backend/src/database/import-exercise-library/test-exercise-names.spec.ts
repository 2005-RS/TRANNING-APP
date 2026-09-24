import { isDisposableTestExerciseName } from './test-exercise-names';

describe('test-exercise-names', () => {
  it('flags obvious development names and leaves product names', () => {
    expect(isDisposableTestExerciseName('MinIO Live Verify Bench')).toBe(true);
    expect(isDisposableTestExerciseName('Test squat')).toBe(true);
    expect(isDisposableTestExerciseName('E2E press')).toBe(true);
    expect(isDisposableTestExerciseName('Seed test row')).toBe(true);
    expect(isDisposableTestExerciseName('Upload verify clip')).toBe(true);
    expect(isDisposableTestExerciseName('Barbell Bench Press')).toBe(false);
    expect(isDisposableTestExerciseName('Lat Pulldown')).toBe(false);
  });
});
