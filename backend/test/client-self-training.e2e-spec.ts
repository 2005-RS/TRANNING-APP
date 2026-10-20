import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { PasswordHasherService } from '../src/modules/auth/services/password-hasher.service';
import { ClientExperienceLevel } from '../src/modules/clients/enums/client-experience-level.enum';
import { ClientPrimaryGoal } from '../src/modules/clients/enums/client-primary-goal.enum';
import { ExerciseDifficultyLevel } from '../src/modules/exercises/enums/exercise-difficulty-level.enum';
import { ExerciseEquipmentType } from '../src/modules/exercises/enums/exercise-equipment-type.enum';
import { ExerciseMuscleGroup } from '../src/modules/exercises/enums/exercise-muscle-group.enum';
import { TrainingPlanStatus } from '../src/modules/training-plans/enums/training-plan-status.enum';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { UserStatus } from '../src/modules/users/enums/user-status.enum';
import { WorkoutSessionStatus } from '../src/modules/workout-sessions/enums/workout-session-status.enum';
import { WorkoutPrescriptionType } from '../src/modules/workout-templates/enums/workout-prescription-type.enum';
import { WorkoutTemplateStatus } from '../src/modules/workout-templates/enums/workout-template-status.enum';
import { configureApp } from '../src/config/configure-app';
import { assertSafeTestDatabaseName } from '../src/database/assert-safe-test-database';
import { clearIdentityGraph } from './helpers/clear-identity-graph';

const PASSWORD = 'correct horse battery';

function readId(body: unknown): string {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('id' in body) ||
    typeof body.id !== 'string'
  ) {
    throw new Error('expected an id');
  }
  return body.id;
}

describe('Client self training (e2e)', () => {
  let app: INestApplication;
  let http: App;
  let dataSource: DataSource;
  let users: Repository<User>;
  let hasher: PasswordHasherService;

  beforeAll(async () => {
    assertSafeTestDatabaseName(process.env.DATABASE_NAME ?? '');
    process.env.AUTH_E2E_SKIP_THROTTLE = 'true';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    http = app.getHttpServer() as App;
    dataSource = app.get(DataSource);
    users = dataSource.getRepository(User);
    hasher = app.get(PasswordHasherService);
  });

  beforeEach(async () => {
    assertSafeTestDatabaseName(process.env.DATABASE_NAME ?? '');
    await clearIdentityGraph(dataSource);
  });

  afterAll(async () => {
    await app.close();
    delete process.env.AUTH_E2E_SKIP_THROTTLE;
  });

  async function createUser(email: string, role: UserRole): Promise<User> {
    return users.save(
      users.create({
        email,
        passwordHash: await hasher.hash(PASSWORD),
        firstName: 'Test',
        lastName: 'User',
        role,
        status: UserStatus.ACTIVE,
      }),
    );
  }

  async function authHeader(email: string): Promise<string> {
    const response = await request(http)
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return `Bearer ${response.body.accessToken as string}`;
  }

  async function createAdmin() {
    const user = await createUser('admin@example.com', UserRole.ADMIN);
    return { user, authorization: await authHeader(user.email) };
  }

  async function provisionTrainer(authorization: string) {
    const response = await request(http)
      .post('/api/v1/trainers')
      .set('Authorization', authorization)
      .send({
        email: 'trainer@example.com',
        password: PASSWORD,
        firstName: 'Tia',
        lastName: 'Trainer',
      })
      .expect(201);
    return response.body as { id: string; user: { email: string } };
  }

  async function provisionClient(
    authorization: string,
    email = 'client@example.com',
  ) {
    const response = await request(http)
      .post('/api/v1/clients')
      .set('Authorization', authorization)
      .send({
        email,
        password: PASSWORD,
        firstName: 'Cara',
        lastName: 'Client',
        primaryGoal: ClientPrimaryGoal.MUSCLE_GAIN,
        experienceLevel: ClientExperienceLevel.BEGINNER,
      })
      .expect(201);
    return response.body as { id: string; user: { email: string } };
  }

  async function createExercise(authorization: string, name: string) {
    const response = await request(http)
      .post('/api/v1/exercises')
      .set('Authorization', authorization)
      .send({
        name,
        primaryMuscleGroup: ExerciseMuscleGroup.CHEST,
        equipmentType: ExerciseEquipmentType.BARBELL,
        difficultyLevel: ExerciseDifficultyLevel.BEGINNER,
      })
      .expect(201);
    return readId(response.body);
  }

  function repsItem(exerciseId: string) {
    return {
      exerciseId,
      sets: 3,
      prescriptionType: WorkoutPrescriptionType.REPS,
      repsMin: 8,
      repsMax: 12,
      restSeconds: 90,
    };
  }

  async function createActiveTemplate(
    authorization: string,
    name: string,
    exerciseIds: string[],
  ) {
    const created = await request(http)
      .post('/api/v1/workout-templates')
      .set('Authorization', authorization)
      .send({ name })
      .expect(201);
    const id = readId(created.body);
    await request(http)
      .put(`/api/v1/workout-templates/${id}/exercises`)
      .set('Authorization', authorization)
      .send({ items: exerciseIds.map(repsItem) })
      .expect(200);
    await request(http)
      .patch(`/api/v1/workout-templates/${id}/status`)
      .set('Authorization', authorization)
      .send({ status: WorkoutTemplateStatus.ACTIVE })
      .expect(200);
    return id;
  }

  it('publishes routines, lets a free client train, and protects private and trainer plans', async () => {
    const { authorization: adminAuth } = await createAdmin();
    const trainer = await provisionTrainer(adminAuth);
    const trainerAuth = await authHeader(trainer.user.email);
    const client = await provisionClient(adminAuth);
    const clientAuth = await authHeader(client.user.email);
    const exerciseA = await createExercise(adminAuth, 'Self Training Bench');
    const exerciseB = await createExercise(adminAuth, 'Self Training Row');
    const templateId = await createActiveTemplate(
      adminAuth,
      'Self Training Full Body',
      [exerciseA, exerciseB],
    );

    await request(http)
      .patch(`/api/v1/workout-templates/${templateId}/library`)
      .set('Authorization', trainerAuth)
      .send({ published: true })
      .expect(403);
    await request(http)
      .patch(`/api/v1/workout-templates/${templateId}/library`)
      .set('Authorization', adminAuth)
      .send({ published: true })
      .expect(200);

    const draft = await request(http)
      .post('/api/v1/workout-templates')
      .set('Authorization', adminAuth)
      .send({ name: 'Private draft' })
      .expect(201);
    const draftId = readId(draft.body);
    await request(http)
      .patch(`/api/v1/workout-templates/${draftId}/library`)
      .set('Authorization', adminAuth)
      .send({ published: true })
      .expect(409);

    const library = await request(http)
      .get('/api/v1/clients/me/workout-library')
      .set('Authorization', clientAuth)
      .expect(200);
    expect(library.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: templateId,
          exerciseCount: 2,
          estimatedMinutes: expect.any(Number),
        }),
      ]),
    );
    expect(
      library.body.find((item: { id: string }) => item.id === templateId)
        .estimatedMinutes,
    ).toBeGreaterThan(0);
    await request(http)
      .get('/api/v1/clients/me/workout-library')
      .set('Authorization', trainerAuth)
      .expect(403);

    const firstPlan = await request(http)
      .post('/api/v1/clients/me/training-plans/self')
      .set('Authorization', clientAuth)
      .send({ workouts: [{ workoutTemplateId: templateId }] })
      .expect(201);
    const firstPlanId = readId(firstPlan.body);
    expect(firstPlan.body.isSelfAuthored).toBe(true);
    const planWorkoutId = firstPlan.body.workouts[0].id as string;
    const current = await request(http)
      .get('/api/v1/clients/me/training-plans/current')
      .set('Authorization', clientAuth)
      .expect(200);
    expect(current.body.trainingPlan.id).toBe(firstPlanId);

    const firstSession = await request(http)
      .post('/api/v1/clients/me/workout-sessions')
      .set('Authorization', clientAuth)
      .send({ trainingPlanWorkoutId: planWorkoutId })
      .expect(201);
    const firstSessionId = readId(firstSession.body);
    const firstSessionExerciseId = firstSession.body.exercises[0].id as string;
    await request(http)
      .put(
        `/api/v1/clients/me/workout-sessions/${firstSessionId}/exercises/${firstSessionExerciseId}/sets`,
      )
      .set('Authorization', clientAuth)
      .send({ sets: [{ actualReps: 10, actualLoadKg: 50 }] })
      .expect(200);
    await request(http)
      .patch(`/api/v1/clients/me/workout-sessions/${firstSessionId}/status`)
      .set('Authorization', clientAuth)
      .send({ status: WorkoutSessionStatus.COMPLETED })
      .expect(200);

    const secondSession = await request(http)
      .post('/api/v1/clients/me/workout-sessions')
      .set('Authorization', clientAuth)
      .send({ trainingPlanWorkoutId: planWorkoutId })
      .expect(201);
    expect(secondSession.body.exercises[0].previousSets).toEqual([
      expect.objectContaining({
        setNumber: 1,
        actualReps: 10,
        actualLoadKg: 50,
      }),
    ]);

    await request(http)
      .patch(
        `/api/v1/clients/me/workout-sessions/${readId(secondSession.body)}/status`,
      )
      .set('Authorization', clientAuth)
      .send({ status: WorkoutSessionStatus.CANCELLED })
      .expect(200);

    const replacement = await request(http)
      .post('/api/v1/clients/me/training-plans/self')
      .set('Authorization', clientAuth)
      .send({ workouts: [{ workoutTemplateId: templateId }] })
      .expect(201);
    expect(readId(replacement.body)).not.toBe(firstPlanId);
    const archived = await request(http)
      .get(`/api/v1/clients/me/training-plans/${firstPlanId}`)
      .set('Authorization', clientAuth)
      .expect(200);
    expect(archived.body.status).toBe(TrainingPlanStatus.ARCHIVED);

    await request(http)
      .post('/api/v1/clients/me/training-plans/self')
      .set('Authorization', clientAuth)
      .send({ workouts: [{ workoutTemplateId: draftId }] })
      .expect(404);

    const coachedClient = await provisionClient(
      adminAuth,
      'coached-client@example.com',
    );
    await request(http)
      .patch(`/api/v1/clients/${coachedClient.id}/subscription`)
      .set('Authorization', adminAuth)
      .send({ complimentary: true })
      .expect(200);
    await request(http)
      .put(`/api/v1/clients/${coachedClient.id}/trainer`)
      .set('Authorization', adminAuth)
      .send({ trainerId: trainer.id })
      .expect(200);
    const coachedPlan = await request(http)
      .post(`/api/v1/clients/${coachedClient.id}/training-plans`)
      .set('Authorization', trainerAuth)
      .send({ name: 'Trainer plan' })
      .expect(201);
    const coachedPlanId = readId(coachedPlan.body);
    await request(http)
      .put(
        `/api/v1/clients/${coachedClient.id}/training-plans/${coachedPlanId}/workouts`,
      )
      .set('Authorization', trainerAuth)
      .send({ workouts: [{ workoutTemplateId: templateId }] })
      .expect(200);
    await request(http)
      .patch(
        `/api/v1/clients/${coachedClient.id}/training-plans/${coachedPlanId}/status`,
      )
      .set('Authorization', trainerAuth)
      .send({ status: TrainingPlanStatus.ACTIVE })
      .expect(200);
    const coachedClientAuth = await authHeader(coachedClient.user.email);
    await request(http)
      .post('/api/v1/clients/me/training-plans/self')
      .set('Authorization', coachedClientAuth)
      .send({ workouts: [{ workoutTemplateId: templateId }] })
      .expect(409);
  });
});
