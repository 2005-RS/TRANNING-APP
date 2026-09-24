import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  isPostgresCheckViolation,
  isPostgresForeignKeyViolation,
} from '../../database/postgres-errors';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { Exercise } from '../exercises/entities/exercise.entity';
import { ExercisesService } from '../exercises/exercises.service';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateWorkoutTemplateDto } from './dto/create-workout-template.dto';
import { ListWorkoutTemplatesQueryDto } from './dto/list-workout-templates-query.dto';
import { WorkoutTemplateExerciseInputDto } from './dto/replace-workout-template-exercises.dto';
import { UpdateWorkoutTemplateDto } from './dto/update-workout-template.dto';
import {
  PaginatedWorkoutTemplatesResponseDto,
  WorkoutTemplateResponseDto,
} from './dto/workout-template-response.dto';
import { WorkoutTemplateExercise } from './entities/workout-template-exercise.entity';
import { WorkoutTemplate } from './entities/workout-template.entity';
import { WorkoutPrescriptionType } from './enums/workout-prescription-type.enum';
import {
  SortDirection,
  WorkoutTemplateSortField,
} from './enums/workout-template-sort-field.enum';
import { WorkoutTemplateLifecycleStatus } from './enums/workout-template-lifecycle-status.enum';
import { WorkoutTemplateStatus } from './enums/workout-template-status.enum';
import { assertWorkoutTemplatePrescription } from './workout-template-prescription.util';
import {
  normalizeTemplateName,
  optionalPlainText,
} from './workout-template-text.util';
import {
  toWorkoutTemplateResponse,
  toWorkoutTemplateSummary,
} from './workout-templates.mapper';

export interface UsableWorkoutTemplate {
  template: WorkoutTemplate;
  items: WorkoutTemplateExercise[];
}

const SORT_COLUMNS: Record<WorkoutTemplateSortField, string> = {
  [WorkoutTemplateSortField.Name]: 'template.name',
  [WorkoutTemplateSortField.CreatedAt]: 'template.createdAt',
  [WorkoutTemplateSortField.UpdatedAt]: 'template.updatedAt',
};

@Injectable()
export class WorkoutTemplatesService {
  private readonly logger = new Logger(WorkoutTemplatesService.name);

  constructor(
    @InjectRepository(WorkoutTemplate)
    private readonly templates: Repository<WorkoutTemplate>,
    private readonly exercises: ExercisesService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    dto: CreateWorkoutTemplateDto,
    actor: AuthenticatedUser,
  ): Promise<WorkoutTemplateResponseDto> {
    const saved = await this.templates.save(
      this.templates.create({
        name: normalizeTemplateName(dto.name),
        description: optionalPlainText(dto.description),
        status: WorkoutTemplateStatus.DRAFT,
        createdByUserId: actor.id,
      }),
    );

    this.logger.log(
      JSON.stringify({
        event: 'workout_template_created',
        workoutTemplateId: saved.id,
        createdByUserId: actor.id,
      }),
    );

    return toWorkoutTemplateResponse(saved, []);
  }

  async list(
    query: ListWorkoutTemplatesQueryDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedWorkoutTemplatesResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = query.sort ?? WorkoutTemplateSortField.CreatedAt;
    const sortColumn = SORT_COLUMNS[sort];
    const direction =
      (query.direction ?? SortDirection.Desc) === SortDirection.Asc
        ? 'ASC'
        : 'DESC';
    const status = query.status ?? WorkoutTemplateStatus.ACTIVE;

    const qb = this.templates
      .createQueryBuilder('template')
      .where('template.status = :status', { status });

    if (
      actor.role !== UserRole.ADMIN &&
      status !== WorkoutTemplateStatus.ACTIVE
    ) {
      qb.andWhere('template.createdByUserId = :actorId', { actorId: actor.id });
    }

    if (query.search?.trim()) {
      const search = `%${this.escapeIlike(query.search.trim())}%`;
      qb.andWhere(
        `(template.name ILIKE :search ESCAPE '\\' OR template.description ILIKE :search ESCAPE '\\')`,
        { search },
      );
    }

    qb.orderBy(sortColumn, direction)
      .addOrderBy('template.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, totalItems] = await qb.getManyAndCount();

    return {
      data: rows.map((row) => toWorkoutTemplateSummary(row)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
      },
    };
  }

  async getById(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<WorkoutTemplateResponseDto> {
    const template = await this.loadDetail(id);
    this.assertReadAccess(template, actor);
    return toWorkoutTemplateResponse(template, template.items);
  }

  async update(
    id: string,
    dto: UpdateWorkoutTemplateDto,
    actor: AuthenticatedUser,
  ): Promise<WorkoutTemplateResponseDto> {
    const saved = await this.dataSource.transaction(async (manager) => {
      const template = await this.lockTemplate(id, manager);
      this.assertMutationAccess(template, actor);
      this.assertEditable(template);

      if (dto.name !== undefined) {
        template.name = normalizeTemplateName(dto.name);
      }
      if (dto.description !== undefined) {
        template.description = optionalPlainText(dto.description);
      }

      return manager.getRepository(WorkoutTemplate).save(template);
    });

    return this.loadDetailResponse(saved.id);
  }

  async replaceExercises(
    id: string,
    items: WorkoutTemplateExerciseInputDto[],
    actor: AuthenticatedUser,
  ): Promise<WorkoutTemplateResponseDto> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const template = await this.lockTemplate(id, manager);
        this.assertMutationAccess(template, actor);
        this.assertEditable(template);

        if (
          template.status === WorkoutTemplateStatus.ACTIVE &&
          items.length === 0
        ) {
          throw new ConflictException(
            'ACTIVE workout templates cannot have an empty exercise list',
          );
        }

        items.forEach((item) => assertWorkoutTemplatePrescription(item));

        const exerciseIds = items.map((item) => item.exerciseId);
        await this.exercises.requireActiveByIds(exerciseIds, manager);

        await manager.getRepository(WorkoutTemplateExercise).delete({
          workoutTemplateId: template.id,
        });

        if (items.length === 0) {
          return;
        }

        const rows = items.map((item, index) =>
          manager.getRepository(WorkoutTemplateExercise).create({
            workoutTemplateId: template.id,
            exerciseId: item.exerciseId,
            position: index + 1,
            sets: item.sets,
            prescriptionType: item.prescriptionType,
            repsMin:
              item.prescriptionType === WorkoutPrescriptionType.REPS
                ? (item.repsMin ?? null)
                : null,
            repsMax:
              item.prescriptionType === WorkoutPrescriptionType.REPS
                ? (item.repsMax ?? null)
                : null,
            durationSeconds:
              item.prescriptionType === WorkoutPrescriptionType.DURATION
                ? (item.durationSeconds ?? null)
                : null,
            restSeconds: item.restSeconds,
            targetRpe: item.targetRpe ?? null,
            targetRir: item.targetRir ?? null,
            tempo: optionalPlainText(item.tempo),
            notes: optionalPlainText(item.notes),
          }),
        );

        await manager.getRepository(WorkoutTemplateExercise).save(rows);
      });
    } catch (error) {
      this.throwMappedPersistenceError(error);
    }

    this.logger.log(
      JSON.stringify({
        event: 'workout_template_exercises_replaced',
        workoutTemplateId: id,
        itemCount: items.length,
        actorUserId: actor.id,
      }),
    );

    return this.loadDetailResponse(id);
  }

  async updateStatus(
    id: string,
    status: WorkoutTemplateLifecycleStatus,
    actor: AuthenticatedUser,
  ): Promise<WorkoutTemplateResponseDto> {
    const saved = await this.dataSource.transaction(async (manager) => {
      const template = await this.lockTemplate(id, manager);
      this.assertMutationAccess(template, actor);
      const previous = template.status;

      if (status === WorkoutTemplateLifecycleStatus.ARCHIVED) {
        template.status = WorkoutTemplateStatus.ARCHIVED;
      } else if (previous !== WorkoutTemplateStatus.ACTIVE) {
        const items = await this.loadItems(template.id, manager);
        await this.assertUsablePrescription(items, manager);
        template.status = WorkoutTemplateStatus.ACTIVE;
      }

      const updated = await manager
        .getRepository(WorkoutTemplate)
        .save(template);

      if (previous !== updated.status) {
        this.logger.log(
          JSON.stringify({
            event:
              updated.status === WorkoutTemplateStatus.ARCHIVED
                ? 'workout_template_archived'
                : 'workout_template_activated',
            workoutTemplateId: updated.id,
            actorUserId: actor.id,
          }),
        );
      }

      return updated;
    });

    return this.loadDetailResponse(saved.id);
  }

  /**
   * Future TrainingPlan creation must call this instead of querying
   * WorkoutTemplate repositories directly. ACTIVE status is required, but
   * is not sufficient: every referenced Exercise must still be ACTIVE.
   * Archiving an Exercise does not mutate template status.
   */
  async requireUsableTemplate(
    id: string,
    manager?: EntityManager,
  ): Promise<WorkoutTemplate> {
    const usable = await this.requireUsableTemplateWithItems(id, manager);
    return usable.template;
  }

  /**
   * Returns the usable ACTIVE template and its ordered items.
   *
   * TrainingPlan must snapshot these prescriptions into plan-specific
   * entities. Later edits to WorkoutTemplate / WorkoutTemplateExercise must
   * not rewrite an already assigned client plan.
   */
  async requireUsableTemplateWithItems(
    id: string,
    manager?: EntityManager,
  ): Promise<UsableWorkoutTemplate> {
    const template = await this.loadDetail(id, manager);
    if (template.status !== WorkoutTemplateStatus.ACTIVE) {
      throw new ConflictException('Workout template is not usable');
    }
    await this.assertUsablePrescription(template.items, manager);
    return { template, items: template.items };
  }

  private async assertUsablePrescription(
    items: WorkoutTemplateExercise[],
    manager?: EntityManager,
  ): Promise<Exercise[]> {
    if (items.length === 0) {
      throw new ConflictException('Workout template has no exercises');
    }

    return this.exercises.requireActiveByIds(
      items.map((item) => item.exerciseId),
      manager,
    );
  }

  private async loadDetail(
    id: string,
    manager?: EntityManager,
  ): Promise<WorkoutTemplate> {
    const templates = manager?.getRepository(WorkoutTemplate) ?? this.templates;
    const template = await templates.findOne({
      where: { id },
      relations: { items: { exercise: true } },
      order: { items: { position: 'ASC' } },
    });
    if (!template) {
      throw new NotFoundException('Workout template not found');
    }
    template.items = template.items ?? [];
    return template;
  }

  private async loadDetailResponse(
    id: string,
  ): Promise<WorkoutTemplateResponseDto> {
    const template = await this.loadDetail(id);
    return toWorkoutTemplateResponse(template, template.items);
  }

  private async loadItems(
    workoutTemplateId: string,
    manager: EntityManager,
  ): Promise<WorkoutTemplateExercise[]> {
    return manager.getRepository(WorkoutTemplateExercise).find({
      where: { workoutTemplateId },
      relations: { exercise: true },
      order: { position: 'ASC' },
    });
  }

  private async lockTemplate(
    id: string,
    manager: EntityManager,
  ): Promise<WorkoutTemplate> {
    const template = await manager
      .getRepository(WorkoutTemplate)
      .createQueryBuilder('template')
      .setLock('pessimistic_write')
      .where('template.id = :id', { id })
      .getOne();
    if (!template) {
      throw new NotFoundException('Workout template not found');
    }
    return template;
  }

  private assertReadAccess(
    template: WorkoutTemplate,
    actor: AuthenticatedUser,
  ): void {
    if (actor.role === UserRole.ADMIN) {
      return;
    }
    if (template.status === WorkoutTemplateStatus.ACTIVE) {
      return;
    }
    if (template.createdByUserId === actor.id) {
      return;
    }
    throw new NotFoundException('Workout template not found');
  }

  private assertMutationAccess(
    template: WorkoutTemplate,
    actor: AuthenticatedUser,
  ): void {
    if (actor.role === UserRole.ADMIN) {
      return;
    }
    if (template.createdByUserId !== actor.id) {
      throw new NotFoundException('Workout template not found');
    }
  }

  private assertEditable(template: WorkoutTemplate): void {
    if (template.status === WorkoutTemplateStatus.ARCHIVED) {
      throw new ConflictException('Workout template is archived');
    }
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
    if (isPostgresCheckViolation(error)) {
      throw new BadRequestException('Invalid workout template prescription');
    }
    if (isPostgresForeignKeyViolation(error)) {
      throw new ConflictException('Workout template reference is invalid');
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
