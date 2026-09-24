import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  isPostgresCheckViolation,
  isPostgresForeignKeyViolation,
  isPostgresUniqueViolation,
} from '../../database/postgres-errors';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { parseStrictIsoDate } from '../clients/iso-date.util';
import { ClientProfile } from '../clients/entities/client-profile.entity';
import { ClientsService } from '../clients/clients.service';
import { TrainerClientAccessService } from '../trainer-client-assignments/trainer-client-access.service';
import { TrainingPlansService } from '../training-plans/training-plans.service';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { ExerciseMediaService } from '../exercises/media/exercise-media.service';
import { optionalPlainText } from '../workout-templates/workout-template-text.util';
import { ListWorkoutSessionsQueryDto } from './dto/list-workout-sessions-query.dto';
import { WorkoutSetInputDto } from './dto/replace-workout-sets.dto';
import { StartWorkoutSessionDto } from './dto/start-workout-session.dto';
import {
  CurrentWorkoutSessionResponseDto,
  PaginatedWorkoutSessionsResponseDto,
  WorkoutSessionResponseDto,
} from './dto/workout-session-response.dto';
import { WorkoutSessionExercise } from './entities/workout-session-exercise.entity';
import { WorkoutSession } from './entities/workout-session.entity';
import { WorkoutSet } from './entities/workout-set.entity';
import { WorkoutSessionLifecycleStatus } from './enums/workout-session-lifecycle-status.enum';
import { WorkoutSessionStatus } from './enums/workout-session-status.enum';
import { assertActualSetMatchesPrescription } from './workout-session-execution.util';
import {
  toWorkoutSessionResponse,
  toWorkoutSessionSummary,
} from './workout-sessions.mapper';

@Injectable()
export class WorkoutSessionsService {
  private readonly logger = new Logger(WorkoutSessionsService.name);

  constructor(
    @InjectRepository(WorkoutSession)
    private readonly sessions: Repository<WorkoutSession>,
    private readonly clients: ClientsService,
    private readonly access: TrainerClientAccessService,
    private readonly plans: TrainingPlansService,
    private readonly dataSource: DataSource,
    private readonly exerciseMedia: ExerciseMediaService,
  ) {}

  async start(
    dto: StartWorkoutSessionDto,
    actor: AuthenticatedUser,
  ): Promise<WorkoutSessionResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);
    this.assertClientMutable(profile);

    try {
      const sessionId = await this.dataSource.transaction(async (manager) => {
        const locked = await this.clients.lockByIdWithUser(manager, profile.id);
        if (!locked) {
          throw new NotFoundException('Client not found');
        }
        this.assertClientMutable(locked);

        const { plan, workout, exercises } =
          await this.plans.requireActivePlanWorkoutForClient(
            locked.id,
            dto.trainingPlanWorkoutId,
            manager,
          );

        const existing = await manager
          .getRepository(WorkoutSession)
          .createQueryBuilder('session')
          .setLock('pessimistic_write')
          .where('session.clientProfileId = :clientProfileId', {
            clientProfileId: locked.id,
          })
          .andWhere('session.status = :status', {
            status: WorkoutSessionStatus.IN_PROGRESS,
          })
          .getOne();
        if (existing) {
          throw new ConflictException(
            'An IN_PROGRESS workout session already exists',
          );
        }

        const session = await manager.getRepository(WorkoutSession).save(
          manager.getRepository(WorkoutSession).create({
            clientProfileId: locked.id,
            trainingPlanId: plan.id,
            sourceTrainingPlanWorkoutId: workout.id,
            workoutNameSnapshot: workout.nameSnapshot,
            workoutDescriptionSnapshot: workout.descriptionSnapshot,
            scheduledDaySnapshot: workout.scheduledDay,
            status: WorkoutSessionStatus.IN_PROGRESS,
            startedAt: new Date(),
            completedAt: null,
            cancelledAt: null,
            notes: null,
          }),
        );

        const rows = exercises.map((item) =>
          manager.getRepository(WorkoutSessionExercise).create({
            workoutSessionId: session.id,
            sourceTrainingPlanExerciseId: item.id,
            exerciseId: item.exerciseId,
            exerciseNameSnapshot: item.exerciseNameSnapshot,
            position: item.position,
            prescribedSets: item.sets,
            prescriptionType: item.prescriptionType,
            prescribedRepsMin: item.repsMin,
            prescribedRepsMax: item.repsMax,
            prescribedDurationSeconds: item.durationSeconds,
            prescribedRestSeconds: item.restSeconds,
            prescribedTargetLoadKg: item.targetLoadKg,
            prescribedTargetRpe: item.targetRpe,
            prescribedTargetRir: item.targetRir,
            prescribedTempo: item.tempo,
            prescribedNotes: item.notes,
          }),
        );
        await manager.getRepository(WorkoutSessionExercise).save(rows);
        return session.id;
      });

      this.logger.log(
        JSON.stringify({
          event: 'workout_session_started',
          workoutSessionId: sessionId,
          clientProfileId: profile.id,
        }),
      );

      return this.loadDetailResponse(profile.id, sessionId);
    } catch (error) {
      this.throwMappedPersistenceError(error);
    }
  }

  async listMine(
    query: ListWorkoutSessionsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedWorkoutSessionsResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);
    return this.list(profile.id, query);
  }

  async listForClient(
    clientProfileId: string,
    query: ListWorkoutSessionsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedWorkoutSessionsResponseDto> {
    await this.assertActorCanReadClientSessions(actor, clientProfileId);
    return this.list(clientProfileId, query);
  }

  async getCurrentMine(
    actor: AuthenticatedUser,
  ): Promise<CurrentWorkoutSessionResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);
    const session = await this.sessions
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.exercises', 'exercise')
      .leftJoinAndSelect('exercise.sets', 'set')
      .where('session.clientProfileId = :clientProfileId', {
        clientProfileId: profile.id,
      })
      .andWhere('session.status = :status', {
        status: WorkoutSessionStatus.IN_PROGRESS,
      })
      .orderBy('exercise.position', 'ASC')
      .addOrderBy('set.setNumber', 'ASC')
      .getOne();

    return {
      workoutSession: session
        ? await this.toDetailResponse(session, session.exercises)
        : null,
    };
  }

  async getMineById(
    sessionId: string,
    actor: AuthenticatedUser,
  ): Promise<WorkoutSessionResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);
    return this.loadDetailResponse(profile.id, sessionId);
  }

  async getByIdForClient(
    clientProfileId: string,
    sessionId: string,
    actor: AuthenticatedUser,
  ): Promise<WorkoutSessionResponseDto> {
    await this.assertActorCanReadClientSessions(actor, clientProfileId);
    return this.loadDetailResponse(clientProfileId, sessionId);
  }

  async replaceSets(
    sessionId: string,
    sessionExerciseId: string,
    sets: WorkoutSetInputDto[],
    actor: AuthenticatedUser,
  ): Promise<WorkoutSessionResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);

    try {
      await this.dataSource.transaction(async (manager) => {
        const session = await this.lockOwnedSession(
          profile.id,
          sessionId,
          manager,
        );
        this.assertInProgress(session);

        const exercise = await manager
          .getRepository(WorkoutSessionExercise)
          .findOne({
            where: { id: sessionExerciseId, workoutSessionId: session.id },
          });
        if (!exercise) {
          throw new NotFoundException('Workout session exercise not found');
        }

        for (const set of sets) {
          assertActualSetMatchesPrescription(exercise.prescriptionType, set);
        }

        await manager.getRepository(WorkoutSet).delete({
          workoutSessionExerciseId: exercise.id,
        });

        if (sets.length === 0) {
          return;
        }

        const rows = sets.map((input, index) =>
          manager.getRepository(WorkoutSet).create({
            workoutSessionExerciseId: exercise.id,
            setNumber: index + 1,
            actualReps:
              input.actualReps === undefined ? null : input.actualReps,
            actualDurationSeconds:
              input.actualDurationSeconds === undefined
                ? null
                : input.actualDurationSeconds,
            actualLoadKg:
              input.actualLoadKg === undefined ? null : input.actualLoadKg,
            actualRpe: input.actualRpe === undefined ? null : input.actualRpe,
            actualRir: input.actualRir === undefined ? null : input.actualRir,
            notes: optionalPlainText(input.notes),
          }),
        );
        await manager.getRepository(WorkoutSet).save(rows);
      });
    } catch (error) {
      this.throwMappedPersistenceError(error);
    }

    this.logger.log(
      JSON.stringify({
        event: 'workout_session_sets_updated',
        workoutSessionId: sessionId,
        workoutSessionExerciseId: sessionExerciseId,
        clientProfileId: profile.id,
      }),
    );

    return this.loadDetailResponse(profile.id, sessionId);
  }

  async updateStatus(
    sessionId: string,
    status: WorkoutSessionLifecycleStatus,
    actor: AuthenticatedUser,
  ): Promise<WorkoutSessionResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);

    try {
      await this.dataSource.transaction(async (manager) => {
        const session = await this.lockOwnedSession(
          profile.id,
          sessionId,
          manager,
        );

        if (session.status === (status as string)) {
          return;
        }

        if (session.status !== WorkoutSessionStatus.IN_PROGRESS) {
          throw new ConflictException('Workout session is already terminal');
        }

        if (status === WorkoutSessionLifecycleStatus.COMPLETED) {
          const recorded = await manager
            .getRepository(WorkoutSet)
            .createQueryBuilder('set')
            .innerJoin('set.sessionExercise', 'exercise')
            .where('exercise.workoutSessionId = :sessionId', {
              sessionId: session.id,
            })
            .getCount();
          if (recorded === 0) {
            throw new ConflictException(
              'COMPLETED sessions require at least one recorded set',
            );
          }
          session.status = WorkoutSessionStatus.COMPLETED;
          session.completedAt = new Date();
          session.cancelledAt = null;
          await manager.getRepository(WorkoutSession).save(session);
          this.logger.log(
            JSON.stringify({
              event: 'workout_session_completed',
              workoutSessionId: session.id,
              clientProfileId: profile.id,
            }),
          );
          return;
        }

        session.status = WorkoutSessionStatus.CANCELLED;
        session.cancelledAt = new Date();
        session.completedAt = null;
        await manager.getRepository(WorkoutSession).save(session);
        this.logger.log(
          JSON.stringify({
            event: 'workout_session_cancelled',
            workoutSessionId: session.id,
            clientProfileId: profile.id,
          }),
        );
      });
    } catch (error) {
      this.throwMappedPersistenceError(error);
    }

    return this.loadDetailResponse(profile.id, sessionId);
  }

  private async list(
    clientProfileId: string,
    query: ListWorkoutSessionsQueryDto,
  ): Promise<PaginatedWorkoutSessionsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    this.assertDateRange(query.dateFrom, query.dateTo);

    const qb = this.sessions
      .createQueryBuilder('session')
      .where('session.clientProfileId = :clientProfileId', { clientProfileId });

    if (query.status) {
      qb.andWhere('session.status = :status', { status: query.status });
    }

    if (query.dateFrom) {
      qb.andWhere('session.startedAt >= :dateFrom', {
        dateFrom: utcDayStart(query.dateFrom),
      });
    }
    if (query.dateTo) {
      qb.andWhere('session.startedAt < :dateToExclusive', {
        dateToExclusive: utcDayEndExclusive(query.dateTo),
      });
    }

    qb.orderBy('session.startedAt', 'DESC')
      .addOrderBy('session.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, totalItems] = await qb.getManyAndCount();

    return {
      data: rows.map((row) => toWorkoutSessionSummary(row)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
      },
    };
  }

  private async assertActorCanReadClientSessions(
    actor: AuthenticatedUser,
    clientProfileId: string,
  ): Promise<void> {
    if (actor.role === UserRole.CLIENT) {
      throw new ForbiddenException();
    }

    if (actor.role === UserRole.TRAINER) {
      await this.access.assertCanAccessClient(actor.id, clientProfileId);
    }

    const client = await this.clients.findByIdWithUser(clientProfileId);
    if (!client) {
      throw new NotFoundException('Client not found');
    }
  }

  private assertClientActor(actor: AuthenticatedUser): void {
    if (actor.role !== UserRole.CLIENT) {
      throw new ForbiddenException();
    }
  }

  private assertClientMutable(client: ClientProfile): void {
    if (client.user.status !== UserStatus.ACTIVE) {
      throw new ConflictException('Client is disabled');
    }
  }

  private async requireOwnClientProfile(
    actor: AuthenticatedUser,
  ): Promise<ClientProfile> {
    const profile = await this.clients.findByUserIdWithUser(actor.id);
    if (!profile) {
      this.logger.error(
        JSON.stringify({
          event: 'client_profile_missing',
          userId: actor.id,
        }),
      );
      throw new InternalServerErrorException(
        'Client profile is missing for this account',
      );
    }
    return profile;
  }

  private assertInProgress(session: WorkoutSession): void {
    if (session.status !== WorkoutSessionStatus.IN_PROGRESS) {
      throw new ConflictException('Workout session is not IN_PROGRESS');
    }
  }

  private assertDateRange(dateFrom?: string, dateTo?: string): void {
    if (dateFrom && dateTo && dateTo < dateFrom) {
      throw new BadRequestException('dateTo must be on or after dateFrom');
    }
  }

  private async lockOwnedSession(
    clientProfileId: string,
    sessionId: string,
    manager: EntityManager,
  ): Promise<WorkoutSession> {
    const session = await manager
      .getRepository(WorkoutSession)
      .createQueryBuilder('session')
      .setLock('pessimistic_write')
      .where('session.id = :sessionId', { sessionId })
      .getOne();
    if (!session || session.clientProfileId !== clientProfileId) {
      throw new NotFoundException('Workout session not found');
    }
    return session;
  }

  private async loadDetail(
    clientProfileId: string,
    sessionId: string,
  ): Promise<WorkoutSession> {
    const session = await this.sessions
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.exercises', 'exercise')
      .leftJoinAndSelect('exercise.sets', 'set')
      .where('session.id = :sessionId', { sessionId })
      .andWhere('session.clientProfileId = :clientProfileId', {
        clientProfileId,
      })
      .orderBy('exercise.position', 'ASC')
      .addOrderBy('set.setNumber', 'ASC')
      .getOne();
    if (!session) {
      throw new NotFoundException('Workout session not found');
    }
    session.exercises = session.exercises ?? [];
    return session;
  }

  private async loadDetailResponse(
    clientProfileId: string,
    sessionId: string,
  ): Promise<WorkoutSessionResponseDto> {
    const session = await this.loadDetail(clientProfileId, sessionId);
    return this.toDetailResponse(session, session.exercises);
  }

  private async toDetailResponse(
    session: WorkoutSession,
    exercises: WorkoutSessionExercise[] = session.exercises ?? [],
  ): Promise<WorkoutSessionResponseDto> {
    const demonstrationByExerciseId =
      await this.exerciseMedia.findReadyDemonstrations(
        exercises.map((item) => item.exerciseId),
      );
    return toWorkoutSessionResponse(
      session,
      exercises,
      demonstrationByExerciseId,
    );
  }

  private throwMappedPersistenceError(error: unknown): never {
    if (error instanceof BadRequestException) {
      throw error;
    }
    if (error instanceof ConflictException) {
      throw error;
    }
    if (error instanceof NotFoundException) {
      throw error;
    }
    if (isPostgresUniqueViolation(error)) {
      throw new ConflictException(
        'An IN_PROGRESS workout session already exists',
      );
    }
    if (isPostgresCheckViolation(error)) {
      throw new BadRequestException('Invalid workout session');
    }
    if (isPostgresForeignKeyViolation(error)) {
      throw new ConflictException('Workout session reference is invalid');
    }
    throw error;
  }
}

function utcDayStart(isoDate: string): Date {
  const parsed = parseStrictIsoDate(isoDate);
  if (!parsed) {
    throw new BadRequestException('Invalid date');
  }
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
}

function utcDayEndExclusive(isoDate: string): Date {
  const start = utcDayStart(isoDate);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}
