import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AmbientField } from '@/shared/ui/ambient-field';

describe('AmbientField', () => {
  it('shows only the hidden CSS atmosphere when the browser has no WebGL', () => {
    const { container } = render(<AmbientField preset="home" />);

    const field = container.querySelector('[data-slot="ambient-field"]');
    expect(field).toHaveAttribute('aria-hidden', 'true');
    expect(field?.querySelector('.login-hero-atmosphere')).not.toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
  });
});
