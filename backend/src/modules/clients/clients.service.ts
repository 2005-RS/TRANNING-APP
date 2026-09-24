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
import { isPostgresUniqueViolation } from '../../database/postgres-errors';
import { assertPasswordPolicy } from '../auth/password.policy';
import { PasswordHasherService } from '../auth/services/password-hasher.service';
import { RefreshSessionService } from '../auth/services/refresh-session.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { UsersService } from '../users/users.service';
import { AdminUpdateClientDto } from './dto/admin-update-client.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import {
  ClientResponseDto,
  PaginatedClientsResponseDto,
} from './dto/client-response.dto';
import { ClientSelfUpdateDto } from './dto/client-self-update.dto';
import { ClientProfile } from './entities/client-profile.entity';
import { ClientSortField, SortDirection } from './enums/client-sort-field.enum';
import { toClientResponse } from './clients.mapper';

const SORT_COLUMNS: Record<ClientSortField, string> = {
  [ClientSortField.CreatedAt]: 'profile.createdAt',
  [ClientSortField.FirstName]: 'user.firstName',
  [ClientSortField.LastName]: 'user.lastName',
  [ClientSortField.Email]: 'user.email',
};

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    @InjectRepository(ClientProfile)
    private readonly profiles: Repository<ClientProfile>,
    private readonly users: UsersService,
    private readonly passwords: PasswordHasherService,
    private readonly sessions: RefreshSessionService,
    private readonly dataSource: DataSource,
  ) {}

  async create(input: CreateClientDto): Promise<ClientResponseDto> {
    const policyError = assertPasswordPolicy(input.password);
    if (policyError) {
      throw new BadRequestException(policyError);
    }

    const passwordHash = await this.passwords.hash(input.password);

    try {
      const created = await this.dataSource.transaction(async (manager) => {
        const user = await this.users.createClientUser(manager, {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
        });

        if (user.role !== UserRole.CLIENT) {
          throw new InternalServerErrorException(
            'Client identity invariant violated',
          );
        }

        const profiles = manager.getRepository(ClientProfile);
        const profile = profiles.create({
          userId: user.id,
          phone: this.normalizeOptionalText(input.phone),
          dateOfBirth: input.dateOfBirth ?? null,
          primaryGoal: input.primaryGoal,
          goalNotes: this.normalizeOptionalText(input.goalNotes),
          experienceLevel: input.experienceLevel,
        });
        const saved = await profiles.save(profile);
        saved.user = user;
        return saved;
      });

      this.logger.log(
        JSON.stringify({
          event: 'client_created',
          clientId: created.id,
          userId: created.userId,
        }),
      );

      return toClientResponse(created);
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new ConflictException('Email already in use');
      }

      throw error;
    }
  }

  async list(query: ListClientsQueryDto): Promise<PaginatedClientsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = query.sort ?? ClientSortField.CreatedAt;
    const sortColumn = SORT_COLUMNS[sort];
    const direction =
      (query.direction ?? SortDirection.Desc) === SortDirection.Asc
        ? 'ASC'
        : 'DESC';

    const qb = this.baseQuery();

    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    if (query.primaryGoal) {
      qb.andWhere('profile.primaryGoal = :primaryGoal', {
        primaryGoal: query.primaryGoal,
      });
    }

    if (query.experienceLevel) {
      qb.andWhere('profile.experienceLevel = :experienceLevel', {
        experienceLevel: query.experienceLevel,
      });
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
      data: rows.map((row) => toClientResponse(row)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
      },
    };
  }

  async getById(id: string): Promise<ClientResponseDto> {
    return toClientResponse(await this.findProfileOrFail(id));
  }

  async findByIdWithUser(id: string): Promise<ClientProfile | null> {
    return this.baseQuery().andWhere('profile.id = :id', { id }).getOne();
  }

  async findByUserIdWithUser(userId: string): Promise<ClientProfile | null> {
    return this.findProfileByUserId(userId);
  }

  async lockByIdWithUser(
    manager: EntityManager,
    id: string,
  ): Promise<ClientProfile | null> {
    return manager
      .getRepository(ClientProfile)
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .where('profile.id = :id', { id })
      .andWhere('user.role = :role', { role: UserRole.CLIENT })
      .setLock('pessimistic_write')
      .getOne();
  }

  async getMe(actor: AuthenticatedUser): Promise<ClientResponseDto> {
    const profile = await this.findProfileByUserId(actor.id);

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

    return toClientResponse(profile);
  }

  async updateById(
    id: string,
    input: AdminUpdateClientDto,
  ): Promise<ClientResponseDto> {
    const profile = await this.findProfileOrFail(id);

    try {
      const updated = await this.dataSource.transaction(async (manager) => {
        await this.users.updateIdentity(manager, profile.userId, {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
        });

        const profiles = manager.getRepository(ClientProfile);
        const current = await profiles.findOne({
          where: { id },
          relations: { user: true },
        });

        if (!current) {
          throw new NotFoundException('Client not found');
        }

        this.applyProfileUpdates(current, input);

        const saved = await profiles.save(current);
        const user = await this.users.findByIdWithManager(
          manager,
          saved.userId,
        );
        if (!user) {
          throw new NotFoundException('Client not found');
        }
        saved.user = user;
        return saved;
      });

      return toClientResponse(updated);
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new ConflictException('Email already in use');
      }

      throw error;
    }
  }

  async updateMe(
    actor: AuthenticatedUser,
    input: ClientSelfUpdateDto,
  ): Promise<ClientResponseDto> {
    const profile = await this.findProfileByUserId(actor.id);

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

    this.applyProfileUpdates(profile, input);
    const saved = await this.profiles.save(profile);
    saved.user = profile.user;
    return toClientResponse(saved);
  }

  async updateStatus(
    id: string,
    status: UserStatus,
  ): Promise<ClientResponseDto> {
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
            event: 'client_disabled',
            clientId: profile.id,
            userId: profile.userId,
          }),
        );
      } else {
        this.logger.log(
          JSON.stringify({
            event: 'client_enabled',
            clientId: profile.id,
            userId: profile.userId,
          }),
        );
      }

      const current = await manager.getRepository(ClientProfile).findOne({
        where: { id },
      });
      if (!current) {
        throw new NotFoundException('Client not found');
      }
      current.user = user;
      return current;
    });

    return toClientResponse(updated);
  }

  private applyProfileUpdates(
    profile: ClientProfile,
    input: {
      phone?: string | null;
      dateOfBirth?: string | null;
      primaryGoal?: ClientProfile['primaryGoal'];
      goalNotes?: string | null;
      experienceLevel?: ClientProfile['experienceLevel'];
    },
  ): void {
    if (input.phone !== undefined) {
      profile.phone = this.normalizeOptionalText(input.phone);
    }
    if (input.dateOfBirth !== undefined) {
      profile.dateOfBirth = input.dateOfBirth;
    }
    if (input.primaryGoal !== undefined) {
      profile.primaryGoal = input.primaryGoal;
    }
    if (input.goalNotes !== undefined) {
      profile.goalNotes = this.normalizeOptionalText(input.goalNotes);
    }
    if (input.experienceLevel !== undefined) {
      profile.experienceLevel = input.experienceLevel;
    }
  }

  private async findProfileOrFail(id: string): Promise<ClientProfile> {
    const profile = await this.baseQuery()
      .andWhere('profile.id = :id', { id })
      .getOne();

    if (!profile) {
      throw new NotFoundException('Client not found');
    }

    return profile;
  }

  private async findProfileByUserId(
    userId: string,
  ): Promise<ClientProfile | null> {
    return this.baseQuery()
      .andWhere('profile.userId = :userId', { userId })
      .getOne();
  }

  private baseQuery(): SelectQueryBuilder<ClientProfile> {
    return this.profiles
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .andWhere('user.role = :role', { role: UserRole.CLIENT });
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
