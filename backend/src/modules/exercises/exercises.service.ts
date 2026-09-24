import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { isPostgresUniqueViolation } from '../../database/postgres-errors';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import {
  ExerciseResponseDto,
  PaginatedExercisesResponseDto,
} from './dto/exercise-response.dto';
import { ListExercisesQueryDto } from './dto/list-exercises-query.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { Exercise } from './entities/exercise.entity';
import {
  ExerciseSortField,
  SortDirection,
} from './enums/exercise-sort-field.enum';
import { ExerciseStatus } from './enums/exercise-status.enum';
import { normalizeExerciseName, optionalPlainText } from './exercise-text.util';
import { toExerciseResponse } from './exercises.mapper';

const SORT_COLUMNS: Record<ExerciseSortField, string> = {
  [ExerciseSortField.Name]: 'exercise.name',
  [ExerciseSortField.CreatedAt]: 'exercise.createdAt',
  [ExerciseSortField.UpdatedAt]: 'exercise.updatedAt',
};

@Injectable()
export class ExercisesService {
  private readonly logger = new Logger(ExercisesService.name);

  constructor(
    @InjectRepository(Exercise)
    private readonly exercises: Repository<Exercise>,
  ) {}

  async create(
    dto: CreateExerciseDto,
    actor: AuthenticatedUser,
  ): Promise<ExerciseResponseDto> {
    try {
      const saved = await this.exercises.save(
        this.exercises.create({
          name: normalizeExerciseName(dto.name),
          description: optionalPlainText(dto.description),
          instructions: optionalPlainText(dto.instructions),
          primaryMuscleGroup: dto.primaryMuscleGroup,
          equipmentType: dto.equipmentType,
          difficultyLevel: dto.difficultyLevel,
          status: ExerciseStatus.ACTIVE,
          createdByUserId: actor.id,
        }),
      );

      this.logger.log(
        JSON.stringify({
          event: 'exercise_created',
          exerciseId: saved.id,
          createdByUserId: actor.id,
        }),
      );

      return toExerciseResponse(saved);
    } catch (error) {
      this.throwMappedPersistenceError(error);
    }
  }

  async list(
    query: ListExercisesQueryDto,
  ): Promise<PaginatedExercisesResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = query.sort ?? ExerciseSortField.CreatedAt;
    const sortColumn = SORT_COLUMNS[sort];
    const direction =
      (query.direction ?? SortDirection.Desc) === SortDirection.Asc
        ? 'ASC'
        : 'DESC';
    const status = query.status ?? ExerciseStatus.ACTIVE;

    const qb = this.exercises
      .createQueryBuilder('exercise')
      .where('exercise.status = :status', { status });

    if (query.primaryMuscleGroup) {
      qb.andWhere('exercise.primaryMuscleGroup = :primaryMuscleGroup', {
        primaryMuscleGroup: query.primaryMuscleGroup,
      });
    }
    if (query.equipmentType) {
      qb.andWhere('exercise.equipmentType = :equipmentType', {
        equipmentType: query.equipmentType,
      });
    }
    if (query.difficultyLevel) {
      qb.andWhere('exercise.difficultyLevel = :difficultyLevel', {
        difficultyLevel: query.difficultyLevel,
      });
    }
    if (query.search?.trim()) {
      const search = `%${this.escapeIlike(query.search.trim())}%`;
      qb.andWhere(
        `(exercise.name ILIKE :search ESCAPE '\\' OR exercise.description ILIKE :search ESCAPE '\\')`,
        { search },
      );
    }

    qb.orderBy(sortColumn, direction)
      .addOrderBy('exercise.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, totalItems] = await qb.getManyAndCount();

    return {
      data: rows.map((row) => toExerciseResponse(row)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
      },
    };
  }

  async getById(id: string): Promise<ExerciseResponseDto> {
    return toExerciseResponse(await this.requireById(id));
  }

  async update(
    id: string,
    dto: UpdateExerciseDto,
    actor: AuthenticatedUser,
  ): Promise<ExerciseResponseDto> {
    const exercise = await this.requireWritable(id, actor);

    if (dto.name !== undefined) {
      exercise.name = normalizeExerciseName(dto.name);
    }
    if (dto.description !== undefined) {
      exercise.description = optionalPlainText(dto.description);
    }
    if (dto.instructions !== undefined) {
      exercise.instructions = optionalPlainText(dto.instructions);
    }
    if (dto.primaryMuscleGroup !== undefined) {
      exercise.primaryMuscleGroup = dto.primaryMuscleGroup;
    }
    if (dto.equipmentType !== undefined) {
      exercise.equipmentType = dto.equipmentType;
    }
    if (dto.difficultyLevel !== undefined) {
      exercise.difficultyLevel = dto.difficultyLevel;
    }

    try {
      return toExerciseResponse(await this.exercises.save(exercise));
    } catch (error) {
      this.throwMappedPersistenceError(error);
    }
  }

  async updateStatus(
    id: string,
    status: ExerciseStatus,
    actor: AuthenticatedUser,
  ): Promise<ExerciseResponseDto> {
    const exercise = await this.requireWritable(id, actor);
    const previous = exercise.status;
    exercise.status = status;
    const saved = await this.exercises.save(exercise);

    if (previous !== status) {
      this.logger.log(
        JSON.stringify({
          event:
            status === ExerciseStatus.ARCHIVED
              ? 'exercise_archived'
              : 'exercise_reactivated',
          exerciseId: saved.id,
        }),
      );
    }

    return toExerciseResponse(saved);
  }

  async findActiveByNormalizedName(name: string): Promise<Exercise | null> {
    const normalized = normalizeExerciseName(name).toLowerCase();
    if (normalized.length === 0) {
      return null;
    }

    return this.exercises
      .createQueryBuilder('exercise')
      .where('exercise.status = :status', { status: ExerciseStatus.ACTIVE })
      .andWhere(
        `lower(regexp_replace(btrim(exercise.name), '\\s+', ' ', 'g')) = :normalized`,
        { normalized },
      )
      .orderBy('exercise.createdAt', 'ASC')
      .addOrderBy('exercise.id', 'ASC')
      .getOne();
  }

  async requireExerciseById(id: string): Promise<Exercise> {
    return this.requireById(id);
  }

  async requireExerciseMutationAccess(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<Exercise> {
    return this.requireWritable(id, actor);
  }

  async requireActiveExercise(id: string): Promise<Exercise> {
    const exercise = await this.requireById(id);
    this.assertActive(exercise);
    return exercise;
  }

  async findActiveByIds(
    ids: string[],
    manager?: EntityManager,
  ): Promise<Exercise[]> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return [];
    }

    return this.exerciseRepository(manager).find({
      where: { id: In(uniqueIds), status: ExerciseStatus.ACTIVE },
    });
  }

  async requireActiveByIds(
    ids: string[],
    manager?: EntityManager,
  ): Promise<Exercise[]> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return [];
    }

    const found = await this.exerciseRepository(manager).find({
      where: { id: In(uniqueIds) },
    });
    const byId = new Map(found.map((exercise) => [exercise.id, exercise]));

    return uniqueIds.map((id) => {
      const exercise = byId.get(id);
      if (!exercise) {
        throw new NotFoundException('Exercise not found');
      }
      this.assertActive(exercise);
      return exercise;
    });
  }

  private exerciseRepository(manager?: EntityManager): Repository<Exercise> {
    return manager?.getRepository(Exercise) ?? this.exercises;
  }

  private assertActive(exercise: Exercise): void {
    if (exercise.status !== ExerciseStatus.ACTIVE) {
      throw new ConflictException('Exercise is archived');
    }
  }

  private async requireById(id: string): Promise<Exercise> {
    const exercise = await this.exercises.findOne({ where: { id } });
    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }
    return exercise;
  }

  private async requireWritable(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<Exercise> {
    const exercise = await this.exercises.findOne({ where: { id } });
    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }
    if (
      actor.role !== UserRole.ADMIN &&
      exercise.createdByUserId !== actor.id
    ) {
      throw new NotFoundException('Exercise not found');
    }
    return exercise;
  }

  private throwMappedPersistenceError(error: unknown): never {
    if (isPostgresUniqueViolation(error)) {
      throw new ConflictException('Exercise name already exists');
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
