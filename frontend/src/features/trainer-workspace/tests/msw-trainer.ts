import { delay, http, HttpResponse } from 'msw';
import { jsonError } from '@/features/auth/tests/fixtures';
import {
  catalogExercise,
  catalogExerciseB,
  catalogFood,
  completedSession,
  draftNutritionPlan,
  draftTrainingPlan,
  draftTemplateDetail,
  emptyProgressSummary,
  emptyTrainerDashboard,
  measurementA,
  photoA,
  populatedDraftTemplate,
  populatedTrainerDashboard,
  readyExerciseImage,
  SIGNED_EXERCISE_MEDIA_URL,
  SIGNED_EXERCISE_STORAGE_URL,
  submittedCheckInDetail,
  templateDetail,
  templateSummary,
  templateSummaryB,
  toTemplateExerciseSummary,
  trainerClientA,
  trainerClientB,
  trainerOverviewA,
  trainerOverviewB,
  TRAINER_CLIENT_A_ID,
  TRAINER_CREATED_EXERCISE_ID,
  TRAINER_EXERCISE_ID,
  TRAINER_NUTRITION_PLAN_ID,
  TRAINER_UPLOADED_MEDIA_ID,
} from '@/features/trainer-workspace/tests/fixtures';
import type {
  CheckInResponseDto,
  ClientResponseDto,
  ExerciseMediaResponseDto,
  ExerciseResponseDto,
  NutritionPlanResponseDto,
  NutritionTotalsDto,
  ReplaceNutritionPlanMealsDto,
  ReplaceWorkoutTemplateExercisesDto,
  TrainerClientOverviewItemDto,
  TrainerDashboardResponseDto,
  TrainingPlanResponseDto,
  WorkoutTemplateExerciseInputDto,
  WorkoutTemplateExerciseResponseDto,
  WorkoutTemplateResponseDto,
  WorkoutTemplateSummaryResponseDto,
} from '@/generated/models';
import {
  CheckInResponseDtoStatus,
  ExerciseMediaResponseDtoMediaType,
  ExerciseMediaResponseDtoStatus,
  WorkoutTemplateExerciseResponseDtoPrescriptionType,
  WorkoutTemplateResponseDtoStatus,
} from '@/generated/models';

const API = 'http://localhost:3000/api/v1';

type TrainerMockState = {
  dashboard: TrainerDashboardResponseDto;
  clients: TrainerClientOverviewItemDto[];
  assigned: ClientResponseDto[];
  delayMs: number;
  failNetwork: boolean;
  dashboardStatus: number;
  clientsStatus: number;
  clientStatus: number;
  checkInStatus: number;
  photosStatus: number;
  checkIn: CheckInResponseDto;
  trainingPlan: TrainingPlanResponseDto;
  nutritionPlan: NutritionPlanResponseDto;
  lastReviewBody: unknown;
  lastNutritionCreate: unknown;
  lastNutritionReplace: ReplaceNutritionPlanMealsDto | null;
  lastTrainingCreate: unknown;
  lastTemplateCreate: unknown;
  lastTemplateReplace: ReplaceWorkoutTemplateExercisesDto | null;
  lastUploadRequest: Record<string, unknown> | null;
  lastStoragePosted: boolean;
  lastDeletedMediaId: string | null;
  failStorage: boolean;
  templates: WorkoutTemplateSummaryResponseDto[];
  template: WorkoutTemplateResponseDto;
  exercises: ExerciseResponseDto[];
  exerciseMedia: Record<string, ExerciseMediaResponseDto[]>;
};

export const trainerMockState: TrainerMockState = {
  dashboard: emptyTrainerDashboard,
  clients: [],
  assigned: [],
  delayMs: 0,
  failNetwork: false,
  dashboardStatus: 200,
  clientsStatus: 200,
  clientStatus: 200,
  checkInStatus: 200,
  photosStatus: 200,
  checkIn: structuredClone(submittedCheckInDetail),
  trainingPlan: structuredClone(draftTrainingPlan),
  nutritionPlan: structuredClone(draftNutritionPlan),
  lastReviewBody: null,
  lastNutritionCreate: null,
  lastNutritionReplace: null,
  lastTrainingCreate: null,
  lastTemplateCreate: null,
  lastTemplateReplace: null,
  lastUploadRequest: null,
  lastStoragePosted: false,
  lastDeletedMediaId: null,
  failStorage: false,
  templates: [],
  template: structuredClone(templateDetail),
  exercises: [catalogExercise],
  exerciseMedia: {},
};

export function resetTrainerMockState(): void {
  trainerMockState.dashboard = structuredClone(emptyTrainerDashboard);
  trainerMockState.clients = [];
  trainerMockState.assigned = [];
  trainerMockState.delayMs = 0;
  trainerMockState.failNetwork = false;
  trainerMockState.dashboardStatus = 200;
  trainerMockState.clientsStatus = 200;
  trainerMockState.clientStatus = 200;
  trainerMockState.checkInStatus = 200;
  trainerMockState.photosStatus = 200;
  trainerMockState.checkIn = structuredClone(submittedCheckInDetail);
  trainerMockState.trainingPlan = structuredClone(draftTrainingPlan);
  trainerMockState.nutritionPlan = structuredClone(draftNutritionPlan);
  trainerMockState.lastReviewBody = null;
  trainerMockState.lastNutritionCreate = null;
  trainerMockState.lastNutritionReplace = null;
  trainerMockState.lastTrainingCreate = null;
  trainerMockState.lastTemplateCreate = null;
  trainerMockState.lastTemplateReplace = null;
  trainerMockState.lastUploadRequest = null;
  trainerMockState.lastStoragePosted = false;
  trainerMockState.lastDeletedMediaId = null;
  trainerMockState.failStorage = false;
  trainerMockState.templates = [];
  trainerMockState.template = structuredClone(templateDetail);
  trainerMockState.exercises = [catalogExercise];
  trainerMockState.exerciseMedia = {};
}

export function usePopulatedTrainerWorkspace(): void {
  trainerMockState.dashboard = structuredClone(populatedTrainerDashboard);
  trainerMockState.clients = [trainerOverviewA, trainerOverviewB];
  trainerMockState.assigned = [trainerClientA, trainerClientB];
  trainerMockState.templates = [structuredClone(templateSummary), structuredClone(templateSummaryB)];
  trainerMockState.template = structuredClone(templateDetail);
  trainerMockState.exercises = [catalogExercise, catalogExerciseB];
}

export function useWorkoutTemplateBuilder(kind: 'empty-draft' | 'populated-draft'): void {
  usePopulatedTrainerWorkspace();
  trainerMockState.exercises = [catalogExercise, catalogExerciseB];
  if (kind === 'empty-draft') {
    trainerMockState.template = structuredClone(draftTemplateDetail);
    trainerMockState.exerciseMedia = {};
    return;
  }
  trainerMockState.template = structuredClone(populatedDraftTemplate);
  trainerMockState.exerciseMedia = { [TRAINER_EXERCISE_ID]: [structuredClone(readyExerciseImage)] };
}

function unwrapScalar(value: unknown): string | number | null {
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  return null;
}

function itemsFromReplaceBody(items: WorkoutTemplateExerciseInputDto[]): WorkoutTemplateExerciseResponseDto[] {
  return items.map((input, index) => {
    const exercise =
      trainerMockState.exercises.find((row) => row.id === input.exerciseId) ?? catalogExercise;
    const type =
      input.prescriptionType === WorkoutTemplateExerciseResponseDtoPrescriptionType.DURATION
        ? WorkoutTemplateExerciseResponseDtoPrescriptionType.DURATION
        : WorkoutTemplateExerciseResponseDtoPrescriptionType.REPS;
    return {
      id: `tmpl-item-${index + 1}-${input.exerciseId.slice(0, 8)}`,
      position: index + 1,
      exercise: toTemplateExerciseSummary(exercise),
      sets: input.sets,
      prescriptionType: type,
      repsMin: type === WorkoutTemplateExerciseResponseDtoPrescriptionType.REPS ? (unwrapScalar(input.repsMin) as number | null) : null,
      repsMax: type === WorkoutTemplateExerciseResponseDtoPrescriptionType.REPS ? (unwrapScalar(input.repsMax) as number | null) : null,
      durationSeconds:
        type === WorkoutTemplateExerciseResponseDtoPrescriptionType.DURATION
          ? (unwrapScalar(input.durationSeconds) as number | null)
          : null,
      restSeconds: input.restSeconds,
      targetRpe: unwrapScalar(input.targetRpe) as number | null,
      targetRir: unwrapScalar(input.targetRir) as number | null,
      tempo: unwrapScalar(input.tempo) as string | null,
      notes: unwrapScalar(input.notes) as string | null,
    };
  });
}

function roundNutrient(value: number): number {
  return Math.round(value * 100) / 100;
}

function emptyTotals(): NutritionTotalsDto {
  return { caloriesKcal: 0, proteinG: 0, carbohydratesG: 0, fatG: 0, fiberG: 0 };
}

function addTotals(left: NutritionTotalsDto, right: NutritionTotalsDto): NutritionTotalsDto {
  return {
    caloriesKcal: roundNutrient(left.caloriesKcal + right.caloriesKcal),
    proteinG: roundNutrient(left.proteinG + right.proteinG),
    carbohydratesG: roundNutrient(left.carbohydratesG + right.carbohydratesG),
    fatG: roundNutrient(left.fatG + right.fatG),
    fiberG: roundNutrient(left.fiberG + right.fiberG),
  };
}

function rescaleTotals(nutrition: NutritionTotalsDto, fromGrams: number, toGrams: number): NutritionTotalsDto {
  const factor = fromGrams > 0 ? toGrams / fromGrams : 0;
  return {
    caloriesKcal: roundNutrient(nutrition.caloriesKcal * factor),
    proteinG: roundNutrient(nutrition.proteinG * factor),
    carbohydratesG: roundNutrient(nutrition.carbohydratesG * factor),
    fatG: roundNutrient(nutrition.fatG * factor),
    fiberG: roundNutrient(nutrition.fiberG * factor),
  };
}

type NutrientSource = {
  caloriesKcal?: number | null;
  proteinG?: number | null;
  carbohydratesG?: number | null;
  fatG?: number | null;
  fiberG?: number | null;
};

function toTotals(source: NutrientSource): NutritionTotalsDto {
  return {
    caloriesKcal: source.caloriesKcal ?? 0,
    proteinG: source.proteinG ?? 0,
    carbohydratesG: source.carbohydratesG ?? 0,
    fatG: source.fatG ?? 0,
    fiberG: source.fiberG ?? 0,
  };
}

function scaleTotals(per100: NutrientSource, grams: number): NutritionTotalsDto {
  return rescaleTotals(toTotals(per100), 100, grams);
}

function applyMealReplacement(
  plan: NutritionPlanResponseDto,
  body: ReplaceNutritionPlanMealsDto,
): NutritionPlanResponseDto {
  const previousItems = new Map(
    plan.meals.flatMap((meal) => meal.items.map((item) => [item.foodId, item] as const)),
  );
  const meals = body.meals.map((meal, mealIndex) => {
    const items = meal.items.map((item, itemIndex) => {
      const catalog = item.foodId === catalogFood.id ? catalogFood : undefined;
      const previous = previousItems.get(item.foodId);
      return {
        id: `meal-item-${mealIndex}-${itemIndex}`,
        foodId: item.foodId,
        foodName: catalog?.name ?? previous?.foodName ?? 'Food',
        brand: catalog?.brand ?? previous?.brand ?? null,
        quantityGrams: item.quantityGrams,
        nutrition: catalog
          ? scaleTotals(catalog.nutritionPer100g, item.quantityGrams)
          : previous
            ? rescaleTotals(toTotals(previous.nutrition), previous.quantityGrams, item.quantityGrams)
            : emptyTotals(),
        position: itemIndex,
        notes: unwrapScalar(item.notes) as string | null,
      };
    });
    const totals = items.reduce((sum, item) => addTotals(sum, item.nutrition), emptyTotals());
    return {
      id: `meal-${mealIndex}`,
      name: meal.name,
      mealType: meal.mealType,
      position: mealIndex,
      notes: unwrapScalar(meal.notes) as string | null,
      totals,
      items,
    };
  });
  const mealPlanTotals = meals.reduce((sum, meal) => addTotals(sum, meal.totals), emptyTotals());
  const targets = plan.targets;
  return {
    ...plan,
    meals,
    mealPlanTotals,
    targetDifferences: {
      caloriesDifferenceKcal: targets.caloriesKcal == null ? null : roundNutrient(mealPlanTotals.caloriesKcal - targets.caloriesKcal),
      proteinDifferenceG: targets.proteinG == null ? null : roundNutrient(mealPlanTotals.proteinG - targets.proteinG),
      carbohydratesDifferenceG: targets.carbohydratesG == null ? null : roundNutrient(mealPlanTotals.carbohydratesG - targets.carbohydratesG),
      fatDifferenceG: targets.fatG == null ? null : roundNutrient(mealPlanTotals.fatG - targets.fatG),
    },
  };
}

function paginate<T>(data: T[], page = 1, limit = 20) {
  return {
    data,
    meta: {
      page,
      limit,
      totalItems: data.length,
      totalPages: data.length === 0 ? 0 : 1,
    },
  };
}

async function maybeDelay() {
  if (trainerMockState.delayMs > 0) {
    await delay(trainerMockState.delayMs);
  }
}

function respond<T>(status: number, path: string, body: T) {
  if (trainerMockState.failNetwork) {
    return HttpResponse.error();
  }
  if (status >= 400) {
    return jsonError(
      status,
      status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : 'ERROR',
      'Request failed',
      path,
    );
  }
  return HttpResponse.json(body as object);
}

export const trainerHandlers = [
  http.get(`${API}/trainers/me/dashboard`, async () => {
    await maybeDelay();
    return respond(trainerMockState.dashboardStatus, '/api/v1/trainers/me/dashboard', trainerMockState.dashboard);
  }),
  http.get(`${API}/trainers/me/reports/clients`, async ({ request }) => {
    await maybeDelay();
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const pending = url.searchParams.get('hasPendingCheckIn');
    let rows = trainerMockState.clients;
    if (search) {
      rows = rows.filter((row) => row.clientName.toLowerCase().includes(search));
    }
    if (pending === 'true') {
      rows = rows.filter((row) => row.hasPendingCheckIn);
    }
    if (pending === 'false') {
      rows = rows.filter((row) => !row.hasPendingCheckIn);
    }
    return respond(trainerMockState.clientsStatus, '/api/v1/trainers/me/reports/clients', paginate(rows));
  }),
  http.get(`${API}/trainers/me/clients/:clientId`, async ({ params }) => {
    await maybeDelay();
    const client = trainerMockState.assigned.find((row) => row.id === params.clientId);
    if (!client || trainerMockState.clientStatus >= 400) {
      return jsonError(
        trainerMockState.clientStatus >= 400 ? trainerMockState.clientStatus : 404,
        'NOT_FOUND',
        'Not found',
        `/api/v1/trainers/me/clients/${params.clientId}`,
      );
    }
    return HttpResponse.json(client);
  }),
  http.get(`${API}/trainers/me/clients`, async () => HttpResponse.json(paginate(trainerMockState.assigned))),
  http.get(`${API}/clients/:clientId/training-plans/:planId`, async () =>
    HttpResponse.json(trainerMockState.trainingPlan),
  ),
  http.get(`${API}/clients/:clientId/training-plans`, async () => {
    const summary = Object.fromEntries(
      Object.entries(trainerMockState.trainingPlan).filter(([key]) => key !== 'workouts'),
    );
    return HttpResponse.json(paginate([summary]));
  }),
  http.post(`${API}/clients/:clientId/training-plans`, async ({ request, params }) => {
    const body = (await request.json()) as { name: string };
    trainerMockState.lastTrainingCreate = body;
    trainerMockState.trainingPlan = {
      ...draftTrainingPlan,
      name: body.name,
      clientProfileId: String(params.clientId),
    };
    return HttpResponse.json(trainerMockState.trainingPlan, { status: 201 });
  }),
  http.put(`${API}/clients/:clientId/training-plans/:planId/workouts`, async () =>
    HttpResponse.json(trainerMockState.trainingPlan),
  ),
  http.patch(`${API}/clients/:clientId/training-plans/:planId/exercises/:planExerciseId`, async () =>
    HttpResponse.json(trainerMockState.trainingPlan),
  ),
  http.patch(`${API}/clients/:clientId/training-plans/:planId/status`, async ({ request }) => {
    const body = (await request.json()) as { status: TrainingPlanResponseDto['status'] };
    trainerMockState.trainingPlan = { ...trainerMockState.trainingPlan, status: body.status };
    return HttpResponse.json(trainerMockState.trainingPlan);
  }),
  http.get(`${API}/clients/:clientId/nutrition-plans/:planId`, async () =>
    HttpResponse.json(trainerMockState.nutritionPlan),
  ),
  http.get(`${API}/clients/:clientId/nutrition-plans`, async () => {
    const summary = Object.fromEntries(
      Object.entries(trainerMockState.nutritionPlan).filter(
        ([key]) => key !== 'meals' && key !== 'mealPlanTotals' && key !== 'targetDifferences',
      ),
    );
    return HttpResponse.json(paginate([summary]));
  }),
  http.post(`${API}/clients/:clientId/nutrition-plans`, async ({ request }) => {
    const body = await request.json();
    trainerMockState.lastNutritionCreate = body;
    trainerMockState.nutritionPlan = {
      ...draftNutritionPlan,
      ...(body as object),
      id: TRAINER_NUTRITION_PLAN_ID,
    } as NutritionPlanResponseDto;
    return HttpResponse.json(trainerMockState.nutritionPlan, { status: 201 });
  }),
  http.put(`${API}/clients/:clientId/nutrition-plans/:planId/meals`, async ({ request }) => {
    const body = (await request.json()) as ReplaceNutritionPlanMealsDto;
    trainerMockState.lastNutritionReplace = body;
    trainerMockState.nutritionPlan = applyMealReplacement(trainerMockState.nutritionPlan, body);
    return HttpResponse.json(trainerMockState.nutritionPlan);
  }),
  http.patch(`${API}/clients/:clientId/nutrition-plans/:planId/status`, async ({ request }) => {
    const body = (await request.json()) as { status: NutritionPlanResponseDto['status'] };
    trainerMockState.nutritionPlan = { ...trainerMockState.nutritionPlan, status: body.status };
    return HttpResponse.json(trainerMockState.nutritionPlan);
  }),
  http.get(`${API}/clients/:clientId/check-ins/:checkInId`, async ({ params }) => {
    if (params.checkInId !== trainerMockState.checkIn.id) {
      return jsonError(404, 'NOT_FOUND', 'Not found', `/api/v1/clients/${params.clientId}/check-ins/${params.checkInId}`);
    }
    return HttpResponse.json(trainerMockState.checkIn);
  }),
  http.get(`${API}/clients/:clientId/check-ins`, async ({ request, params }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('status') === 'DRAFT') {
      return jsonError(400, 'BAD_REQUEST', 'DRAFT is not a management-visible status', '/api/v1/clients/check-ins');
    }
    const rows =
      params.clientId === TRAINER_CLIENT_A_ID && trainerMockState.checkIn.status !== CheckInResponseDtoStatus.DRAFT
        ? [
            {
              id: trainerMockState.checkIn.id,
              periodStart: trainerMockState.checkIn.periodStart,
              periodEnd: trainerMockState.checkIn.periodEnd,
              status: trainerMockState.checkIn.status,
              submittedAt: trainerMockState.checkIn.submittedAt,
              hasReview: Boolean(trainerMockState.checkIn.review),
              createdAt: trainerMockState.checkIn.createdAt,
            },
          ]
        : [];
    return HttpResponse.json(paginate(rows));
  }),
  http.post(`${API}/clients/:clientId/check-ins/:checkInId/review`, async ({ request, params }) => {
    if (trainerMockState.checkInStatus === 409) {
      return jsonError(409, 'CONFLICT', 'Already reviewed', `/api/v1/clients/${params.clientId}/check-ins/${params.checkInId}/review`);
    }
    if (trainerMockState.checkInStatus === 403) {
      return jsonError(403, 'FORBIDDEN', 'Not allowed', `/api/v1/clients/${params.clientId}/check-ins/${params.checkInId}/review`);
    }
    const body = (await request.json()) as { feedback: string; actionItems?: string | null };
    trainerMockState.lastReviewBody = body;
    trainerMockState.checkIn = {
      ...trainerMockState.checkIn,
      status: CheckInResponseDtoStatus.REVIEWED,
      review: {
        id: 'r1111111-r111-4111-8111-r11111111111',
        feedback: body.feedback,
        actionItems: body.actionItems ?? null,
        reviewedByUserId: '33333333-3333-4333-8333-333333333333',
        createdAt: '2026-09-05T12:00:00.000Z',
        updatedAt: '2026-09-05T12:00:00.000Z',
      },
    };
    return HttpResponse.json(trainerMockState.checkIn, { status: 201 });
  }),
  http.patch(`${API}/clients/:clientId/check-ins/:checkInId/review`, async ({ request }) => {
    trainerMockState.lastReviewBody = await request.json();
    return HttpResponse.json(trainerMockState.checkIn);
  }),
  http.get(`${API}/clients/:clientId/progress/summary`, async () => HttpResponse.json(emptyProgressSummary)),
  http.get(`${API}/clients/:clientId/progress/exercises/:exerciseId`, async () =>
    jsonError(404, 'NOT_FOUND', 'Not found', '/progress/exercises'),
  ),
  http.get(`${API}/clients/:clientId/progress/exercises`, async () => HttpResponse.json(paginate([]))),
  http.get(`${API}/clients/:clientId/body-measurements`, async ({ params }) =>
    HttpResponse.json(paginate(params.clientId === TRAINER_CLIENT_A_ID ? [measurementA] : [])),
  ),
  http.get(`${API}/clients/:clientId/progress-photos/:photoId/access`, async () =>
    HttpResponse.json({
      url: 'https://signed.example.test/photo',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }),
  ),
  http.get(`${API}/clients/:clientId/progress-photos`, async ({ params }) => {
    if (trainerMockState.photosStatus === 403) {
      return jsonError(403, 'FORBIDDEN', 'Not allowed', '/progress-photos');
    }
    return HttpResponse.json(paginate(params.clientId === TRAINER_CLIENT_A_ID ? [photoA] : []));
  }),
  http.get(`${API}/clients/:clientId/workout-sessions/:sessionId`, async () =>
    jsonError(404, 'NOT_FOUND', 'Not found', '/workout-sessions'),
  ),
  http.get(`${API}/clients/:clientId/workout-sessions`, async ({ params }) =>
    HttpResponse.json(paginate(params.clientId === TRAINER_CLIENT_A_ID ? [completedSession] : [])),
  ),
  http.get(`${API}/workout-templates/:id`, async () => HttpResponse.json(trainerMockState.template)),
  http.get(`${API}/workout-templates`, async ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('search')?.trim().toLowerCase() ?? '';
    const status = url.searchParams.get('status') ?? 'ACTIVE';
    let rows = trainerMockState.templates.filter((template) => template.status === status);
    if (query) {
      rows = rows.filter((template) => {
        const name = template.name.toLowerCase();
        const description = (template.description ?? '').toLowerCase();
        return name.includes(query) || description.includes(query);
      });
    }
    return HttpResponse.json(paginate(rows));
  }),
  http.post(`${API}/workout-templates`, async ({ request }) => {
    const body = (await request.json()) as { name?: string; description?: string };
    trainerMockState.lastTemplateCreate = body;
    trainerMockState.template = {
      ...structuredClone(draftTemplateDetail),
      ...body,
      items: [],
    };
    return HttpResponse.json(trainerMockState.template, { status: 201 });
  }),
  http.put(`${API}/workout-templates/:id/exercises`, async ({ request }) => {
    const body = (await request.json()) as ReplaceWorkoutTemplateExercisesDto;
    trainerMockState.lastTemplateReplace = body;
    trainerMockState.template = {
      ...trainerMockState.template,
      items: itemsFromReplaceBody(body.items ?? []),
    };
    return HttpResponse.json(trainerMockState.template);
  }),
  http.patch(`${API}/workout-templates/:id/status`, async ({ request }) => {
    const body = (await request.json()) as { status: WorkoutTemplateResponseDto['status'] };
    if (body.status === WorkoutTemplateResponseDtoStatus.ACTIVE && trainerMockState.template.items.length === 0) {
      return jsonError(
        409,
        'CONFLICT',
        'Add at least one exercise before activating.',
        '/api/v1/workout-templates/status',
      );
    }
    trainerMockState.template = { ...trainerMockState.template, status: body.status };
    return HttpResponse.json(trainerMockState.template);
  }),
  http.get(`${API}/exercises/:id/media/:mediaId/access`, async () =>
    HttpResponse.json({
      url: SIGNED_EXERCISE_MEDIA_URL,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }),
  ),
  http.post(`${API}/exercises/:id/media/upload-requests`, async ({ params, request }) => {
    const exerciseId = String(params.id);
    const exercise = trainerMockState.exercises.find((row) => row.id === exerciseId);
    if (exercise && exercise.createdByUserId !== '33333333-3333-4333-8333-333333333333') {
      return jsonError(
        404,
        'NOT_FOUND',
        'Exercise not found',
        `/api/v1/exercises/${exerciseId}/media/upload-requests`,
      );
    }
    const payload = (await request.json()) as Record<string, unknown>;
    trainerMockState.lastUploadRequest = payload;
    const media: ExerciseMediaResponseDto = {
      id: TRAINER_UPLOADED_MEDIA_ID,
      mediaType:
        payload.mediaType === ExerciseMediaResponseDtoMediaType.IMAGE
          ? ExerciseMediaResponseDtoMediaType.IMAGE
          : ExerciseMediaResponseDtoMediaType.VIDEO,
      originalFileName: String(payload.fileName ?? 'demo.mp4'),
      mimeType: String(payload.mimeType ?? 'video/mp4'),
      fileSizeBytes: null,
      status: ExerciseMediaResponseDtoStatus.PENDING_UPLOAD,
      displayOrder: 0,
      createdAt: '2026-09-07T00:00:00.000Z',
      finalizedAt: null,
    };
    const existing = trainerMockState.exerciseMedia[exerciseId] ?? [];
    trainerMockState.exerciseMedia[exerciseId] = [...existing, media];
    return HttpResponse.json(
      {
        media,
        upload: {
          method: 'POST',
          url: SIGNED_EXERCISE_STORAGE_URL,
          fields: { key: `exercises/${exerciseId}/${media.id}/file`, Policy: 'signed' },
          expiresAt: '2099-01-01T00:00:00.000Z',
        },
      },
      { status: 201 },
    );
  }),
  http.post(`${API}/exercises/:id/media/:mediaId/finalize`, ({ params }) => {
    const exerciseId = String(params.id);
    const mediaId = String(params.mediaId);
    const list = trainerMockState.exerciseMedia[exerciseId] ?? [];
    const next = list.map((item) =>
      item.id === mediaId
        ? {
            ...item,
            status: ExerciseMediaResponseDtoStatus.READY,
            fileSizeBytes: 1_024,
            finalizedAt: '2026-09-07T00:01:00.000Z',
          }
        : item,
    );
    trainerMockState.exerciseMedia[exerciseId] = next;
    const media = next.find((item) => item.id === mediaId) ?? next[0];
    return HttpResponse.json(media);
  }),
  http.delete(`${API}/exercises/:id/media/:mediaId`, ({ params }) => {
    const exerciseId = String(params.id);
    const mediaId = String(params.mediaId);
    trainerMockState.lastDeletedMediaId = mediaId;
    trainerMockState.exerciseMedia[exerciseId] = (trainerMockState.exerciseMedia[exerciseId] ?? []).filter(
      (item) => item.id !== mediaId,
    );
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(SIGNED_EXERCISE_STORAGE_URL, async () => {
    if (trainerMockState.failStorage) {
      return new HttpResponse(null, { status: 403 });
    }
    trainerMockState.lastStoragePosted = true;
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${API}/exercises/:id/media`, async ({ params }) =>
    HttpResponse.json(trainerMockState.exerciseMedia[String(params.id)] ?? []),
  ),
  http.get(`${API}/exercises/:id`, async ({ params }) => {
    const exercise = trainerMockState.exercises.find((row) => row.id === params.id) ?? catalogExercise;
    return HttpResponse.json(exercise);
  }),
  http.get(`${API}/exercises`, async ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('search')?.trim().toLowerCase() ?? '';
    const status = url.searchParams.get('status');
    const muscle = url.searchParams.get('primaryMuscleGroup');
    const equipment = url.searchParams.get('equipmentType');
    let rows = trainerMockState.exercises;
    if (status) {
      rows = rows.filter((exercise) => exercise.status === status);
    }
    if (muscle) {
      rows = rows.filter((exercise) => exercise.primaryMuscleGroup === muscle);
    }
    if (equipment) {
      rows = rows.filter((exercise) => exercise.equipmentType === equipment);
    }
    if (query) {
      rows = rows.filter((exercise) => exercise.name.toLowerCase().includes(query));
    }
    return HttpResponse.json(paginate(rows));
  }),
  http.post(`${API}/exercises`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const created = {
      ...catalogExercise,
      ...body,
      id: TRAINER_CREATED_EXERCISE_ID,
      createdByUserId: '33333333-3333-4333-8333-333333333333',
    } as ExerciseResponseDto;
    trainerMockState.exercises = [created, ...trainerMockState.exercises];
    return HttpResponse.json(created, { status: 201 });
  }),
  http.get(`${API}/nutrition/foods/:id`, async () => HttpResponse.json(catalogFood)),
  http.get(`${API}/nutrition/foods`, async () => HttpResponse.json(paginate([catalogFood]))),
  http.post(`${API}/nutrition/foods`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...catalogFood, ...(body as object) }, { status: 201 });
  }),
];
