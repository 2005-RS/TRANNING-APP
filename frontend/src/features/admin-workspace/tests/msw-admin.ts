import { delay, http, HttpResponse } from 'msw';
import { jsonError } from '@/features/auth/tests/fixtures';
import type {
  AssignmentHistoryItemDto,
  ClientResponseDto,
  ClientTrainerAssignmentResponseDto,
  ExerciseMediaResponseDto,
  ExerciseResponseDto,
  NutritionFoodResponseDto,
  TrainerResponseDto,
} from '@/generated/models';
import {
  ClientResponseDtoExperienceLevel,
  ClientResponseDtoPrimaryGoal,
  ClientUserResponseDtoRole,
  ClientUserResponseDtoStatus,
  ExerciseMediaResponseDtoMediaType,
  ExerciseMediaResponseDtoStatus,
  ExerciseResponseDtoDifficultyLevel,
  ExerciseResponseDtoEquipmentType,
  ExerciseResponseDtoPrimaryMuscleGroup,
  ExerciseResponseDtoStatus,
  NutritionFoodResponseDtoStatus,
  TrainerUserResponseDtoRole,
  TrainerUserResponseDtoStatus,
} from '@/generated/models';

const API = 'http://localhost:3000/api/v1';

export const ADMIN_TRAINER_ID = '33333333-3333-4333-8333-333333333333';
export const ADMIN_CREATED_TRAINER_ID = '55555555-5555-4555-8555-555555555555';
export const ADMIN_CLIENT_ID = '11111111-1111-4111-8111-111111111111';
export const ADMIN_EXERCISE_ID = '77777777-7777-4777-8777-777777777777';
export const ADMIN_FOOD_ID = '88888888-8888-4888-8888-888888888888';
export const ADMIN_MEDIA_ID = '99999999-9999-4999-8999-999999999999';
export const ADMIN_UPLOADED_MEDIA_ID = 'aaaa9999-9999-4999-8999-999999999999';
export const SIGNED_ADMIN_MEDIA_URL = 'https://signed.example.test/admin-media';
export const SIGNED_ADMIN_STORAGE_URL = 'https://storage.example.test/admin-exercise-upload';

export const adminTrainer: TrainerResponseDto = {
  id: ADMIN_TRAINER_ID,
  user: {
    id: 'aaaa3333-3333-4333-8333-333333333333',
    email: 'tess@example.test',
    firstName: 'Tess',
    lastName: 'Trainer',
    role: TrainerUserResponseDtoRole.TRAINER,
    status: TrainerUserResponseDtoStatus.ACTIVE,
  },
  phone: '+506 2222-0000',
  professionalTitle: 'Strength coach',
  bio: 'Platform trainer',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const adminClient: ClientResponseDto = {
  id: ADMIN_CLIENT_ID,
  user: {
    id: 'bbbb1111-1111-4111-8111-111111111111',
    email: 'ada@example.test',
    firstName: 'Ada',
    lastName: 'Client',
    role: ClientUserResponseDtoRole.CLIENT,
    status: ClientUserResponseDtoStatus.ACTIVE,
  },
  phone: null,
  dateOfBirth: null,
  primaryGoal: ClientResponseDtoPrimaryGoal.STRENGTH,
  goalNotes: null,
  experienceLevel: ClientResponseDtoExperienceLevel.INTERMEDIATE,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const adminExercise: ExerciseResponseDto = {
  id: ADMIN_EXERCISE_ID,
  name: 'Vital bench press',
  description: 'Admin catalog lift',
  instructions: 'Press with control.',
  primaryMuscleGroup: ExerciseResponseDtoPrimaryMuscleGroup.CHEST,
  equipmentType: ExerciseResponseDtoEquipmentType.BARBELL,
  difficultyLevel: ExerciseResponseDtoDifficultyLevel.INTERMEDIATE,
  status: ExerciseResponseDtoStatus.ACTIVE,
  createdByUserId: '44444444-4444-4444-8444-444444444444',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const adminFood: NutritionFoodResponseDto = {
  id: ADMIN_FOOD_ID,
  name: 'Greek yogurt',
  brand: 'Vital',
  description: 'High protein dairy',
  nutritionPer100g: {
    caloriesKcal: 82,
    proteinG: 10,
    carbohydratesG: 3.6,
    fatG: 2,
    fiberG: null,
  },
  status: NutritionFoodResponseDtoStatus.ACTIVE,
  createdByUserId: '44444444-4444-4444-8444-444444444444',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const readyAdminMedia: ExerciseMediaResponseDto = {
  id: ADMIN_MEDIA_ID,
  mediaType: ExerciseMediaResponseDtoMediaType.IMAGE,
  originalFileName: 'bench.jpg',
  mimeType: 'image/jpeg',
  fileSizeBytes: 48000,
  status: ExerciseMediaResponseDtoStatus.READY,
  displayOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  finalizedAt: '2026-01-01T00:00:00.000Z',
};

function paginate<T>(data: T[], page = 1, limit = 10) {
  return {
    data,
    meta: {
      page,
      limit,
      totalItems: data.length,
      totalPages: data.length === 0 ? 0 : Math.max(1, Math.ceil(data.length / limit)),
    },
  };
}

type AdminMockState = {
  delayMs: number;
  failNetwork: boolean;
  dashboardStatus: number;
  trainersStatus: number;
  clientsStatus: number;
  clientDetailStatus: number;
  exercisesStatus: number;
  foodsStatus: number;
  createExerciseStatus: number;
  createTrainerStatus: number;
  assignmentStatus: number;
  assignmentReadStatus: number;
  assignmentReadDelayMs: number;
  unreadCount: number;
  dashboardRequests: number;
  lastExercisesStatusParam: string | null;
  trainers: TrainerResponseDto[];
  clients: ClientResponseDto[];
  exercises: ExerciseResponseDto[];
  foods: NutritionFoodResponseDto[];
  assignment: ClientTrainerAssignmentResponseDto | null;
  history: AssignmentHistoryItemDto[];
  media: Record<string, ExerciseMediaResponseDto[]>;
  lastUploadRequest: Record<string, unknown> | null;
  lastStoragePosted: boolean;
  lastDeletedMediaId: string | null;
  failStorage: boolean;
};

function seedTrainers(): TrainerResponseDto[] {
  return [{ ...adminTrainer, user: { ...adminTrainer.user } }];
}

function seedClients(): ClientResponseDto[] {
  return [{ ...adminClient, user: { ...adminClient.user } }];
}

export const adminMockState: AdminMockState = {
  delayMs: 0,
  failNetwork: false,
  dashboardStatus: 200,
  trainersStatus: 200,
  clientsStatus: 200,
  clientDetailStatus: 200,
  exercisesStatus: 200,
  foodsStatus: 200,
  createExerciseStatus: 201,
  createTrainerStatus: 201,
  assignmentStatus: 200,
  assignmentReadStatus: 200,
  assignmentReadDelayMs: 0,
  unreadCount: 99,
  dashboardRequests: 0,
  lastExercisesStatusParam: null,
  trainers: seedTrainers(),
  clients: seedClients(),
  exercises: [{ ...adminExercise }],
  foods: [{ ...adminFood, nutritionPer100g: { ...adminFood.nutritionPer100g } }],
  assignment: null,
  history: [],
  media: { [ADMIN_EXERCISE_ID]: [structuredClone(readyAdminMedia)] },
  lastUploadRequest: null,
  lastStoragePosted: false,
  lastDeletedMediaId: null,
  failStorage: false,
};

export function resetAdminMockState(): void {
  adminMockState.delayMs = 0;
  adminMockState.failNetwork = false;
  adminMockState.dashboardStatus = 200;
  adminMockState.trainersStatus = 200;
  adminMockState.clientsStatus = 200;
  adminMockState.clientDetailStatus = 200;
  adminMockState.exercisesStatus = 200;
  adminMockState.foodsStatus = 200;
  adminMockState.createExerciseStatus = 201;
  adminMockState.createTrainerStatus = 201;
  adminMockState.assignmentStatus = 200;
  adminMockState.assignmentReadStatus = 200;
  adminMockState.assignmentReadDelayMs = 0;
  adminMockState.unreadCount = 99;
  adminMockState.dashboardRequests = 0;
  adminMockState.lastExercisesStatusParam = null;
  adminMockState.trainers = seedTrainers();
  adminMockState.clients = seedClients();
  adminMockState.exercises = [{ ...adminExercise }];
  adminMockState.foods = [{ ...adminFood, nutritionPer100g: { ...adminFood.nutritionPer100g } }];
  adminMockState.assignment = null;
  adminMockState.history = [];
  adminMockState.media = { [ADMIN_EXERCISE_ID]: [structuredClone(readyAdminMedia)] };
  adminMockState.lastUploadRequest = null;
  adminMockState.lastStoragePosted = false;
  adminMockState.lastDeletedMediaId = null;
  adminMockState.failStorage = false;
}

export function useEmptyAdminCatalogs(): void {
  adminMockState.trainers = [];
  adminMockState.clients = [];
  adminMockState.exercises = [];
  adminMockState.foods = [];
  adminMockState.media = {};
}

async function maybeDelay() {
  if (adminMockState.delayMs > 0) {
    await delay(adminMockState.delayMs);
  }
}

export const adminHandlers = [
  http.get(`${API}/admin/dashboard`, async ({ request }) => {
    adminMockState.dashboardRequests += 1;
    await maybeDelay();
    if (adminMockState.failNetwork) {
      return HttpResponse.error();
    }
    if (adminMockState.dashboardStatus !== 200) {
      return jsonError(
        adminMockState.dashboardStatus,
        adminMockState.dashboardStatus === 403 ? 'FORBIDDEN' : 'ERROR',
        'Dashboard unavailable',
        '/api/v1/admin/dashboard',
      );
    }
    const periodDays = Number(new URL(request.url).searchParams.get('periodDays') ?? 7);
    const activeClients = adminMockState.clients.filter((row) => row.user.status === 'ACTIVE').length;
    return HttpResponse.json({
      periodDays: periodDays === 30 || periodDays === 90 ? periodDays : 7,
      activeTrainers: adminMockState.trainers.filter((row) => row.user.status === 'ACTIVE').length,
      activeClients,
      currentlyAssignedClients: adminMockState.assignment ? 1 : 0,
      unassignedActiveClients: adminMockState.assignment ? 0 : activeClients,
      activeTrainingPlans: 1,
      activeNutritionPlans: 1,
      completedWorkoutSessions: 4,
      pendingCheckIns: 2,
      notifications: { unreadCount: adminMockState.unreadCount },
    });
  }),
  http.post(`${API}/trainers`, async ({ request }) => {
    if (adminMockState.createTrainerStatus === 409) {
      return jsonError(409, 'CONFLICT', 'Email already in use', '/api/v1/trainers');
    }
    const body = (await request.json()) as {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      professionalTitle?: string;
      bio?: string;
    };
    const created: TrainerResponseDto = {
      id: ADMIN_CREATED_TRAINER_ID,
      user: {
        id: 'cccc5555-5555-4555-8555-555555555555',
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        role: TrainerUserResponseDtoRole.TRAINER,
        status: TrainerUserResponseDtoStatus.ACTIVE,
      },
      phone: body.phone ?? null,
      professionalTitle: body.professionalTitle ?? null,
      bio: body.bio ?? null,
      createdAt: '2026-09-09T00:00:00.000Z',
      updatedAt: '2026-09-09T00:00:00.000Z',
    };
    adminMockState.trainers = [created, ...adminMockState.trainers];
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch(`${API}/trainers/:id/status`, async ({ params, request }) => {
    const body = (await request.json()) as { status: 'ACTIVE' | 'DISABLED' };
    adminMockState.trainers = adminMockState.trainers.map((row) =>
      row.id === params.id ? { ...row, user: { ...row.user, status: body.status } } : row,
    );
    const found = adminMockState.trainers.find((row) => row.id === params.id);
    return found
      ? HttpResponse.json(found)
      : jsonError(404, 'NOT_FOUND', 'Trainer not found', `/api/v1/trainers/${String(params.id)}`);
  }),
  http.patch(`${API}/trainers/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, string | null>;
    adminMockState.trainers = adminMockState.trainers.map((row) =>
      row.id === params.id
        ? {
            ...row,
            phone: body.phone ?? row.phone,
            professionalTitle: body.professionalTitle ?? row.professionalTitle,
            bio: body.bio ?? row.bio,
            user: {
              ...row.user,
              email: body.email ?? row.user.email,
              firstName: body.firstName ?? row.user.firstName,
              lastName: body.lastName ?? row.user.lastName,
            },
          }
        : row,
    );
    const found = adminMockState.trainers.find((row) => row.id === params.id);
    return found
      ? HttpResponse.json(found)
      : jsonError(404, 'NOT_FOUND', 'Trainer not found', `/api/v1/trainers/${String(params.id)}`);
  }),
  http.get(`${API}/trainers/:id`, async ({ params }) => {
    await maybeDelay();
    if (adminMockState.failNetwork) {
      return HttpResponse.error();
    }
    const found = adminMockState.trainers.find((row) => row.id === params.id);
    return found
      ? HttpResponse.json(found)
      : jsonError(404, 'NOT_FOUND', 'Trainer not found', `/api/v1/trainers/${String(params.id)}`);
  }),
  http.get(`${API}/trainers`, async ({ request }) => {
    await maybeDelay();
    if (adminMockState.failNetwork) {
      return HttpResponse.error();
    }
    if (adminMockState.trainersStatus !== 200) {
      return jsonError(adminMockState.trainersStatus, 'FORBIDDEN', 'Forbidden', '/api/v1/trainers');
    }
    const url = new URL(request.url);
    const term = url.searchParams.get('search')?.toLowerCase() ?? '';
    const status = url.searchParams.get('status');
    return HttpResponse.json(
      paginate(
        adminMockState.trainers.filter((row) => {
          const searchable = `${row.user.firstName} ${row.user.lastName} ${row.user.email}`.toLowerCase();
          return (!term || searchable.includes(term)) && (!status || row.user.status === status);
        }),
      ),
    );
  }),
  http.get(`${API}/clients/:clientId/trainer-history`, async ({ params }) => {
    if (String(params.clientId) !== ADMIN_CLIENT_ID && adminMockState.clientDetailStatus === 404) {
      return jsonError(404, 'NOT_FOUND', 'Client not found', `/api/v1/clients/${String(params.clientId)}`);
    }
    return HttpResponse.json(paginate(adminMockState.history));
  }),
  http.get(`${API}/clients/:clientId/trainer`, async ({ params }) => {
    if (adminMockState.assignmentReadDelayMs > 0) {
      await delay(adminMockState.assignmentReadDelayMs);
    }
    if (adminMockState.assignmentReadStatus !== 200) {
      return jsonError(
        adminMockState.assignmentReadStatus,
        'ERROR',
        'Internal server error',
        `/api/v1/clients/${String(params.clientId)}/trainer`,
      );
    }
    return HttpResponse.json({ trainer: adminMockState.assignment?.trainer ?? null });
  }),
  http.put(`${API}/clients/:clientId/trainer`, async ({ params, request }) => {
    if (adminMockState.assignmentStatus === 409) {
      return jsonError(409, 'CONFLICT', 'Trainer is disabled', `/api/v1/clients/${String(params.clientId)}/trainer`);
    }
    const body = (await request.json()) as { trainerId: string };
    const selected =
      adminMockState.trainers.find((row) => row.id === body.trainerId) ?? adminMockState.trainers[0];
    if (!selected) {
      return jsonError(404, 'NOT_FOUND', 'Trainer not found', `/api/v1/clients/${String(params.clientId)}/trainer`);
    }
    adminMockState.assignment = {
      id: 'abababab-abab-4aba-8aba-abababababab',
      trainer: selected,
      assignedAt: '2026-09-09T00:00:00.000Z',
    };
    adminMockState.history = [
      {
        ...adminMockState.assignment,
        assignedByUserId: '44444444-4444-4444-8444-444444444444',
        endedAt: null,
        endedByUserId: null,
      },
    ];
    return HttpResponse.json(adminMockState.assignment);
  }),
  http.delete(`${API}/clients/:clientId/trainer`, async () => {
    if (adminMockState.assignment) {
      adminMockState.history = adminMockState.history.map((item) =>
        item.id === adminMockState.assignment?.id
          ? {
              ...item,
              endedAt: '2026-09-09T01:00:00.000Z',
              endedByUserId: '44444444-4444-4444-8444-444444444444',
            }
          : item,
      );
    }
    adminMockState.assignment = null;
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${API}/clients`, async ({ request }) => {
    const body = (await request.json()) as {
      email: string;
      firstName: string;
      lastName: string;
      primaryGoal: ClientResponseDto['primaryGoal'];
      experienceLevel: ClientResponseDto['experienceLevel'];
      phone?: string;
      dateOfBirth?: string;
      goalNotes?: string;
    };
    const created: ClientResponseDto = {
      id: '66666666-6666-4666-8666-666666666666',
      user: {
        id: 'dddd6666-6666-4666-8666-666666666666',
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        role: ClientUserResponseDtoRole.CLIENT,
        status: ClientUserResponseDtoStatus.ACTIVE,
      },
      phone: body.phone ?? null,
      dateOfBirth: body.dateOfBirth ?? null,
      primaryGoal: body.primaryGoal,
      goalNotes: body.goalNotes ?? null,
      experienceLevel: body.experienceLevel,
      createdAt: '2026-09-09T00:00:00.000Z',
      updatedAt: '2026-09-09T00:00:00.000Z',
    };
    adminMockState.clients = [created, ...adminMockState.clients];
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch(`${API}/clients/:id/status`, async ({ params, request }) => {
    const body = (await request.json()) as { status: 'ACTIVE' | 'DISABLED' };
    adminMockState.clients = adminMockState.clients.map((row) =>
      row.id === params.id ? { ...row, user: { ...row.user, status: body.status } } : row,
    );
    const found = adminMockState.clients.find((row) => row.id === params.id);
    return found
      ? HttpResponse.json(found)
      : jsonError(404, 'NOT_FOUND', 'Client not found', `/api/v1/clients/${String(params.id)}`);
  }),
  http.patch(`${API}/clients/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, string | null>;
    adminMockState.clients = adminMockState.clients.map((row) =>
      row.id === params.id
        ? {
            ...row,
            phone: body.phone ?? row.phone,
            dateOfBirth: body.dateOfBirth ?? row.dateOfBirth,
            goalNotes: body.goalNotes ?? row.goalNotes,
            primaryGoal: (body.primaryGoal as ClientResponseDto['primaryGoal'] | undefined) ?? row.primaryGoal,
            experienceLevel:
              (body.experienceLevel as ClientResponseDto['experienceLevel'] | undefined) ?? row.experienceLevel,
            user: {
              ...row.user,
              email: body.email ?? row.user.email,
              firstName: body.firstName ?? row.user.firstName,
              lastName: body.lastName ?? row.user.lastName,
            },
          }
        : row,
    );
    const found = adminMockState.clients.find((row) => row.id === params.id);
    return found
      ? HttpResponse.json(found)
      : jsonError(404, 'NOT_FOUND', 'Client not found', `/api/v1/clients/${String(params.id)}`);
  }),
  http.get(`${API}/clients/:id`, async ({ params }) => {
    await maybeDelay();
    if (adminMockState.failNetwork) {
      return HttpResponse.error();
    }
    if (adminMockState.clientDetailStatus !== 200) {
      return jsonError(
        adminMockState.clientDetailStatus,
        adminMockState.clientDetailStatus === 404 ? 'NOT_FOUND' : 'ERROR',
        'Client not found',
        `/api/v1/clients/${String(params.id)}`,
      );
    }
    const found = adminMockState.clients.find((row) => row.id === params.id);
    return found
      ? HttpResponse.json(found)
      : jsonError(404, 'NOT_FOUND', 'Client not found', `/api/v1/clients/${String(params.id)}`);
  }),
  http.get(`${API}/clients`, async ({ request }) => {
    await maybeDelay();
    if (adminMockState.failNetwork) {
      return HttpResponse.error();
    }
    if (adminMockState.clientsStatus !== 200) {
      return jsonError(adminMockState.clientsStatus, 'FORBIDDEN', 'Forbidden', '/api/v1/clients');
    }
    const url = new URL(request.url);
    const term = url.searchParams.get('search')?.toLowerCase() ?? '';
    const primaryGoal = url.searchParams.get('primaryGoal');
    return HttpResponse.json(
      paginate(
        adminMockState.clients.filter((row) => {
          const searchable = `${row.user.firstName} ${row.user.lastName} ${row.user.email}`.toLowerCase();
          return (!term || searchable.includes(term)) && (!primaryGoal || row.primaryGoal === primaryGoal);
        }),
      ),
    );
  }),
  http.get(`${API}/exercises/:id/media/:mediaId/access`, async () => {
    return HttpResponse.json({
      url: SIGNED_ADMIN_MEDIA_URL,
      expiresAt: '2099-01-01T00:00:00.000Z',
    });
  }),
  http.post(`${API}/exercises/:id/media/upload-requests`, async ({ params, request }) => {
    const exerciseId = String(params.id);
    const payload = (await request.json()) as Record<string, unknown>;
    adminMockState.lastUploadRequest = payload;
    const media: ExerciseMediaResponseDto = {
      id: ADMIN_UPLOADED_MEDIA_ID,
      mediaType:
        payload.mediaType === ExerciseMediaResponseDtoMediaType.VIDEO
          ? ExerciseMediaResponseDtoMediaType.VIDEO
          : ExerciseMediaResponseDtoMediaType.IMAGE,
      originalFileName: String(payload.fileName ?? 'demo.jpg'),
      mimeType: String(payload.mimeType ?? 'image/jpeg'),
      fileSizeBytes: typeof payload.fileSizeBytes === 'number' ? payload.fileSizeBytes : null,
      status: ExerciseMediaResponseDtoStatus.PENDING_UPLOAD,
      displayOrder: 0,
      createdAt: '2026-09-09T00:00:00.000Z',
      finalizedAt: null,
    };
    adminMockState.media[exerciseId] = [...(adminMockState.media[exerciseId] ?? []), media];
    return HttpResponse.json(
      {
        media,
        upload: {
          method: 'POST',
          url: SIGNED_ADMIN_STORAGE_URL,
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
    adminMockState.media[exerciseId] = (adminMockState.media[exerciseId] ?? []).map((item) =>
      item.id === mediaId
        ? { ...item, status: ExerciseMediaResponseDtoStatus.READY, finalizedAt: '2026-09-09T00:01:00.000Z' }
        : item,
    );
    const media = (adminMockState.media[exerciseId] ?? []).find((item) => item.id === mediaId);
    return HttpResponse.json(media ?? readyAdminMedia);
  }),
  http.delete(`${API}/exercises/:id/media/:mediaId`, ({ params }) => {
    const exerciseId = String(params.id);
    const mediaId = String(params.mediaId);
    adminMockState.lastDeletedMediaId = mediaId;
    adminMockState.media[exerciseId] = (adminMockState.media[exerciseId] ?? []).filter((item) => item.id !== mediaId);
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(SIGNED_ADMIN_STORAGE_URL, async () => {
    if (adminMockState.failStorage) {
      return new HttpResponse(null, { status: 403 });
    }
    adminMockState.lastStoragePosted = true;
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${API}/exercises/:id/media`, async ({ params }) => {
    return HttpResponse.json(adminMockState.media[String(params.id)] ?? []);
  }),
  http.post(`${API}/exercises`, async ({ request }) => {
    if (adminMockState.createExerciseStatus === 409) {
      return jsonError(409, 'CONFLICT', 'Exercise name already exists', '/api/v1/exercises');
    }
    const body = (await request.json()) as Partial<ExerciseResponseDto>;
    const created: ExerciseResponseDto = {
      ...adminExercise,
      id: 'eeee7777-7777-4777-8777-777777777777',
      name: String(body.name ?? 'New exercise'),
      description: body.description ?? null,
      instructions: body.instructions ?? null,
      primaryMuscleGroup: body.primaryMuscleGroup ?? ExerciseResponseDtoPrimaryMuscleGroup.OTHER,
      equipmentType: body.equipmentType ?? ExerciseResponseDtoEquipmentType.OTHER,
      difficultyLevel: body.difficultyLevel ?? ExerciseResponseDtoDifficultyLevel.BEGINNER,
    };
    adminMockState.exercises = [created, ...adminMockState.exercises];
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch(`${API}/exercises/:id/status`, async ({ params, request }) => {
    const body = (await request.json()) as { status: 'ACTIVE' | 'ARCHIVED' };
    adminMockState.exercises = adminMockState.exercises.map((row) =>
      row.id === params.id ? { ...row, status: body.status } : row,
    );
    const found = adminMockState.exercises.find((row) => row.id === params.id);
    return found
      ? HttpResponse.json(found)
      : jsonError(404, 'NOT_FOUND', 'Exercise not found', `/api/v1/exercises/${String(params.id)}`);
  }),
  http.patch(`${API}/exercises/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Partial<ExerciseResponseDto>;
    adminMockState.exercises = adminMockState.exercises.map((row) =>
      row.id === params.id ? { ...row, ...body, id: row.id } : row,
    );
    const found = adminMockState.exercises.find((row) => row.id === params.id);
    return found
      ? HttpResponse.json(found)
      : jsonError(404, 'NOT_FOUND', 'Exercise not found', `/api/v1/exercises/${String(params.id)}`);
  }),
  http.get(`${API}/exercises/:id`, async ({ params }) => {
    const found = adminMockState.exercises.find((row) => row.id === params.id);
    return found
      ? HttpResponse.json(found)
      : jsonError(404, 'NOT_FOUND', 'Exercise not found', `/api/v1/exercises/${String(params.id)}`);
  }),
  http.get(`${API}/exercises`, async ({ request }) => {
    await maybeDelay();
    if (adminMockState.failNetwork) {
      return HttpResponse.error();
    }
    if (adminMockState.exercisesStatus !== 200) {
      return jsonError(adminMockState.exercisesStatus, 'FORBIDDEN', 'Forbidden', '/api/v1/exercises');
    }
    const url = new URL(request.url);
    const term = url.searchParams.get('search')?.toLowerCase() ?? '';
    const status = url.searchParams.get('status');
    adminMockState.lastExercisesStatusParam = status;
    return HttpResponse.json(
      paginate(
        adminMockState.exercises.filter(
          (row) => (!term || row.name.toLowerCase().includes(term)) && row.status === (status ?? 'ACTIVE'),
        ),
      ),
    );
  }),
  http.post(`${API}/nutrition/foods`, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      brand?: string;
      description?: string;
      caloriesPer100g: number;
      proteinGPer100g: number;
      carbohydratesGPer100g: number;
      fatGPer100g: number;
      fiberGPer100g?: number | null;
    };
    const created: NutritionFoodResponseDto = {
      id: 'ffff8888-8888-4888-8888-888888888888',
      name: body.name,
      brand: body.brand ?? null,
      description: body.description ?? null,
      nutritionPer100g: {
        caloriesKcal: body.caloriesPer100g,
        proteinG: body.proteinGPer100g,
        carbohydratesG: body.carbohydratesGPer100g,
        fatG: body.fatGPer100g,
        fiberG: body.fiberGPer100g ?? null,
      },
      status: NutritionFoodResponseDtoStatus.ACTIVE,
      createdByUserId: '44444444-4444-4444-8444-444444444444',
      createdAt: '2026-09-09T00:00:00.000Z',
      updatedAt: '2026-09-09T00:00:00.000Z',
    };
    adminMockState.foods = [created, ...adminMockState.foods];
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch(`${API}/nutrition/foods/:id/status`, async ({ params, request }) => {
    const body = (await request.json()) as { status: 'ACTIVE' | 'ARCHIVED' };
    adminMockState.foods = adminMockState.foods.map((row) =>
      row.id === params.id ? { ...row, status: body.status } : row,
    );
    const found = adminMockState.foods.find((row) => row.id === params.id);
    return found
      ? HttpResponse.json(found)
      : jsonError(404, 'NOT_FOUND', 'Food not found', `/api/v1/nutrition/foods/${String(params.id)}`);
  }),
  http.patch(`${API}/nutrition/foods/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    adminMockState.foods = adminMockState.foods.map((row) =>
      row.id === params.id
        ? {
            ...row,
            name: String(body.name ?? row.name),
            brand: (body.brand as string | null | undefined) ?? row.brand,
            description: (body.description as string | null | undefined) ?? row.description,
            nutritionPer100g: {
              caloriesKcal: Number(body.caloriesPer100g ?? row.nutritionPer100g.caloriesKcal),
              proteinG: Number(body.proteinGPer100g ?? row.nutritionPer100g.proteinG),
              carbohydratesG: Number(body.carbohydratesGPer100g ?? row.nutritionPer100g.carbohydratesG),
              fatG: Number(body.fatGPer100g ?? row.nutritionPer100g.fatG),
              fiberG:
                body.fiberGPer100g === undefined
                  ? row.nutritionPer100g.fiberG
                  : (body.fiberGPer100g as number | null),
            },
          }
        : row,
    );
    const found = adminMockState.foods.find((row) => row.id === params.id);
    return found
      ? HttpResponse.json(found)
      : jsonError(404, 'NOT_FOUND', 'Food not found', `/api/v1/nutrition/foods/${String(params.id)}`);
  }),
  http.get(`${API}/nutrition/foods/:id`, async ({ params }) => {
    const found = adminMockState.foods.find((row) => row.id === params.id);
    return found
      ? HttpResponse.json(found)
      : jsonError(404, 'NOT_FOUND', 'Food not found', `/api/v1/nutrition/foods/${String(params.id)}`);
  }),
  http.get(`${API}/nutrition/foods`, async ({ request }) => {
    await maybeDelay();
    if (adminMockState.failNetwork) {
      return HttpResponse.error();
    }
    if (adminMockState.foodsStatus !== 200) {
      return jsonError(adminMockState.foodsStatus, 'FORBIDDEN', 'Forbidden', '/api/v1/nutrition/foods');
    }
    const term = new URL(request.url).searchParams.get('search')?.toLowerCase() ?? '';
    return HttpResponse.json(
      paginate(adminMockState.foods.filter((row) => !term || row.name.toLowerCase().includes(term))),
    );
  }),
];
