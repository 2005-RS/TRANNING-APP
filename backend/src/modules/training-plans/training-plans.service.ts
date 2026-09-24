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
import { toIsoDateString } from '../clients/iso-date.util';
import { ClientProfile } from '../clients/entities/client-profile.entity';
import { ClientsService } from '../clients/clients.service';
import { ExercisesService } from '../exercises/exercises.service';
import { ActivityEventType } from '../activity-events/enums/activity-event-type.enum';
import { NotificationPublisherService } from '../notifications/notification-publisher.service';
import { TrainerClientAccessService } from '../trainer-client-assignments/trainer-client-access.service';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { WorkoutPrescriptionType } from '../workout-templates/enums/workout-prescription-type.enum';
import {
  normalizeTemplateName,
  optionalPlainText,
} from '../workout-templates/workout-template-text.util';
import {
  UsableWorkoutTemplate,
  WorkoutTemplatesService,
} from '../workout-templates/workout-templates.service';
import { CreateTrainingPlanDto } from './dto/create-training-plan.dto';
import { ListTrainingPlansQueryDto } from './dto/list-training-plans-query.dto';
import { TrainingPlanWorkoutInputDto } from './dto/replace-training-plan-workouts.dto';
import { UpdateTrainingPlanDto } from './dto/update-training-plan.dto';
import { UpdateTrainingPlanExerciseDto } from './dto/update-training-plan-exercise.dto';
import { UpdateTrainingPlanWorkoutDto } from './dto/update-training-plan-workout.dto';
import {
  CurrentTrainingPlanResponseDto,
  PaginatedTrainingPlansResponseDto,
  TrainingPlanResponseDto,
} from './dto/training-plan-response.dto';
import { TrainingPlanExercise } from './entities/training-plan-exercise.entity';
import { TrainingPlan } from './entities/training-plan.entity';
import { TrainingPlanWorkout } from './entities/training-plan-workout.entity';
import { TrainingPlanLifecycleStatus } from './enums/training-plan-lifecycle-status.enum';
import {
  SortDirection,
  TrainingPlanSortField,
} from './enums/training-plan-sort-field.enum';
import { TrainingPlanStatus } from './enums/training-plan-status.enum';
import { assertTrainingPlanPrescription } from './training-plan-prescription.util';
import {
  toTrainingPlanResponse,
  toTrainingPlanSummary,
} from './training-plans.mapper';

export interface ActivePlanWorkoutSnapshot {
  plan: TrainingPlan;
  workout: TrainingPlanWorkout;
  exercises: TrainingPlanExercise[];
}

const SORT_COLUMNS: Record<TrainingPlanSortField, string> = {
  [TrainingPlanSortField.Name]: 'plan.name',
  [TrainingPlanSortField.CreatedAt]: 'plan.createdAt',
  [TrainingPlanSortField.UpdatedAt]: 'plan.updatedAt',
  [TrainingPlanSortField.StartDate]: 'plan.startDate',
};

@Injectable()
export class TrainingPlansService {
  private readonly logger = new Logger(TrainingPlansService.name);

  constructor(
    @InjectRepository(TrainingPlan)
    private readonly plans: Repository<TrainingPlan>,
    private readonly clients: ClientsService,
    private readonly access: TrainerClientAccessService,
    private readonly templates: WorkoutTemplatesService,
    private readonly exercises: ExercisesService,
    private readonly notifications: NotificationPublisherService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    clientProfileId: string,
    dto: CreateTrainingPlanDto,
    actor: AuthenticatedUser,
  ): Promise<TrainingPlanResponseDto> {
    const client = await this.assertActorCanManageClientPlan(
      actor,
      clientProfileId,
    );
    this.assertClientMutable(client);
    this.assertDateRange(dto.startDate ?? null, dto.endDate ?? null);

    const saved = await this.plans.save(
      this.plans.create({
        clientProfileId,
        name: normalizeTemplateName(dto.name),
        description: optionalPlainText(dto.description),
        status: TrainingPlanStatus.DRAFT,
        startDate: dto.startDate ?? null,
        endDate: dto.endDate ?? null,
        createdByUserId: actor.id,
        activatedAt: null,
        archivedAt: null,
      }),
    );

    this.logger.log(
      JSON.stringify({
        event: 'training_plan_created',
        trainingPlanId: saved.id,
        clientProfileId,
        createdByUserId: actor.id,
      }),
    );

    return toTrainingPlanResponse(saved, []);
  }

  async listForClient(
    clientProfileId: string,
    query: ListTrainingPlansQueryDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedTrainingPlansResponseDto> {
    await this.assertActorCanManageClientPlan(actor, clientProfileId);
    return this.list(clientProfileId, query);
  }

  async listMine(
    query: ListTrainingPlansQueryDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedTrainingPlansResponseDto> {
    const profile = await this.requireOwnClientProfile(actor);
    const status =
      query.status === TrainingPlanStatus.DRAFT
        ? null
        : (query.status ?? undefined);
    return this.list(profile.id, query, {
      excludeDraft: true,
      forcedStatus: status,
    });
  }

  async getById(
    clientProfileId: string,
    planId: string,
    actor: AuthenticatedUser,
  ): Promise<TrainingPlanResponseDto> {
    await this.assertActorCanManageClientPlan(actor, clientProfileId);
    return this.loadDetailResponse(clientProfileId, planId);
  }

  async getMineById(
    planId: string,
    actor: AuthenticatedUser,
  ): Promise<TrainingPlanResponseDto> {
    const profile = await this.requireOwnClientProfile(actor);
    const plan = await this.loadDetail(profile.id, planId);
    if (plan.status === TrainingPlanStatus.DRAFT) {
      throw new NotFoundException('Training plan not found');
    }
    return toTrainingPlanResponse(plan, plan.workouts);
  }

  async getCurrentMine(
    actor: AuthenticatedUser,
  ): Promise<CurrentTrainingPlanResponseDto> {
    const profile = await this.requireOwnClientProfile(actor);
    const plan = await this.plans
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.workouts', 'workout')
      .leftJoinAndSelect('workout.exercises', 'exercise')
      .where('plan.clientProfileId = :clientProfileId', {
        clientProfileId: profile.id,
      })
      .andWhere('plan.status = :status', { status: TrainingPlanStatus.ACTIVE })
      .orderBy('workout.position', 'ASC')
      .addOrderBy('exercise.position', 'ASC')
      .getOne();

    return {
      trainingPlan: plan ? toTrainingPlanResponse(plan, plan.workouts) : null,
    };
  }

  /**
   * Loads the current ACTIVE plan workout for session start.
   * Uses the same EntityManager as the caller. Does not check live
   * Exercise.status: the ACTIVE plan snapshot is the prescription authority.
   * Workouts that are not on the current ACTIVE plan return a safe 404.
   */
  async requireActivePlanWorkoutForClient(
    clientProfileId: string,
    trainingPlanWorkoutId: string,
    manager: EntityManager,
  ): Promise<ActivePlanWorkoutSnapshot> {
    const plan = await manager
      .getRepository(TrainingPlan)
      .createQueryBuilder('plan')
      .setLock('pessimistic_write')
      .where('plan.clientProfileId = :clientProfileId', { clientProfileId })
      .andWhere('plan.status = :status', { status: TrainingPlanStatus.ACTIVE })
      .getOne();
    if (!plan) {
      throw new NotFoundException('Training plan workout not found');
    }

    const workout = await manager.getRepository(TrainingPlanWorkout).findOne({
      where: { id: trainingPlanWorkoutId, trainingPlanId: plan.id },
    });
    if (!workout) {
      throw new NotFoundException('Training plan workout not found');
    }

    const exercises = await manager.getRepository(TrainingPlanExercise).find({
      where: { trainingPlanWorkoutId: workout.id },
      order: { position: 'ASC' },
    });
    if (exercises.length === 0) {
      throw new ConflictException('Training plan workout has no exercises');
    }

    return { plan, workout, exercises };
  }

  async update(
    clientProfileId: string,
    planId: string,
    dto: UpdateTrainingPlanDto,
    actor: AuthenticatedUser,
  ): Promise<TrainingPlanResponseDto> {
    const client = await this.assertActorCanManageClientPlan(
      actor,
      clientProfileId,
    );
    this.assertClientMutable(client);

    const saved = await this.dataSource.transaction(async (manager) => {
      const plan = await this.lockPlan(clientProfileId, planId, manager);
      this.assertEditable(plan);

      if (dto.name !== undefined) {
        plan.name = normalizeTemplateName(dto.name);
      }
      if (dto.description !== undefined) {
        plan.description = optionalPlainText(dto.description);
      }
      if (dto.startDate !== undefined) {
        plan.startDate = dto.startDate;
      }
      if (dto.endDate !== undefined) {
        plan.endDate = dto.endDate;
      }
      this.assertDateRange(
        this.toDateString(plan.startDate),
        this.toDateString(plan.endDate),
      );

      return manager.getRepository(TrainingPlan).save(plan);
    });

    return this.loadDetailResponse(clientProfileId, saved.id);
  }

  async replaceWorkouts(
    clientProfileId: string,
    planId: string,
    workouts: TrainingPlanWorkoutInputDto[],
    actor: AuthenticatedUser,
  ): Promise<TrainingPlanResponseDto> {
    const client = await this.assertActorCanManageClientPlan(
      actor,
      clientProfileId,
    );
    this.assertClientMutable(client);

    try {
      await this.dataSource.transaction(async (manager) => {
        const plan = await this.lockPlan(clientProfileId, planId, manager);
        this.assertEditable(plan);

        if (
          plan.status === TrainingPlanStatus.ACTIVE &&
          workouts.length === 0
        ) {
          throw new ConflictException(
            'ACTIVE training plans cannot have an empty workout list',
          );
        }

        const snapshots: UsableWorkoutTemplate[] = [];
        for (const input of workouts) {
          snapshots.push(
            await this.templates.requireUsableTemplateWithItems(
              input.workoutTemplateId,
              manager,
            ),
          );
        }

        await manager.getRepository(TrainingPlanWorkout).delete({
          trainingPlanId: plan.id,
        });

        for (const [index, input] of workouts.entries()) {
          const { template, items } = snapshots[index];
          const workout = await manager.getRepository(TrainingPlanWorkout).save(
            manager.getRepository(TrainingPlanWorkout).create({
              trainingPlanId: plan.id,
              sourceWorkoutTemplateId: template.id,
              nameSnapshot: template.name,
              descriptionSnapshot: template.description,
              position: index + 1,
              scheduledDay: input.scheduledDay ?? null,
              notes: optionalPlainText(input.notes),
            }),
          );

          const exerciseRows = items.map((item, exerciseIndex) =>
            manager.getRepository(TrainingPlanExercise).create({
              trainingPlanWorkoutId: workout.id,
              exerciseId: item.exerciseId,
              exerciseNameSnapshot: item.exercise.name,
              position: exerciseIndex + 1,
              sets: item.sets,
              prescriptionType: item.prescriptionType,
              repsMin: item.repsMin,
              repsMax: item.repsMax,
              durationSeconds: item.durationSeconds,
              restSeconds: item.restSeconds,
              targetLoadKg: null,
              targetRpe: item.targetRpe,
              targetRir: item.targetRir,
              tempo: item.tempo,
              notes: item.notes,
            }),
          );
          if (exerciseRows.length > 0) {
            await manager
              .getRepository(TrainingPlanExercise)
              .save(exerciseRows);
          }
        }
      });
    } catch (error) {
      this.throwMappedPersistenceError(error);
    }

    this.logger.log(
      JSON.stringify({
        event: 'training_plan_workouts_snapshotted',
        trainingPlanId: planId,
        clientProfileId,
        workoutCount: workouts.length,
        actorUserId: actor.id,
      }),
    );

    return this.loadDetailResponse(clientProfileId, planId);
  }

  async updateWorkout(
    clientProfileId: string,
    planId: string,
    planWorkoutId: string,
    dto: UpdateTrainingPlanWorkoutDto,
    actor: AuthenticatedUser,
  ): Promise<TrainingPlanResponseDto> {
    const client = await this.assertActorCanManageClientPlan(
      actor,
      clientProfileId,
    );
    this.assertClientMutable(client);

    await this.dataSource.transaction(async (manager) => {
      const plan = await this.lockPlan(clientProfileId, planId, manager);
      this.assertEditable(plan);
      const workout = await manager.getRepository(TrainingPlanWorkout).findOne({
        where: { id: planWorkoutId, trainingPlanId: plan.id },
      });
      if (!workout) {
        throw new NotFoundException('Training plan workout not found');
      }
      if (dto.scheduledDay !== undefined) {
        workout.scheduledDay = dto.scheduledDay;
      }
      if (dto.notes !== undefined) {
        workout.notes = optionalPlainText(dto.notes);
      }
      await manager.getRepository(TrainingPlanWorkout).save(workout);
    });

    return this.loadDetailResponse(clientProfileId, planId);
  }

  async updateExercise(
    clientProfileId: string,
    planId: string,
    planExerciseId: string,
    dto: UpdateTrainingPlanExerciseDto,
    actor: AuthenticatedUser,
  ): Promise<TrainingPlanResponseDto> {
    const client = await this.assertActorCanManageClientPlan(
      actor,
      clientProfileId,
    );
    this.assertClientMutable(client);

    await this.dataSource.transaction(async (manager) => {
      const plan = await this.lockPlan(clientProfileId, planId, manager);
      this.assertEditable(plan);
      const item = await manager.getRepository(TrainingPlanExercise).findOne({
        where: { id: planExerciseId },
        relations: { workout: true },
      });
      if (!item || item.workout.trainingPlanId !== plan.id) {
        throw new NotFoundException('Training plan exercise not found');
      }

      const merged = {
        prescriptionType: dto.prescriptionType ?? item.prescriptionType,
        repsMin: dto.repsMin !== undefined ? dto.repsMin : item.repsMin,
        repsMax: dto.repsMax !== undefined ? dto.repsMax : item.repsMax,
        durationSeconds:
          dto.durationSeconds !== undefined
            ? dto.durationSeconds
            : item.durationSeconds,
        targetRpe: dto.targetRpe !== undefined ? dto.targetRpe : item.targetRpe,
        targetRir: dto.targetRir !== undefined ? dto.targetRir : item.targetRir,
        targetLoadKg:
          dto.targetLoadKg !== undefined ? dto.targetLoadKg : item.targetLoadKg,
      };
      assertTrainingPlanPrescription(merged);

      if (dto.sets !== undefined) {
        item.sets = dto.sets;
      }
      if (dto.restSeconds !== undefined) {
        item.restSeconds = dto.restSeconds;
      }
      item.prescriptionType = merged.prescriptionType;
      if (merged.prescriptionType === WorkoutPrescriptionType.REPS) {
        item.repsMin = merged.repsMin ?? null;
        item.repsMax = merged.repsMax ?? null;
        item.durationSeconds = null;
      } else {
        item.repsMin = null;
        item.repsMax = null;
        item.durationSeconds = merged.durationSeconds ?? null;
      }
      item.targetLoadKg = merged.targetLoadKg ?? null;
      item.targetRpe = merged.targetRpe ?? null;
      item.targetRir = merged.targetRir ?? null;
      if (dto.tempo !== undefined) {
        item.tempo = optionalPlainText(dto.tempo);
      }
      if (dto.notes !== undefined) {
        item.notes = optionalPlainText(dto.notes);
      }

      await manager.getRepository(TrainingPlanExercise).save(item);

      this.logger.log(
        JSON.stringify({
          event: 'training_plan_prescription_changed',
          trainingPlanId: plan.id,
          trainingPlanExerciseId: item.id,
          actorUserId: actor.id,
        }),
      );
    });

    return this.loadDetailResponse(clientProfileId, planId);
  }

  async updateStatus(
    clientProfileId: string,
    planId: string,
    status: TrainingPlanLifecycleStatus,
    actor: AuthenticatedUser,
  ): Promise<TrainingPlanResponseDto> {
    const client = await this.assertActorCanManageClientPlan(
      actor,
      clientProfileId,
    );
    this.assertClientMutable(client);

    try {
      await this.dataSource.transaction(async (manager) => {
        const lockedClient = await this.clients.lockByIdWithUser(
          manager,
          clientProfileId,
        );
        if (!lockedClient) {
          throw new NotFoundException('Client not found');
        }
        this.assertClientMutable(lockedClient);

        const plan = await this.lockPlan(clientProfileId, planId, manager);

        if (status === TrainingPlanLifecycleStatus.ARCHIVED) {
          if (plan.status === TrainingPlanStatus.ARCHIVED) {
            return;
          }
          plan.status = TrainingPlanStatus.ARCHIVED;
          plan.archivedAt = new Date();
          await manager.getRepository(TrainingPlan).save(plan);
          this.logger.log(
            JSON.stringify({
              event: 'training_plan_archived',
              trainingPlanId: plan.id,
              clientProfileId,
              actorUserId: actor.id,
            }),
          );
          return;
        }

        if (plan.status === TrainingPlanStatus.ACTIVE) {
          return;
        }

        await this.assertPlanActivatable(plan.id, manager);

        const previous = await manager
          .getRepository(TrainingPlan)
          .createQueryBuilder('plan')
          .setLock('pessimistic_write')
          .where('plan.clientProfileId = :clientProfileId', { clientProfileId })
          .andWhere('plan.status = :status', {
            status: TrainingPlanStatus.ACTIVE,
          })
          .andWhere('plan.id <> :planId', { planId: plan.id })
          .getOne();

        if (previous) {
          previous.status = TrainingPlanStatus.ARCHIVED;
          previous.archivedAt = new Date();
          await manager.getRepository(TrainingPlan).save(previous);
          this.logger.log(
            JSON.stringify({
              event: 'previous_active_training_plan_archived',
              trainingPlanId: previous.id,
              replacedByTrainingPlanId: plan.id,
              clientProfileId,
            }),
          );
        }

        plan.status = TrainingPlanStatus.ACTIVE;
        plan.activatedAt = new Date();
        plan.archivedAt = null;
        await manager.getRepository(TrainingPlan).save(plan);
        await this.notifications.publish(manager, {
          type: ActivityEventType.TRAINING_PLAN_ACTIVATED,
          actorUserId: actor.id,
          clientProfileId,
          relatedEntityId: plan.id,
          recipientUserId: lockedClient.userId,
        });
        this.logger.log(
          JSON.stringify({
            event: 'training_plan_activated',
            trainingPlanId: plan.id,
            clientProfileId,
            actorUserId: actor.id,
          }),
        );
      });
    } catch (error) {
      this.throwMappedPersistenceError(error);
    }

    return this.loadDetailResponse(clientProfileId, planId);
  }

  private async list(
    clientProfileId: string,
    query: ListTrainingPlansQueryDto,
    options?: {
      excludeDraft?: boolean;
      forcedStatus?: TrainingPlanStatus | null;
    },
  ): Promise<PaginatedTrainingPlansResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = query.sort ?? TrainingPlanSortField.CreatedAt;
    const sortColumn = SORT_COLUMNS[sort];
    const direction =
      (query.direction ?? SortDirection.Desc) === SortDirection.Asc
        ? 'ASC'
        : 'DESC';

    const qb = this.plans
      .createQueryBuilder('plan')
      .where('plan.clientProfileId = :clientProfileId', { clientProfileId });

    if (options?.forcedStatus === null) {
      qb.andWhere('1 = 0');
    } else if (options?.forcedStatus) {
      qb.andWhere('plan.status = :status', { status: options.forcedStatus });
    } else if (query.status) {
      qb.andWhere('plan.status = :status', { status: query.status });
    }

    if (options?.excludeDraft && !options.forcedStatus && !query.status) {
      qb.andWhere('plan.status IN (:...visible)', {
        visible: [TrainingPlanStatus.ACTIVE, TrainingPlanStatus.ARCHIVED],
      });
    }

    if (query.search?.trim()) {
      const search = `%${this.escapeIlike(query.search.trim())}%`;
      qb.andWhere(
        `(plan.name ILIKE :search ESCAPE '\\' OR plan.description ILIKE :search ESCAPE '\\')`,
        { search },
      );
    }

    qb.orderBy(sortColumn, direction)
      .addOrderBy('plan.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, totalItems] = await qb.getManyAndCount();

    return {
      data: rows.map((row) => toTrainingPlanSummary(row)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
      },
    };
  }

  private async assertActorCanManageClientPlan(
    actor: AuthenticatedUser,
    clientProfileId: string,
  ): Promise<ClientProfile> {
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
    return client;
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

  private assertEditable(plan: TrainingPlan): void {
    if (plan.status === TrainingPlanStatus.ARCHIVED) {
      throw new ConflictException('Training plan is archived');
    }
  }

  private assertDateRange(
    startDate: string | null,
    endDate: string | null,
  ): void {
    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }
  }

  private toDateString(value: Date | string | null): string | null {
    return toIsoDateString(value);
  }

  private async lockPlan(
    clientProfileId: string,
    planId: string,
    manager: EntityManager,
  ): Promise<TrainingPlan> {
    const plan = await manager
      .getRepository(TrainingPlan)
      .createQueryBuilder('plan')
      .setLock('pessimistic_write')
      .where('plan.id = :planId', { planId })
      .getOne();
    if (!plan || plan.clientProfileId !== clientProfileId) {
      throw new NotFoundException('Training plan not found');
    }
    return plan;
  }

  private async loadDetail(
    clientProfileId: string,
    planId: string,
  ): Promise<TrainingPlan> {
    const plan = await this.plans
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.workouts', 'workout')
      .leftJoinAndSelect('workout.exercises', 'exercise')
      .where('plan.id = :planId', { planId })
      .andWhere('plan.clientProfileId = :clientProfileId', { clientProfileId })
      .orderBy('workout.position', 'ASC')
      .addOrderBy('exercise.position', 'ASC')
      .getOne();
    if (!plan) {
      throw new NotFoundException('Training plan not found');
    }
    plan.workouts = plan.workouts ?? [];
    return plan;
  }

  private async loadDetailResponse(
    clientProfileId: string,
    planId: string,
  ): Promise<TrainingPlanResponseDto> {
    const plan = await this.loadDetail(clientProfileId, planId);
    return toTrainingPlanResponse(plan, plan.workouts);
  }

  private async assertPlanActivatable(
    planId: string,
    manager: EntityManager,
  ): Promise<void> {
    const workouts = await manager.getRepository(TrainingPlanWorkout).find({
      where: { trainingPlanId: planId },
      relations: { exercises: true },
      order: { position: 'ASC' },
    });
    if (workouts.length === 0) {
      throw new ConflictException('Training plan has no workouts');
    }

    const exerciseIds: string[] = [];
    for (const workout of workouts) {
      const items = workout.exercises ?? [];
      if (items.length === 0) {
        throw new ConflictException('Training plan workout has no exercises');
      }
      for (const item of items) {
        assertTrainingPlanPrescription(item);
        exerciseIds.push(item.exerciseId);
      }
    }

    await this.exercises.requireActiveByIds(exerciseIds, manager);
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
      throw new ConflictException('Client already has an ACTIVE training plan');
    }
    if (isPostgresCheckViolation(error)) {
      throw new BadRequestException('Invalid training plan');
    }
    if (isPostgresForeignKeyViolation(error)) {
      throw new ConflictException('Training plan reference is invalid');
    }
    throw error;
  }

  private escapeIlike(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  }
}
