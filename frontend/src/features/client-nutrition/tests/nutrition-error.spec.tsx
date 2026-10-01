import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NutritionError } from '@/features/client-nutrition/components/nutrition-error';
import { clientNutritionCopy } from '@/features/client-nutrition/copy';
import { NetworkError } from '@/shared/errors/api-error';

describe('NutritionError', () => {
  it('uses the nutrition copy when the request never reached the server', () => {
    render(<NutritionError error={new NetworkError()} onRetry={vi.fn()} retrying={false} />);

    expect(screen.getByText(clientNutritionCopy.error.network)).toBeInTheDocument();
  });

  it('keeps the shared description for other failures', () => {
    render(<NutritionError error={new Error('boom')} onRetry={vi.fn()} retrying={false} />);

    expect(screen.queryByText(clientNutritionCopy.error.network)).not.toBeInTheDocument();
  });
});
