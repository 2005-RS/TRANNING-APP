import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RouteErrorPage } from '@/app/shells/route-error-page';
import { navigationCopy } from '@/features/navigation/copy';

describe('RouteErrorPage', () => {
  it('shows a generic recovery screen and does not leak the thrown message', () => {
    render(
      <RouteErrorPage
        error={new Error('Bearer eyJhbGciOi.secret leaked from fetch')}
        reset={() => undefined}
      />,
    );

    expect(
      screen.getByRole('heading', { name: navigationCopy.routeErrorTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(navigationCopy.routeErrorBody)).toBeInTheDocument();
    expect(screen.queryByText(/Bearer /)).not.toBeInTheDocument();
    expect(screen.queryByText(/eyJhbGciOi/)).not.toBeInTheDocument();
  });
});
