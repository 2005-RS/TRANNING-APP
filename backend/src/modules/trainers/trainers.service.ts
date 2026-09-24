import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { assertPasswordPolicy } from '../auth/password.policy';
import { PasswordHasherService } from '../auth/services/password-hasher.service';
import { RefreshSessionService } from '../auth/services/refresh-session.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { isPostgresUniqueViolation } from '../../database/postgres-errors';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { UsersService } from '../users/users.service';
import { AdminUpdateTrainerDto } from './dto/admin-update-trainer.dto';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { ListTrainersQueryDto } from './dto/list-trainers-query.dto';
import {
  PaginatedTrainersResponseDto,
  TrainerResponseDto,
} from './dto/trainer-response.dto';
import { TrainerSelfUpdateDto } from './dto/trainer-self-update.dto';
import { TrainerProfile } from './entities/trainer-profile.entity';
import {
  SortDirection,
  TrainerSortField,
} from './enums/trainer-sort-field.enum';
import { toTrainerResponse } from './trainers.mapper';

const SORT_COLUMNS: Record<TrainerSortField, string> = {
  [TrainerSortField.CreatedAt]: 'profile.createdAt',
  [TrainerSortField.FirstName]: 'user.firstName',
  [TrainerSortField.LastName]: 'user.lastName',
  [TrainerSortField.Email]: 'user.email',
};

@Injectable()
export class TrainersService {
  private readonly logger = new Logger(TrainersService.name);

  constructor(
    @InjectRepository(TrainerProfile)
    private readonly profiles: Repository<TrainerProfile>,
    private readonly users: UsersService,
    private readonly passwords: PasswordHasherService,
    private readonly sessions: RefreshSessionService,
    private readonly dataSource: DataSource,
  ) {}

  async create(input: CreateTrainerDto): Promise<TrainerResponseDto> {
    const policyError = assertPasswordPolicy(input.password);
    if (policyError) {
      throw new BadRequestException(policyError);
    }

    const passwordHash = await this.passwords.hash(input.password);

    try {
      const created = await this.dataSource.transaction(async (manager) => {
        const user = await this.users.createTrainerUser(manager, {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
        });

        if (user.role !== UserRole.TRAINER) {
          throw new InternalServerErrorException(
            'Trainer identity invariant violated',
          );
        }

        const profiles = manager.getRepository(TrainerProfile);
        const profile = profiles.create({
          userId: user.id,
          phone: this.normalizeOptionalText(input.phone),
          professionalTitle: this.normalizeOptionalText(
            input.professionalTitle,
          ),
          bio: this.normalizeOptionalText(input.bio),
        });
        const saved = await profiles.save(profile);
        saved.user = user;
        return saved;
      });

      this.logger.log(
        JSON.stringify({
          event: 'trainer_created',
          trainerId: created.id,
          userId: created.userId,
        }),
      );

      return toTrainerResponse(created);
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new ConflictException('Email already in use');
      }

      throw error;
    }
  }

  async list(
    query: ListTrainersQueryDto,
  ): Promise<PaginatedTrainersResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = query.sort ?? TrainerSortField.CreatedAt;
    const sortColumn = SORT_COLUMNS[sort];
    const direction =
      (query.direction ?? SortDirection.Desc) === SortDirection.Asc
        ? 'ASC'
        : 'DESC';

    const qb = this.baseQuery();

    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    if (query.search?.trim()) {
      const search = `%${this.escapeIlike(query.search.trim())}%`;
      qb.andWhere(
        `(user.firstName ILIKE :search ESCAPE '\\' OR user.lastName ILIKE :search ESCAPE '\\' OR user.email ILIKE :search ESCAPE '\\')`,
        { search },
      );
    }

    qb.orderBy(sortColumn, direction)
      .addOrderBy('profile.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, totalItems] = await qb.getManyAndCount();

    return {
      data: rows.map((row) => toTrainerResponse(row)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
      },
    };
  }

  async getById(id: string): Promise<TrainerResponseDto> {
    const profile = await this.findProfileOrFail(id);
    return toTrainerResponse(profile);
  }

  async findByIdWithUser(id: string): Promise<TrainerProfile | null> {
    return this.baseQuery().andWhere('profile.id = :id', { id }).getOne();
  }

  async findByUserIdWithUser(userId: string): Promise<TrainerProfile | null> {
    return this.findProfileByUserId(userId);
  }

  async findByIdWithUserOn(
    manager: EntityManager,
    id: string,
  ): Promise<TrainerProfile | null> {
    return manager
      .getRepository(TrainerProfile)
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .andWhere('user.role = :role', { role: UserRole.TRAINER })
      .andWhere('profile.id = :id', { id })
      .getOne();
  }

  async getMe(actor: AuthenticatedUser): Promise<TrainerResponseDto> {
    const profile = await this.findProfileByUserId(actor.id);

    if (!profile) {
      this.logger.error(
        JSON.stringify({
          event: 'trainer_profile_missing',
          userId: actor.id,
        }),
      );
      throw new InternalServerErrorException(
        'Trainer profile is missing for this account',
      );
    }

    return toTrainerResponse(profile);
  }

  async updateById(
    id: string,
    input: AdminUpdateTrainerDto,
  ): Promise<TrainerResponseDto> {
    const profile = await this.findProfileOrFail(id);

    try {
      const updated = await this.dataSource.transaction(async (manager) => {
        await this.users.updateIdentity(manager, profile.userId, {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
        });

        const profiles = manager.getRepository(TrainerProfile);
        const current = await profiles.findOne({
          where: { id },
          relations: { user: true },
        });

        if (!current) {
          throw new NotFoundException('Trainer not found');
        }

        if (input.phone !== undefined) {
          current.phone = this.normalizeOptionalText(input.phone);
        }
        if (input.professionalTitle !== undefined) {
          current.professionalTitle = this.normalizeOptionalText(
            input.professionalTitle,
          );
        }
        if (input.bio !== undefined) {
          current.bio = this.normalizeOptionalText(input.bio);
        }

        const saved = await profiles.save(current);
        const user = await this.users.findByIdWithManager(
          manager,
          saved.userId,
        );
        if (!user) {
          throw new NotFoundException('Trainer not found');
        }
        saved.user = user;
        return saved;
      });

      return toTrainerResponse(updated);
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new ConflictException('Email already in use');
      }

      throw error;
    }
  }

  async updateMe(
    actor: AuthenticatedUser,
    input: TrainerSelfUpdateDto,
  ): Promise<TrainerResponseDto> {
    const profile = await this.findProfileByUserId(actor.id);

    if (!profile) {
      this.logger.error(
        JSON.stringify({
          event: 'trainer_profile_missing',
          userId: actor.id,
        }),
      );
      throw new InternalServerErrorException(
        'Trainer profile is missing for this account',
      );
    }

    if (input.phone !== undefined) {
      profile.phone = this.normalizeOptionalText(input.phone);
    }
    if (input.professionalTitle !== undefined) {
      profile.professionalTitle = this.normalizeOptionalText(
        input.professionalTitle,
      );
    }
    if (input.bio !== undefined) {
      profile.bio = this.normalizeOptionalText(input.bio);
    }

    const saved = await this.profiles.save(profile);
    saved.user = profile.user;
    return toTrainerResponse(saved);
  }

  async updateStatus(
    id: string,
    status: UserStatus,
  ): Promise<TrainerResponseDto> {
    const profile = await this.findProfileOrFail(id);

    const updated = await this.dataSource.transaction(async (manager) => {
      const user = await this.users.updateStatus(
        manager,
        profile.userId,
        status,
      );

      if (status === UserStatus.DISABLED) {
        await this.sessions.revokeAllForUser(profile.userId, manager);
        this.logger.log(
          JSON.stringify({
            event: 'trainer_disabled',
            trainerId: profile.id,
            userId: profile.userId,
          }),
        );
      } else {
        this.logger.log(
          JSON.stringify({
            event: 'trainer_enabled',
            trainerId: profile.id,
            userId: profile.userId,
          }),
        );
      }

      const current = await manager.getRepository(TrainerProfile).findOne({
        where: { id },
      });
      if (!current) {
        throw new NotFoundException('Trainer not found');
      }
      current.user = user;
      return current;
    });

    return toTrainerResponse(updated);
  }

  private async findProfileOrFail(id: string): Promise<TrainerProfile> {
    const profile = await this.baseQuery()
      .andWhere('profile.id = :id', { id })
      .getOne();

    if (!profile) {
      throw new NotFoundException('Trainer not found');
    }

    return profile;
  }

  private async findProfileByUserId(
    userId: string,
  ): Promise<TrainerProfile | null> {
    return this.baseQuery()
      .andWhere('profile.userId = :userId', { userId })
      .getOne();
  }

  private baseQuery(): SelectQueryBuilder<TrainerProfile> {
    return this.profiles
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .andWhere('user.role = :role', { role: UserRole.TRAINER });
  }

  private normalizeOptionalText(
    value: string | null | undefined,
  ): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  private escapeIlike(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  }
}
