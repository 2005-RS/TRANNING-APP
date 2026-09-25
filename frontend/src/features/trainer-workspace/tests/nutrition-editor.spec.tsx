import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { TestProviders } from '@/features/auth/tests/render';
import { authServer, resetAuthMockState } from '@/features/auth/tests/msw-server';
import { trainerA } from '@/features/auth/tests/fixtures';
import { resetAuthBootstrap } from '@/features/auth/lib/session-service';
import { clearAccessToken } from '@/shared/lib/access-token';
import { NutritionMealEditor } from '../components/nutrition-meal-editor';
import { NutritionFoodSearch } from '../components/nutrition-food-search';
import { trainerWorkspaceCopy } from '../copy';
import { catalogFood, draftNutritionPlan } from './fixtures';
import { resetTrainerMockState } from './msw-trainer';
import type { ReplaceNutritionPlanMealsDto } from '@/generated/models';

const copy = trainerWorkspaceCopy.nutrition;
const api = 'http://localhost:3000/api/v1';

describe('Nutrition meal editor', () => {
  beforeEach(() => {
    authServer.listen({ onUnhandledRequest: 'error' });
    resetAuthMockState();
    resetTrainerMockState();
    resetAuthBootstrap();
    clearAccessToken();
  });
  afterEach(() => {
    authServer.resetHandlers();
    authServer.close();
    resetAuthBootstrap();
    clearAccessToken();
  });

  it('keeps focus while naming a meal, validates an empty meal, and saves decimal portions and notes', async () => {
    const user = userEvent.setup();
    const dirty = vi.fn();
    let body: ReplaceNutritionPlanMealsDto | undefined;
    authServer.use(
      http.get(`${api}/nutrition/foods`, () => HttpResponse.json({ data: [catalogFood], meta: { page: 1, limit: 10, totalPages: 1, totalItems: 1 } })),
      http.put(`${api}/clients/:clientId/nutrition-plans/:planId/meals`, async ({ request }) => {
        body = await request.json() as ReplaceNutritionPlanMealsDto;
        return HttpResponse.json({
          ...draftNutritionPlan,
          meals: [{
            id: 'meal-saved',
            name: body.meals[0]?.name ?? 'Meal',
            mealType: body.meals[0]?.mealType ?? 'OTHER',
            position: 0,
            notes: body.meals[0]?.notes ?? null,
            totals: draftNutritionPlan.mealPlanTotals,
            items: (body.meals[0]?.items ?? []).map((item, index) => ({
              id: `item-saved-${index}`,
              foodId: item.foodId,
              foodName: catalogFood.name,
              brand: null,
              quantityGrams: item.quantityGrams,
              nutrition: catalogFood.nutritionPer100g,
              position: index,
              notes: item.notes ?? null,
            })),
          }],
        });
      }),
    );
    render(<TestProviders status="AUTHENTICATED" user={trainerA}><NutritionMealEditor plan={draftNutritionPlan} clientId={draftNutritionPlan.clientProfileId} onDirtyChange={dirty} /></TestProviders>);
    await user.click(screen.getByRole('button', { name: copy.addMeal }));
    const name = screen.getByLabelText(copy.mealName);
    await user.clear(name);
    await user.type(name, 'Breakfast plate');
    expect(name).toHaveValue('Breakfast plate');
    expect(name).toHaveFocus();
    await user.click(screen.getByRole('button', { name: copy.saveMeals }));
    expect(await screen.findByRole('alert')).toHaveTextContent(copy.invalidMeals);
    expect(body).toBeUndefined();
    await user.click(screen.getByRole('button', { name: copy.chooseFood }));
    await user.click(await screen.findByRole('button', { name: `${copy.addItem}: ${catalogFood.name}` }));
    const quantity = screen.getByLabelText(copy.quantity);
    await user.clear(quantity);
    await user.type(quantity, '125,25');
    await user.type(screen.getAllByLabelText(copy.notes)[0]!, 'Weigh after cooking');
    await user.click(screen.getByRole('button', { name: copy.saveMeals }));
    await waitFor(() => expect(body?.meals[0]?.items[0]?.quantityGrams).toBe(125.25));
    expect(body?.meals[0]?.items[0]?.notes).toBe('Weigh after cooking');
    expect(body?.meals[0]?.name).toBe('Breakfast plate');
    expect(dirty).toHaveBeenLastCalledWith(false);
  });

  it('rejects zero portions and permits undoing local removal', async () => {
    const user = userEvent.setup();
    const plan = { ...draftNutritionPlan, meals: [{
      id: 'meal-one', name: 'Dinner', mealType: 'DINNER' as const, position: 0,
      totals: draftNutritionPlan.mealPlanTotals,
      items: [{ id: 'item-one', foodId: catalogFood.id, foodName: 'Historical food name', quantityGrams: 120, position: 0, nutrition: catalogFood.nutritionPer100g }],
    }] };
    render(<TestProviders status="AUTHENTICATED" user={trainerA}><NutritionMealEditor plan={plan} clientId={plan.clientProfileId} onDirtyChange={vi.fn()} /></TestProviders>);
    const quantity = screen.getByLabelText(copy.quantity);
    await user.clear(quantity);
    await user.type(quantity, '0');
    expect(quantity).toHaveAttribute('aria-invalid', 'true');
    await user.click(screen.getByRole('button', { name: copy.saveMeals }));
    expect(await screen.findByRole('alert')).toHaveTextContent(copy.invalidMeals);
    await user.click(screen.getByRole('button', { name: `${copy.removeFood}: Historical food name` }));
    expect(screen.queryByText('Historical food name')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: copy.discard }));
    expect(screen.getByText('Historical food name')).toBeInTheDocument();
    expect(screen.getByLabelText(copy.quantity)).toHaveValue('120');
  });

  it('searches the server and reaches foods beyond the first page', async () => {
    const user = userEvent.setup();
    const select = vi.fn();
    const requests: URL[] = [];
    authServer.use(http.get(`${api}/nutrition/foods`, ({ request }) => {
      const url = new URL(request.url);
      requests.push(url);
      const page = Number(url.searchParams.get('page') ?? '1');
      return HttpResponse.json({ data: [{ ...catalogFood, name: page === 2 ? 'Second page oats' : 'First page oats' }], meta: { page, limit: 10, totalItems: 11, totalPages: 2 } });
    }));
    render(<TestProviders status="AUTHENTICATED" user={trainerA}><NutritionFoodSearch onSelect={select} /></TestProviders>);
    expect(await screen.findByText('First page oats')).toBeInTheDocument();
    await user.type(screen.getByLabelText(copy.searchFoods), 'oats');
    await user.click(screen.getByRole('button', { name: trainerWorkspaceCopy.search }));
    await waitFor(() => expect(requests.at(-1)?.searchParams.get('search')).toBe('oats'));
    await user.click(screen.getByRole('button', { name: trainerWorkspaceCopy.next }));
    await user.click(await screen.findByRole('button', { name: `${copy.addItem}: Second page oats` }));
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ name: 'Second page oats' }));
    expect(requests.at(-1)?.searchParams.get('page')).toBe('2');
  });
});
