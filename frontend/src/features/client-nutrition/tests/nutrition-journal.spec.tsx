import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestApp } from '@/features/auth/tests/render';
import { clientA } from '@/features/auth/tests/fixtures';
import { authServer, resetAuthMockState } from '@/features/auth/tests/msw-server';
import { resetAuthBootstrap } from '@/features/auth/lib/session-service';
import { clearAccessToken } from '@/shared/lib/access-token';
import { clientNutritionCopy } from '@/features/client-nutrition/copy';
import { localIsoDate } from '@/features/client-nutrition/lib/journal-date';
import {
  EGG_PORTION_ID,
  eggFood,
  journalMockState,
  OATS_ITEM_ID,
  resetJournalMockState,
} from '@/features/client-nutrition/tests/msw-journal';

const timeout = 6000;
const copy = clientNutritionCopy;

function renderAt(entry: string) {
  return render(<TestApp initialEntry={entry} status="AUTHENTICATED" user={clientA} />);
}

describe('Client nutrition journal', { timeout: 20_000 }, () => {
  beforeEach(() => {
    authServer.listen({ onUnhandledRequest: 'error' });
    resetAuthMockState();
    resetJournalMockState();
    resetAuthBootstrap();
    clearAccessToken();
  });

  afterEach(() => {
    authServer.resetHandlers();
    authServer.close();
    resetAuthBootstrap();
    clearAccessToken();
  });

  it('shows today against the coach target, all meals, and logs a prescribed item', async () => {
    const user = userEvent.setup();
    renderAt('/client/nutrition');

    expect(await screen.findByText(copy.journal.today, undefined, { timeout })).toBeInTheDocument();
    const meter = await screen.findByRole('meter', { name: copy.targets.calories }, { timeout });
    expect(meter).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText(copy.journal.targetFromCoach)).toBeInTheDocument();
    for (const type of ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'OTHER'] as const) {
      expect(screen.getByRole('heading', { name: copy.mealType[type] })).toBeInTheDocument();
    }

    await user.click(screen.getByRole('button', { name: `${copy.journal.markEaten}: Oats` }));
    expect(journalMockState.lastPlannedAction).toBe(`eaten:${OATS_ITEM_ID}`);
    const breakfast = screen.getByRole('region', { name: copy.mealType.BREAKFAST });
    expect(await within(breakfast).findByText(copy.journal.statusEaten)).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: copy.targets.calories })).toHaveAttribute(
      'aria-valuenow',
      '311',
    );

    await user.click(screen.getByRole('button', { name: `${copy.journal.skip}: Chicken breast` }));
    const lunch = screen.getByRole('region', { name: copy.mealType.LUNCH });
    expect(await within(lunch).findByText(copy.journal.statusSkipped)).toBeInTheDocument();
    await user.click(within(lunch).getByRole('button', { name: `${copy.journal.undo}: Chicken breast` }));
    expect(
      await within(lunch).findByRole('button', { name: `${copy.journal.markEaten}: Chicken breast` }),
    ).toBeInTheDocument();
  });

  it('opens the add-food sheet with database, barcode and a disabled photo option', async () => {
    const user = userEvent.setup();
    renderAt('/client/nutrition');

    await user.click(
      await screen.findByRole('button', { name: copy.journal.addFood }, { timeout }),
    );
    const dialog = await screen.findByRole('dialog', { name: copy.addSheet.title });
    expect(within(dialog).getByRole('link', { name: new RegExp(copy.addSheet.database) })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: new RegExp(copy.addSheet.barcode) })).toBeInTheDocument();
    // U3: the photo option is visible but not actionable.
    expect(within(dialog).getByText(copy.addSheet.photo).closest('[aria-disabled]')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('searches foods and logs two portions of a food', async () => {
    const user = userEvent.setup();
    const date = localIsoDate();
    renderAt(`/client/nutrition/add?meal=SNACK&date=${date}`);

    const row = await screen.findByRole('link', { name: /Huevo entero/ }, { timeout });
    expect(within(row).getByText(/71.5 kcal/)).toBeInTheDocument();
    await user.click(row);

    expect(await screen.findByRole('heading', { name: 'Huevo entero' }, { timeout })).toBeInTheDocument();
    // Original USDA name stays visible next to the display name (D3).
    expect(screen.getByText('Egg, whole, raw, fresh')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: copy.mealType.SNACK })).toBeChecked();
    expect(screen.getByRole('radio', { name: '1 egg' })).toBeChecked();
    // Unknown nutrients render as a dash, never as 0.
    const vitaminD = screen.getByText('Vitamin D').closest('div')!;
    expect(within(vitaminD).getByText(copy.food.unknown)).toBeInTheDocument();
    expect(screen.getByText(copy.food.sourceUsda)).toBeInTheDocument();

    const amount = screen.getByRole('textbox');
    await user.clear(amount);
    await user.type(amount, '2');
    expect(screen.getByText('143')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: copy.food.save }));

    expect(await screen.findByText(copy.journal.today, undefined, { timeout })).toBeInTheDocument();
    expect(journalMockState.lastEntryBody).toEqual({
      portionId: EGG_PORTION_ID,
      portionQuantity: 2,
      mealType: 'SNACK',
      foodId: eggFood.id,
    });
  });

  it('shows a clear message when a barcode is not found', async () => {
    const user = userEvent.setup();
    journalMockState.barcodeStatus = 404;
    renderAt('/client/nutrition/barcode');

    const input = await screen.findByLabelText(copy.barcode.manualLabel, undefined, { timeout });
    await user.type(input, '12');
    await user.click(screen.getByRole('button', { name: copy.barcode.lookup }));
    expect(await screen.findByText(copy.barcode.invalid)).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, '12345678');
    await user.click(screen.getByRole('button', { name: copy.barcode.lookup }));
    expect(await screen.findByText(copy.barcode.notFound, undefined, { timeout })).toBeInTheDocument();
  });
});
