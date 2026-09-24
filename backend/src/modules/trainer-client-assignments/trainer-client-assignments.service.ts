import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { isPostgresUniqueViolation } from '../../database/postgres-errors';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ClientsService } from '../clients/clients.service';
import { ListClientsQueryDto } from '../clients/dto/list-clients-query.dto';
import {
  ClientResponseDto,
  PaginatedClientsResponseDto,
} from '../clients/dto/client-response.dto';
import { toClientResponse } from '../clients/clients.mapper';
import {
  ClientSortField,
  SortDirection,
} from '../clients/enums/client-sort-field.enum';
import { TrainersService } from '../trainers/trainers.service';
import { toTrainerResponse } from '../trainers/trainers.mapper';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import {
  AssignmentHistoryItemDto,
  ClientTrainerAssignmentResponseDto,
  CurrentTrainerResponseDto,
  PaginatedAssignmentHistoryResponseDto,
} from './dto/assignment-response.dto';
import { ListAssignmentHistoryQueryDto } from './dto/list-assignment-history-query.dto';
import { TrainerClientAssignment } from './entities/trainer-client-assignment.entity';
import { TrainerClientAccessService } from './trainer-client-access.service';

const CLIENT_SORT_COLUMNS: Record<ClientSortField, string> = {
  [ClientSortField.CreatedAt]: 'profile.createdAt',
  [ClientSortField.FirstName]: 'user.firstName',
  [ClientSortField.LastName]: 'user.lastName',
  [ClientSortField.Email]: 'user.email',
};

@Injectable()
export class TrainerClientAssignmentsService {
  private readonly logger = new Logger(TrainerClientAssignmentsService.name);

  constructor(
    @InjectRepository(TrainerClientAssignment)
    private readonly assignments: Repository<TrainerClientAssignment>,
    private readonly access: TrainerClientAccessService,
    private readonly trainers: TrainersService,
    private readonly clients: ClientsService,
    private readonly dataSource: DataSource,
  ) {}

  async setTrainer(
    clientProfileId: string,
    trainerProfileId: string,
    actor: AuthenticatedUser,
  ): Promise<ClientTrainerAssignmentResponseDto> {
    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        const client = await this.clients.lockByIdWithUser(
          manager,
          clientProfileId,
        );
        if (!client) {
          throw new NotFoundException('Client not found');
        }
        if (client.user.status !== UserStatus.ACTIVE) {
          throw new ConflictException('Client is disabled');
        }

        const trainer = await this.trainers.findByIdWithUserOn(
          manager,
          trainerProfileId,
        );
        if (!trainer) {
          throw new NotFoundException('Trainer not found');
        }
        if (trainer.user.status !== UserStatus.ACTIVE) {
          throw new ConflictException('Trainer is disabled');
        }

        const repo = manager.getRepository(TrainerClientAssignment);
        const active = await repo
          .createQueryBuilder('assignment')
          .setLock('pessimistic_write')
          .where('assignment.clientProfileId = :clientProfileId', {
            clientProfileId,
          })
          .andWhere('assignment.endedAt IS NULL')
          .getOne();

        if (active && active.trainerProfileId === trainerProfileId) {
          active.trainerProfile = trainer;
          return active;
        }

        const now = new Date();

        if (active) {
          active.endedAt = now;
          active.endedByUserId = actor.id;
          await repo.save(active);
        }

        const created = repo.create({
          trainerProfileId,
          clientProfileId,
          assignedAt: now,
          endedAt: null,
          assignedByUserId: actor.id,
          endedByUserId: null,
        });
        const persisted = await repo.save(created);
        persisted.trainerProfile = trainer;

        this.logger.log(
          JSON.stringify({
            event: active ? 'assignment_changed' : 'assignment_created',
            assignmentId: persisted.id,
            clientProfileId,
            trainerProfileId,
            previousAssignmentId: active?.id ?? null,
          }),
        );

        return persisted;
      });

      return this.toAssignmentResponse(saved);
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new ConflictException('Assignment conflict');
      }
      throw error;
    }
  }

  async unassign(
    clientProfileId: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const client = await this.clients.findByIdWithUser(clientProfileId);
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    await this.dataSource.transaction(async (manager) => {
      await this.clients.lockByIdWithUser(manager, clientProfileId);
      const repo = manager.getRepository(TrainerClientAssignment);
      const active = await repo
        .createQueryBuilder('assignment')
        .setLock('pessimistic_write')
        .where('assignment.clientProfileId = :clientProfileId', {
          clientProfileId,
        })
        .andWhere('assignment.endedAt IS NULL')
        .getOne();

      if (!active) {
        return;
      }

      active.endedAt = new Date();
      active.endedByUserId = actor.id;
      await repo.save(active);

      this.logger.log(
        JSON.stringify({
          event: 'assignment_ended',
          assignmentId: active.id,
          clientProfileId,
          trainerProfileId: active.trainerProfileId,
        }),
      );
    });
  }

  async getCurrentTrainerForAdmin(
    clientProfileId: string,
  ): Promise<CurrentTrainerResponseDto> {
    const client = await this.clients.findByIdWithUser(clientProfileId);
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return this.toCurrentTrainerResponse(
      await this.access.findActiveByClientId(clientProfileId),
    );
  }

  async getCurrentTrainerForClient(
    actor: AuthenticatedUser,
  ): Promise<CurrentTrainerResponseDto> {
    const client = await this.requireClientProfileForUser(actor.id);
    return this.toCurrentTrainerResponse(
      await this.access.findActiveByClientId(client.id),
    );
  }

  async listHistory(
    clientProfileId: string,
    query: ListAssignmentHistoryQueryDto,
  ): Promise<PaginatedAssignmentHistoryResponseDto> {
    const client = await this.clients.findByIdWithUser(clientProfileId);
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [rows, totalItems] = await this.assignments
      .createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.trainerProfile', 'trainer')
      .innerJoinAndSelect('trainer.user', 'trainerUser')
      .where('assignment.clientProfileId = :clientProfileId', {
        clientProfileId,
      })
      .orderBy('assignment.assignedAt', 'DESC')
      .addOrderBy('assignment.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: rows.map((row) => this.toHistoryItem(row)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
      },
    };
  }

  async listAssignedClients(
    actor: AuthenticatedUser,
    query: ListClientsQueryDto,
  ): Promise<PaginatedClientsResponseDto> {
    await this.requireTrainerProfileForUser(actor.id);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = query.sort ?? ClientSortField.CreatedAt;
    const sortColumn = CLIENT_SORT_COLUMNS[sort];
    const direction =
      (query.direction ?? SortDirection.Desc) === SortDirection.Asc
        ? 'ASC'
        : 'DESC';

    const qb = this.assignments
      .createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.clientProfile', 'profile')
      .innerJoinAndSelect('profile.user', 'user')
      .innerJoin('assignment.trainerProfile', 'trainer')
      .where('assignment.endedAt IS NULL')
      .andWhere('trainer.userId = :trainerUserId', {
        trainerUserId: actor.id,
      })
      .andWhere('user.role = :role', { role: UserRole.CLIENT });

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
      data: rows.map((row) => toClientResponse(row.clientProfile)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
      },
    };
  }

  async getAssignedClient(
    actor: AuthenticatedUser,
    clientProfileId: string,
  ): Promise<ClientResponseDto> {
    await this.requireTrainerProfileForUser(actor.id);
    await this.access.assertCanAccessClient(actor.id, clientProfileId);
    return this.clients.getById(clientProfileId);
  }

  private async requireTrainerProfileForUser(userId: string) {
    const profile = await this.trainers.findByUserIdWithUser(userId);
    if (!profile) {
      this.logger.error(
        JSON.stringify({ event: 'trainer_profile_missing', userId }),
      );
      throw new InternalServerErrorException(
        'Trainer profile is missing for this account',
      );
    }
    return profile;
  }

  private async requireClientProfileForUser(userId: string) {
    const profile = await this.clients.findByUserIdWithUser(userId);
    if (!profile) {
      this.logger.error(
        JSON.stringify({ event: 'client_profile_missing', userId }),
      );
      throw new InternalServerErrorException(
        'Client profile is missing for this account',
      );
    }
    return profile;
  }

  private toCurrentTrainerResponse(
    assignment: TrainerClientAssignment | null,
  ): CurrentTrainerResponseDto {
    if (!assignment?.trainerProfile) {
      return { trainer: null };
    }
    return { trainer: toTrainerResponse(assignment.trainerProfile) };
  }

  private toAssignmentResponse(
    assignment: TrainerClientAssignment,
  ): ClientTrainerAssignmentResponseDto {
    return {
      id: assignment.id,
      trainer: toTrainerResponse(assignment.trainerProfile),
      assignedAt: assignment.assignedAt,
    };
  }

  private toHistoryItem(
    assignment: TrainerClientAssignment,
  ): AssignmentHistoryItemDto {
    return {
      id: assignment.id,
      trainer: toTrainerResponse(assignment.trainerProfile),
      assignedAt: assignment.assignedAt,
      endedAt: assignment.endedAt,
      assignedByUserId: assignment.assignedByUserId,
      endedByUserId: assignment.endedByUserId,
    };
  }

  private escapeIlike(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  }
}
