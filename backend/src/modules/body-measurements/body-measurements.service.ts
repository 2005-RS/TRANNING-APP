import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isPostgresCheckViolation } from '../../database/postgres-errors';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ClientProfile } from '../clients/entities/client-profile.entity';
import { ClientsService } from '../clients/clients.service';
import { TrainerClientAccessService } from '../trainer-client-assignments/trainer-client-access.service';
import { UserRole } from '../users/enums/user-role.enum';
import {
  BODY_MEASUREMENT_FUTURE_SKEW_MS,
  BODY_METRIC_FIELDS,
} from './body-measurements.constants';
import {
  emptyMetricValues,
  hasAtLeastOneMetric,
} from './body-measurements.metrics';
import {
  paginationMeta,
  toBodyMeasurementResponse,
} from './body-measurements.mapper';
import { utcDayEndExclusive, utcDayStart } from './date-range.util';
import {
  CreateBodyMeasurementDto,
  ListBodyMeasurementsQueryDto,
  UpdateBodyMeasurementDto,
} from './dto/body-measurement-input.dto';
import {
  BodyMeasurementResponseDto,
  PaginatedBodyMeasurementsResponseDto,
} from './dto/body-measurement-response.dto';
import { BodyMeasurement } from './entities/body-measurement.entity';
import { parseStrictIsoDateTime } from './iso-datetime.validators';

@Injectable()
export class BodyMeasurementsService {
  private readonly logger = new Logger(BodyMeasurementsService.name);

  constructor(
    @InjectRepository(BodyMeasurement)
    private readonly measurements: Repository<BodyMeasurement>,
    private readonly clients: ClientsService,
    private readonly access: TrainerClientAccessService,
  ) {}

  async createMine(
    dto: CreateBodyMeasurementDto,
    actor: AuthenticatedUser,
  ): Promise<BodyMeasurementResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);
    const metrics = this.metricsFromDto(dto);
    if (!hasAtLeastOneMetric(metrics)) {
      throw new BadRequestException('At least one body metric is required');
    }

    try {
      const saved = await this.measurements.save(
        this.measurements.create({
          clientProfileId: profile.id,
          measuredAt: this.resolveObservationTime(dto.measuredAt),
          ...metrics,
          notes: this.normalizeNotes(dto.notes),
        }),
      );

      this.logger.log(
        JSON.stringify({
          event: 'body_measurement_created',
          measurementId: saved.id,
          clientProfileId: profile.id,
        }),
      );

      return toBodyMeasurementResponse(saved);
    } catch (error) {
      this.throwMappedPersistenceError(error);
    }
  }

  async listMine(
    query: ListBodyMeasurementsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedBodyMeasurementsResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);
    return this.listForClient(profile.id, query);
  }

  async listForClient(
    clientProfileId: string,
    query: ListBodyMeasurementsQueryDto,
    actor?: AuthenticatedUser,
  ): Promise<PaginatedBodyMeasurementsResponseDto> {
    if (actor) {
      await this.assertActorCanReadClient(actor, clientProfileId);
    }
    this.assertDateRange(query.dateFrom, query.dateTo);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.measurements
      .createQueryBuilder('measurement')
      .where('measurement.clientProfileId = :clientProfileId', {
        clientProfileId,
      });

    if (query.dateFrom) {
      qb.andWhere('measurement.measuredAt >= :dateFrom', {
        dateFrom: utcDayStart(query.dateFrom),
      });
    }
    if (query.dateTo) {
      qb.andWhere('measurement.measuredAt < :dateToExclusive', {
        dateToExclusive: utcDayEndExclusive(query.dateTo),
      });
    }
    if (query.hasBodyWeight === true) {
      qb.andWhere('measurement.bodyWeightKg IS NOT NULL');
    }

    qb.orderBy('measurement.measuredAt', 'DESC')
      .addOrderBy('measurement.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, totalItems] = await qb.getManyAndCount();
    return {
      data: rows.map((row) => toBodyMeasurementResponse(row)),
      meta: paginationMeta(page, limit, totalItems),
    };
  }

  async getMine(
    measurementId: string,
    actor: AuthenticatedUser,
  ): Promise<BodyMeasurementResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);
    const row = await this.requireOwned(profile.id, measurementId);
    return toBodyMeasurementResponse(row);
  }

  async getForClient(
    clientProfileId: string,
    measurementId: string,
    actor: AuthenticatedUser,
  ): Promise<BodyMeasurementResponseDto> {
    await this.assertActorCanReadClient(actor, clientProfileId);
    const row = await this.requireOwned(clientProfileId, measurementId);
    return toBodyMeasurementResponse(row);
  }

  async updateMine(
    measurementId: string,
    dto: UpdateBodyMeasurementDto,
    actor: AuthenticatedUser,
  ): Promise<BodyMeasurementResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);
    const existing = await this.requireOwned(profile.id, measurementId);
    const merged = this.mergeUpdate(existing, dto);
    if (!hasAtLeastOneMetric(merged)) {
      throw new BadRequestException(
        'At least one body metric must remain after the update',
      );
    }

    try {
      existing.measuredAt = merged.measuredAt;
      existing.notes = merged.notes;
      for (const field of BODY_METRIC_FIELDS) {
        existing[field] = merged[field];
      }
      const saved = await this.measurements.save(existing);

      this.logger.log(
        JSON.stringify({
          event: 'body_measurement_updated',
          measurementId: saved.id,
          clientProfileId: profile.id,
        }),
      );

      return toBodyMeasurementResponse(saved);
    } catch (error) {
      this.throwMappedPersistenceError(error);
    }
  }

  async requireOwnedByClient(
    measurementId: string,
    clientProfileId: string,
  ): Promise<BodyMeasurement> {
    return this.requireOwned(clientProfileId, measurementId);
  }

  private mergeUpdate(
    existing: BodyMeasurement,
    dto: UpdateBodyMeasurementDto,
  ): BodyMeasurement {
    const next = this.measurements.create({
      ...existing,
    });
    if (dto.measuredAt !== undefined) {
      next.measuredAt = this.resolveObservationTime(dto.measuredAt);
    }
    if (dto.notes !== undefined) {
      next.notes = this.normalizeNotes(dto.notes);
    }
    for (const field of BODY_METRIC_FIELDS) {
      if (dto[field] !== undefined) {
        next[field] = dto[field];
      }
    }
    return next;
  }

  private metricsFromDto(
    dto: CreateBodyMeasurementDto | UpdateBodyMeasurementDto,
  ): ReturnType<typeof emptyMetricValues> {
    const metrics = emptyMetricValues();
    for (const field of BODY_METRIC_FIELDS) {
      if (dto[field] !== undefined) {
        metrics[field] = dto[field] as number | null;
      }
    }
    return metrics;
  }

  private resolveObservationTime(value?: string): Date {
    if (value === undefined) {
      return new Date();
    }
    const parsed = parseStrictIsoDateTime(value);
    if (!parsed) {
      throw new BadRequestException('measuredAt is invalid');
    }
    this.assertNotFarFuture(parsed);
    return parsed;
  }

  private assertNotFarFuture(value: Date): void {
    if (value.getTime() > Date.now() + BODY_MEASUREMENT_FUTURE_SKEW_MS) {
      throw new BadRequestException(
        'measuredAt cannot be more than 5 minutes in the future',
      );
    }
  }

  private normalizeNotes(notes?: string | null): string | null {
    if (notes === undefined || notes === null) {
      return null;
    }
    const trimmed = notes.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  private async requireOwned(
    clientProfileId: string,
    measurementId: string,
  ): Promise<BodyMeasurement> {
    const row = await this.measurements.findOne({
      where: { id: measurementId, clientProfileId },
    });
    if (!row) {
      throw new NotFoundException('Body measurement not found');
    }
    return row;
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
    if (error instanceof BadRequestException) {
      throw error;
    }
    if (isPostgresCheckViolation(error)) {
      throw new BadRequestException('Invalid body measurement');
    }
    throw error;
  }
}
