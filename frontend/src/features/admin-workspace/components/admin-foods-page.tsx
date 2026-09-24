import { useState } from 'react';
import { Archive, ChevronLeft, Edit, Plus, RotateCcw } from 'lucide-react';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CreateNutritionFoodDto, NutritionFoodResponseDto, UpdateNutritionFoodDto } from '@/generated/models';
import { UpdateNutritionFoodStatusDtoStatus } from '@/generated/models';
import {
  getNutritionFoodsGetByIdQueryKey,
  getNutritionFoodsListQueryKey,
  useNutritionFoodsCreate,
  useNutritionFoodsGetById,
  useNutritionFoodsList,
  useNutritionFoodsUpdate,
  useNutritionFoodsUpdateStatus,
} from '@/generated/nutrition-foods/nutrition-foods';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { useAdminWorkspaceCopy } from '@/features/admin-workspace/copy';
import { ConfirmSheet } from '@/features/admin-workspace/components/confirm-sheet';
import { AdminFormSheet, FormTextField } from '@/features/admin-workspace/components/admin-form';
import {
  AdminErrorState,
  AdminField,
  AdminListEmptyState,
  AdminListSkeleton,
  AdminPageScaffold,
  AdminPageSkeleton,
  AdminStatusBadge,
  AdminSurface,
  AdminTableSurface,
  Detail,
  NativeSelect,
  PaginationBar,
  SearchInput,
} from '@/features/admin-workspace/components/admin-primitives';
import { adminBackLinkClassName } from '@/features/admin-workspace/lib/ui';
import { adminMutationError } from '@/features/admin-workspace/lib/errors';
import { displayDateTime, numberText, optionalText, parseNumberInput } from '@/features/admin-workspace/lib/formatters';
import { foodFormSchema } from '@/features/admin-workspace/lib/schemas';
import { PAGE_SIZE } from '@/features/admin-workspace/lib/search';
import { asOpenApiField } from '@/features/trainer-workspace/lib/openapi-field';
import { Button } from '@/shared/ui/button';

const STALE_TIME_MS = 60_000;

export function AdminFoodsPage() {
  const copy = useAdminWorkspaceCopy();
  const navigate = useNavigate({ from: '/admin/foods' });
  const search = useSearch({ from: '/admin/foods' });
  const [draftSearch, setDraftSearch] = useState(search.search ?? '');
  const [creating, setCreating] = useState(false);
  const query = useNutritionFoodsList(
    { page: search.page ?? 1, limit: PAGE_SIZE, search: search.search, status: search.status },
    { query: { staleTime: STALE_TIME_MS, refetchOnWindowFocus: false } },
  );
  const filtered = Boolean(search.search || search.status);
  const g = copy.foods.grams;

  function clearFilters() {
    setDraftSearch('');
    void navigate({ search: {}, replace: true });
  }

  return (
    <AdminPageScaffold
      title={copy.foods.title}
      description={copy.foods.description}
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden />
          {copy.foods.newFood}
        </Button>
      }
    >
      <form
        role="search"
        className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[1fr_12rem_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void navigate({ search: { ...search, search: draftSearch.trim() || undefined, page: undefined }, replace: true });
        }}
      >
        <SearchInput
          label={copy.foods.searchLabel}
          value={draftSearch}
          placeholder={copy.common.searchPlaceholder}
          onChange={setDraftSearch}
        />
        <AdminField label={copy.common.status}>
          <NativeSelect
            value={search.status === 'ARCHIVED' ? 'ARCHIVED' : ''}
            onChange={(event) => {
              const status = event.target.value === 'ARCHIVED' ? ('ARCHIVED' as const) : undefined;
              void navigate({ search: { ...search, status, page: undefined }, replace: true });
            }}
          >
            <option value="">{copy.status.ACTIVE}</option>
            <option value="ARCHIVED">{copy.status.ARCHIVED}</option>
          </NativeSelect>
        </AdminField>
        <div className="flex flex-wrap items-end gap-2">
          <Button type="submit">{copy.search}</Button>
          {filtered ? (
            <Button type="button" variant="outline" onClick={clearFilters}>
              {copy.clearFilters}
            </Button>
          ) : null}
        </div>
      </form>

      {query.isPending ? (
        <AdminListSkeleton label={copy.foods.loadingLabel} />
      ) : query.isError || !query.data ? (
        <AdminErrorState
          inline
          error={query.error}
          retrying={query.isFetching}
          onRetry={() => {
            if (!query.isFetching) {
              void query.refetch();
            }
          }}
        />
      ) : query.data.data.length === 0 ? (
        <AdminListEmptyState
          filtered={filtered}
          emptyTitle={copy.foods.emptyTitle}
          emptyBody={copy.foods.emptyBody}
          onClearFilters={clearFilters}
          emptyActions={<Button onClick={() => setCreating(true)}>{copy.foods.newFood}</Button>}
        />
      ) : (
        <>
          <AdminTableSurface>
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                {copy.foods.title}. {copy.foods.per100Hint}
              </caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-medium">{copy.common.name}</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    <abbr title={copy.foods.calories} className="no-underline">{copy.foods.kcal}</abbr>
                  </th>
                  <th scope="col" className="hidden px-4 py-3 text-right font-medium md:table-cell">{copy.foods.protein}</th>
                  <th scope="col" className="hidden px-4 py-3 text-right font-medium md:table-cell">{copy.foods.carbs}</th>
                  <th scope="col" className="hidden px-4 py-3 text-right font-medium md:table-cell">{copy.foods.fat}</th>
                  <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">{copy.common.status}</th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((food) => (
                  <tr key={food.id} className="border-b border-border/70 last:border-0 hover:bg-muted/40">
                    <td className="max-w-0 px-4 py-3">
                      <Link
                        to="/admin/foods/$foodId"
                        params={{ foodId: food.id }}
                        className="block truncate font-medium text-foreground underline-offset-4 hover:underline focus-visible:underline"
                      >
                        {food.name}
                      </Link>
                      <span className="block truncate text-xs text-muted-foreground">
                        {optionalText(food.brand, copy.notSet)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {numberText(food.nutritionPer100g.caloriesKcal)}
                    </td>
                    <td className="hidden px-4 py-3 text-right font-mono tabular-nums md:table-cell">
                      {numberText(food.nutritionPer100g.proteinG)} {g}
                    </td>
                    <td className="hidden px-4 py-3 text-right font-mono tabular-nums md:table-cell">
                      {numberText(food.nutritionPer100g.carbohydratesG)} {g}
                    </td>
                    <td className="hidden px-4 py-3 text-right font-mono tabular-nums md:table-cell">
                      {numberText(food.nutritionPer100g.fatG)} {g}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <AdminStatusBadge status={food.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableSurface>
          <p className="text-xs text-muted-foreground">{copy.foods.per100Hint}</p>
          <PaginationBar
            meta={query.data.meta}
            onPage={(page) => void navigate({ search: { ...search, page }, replace: true })}
          />
        </>
      )}
      <FoodSheet open={creating} onOpenChange={setCreating} mode="create" />
    </AdminPageScaffold>
  );
}

export function AdminFoodDetailPage() {
  const copy = useAdminWorkspaceCopy();
  const queryClient = useQueryClient();
  const { user } = useAuthSession();
  const { foodId } = useParams({ from: '/admin/foods/$foodId' });
  const query = useNutritionFoodsGetById(foodId, { query: { staleTime: STALE_TIME_MS, refetchOnWindowFocus: false } });
  const statusMutation = useNutritionFoodsUpdateStatus();
  const [editing, setEditing] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  if (query.isPending) {
    return <AdminPageSkeleton label={copy.foods.loadingLabel} />;
  }
  if (query.isError || !query.data) {
    return (
      <AdminErrorState
        error={query.error}
        retrying={query.isFetching}
        onRetry={() => {
          if (!query.isFetching) {
            void query.refetch();
          }
        }}
      />
    );
  }

  const food = query.data;
  const archived = food.status === 'ARCHIVED';
  const g = copy.foods.grams;
  const nutrition = food.nutritionPer100g;

  async function updateStatus() {
    if (statusMutation.isPending) {
      return;
    }
    setStatusError(null);
    try {
      await statusMutation.mutateAsync({
        foodId: food.id,
        data: { status: archived ? UpdateNutritionFoodStatusDtoStatus.ACTIVE : UpdateNutritionFoodStatusDtoStatus.ARCHIVED },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getNutritionFoodsListQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getNutritionFoodsGetByIdQueryKey(food.id) }),
      ]);
      setConfirmStatus(false);
      toast.success(copy.foods.statusToast);
    } catch (err) {
      setStatusError(adminMutationError(err, 'food', copy));
    }
  }

  return (
    <AdminPageScaffold
      title={food.name}
      description={food.brand ?? undefined}
      meta={<AdminStatusBadge status={food.status} />}
      backLink={
        <Link to="/admin/foods" className={adminBackLinkClassName}>
          <ChevronLeft className="size-4" aria-hidden />
          {copy.foods.backToList}
        </Link>
      }
      actions={
        <>
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Edit className="size-4" aria-hidden />
            {copy.common.edit}
          </Button>
          <Button
            variant={archived ? 'default' : 'outline'}
            onClick={() => {
              setStatusError(null);
              setConfirmStatus(true);
            }}
          >
            {archived ? <RotateCcw className="size-4" aria-hidden /> : <Archive className="size-4" aria-hidden />}
            {archived ? copy.common.activate : copy.common.archive}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <AdminSurface aria-labelledby="food-nutrition-heading">
          <h2 id="food-nutrition-heading" className="text-base font-semibold tracking-tight">
            {copy.foods.per100}
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Macro label={copy.foods.calories} value={`${numberText(nutrition.caloriesKcal)} ${copy.foods.kcal}`} />
            <Macro label={copy.foods.protein} value={`${numberText(nutrition.proteinG)} ${g}`} />
            <Macro label={copy.foods.carbs} value={`${numberText(nutrition.carbohydratesG)} ${g}`} />
            <Macro label={copy.foods.fat} value={`${numberText(nutrition.fatG)} ${g}`} />
            <Macro
              label={copy.foods.fiber}
              value={nutrition.fiberG == null ? copy.notSet : `${numberText(nutrition.fiberG)} ${g}`}
            />
          </dl>
        </AdminSurface>
        <AdminSurface aria-labelledby="food-detail-heading">
          <h2 id="food-detail-heading" className="text-base font-semibold tracking-tight">
            {copy.foods.detailTitle}
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail label={copy.foods.brand} value={optionalText(food.brand, copy.notSet)} />
            <Detail
              label={copy.exercises.source}
              value={user?.id === food.createdByUserId ? copy.exercises.createdByYou : copy.exercises.createdByOther}
            />
            <Detail
              className="sm:col-span-2"
              label={copy.foods.descriptionLabel}
              value={optionalText(food.description, copy.notSet)}
            />
            <Detail label={copy.common.created} value={displayDateTime(food.createdAt)} />
            <Detail label={copy.common.updated} value={displayDateTime(food.updatedAt)} />
          </dl>
        </AdminSurface>
      </div>
      <FoodSheet open={editing} onOpenChange={setEditing} mode="edit" food={food} />
      <ConfirmSheet
        open={confirmStatus}
        onOpenChange={setConfirmStatus}
        title={archived ? copy.foods.activateTitle : copy.foods.archiveTitle}
        description={archived ? copy.foods.activateBody : copy.foods.archiveBody}
        confirmLabel={archived ? copy.common.activate : copy.common.archive}
        pendingLabel={copy.saving}
        cancelLabel={copy.cancel}
        pending={statusMutation.isPending}
        danger={!archived}
        error={statusError}
        onConfirm={() => void updateStatus()}
      />
    </AdminPageScaffold>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function numberDefault(value: number | null | undefined) {
  return value == null ? '' : String(value);
}

function foodDefaults(food?: NutritionFoodResponseDto) {
  return {
    name: food?.name ?? '',
    brand: food?.brand ?? '',
    description: food?.description ?? '',
    caloriesPer100g: numberDefault(food?.nutritionPer100g.caloriesKcal),
    proteinGPer100g: numberDefault(food?.nutritionPer100g.proteinG),
    carbohydratesGPer100g: numberDefault(food?.nutritionPer100g.carbohydratesG),
    fatGPer100g: numberDefault(food?.nutritionPer100g.fatG),
    fiberGPer100g: numberDefault(food?.nutritionPer100g.fiberG),
  };
}

function FoodSheet({
  open,
  onOpenChange,
  mode,
  food,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  food?: NutritionFoodResponseDto;
}) {
  const copy = useAdminWorkspaceCopy();
  const queryClient = useQueryClient();
  const create = useNutritionFoodsCreate();
  const update = useNutritionFoodsUpdate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: foodDefaults(food),
    validators: { onSubmit: foodFormSchema(copy) },
    onSubmit: async ({ value }) => {
      setError(null);
      const calories = parseNumberInput(value.caloriesPer100g) ?? 0;
      const protein = parseNumberInput(value.proteinGPer100g) ?? 0;
      const carbs = parseNumberInput(value.carbohydratesGPer100g) ?? 0;
      const fat = parseNumberInput(value.fatGPer100g) ?? 0;
      const fiber = parseNumberInput(value.fiberGPer100g);
      const brand = value.brand.trim();
      const description = value.description.trim();
      try {
        if (mode === 'create') {
          const data: CreateNutritionFoodDto = {
            name: value.name.trim(),
            brand: asOpenApiField<CreateNutritionFoodDto['brand']>(brand || undefined),
            description: asOpenApiField<CreateNutritionFoodDto['description']>(description || undefined),
            caloriesPer100g: calories,
            proteinGPer100g: protein,
            carbohydratesGPer100g: carbs,
            fatGPer100g: fat,
            fiberGPer100g: asOpenApiField<CreateNutritionFoodDto['fiberGPer100g']>(fiber),
          };
          await create.mutateAsync({ data });
          toast.success(copy.foods.createdToast);
        } else if (food) {
          const data: UpdateNutritionFoodDto = {
            name: value.name.trim(),
            brand: asOpenApiField<UpdateNutritionFoodDto['brand']>(brand || null),
            description: asOpenApiField<UpdateNutritionFoodDto['description']>(description || null),
            caloriesPer100g: calories,
            proteinGPer100g: protein,
            carbohydratesGPer100g: carbs,
            fatGPer100g: fat,
            fiberGPer100g: asOpenApiField<UpdateNutritionFoodDto['fiberGPer100g']>(fiber ?? null),
          };
          await update.mutateAsync({ foodId: food.id, data });
          await queryClient.invalidateQueries({ queryKey: getNutritionFoodsGetByIdQueryKey(food.id) });
          toast.success(copy.foods.savedToast);
        }
        await queryClient.invalidateQueries({ queryKey: getNutritionFoodsListQueryKey() });
        form.reset();
        onOpenChange(false);
      } catch (err) {
        setError(adminMutationError(err, 'food', copy));
      }
    },
  });

  const numberInput = { inputMode: 'decimal' as const, autoComplete: 'off' };

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(submitting) => (
        <AdminFormSheet
          open={open}
          onOpenChange={(next) => {
            if (!next) {
              form.reset();
              setError(null);
            }
            onOpenChange(next);
          }}
          title={mode === 'create' ? copy.foods.newFood : copy.foods.editFood}
          description={copy.foods.description}
          error={error}
          submitting={submitting}
          submitLabel={mode === 'create' ? copy.create : copy.save}
          submittingLabel={mode === 'create' ? copy.creating : copy.saving}
          onSubmit={() => void form.handleSubmit()}
        >
          <form.Field name="name">
            {(field) => <FormTextField field={field} id={`food-${mode}-name`} label={copy.common.name} autoComplete="off" />}
          </form.Field>
          <form.Field name="brand">
            {(field) => <FormTextField field={field} id={`food-${mode}-brand`} label={copy.foods.brand} optional />}
          </form.Field>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">{copy.foods.per100}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <form.Field name="caloriesPer100g">
                {(field) => (
                  <FormTextField
                    field={field}
                    id={`food-${mode}-calories`}
                    label={`${copy.foods.calories} (${copy.foods.kcal})`}
                    {...numberInput}
                  />
                )}
              </form.Field>
              <form.Field name="proteinGPer100g">
                {(field) => (
                  <FormTextField
                    field={field}
                    id={`food-${mode}-protein`}
                    label={`${copy.foods.protein} (${copy.foods.grams})`}
                    {...numberInput}
                  />
                )}
              </form.Field>
              <form.Field name="carbohydratesGPer100g">
                {(field) => (
                  <FormTextField
                    field={field}
                    id={`food-${mode}-carbs`}
                    label={`${copy.foods.carbs} (${copy.foods.grams})`}
                    {...numberInput}
                  />
                )}
              </form.Field>
              <form.Field name="fatGPer100g">
                {(field) => (
                  <FormTextField
                    field={field}
                    id={`food-${mode}-fat`}
                    label={`${copy.foods.fat} (${copy.foods.grams})`}
                    {...numberInput}
                  />
                )}
              </form.Field>
              <form.Field name="fiberGPer100g">
                {(field) => (
                  <FormTextField
                    field={field}
                    id={`food-${mode}-fiber`}
                    label={`${copy.foods.fiber} (${copy.foods.grams})`}
                    optional
                    {...numberInput}
                  />
                )}
              </form.Field>
            </div>
          </fieldset>
          <form.Field name="description">
            {(field) => (
              <FormTextField
                field={field}
                id={`food-${mode}-description`}
                label={copy.foods.descriptionLabel}
                optional
                multiline
              />
            )}
          </form.Field>
        </AdminFormSheet>
      )}
    </form.Subscribe>
  );
}
