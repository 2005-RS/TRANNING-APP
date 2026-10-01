import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from '@/app/app-error-boundary';
import { navigationCopy } from '@/features/navigation/copy';

function Broken(): never {
  throw new Error('provider failed');
}

describe('AppErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('replaces a blank page with a reload prompt when something outside the router throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <AppErrorBoundary>
        <Broken />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: navigationCopy.routeErrorTitle })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: navigationCopy.reload })).toBeInTheDocument();
  });

  it('renders its children when nothing fails', () => {
    render(
      <AppErrorBoundary>
        <p>App</p>
      </AppErrorBoundary>,
    );

    expect(screen.getByText('App')).toBeInTheDocument();
  });
});
