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
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import {
  isPostgresCheckViolation,
  isPostgresUniqueViolation,
} from '../../database/postgres-errors';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ClientsService } from '../clients/clients.service';
import { ClientProfile } from '../clients/entities/client-profile.entity';
import { toIsoDateString } from '../clients/iso-date.util';
import { TrainerClientAccessService } from '../trainer-client-assignments/trainer-client-access.service';
import { UserRole } from '../users/enums/user-role.enum';
import { assertCheckInPeriod } from './check-in-period.util';
import {
  CheckInResponseValues,
  hasSubstantiveCheckInResponse,
} from './check-in-responses.util';
import { optionalPlainText } from './check-in-text.util';
import {
  CHECK_IN_LIST_DEFAULT_LIMIT,
  CHECK_IN_LIST_DEFAULT_PAGE,
} from './check-ins.constants';
import {
  paginationMeta,
  toCheckInDetail,
  toCheckInSummary,
} from './check-ins.mapper';
import { CreateCheckInDto } from './dto/create-check-in.dto';
import { CreateCheckInReviewDto } from './dto/create-check-in-review.dto';
import { ListClientCheckInsQueryDto } from './dto/list-client-check-ins-query.dto';
import { ListManagementCheckInsQueryDto } from './dto/list-management-check-ins-query.dto';
import {
  CheckInResponseDto,
  PaginatedCheckInsResponseDto,
} from './dto/check-in-response.dto';
import { UpdateCheckInDto } from './dto/update-check-in.dto';
import { UpdateCheckInReviewDto } from './dto/update-check-in-review.dto';
import { ActivityEventType } from '../activity-events/enums/activity-event-type.enum';
import { NotificationPublisherService } from '../notifications/notification-publisher.service';
import { CheckInReview } from './entities/check-in-review.entity';
import { CheckIn } from './entities/check-in.entity';
import { CheckInStatus } from './enums/check-in-status.enum';

const UNIQUE_CLIENT_PERIOD = 'UQ_check_ins_client_period';
const UNIQUE_REVIEW_CHECK_IN = 'UQ_check_in_reviews_check_in_id';

@Injectable()
export class CheckInsService {
  private readonly logger = new Logger(CheckInsService.name);

  constructor(
    @InjectRepository(CheckIn)
    private readonly checkIns: Repository<CheckIn>,
    private readonly clients: ClientsService,
    private readonly access: TrainerClientAccessService,
    private readonly notifications: NotificationPublisherService,
    private readonly dataSource: DataSource,
  ) {}

  async createMine(
    dto: CreateCheckInDto,
    actor: AuthenticatedUser,
  ): Promise<CheckInResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);
    assertCheckInPeriod(dto.periodStart, dto.periodEnd);
    const responses = this.responsesFromCreate(dto);

    try {
      const saved = await this.checkIns.save(
        this.checkIns.create({
          clientProfileId: profile.id,
          periodStart: dto.periodStart,
          periodEnd: dto.periodEnd,
          status: CheckInStatus.DRAFT,
          submittedAt: null,
          ...responses,
        }),
      );

      this.logger.log(
        JSON.stringify({
          event: 'check_in_created',
          checkInId: saved.id,
          clientProfileId: profile.id,
        }),
      );

      return toCheckInDetail(saved);
    } catch (error) {
      this.throwMappedPersistenceError(error);
    }
  }

  async listMine(
    query: ListClientCheckInsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedCheckInsResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);
    return this.listForProfile(profile.id, query, { includeDrafts: true });
  }

  async getMine(
    checkInId: string,
    actor: AuthenticatedUser,
  ): Promise<CheckInResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);
    const checkIn = await this.loadDetail(profile.id, checkInId);
    return toCheckInDetail(checkIn);
  }

  async updateMine(
    checkInId: string,
    dto: UpdateCheckInDto,
    actor: AuthenticatedUser,
  ): Promise<CheckInResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);
    const existing = await this.requireOwned(profile.id, checkInId);
    if (existing.status !== CheckInStatus.DRAFT) {
      throw new ConflictException('Submitted check-in responses are immutable');
    }

    const periodStart =
      dto.periodStart ?? this.requirePeriodDate(existing.periodStart);
    const periodEnd =
      dto.periodEnd ?? this.requirePeriodDate(existing.periodEnd);
    assertCheckInPeriod(periodStart, periodEnd);
    const merged = this.mergeDraft(existing, dto);

    try {
      existing.periodStart = periodStart;
      existing.periodEnd = periodEnd;
      this.assignResponses(existing, merged);
      const saved = await this.checkIns.save(existing);
      return toCheckInDetail(saved);
    } catch (error) {
      this.throwMappedPersistenceError(error);
    }
  }

  async submitMine(
    checkInId: string,
    actor: AuthenticatedUser,
  ): Promise<CheckInResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const checkIn = await this.lockOwned(profile.id, checkInId, manager);
        if (checkIn.status === CheckInStatus.SUBMITTED) {
          return { checkIn, submittedNow: false };
        }
        if (checkIn.status === CheckInStatus.REVIEWED) {
          throw new ConflictException(
            'Reviewed check-ins cannot return to SUBMITTED',
          );
        }
        if (!hasSubstantiveCheckInResponse(this.responsesOf(checkIn))) {
          throw new ConflictException('Check-in has no substantive response');
        }

        checkIn.status = CheckInStatus.SUBMITTED;
        checkIn.submittedAt = new Date();
        const saved = await manager.getRepository(CheckIn).save(checkIn);
        const recipientUserId = await this.access.findCurrentTrainerUserId(
          profile.id,
        );
        await this.notifications.publish(manager, {
          type: ActivityEventType.CHECK_IN_SUBMITTED,
          actorUserId: actor.id,
          clientProfileId: profile.id,
          relatedEntityId: saved.id,
          recipientUserId,
        });
        return {
          checkIn: saved,
          submittedNow: true,
        };
      });

      if (result.submittedNow) {
        this.logger.log(
          JSON.stringify({
            event: 'check_in_submitted',
            checkInId: result.checkIn.id,
            clientProfileId: profile.id,
          }),
        );
      }

      return this.getMine(checkInId, actor);
    } catch (error) {
      this.throwMappedPersistenceError(error);
    }
  }

  async deleteMine(checkInId: string, actor: AuthenticatedUser): Promise<void> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);

    try {
      await this.dataSource.transaction(async (manager) => {
        const checkIn = await this.lockOwned(profile.id, checkInId, manager);
        if (checkIn.status !== CheckInStatus.DRAFT) {
          throw new ConflictException('Submitted check-ins cannot be deleted');
        }
        await manager.getRepository(CheckIn).delete({ id: checkIn.id });
      });
    } catch (error) {
      this.throwMappedPersistenceError(error);
    }

    this.logger.log(
      JSON.stringify({
        event: 'check_in_draft_discarded',
        checkInId,
        clientProfileId: profile.id,
      }),
    );
  }

  async listForClient(
    clientProfileId: string,
    query: ListManagementCheckInsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedCheckInsResponseDto> {
    await this.assertActorCanReadClient(actor, clientProfileId);
    return this.listForProfile(clientProfileId, query, {
      includeDrafts: false,
    });
  }

  async getForClient(
    clientProfileId: string,
    checkInId: string,
    actor: AuthenticatedUser,
  ): Promise<CheckInResponseDto> {
    await this.assertActorCanReadClient(actor, clientProfileId);
    const checkIn = await this.loadDetail(clientProfileId, checkInId);
    if (checkIn.status === CheckInStatus.DRAFT) {
      throw new NotFoundException('Check-in not found');
    }
    return toCheckInDetail(checkIn);
  }

  async createReview(
    clientProfileId: string,
    checkInId: string,
    dto: CreateCheckInReviewDto,
    actor: AuthenticatedUser,
  ): Promise<CheckInResponseDto> {
    this.assertTrainerReviewer(actor);
    await this.assertActorCanReadClient(actor, clientProfileId);
    const feedback = this.requireFeedback(dto.feedback);
    const actionItems =
      dto.actionItems === undefined ? null : optionalPlainText(dto.actionItems);

    try {
      await this.dataSource.transaction(async (manager) => {
        await this.access.assertCanAccessClient(actor.id, clientProfileId);
        const checkIn = await this.lockOwned(
          clientProfileId,
          checkInId,
          manager,
        );
        if (checkIn.status === CheckInStatus.DRAFT) {
          throw new NotFoundException('Check-in not found');
        }
        if (checkIn.status === CheckInStatus.REVIEWED) {
          throw new ConflictException('Check-in already has a review');
        }
        if (checkIn.status !== CheckInStatus.SUBMITTED) {
          throw new ConflictException('Check-in is not ready for review');
        }

        const reviewRepo = manager.getRepository(CheckInReview);
        await reviewRepo.save(
          reviewRepo.create({
            checkInId: checkIn.id,
            reviewedByUserId: actor.id,
            feedback,
            actionItems,
          }),
        );

        checkIn.status = CheckInStatus.REVIEWED;
        await manager.getRepository(CheckIn).save(checkIn);

        const client = await manager.getRepository(ClientProfile).findOne({
          where: { id: clientProfileId },
        });
        if (!client) {
          throw new InternalServerErrorException(
            'Client profile is missing for this account',
          );
        }
        await this.notifications.publish(manager, {
          type: ActivityEventType.CHECK_IN_REVIEWED,
          actorUserId: actor.id,
          clientProfileId,
          relatedEntityId: checkIn.id,
          recipientUserId: client.userId,
        });
      });
    } catch (error) {
      this.throwMappedPersistenceError(error);
    }

    this.logger.log(
      JSON.stringify({
        event: 'check_in_reviewed',
        checkInId,
        clientProfileId,
      }),
    );

    return this.getForClient(clientProfileId, checkInId, actor);
  }

  async updateReview(
    clientProfileId: string,
    checkInId: string,
    dto: UpdateCheckInReviewDto,
    actor: AuthenticatedUser,
  ): Promise<CheckInResponseDto> {
    this.assertTrainerReviewer(actor);
    await this.assertActorCanReadClient(actor, clientProfileId);

    try {
      await this.dataSource.transaction(async (manager) => {
        const checkIn = await this.lockOwned(
          clientProfileId,
          checkInId,
          manager,
        );
        if (checkIn.status === CheckInStatus.DRAFT) {
          throw new NotFoundException('Check-in not found');
        }

        const review = await manager.getRepository(CheckInReview).findOne({
          where: { checkInId: checkIn.id },
        });
        if (!review) {
          throw new NotFoundException('Check-in review not found');
        }
        if (review.reviewedByUserId !== actor.id) {
          throw new ConflictException('Review belongs to a different reviewer');
        }

        if (dto.feedback !== undefined) {
          review.feedback = this.requireFeedback(dto.feedback);
        }
        if (dto.actionItems !== undefined) {
          review.actionItems = optionalPlainText(dto.actionItems);
        }
        await manager.getRepository(CheckInReview).save(review);
      });
    } catch (error) {
      this.throwMappedPersistenceError(error);
    }

    this.logger.log(
      JSON.stringify({
        event: 'check_in_review_updated',
        checkInId,
        clientProfileId,
      }),
    );

    return this.getForClient(clientProfileId, checkInId, actor);
  }

  private async listForProfile(
    clientProfileId: string,
    query: ListClientCheckInsQueryDto | ListManagementCheckInsQueryDto,
    options: { includeDrafts: boolean },
  ): Promise<PaginatedCheckInsResponseDto> {
    this.assertDateRange(query.dateFrom, query.dateTo);
    const page = query.page ?? CHECK_IN_LIST_DEFAULT_PAGE;
    const limit = query.limit ?? CHECK_IN_LIST_DEFAULT_LIMIT;

    const qb = this.checkIns
      .createQueryBuilder('checkIn')
      .select([
        'checkIn.id',
        'checkIn.periodStart',
        'checkIn.periodEnd',
        'checkIn.status',
        'checkIn.submittedAt',
        'checkIn.createdAt',
      ])
      .where('checkIn.clientProfileId = :clientProfileId', { clientProfileId });

    if (!options.includeDrafts) {
      qb.andWhere('checkIn.status != :draft', { draft: CheckInStatus.DRAFT });
    }
    if (query.status) {
      qb.andWhere('checkIn.status = :status', { status: query.status });
    }
    if (query.dateFrom) {
      qb.andWhere('checkIn.periodStart >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    }
    if (query.dateTo) {
      qb.andWhere('checkIn.periodStart <= :dateTo', { dateTo: query.dateTo });
    }

    qb.orderBy('checkIn.periodStart', 'DESC')
      .addOrderBy('checkIn.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, totalItems] = await qb.getManyAndCount();
    return {
      data: rows.map((row) => toCheckInSummary(row)),
      meta: paginationMeta(page, limit, totalItems),
    };
  }

  private async loadDetail(
    clientProfileId: string,
    checkInId: string,
  ): Promise<CheckIn> {
    const checkIn = await this.checkIns
      .createQueryBuilder('checkIn')
      .leftJoinAndSelect('checkIn.review', 'review')
      .where('checkIn.id = :checkInId', { checkInId })
      .andWhere('checkIn.clientProfileId = :clientProfileId', {
        clientProfileId,
      })
      .getOne();
    if (!checkIn) {
      throw new NotFoundException('Check-in not found');
    }
    return checkIn;
  }

  private async requireOwned(
    clientProfileId: string,
    checkInId: string,
  ): Promise<CheckIn> {
    const checkIn = await this.checkIns.findOne({
      where: { id: checkInId, clientProfileId },
    });
    if (!checkIn) {
      throw new NotFoundException('Check-in not found');
    }
    return checkIn;
  }

  private async lockOwned(
    clientProfileId: string,
    checkInId: string,
    manager: EntityManager,
  ): Promise<CheckIn> {
    const checkIn = await manager
      .getRepository(CheckIn)
      .createQueryBuilder('checkIn')
      .setLock('pessimistic_write')
      .where('checkIn.id = :checkInId', { checkInId })
      .getOne();
    if (!checkIn || checkIn.clientProfileId !== clientProfileId) {
      throw new NotFoundException('Check-in not found');
    }
    return checkIn;
  }

  private responsesFromCreate(dto: CreateCheckInDto): CheckInResponseValues {
    return {
      sleepQuality: dto.sleepQuality ?? null,
      energyLevel: dto.energyLevel ?? null,
      stressLevel: dto.stressLevel ?? null,
      hungerLevel: dto.hungerLevel ?? null,
      recoveryLevel: dto.recoveryLevel ?? null,
      trainingAdherencePct: dto.trainingAdherencePct ?? null,
      nutritionAdherencePct: dto.nutritionAdherencePct ?? null,
      wins: optionalPlainText(dto.wins),
      challenges: optionalPlainText(dto.challenges),
      generalNotes: optionalPlainText(dto.generalNotes),
    };
  }

  private mergeDraft(
    existing: CheckIn,
    dto: UpdateCheckInDto,
  ): CheckInResponseValues {
    const current = this.responsesOf(existing);
    return {
      sleepQuality:
        dto.sleepQuality === undefined
          ? current.sleepQuality
          : dto.sleepQuality,
      energyLevel:
        dto.energyLevel === undefined ? current.energyLevel : dto.energyLevel,
      stressLevel:
        dto.stressLevel === undefined ? current.stressLevel : dto.stressLevel,
      hungerLevel:
        dto.hungerLevel === undefined ? current.hungerLevel : dto.hungerLevel,
      recoveryLevel:
        dto.recoveryLevel === undefined
          ? current.recoveryLevel
          : dto.recoveryLevel,
      trainingAdherencePct:
        dto.trainingAdherencePct === undefined
          ? current.trainingAdherencePct
          : dto.trainingAdherencePct,
      nutritionAdherencePct:
        dto.nutritionAdherencePct === undefined
          ? current.nutritionAdherencePct
          : dto.nutritionAdherencePct,
      wins: dto.wins === undefined ? current.wins : optionalPlainText(dto.wins),
      challenges:
        dto.challenges === undefined
          ? current.challenges
          : optionalPlainText(dto.challenges),
      generalNotes:
        dto.generalNotes === undefined
          ? current.generalNotes
          : optionalPlainText(dto.generalNotes),
    };
  }

  private responsesOf(checkIn: CheckIn): CheckInResponseValues {
    return {
      sleepQuality: checkIn.sleepQuality,
      energyLevel: checkIn.energyLevel,
      stressLevel: checkIn.stressLevel,
      hungerLevel: checkIn.hungerLevel,
      recoveryLevel: checkIn.recoveryLevel,
      trainingAdherencePct: checkIn.trainingAdherencePct,
      nutritionAdherencePct: checkIn.nutritionAdherencePct,
      wins: checkIn.wins,
      challenges: checkIn.challenges,
      generalNotes: checkIn.generalNotes,
    };
  }

  private assignResponses(
    checkIn: CheckIn,
    responses: CheckInResponseValues,
  ): void {
    checkIn.sleepQuality = responses.sleepQuality;
    checkIn.energyLevel = responses.energyLevel;
    checkIn.stressLevel = responses.stressLevel;
    checkIn.hungerLevel = responses.hungerLevel;
    checkIn.recoveryLevel = responses.recoveryLevel;
    checkIn.trainingAdherencePct = responses.trainingAdherencePct;
    checkIn.nutritionAdherencePct = responses.nutritionAdherencePct;
    checkIn.wins = responses.wins;
    checkIn.challenges = responses.challenges;
    checkIn.generalNotes = responses.generalNotes;
  }

  private requireFeedback(value: string): string {
    const normalized = optionalPlainText(value);
    if (!normalized) {
      throw new BadRequestException(
        'feedback must contain meaningful non-whitespace text',
      );
    }
    return normalized;
  }

  private requirePeriodDate(value: Date | string): string {
    const iso = toIsoDateString(value);
    if (!iso) {
      throw new BadRequestException('Check-in period is invalid');
    }
    return iso;
  }

  private async assertActorCanReadClient(
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

  private assertTrainerReviewer(actor: AuthenticatedUser): void {
    if (actor.role !== UserRole.TRAINER) {
      throw new ForbiddenException();
    }
  }

  private assertClientActor(actor: AuthenticatedUser): void {
    if (actor.role !== UserRole.CLIENT) {
      throw new ForbiddenException();
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

  private assertDateRange(dateFrom?: string, dateTo?: string): void {
    if (dateFrom && dateTo && dateTo < dateFrom) {
      throw new BadRequestException('dateTo must be on or after dateFrom');
    }
  }

  private throwMappedPersistenceError(error: unknown): never {
    if (
      error instanceof BadRequestException ||
      error instanceof ConflictException ||
      error instanceof NotFoundException ||
      error instanceof ForbiddenException
    ) {
      throw error;
    }
    if (isPostgresUniqueViolation(error)) {
      const constraint = this.uniqueConstraintName(error);
      if (constraint === UNIQUE_REVIEW_CHECK_IN) {
        throw new ConflictException('Check-in already has a review');
      }
      if (constraint === UNIQUE_CLIENT_PERIOD) {
        throw new ConflictException(
          'A check-in already exists for this period',
        );
      }
      throw new ConflictException('Check-in conflict');
    }
    if (isPostgresCheckViolation(error)) {
      throw new BadRequestException('Invalid check-in');
    }
    throw error;
  }

  private uniqueConstraintName(error: unknown): string | undefined {
    if (!(error instanceof QueryFailedError)) {
      return undefined;
    }
    const driver = error.driverError;
    if (
      typeof driver !== 'object' ||
      driver === null ||
      !('constraint' in driver)
    ) {
      return undefined;
    }
    return typeof driver.constraint === 'string'
      ? driver.constraint
      : undefined;
  }
}
