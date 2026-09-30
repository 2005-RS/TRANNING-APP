import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrivateProgressPhoto } from '@/features/client-body/components/private-progress-photo';

class NeverIntersectingObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}

describe('PrivateProgressPhoto', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', NeverIntersectingObserver);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a still frame instead of a loading skeleton before it nears the viewport', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PrivateProgressPhoto photoId="photo-1" label="Front photo" />
      </QueryClientProvider>,
    );

    expect(screen.getByRole('img', { name: 'Front photo' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(document.querySelector('.animate-pulse')).toBeNull();
  });
});
