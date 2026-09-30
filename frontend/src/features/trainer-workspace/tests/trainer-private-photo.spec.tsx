import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrainerPrivatePhoto } from '@/features/trainer-workspace/components/trainer-private-photo';

class NeverIntersectingObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}

describe('TrainerPrivatePhoto', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', NeverIntersectingObserver);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a still frame instead of a loading skeleton before it nears the viewport', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <TrainerPrivatePhoto clientId="client-1" photoId="photo-1" label="Front photo" />
      </QueryClientProvider>,
    );

    expect(screen.getByRole('img', { name: 'Front photo' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(document.querySelector('.animate-pulse')).toBeNull();
  });
});
