import { isSocketOriginAllowed } from './socket-io.adapter';

describe('isSocketOriginAllowed', () => {
  const allowed = ['http://localhost:5173', 'https://app.example.com'];

  it('accepts configured origins', () => {
    expect(isSocketOriginAllowed('http://localhost:5173', allowed)).toBe(true);
  });

  it('rejects foreign browser origins', () => {
    expect(isSocketOriginAllowed('https://evil.example', allowed)).toBe(false);
    expect(isSocketOriginAllowed('http://localhost:3000', allowed)).toBe(false);
  });

  it('allows origin-less non-browser clients (they still need a token)', () => {
    expect(isSocketOriginAllowed(undefined, allowed)).toBe(true);
  });

  it('honours the development wildcard', () => {
    expect(isSocketOriginAllowed('http://anything:1', true)).toBe(true);
  });
});
