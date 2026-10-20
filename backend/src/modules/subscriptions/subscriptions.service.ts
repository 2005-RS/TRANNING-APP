import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { EnvironmentVariables } from '../../config/env.validation';
import { isPostgresUniqueViolation } from '../../database/postgres-errors';
import { ClientProfile } from '../clients/entities/client-profile.entity';
import { TrainerClientAssignment } from '../trainer-client-assignments/entities/trainer-client-assignment.entity';
import {
  PAYMENT_NOT_PENDING_MESSAGE,
  PAYMENT_PAID_ON_INVALID_MESSAGE,
  PAYMENT_PENDING_EXISTS_MESSAGE,
  PAYMENT_REFERENCE_USED_MESSAGE,
  PAYMENTS_NOT_CONFIGURED_MESSAGE,
} from './subscriptions.constants';
import {
  AdminSubscriptionPaymentResponseDto,
  PaginatedSubscriptionPaymentsResponseDto,
} from './dto/admin-subscription-payment-response.dto';
import { ApproveSubscriptionPaymentResponseDto } from './dto/approve-subscription-payment-response.dto';
import { CreateSubscriptionPaymentDto } from './dto/create-subscription-payment.dto';
import { PaginatedExpiredSubscriptionClientsResponseDto } from './dto/expired-subscription-client.dto';
import { SubscriptionPaymentResponseDto } from './dto/subscription-payment-response.dto';
import {
  SubscriptionResponseDto,
  SubscriptionSinpeInstructionsDto,
} from './dto/subscription-response.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { ClientSubscription } from './entities/client-subscription.entity';
import { SubscriptionPayment } from './entities/subscription-payment.entity';
import {
  SubscriptionPaymentProvider,
  SubscriptionPaymentStatus,
} from './enums/subscription-payment.enum';
import { toSubscriptionPaymentResponse } from './subscriptions.mapper';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(ClientSubscription)
    private readonly subscriptions: Repository<ClientSubscription>,
    @InjectRepository(SubscriptionPayment)
    private readonly payments: Repository<SubscriptionPayment>,
    @InjectRepository(ClientProfile)
    private readonly profiles: Repository<ClientProfile>,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly dataSource: DataSource,
  ) {}

  async createFreeForProfile(
    manager: EntityManager,
    clientProfileId: string,
  ): Promise<void> {
    await manager.getRepository(ClientSubscription).insert({
      clientProfileId,
      proUntil: null,
      complimentary: false,
      updatedByUserId: null,
    });
  }

  async getForCurrentClient(userId: string): Promise<SubscriptionResponseDto> {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Client profile not found');
    }
    return this.getForClient(profile.id, true);
  }

  async createPaymentForCurrentClient(
    userId: string,
    dto: CreateSubscriptionPaymentDto,
  ): Promise<SubscriptionPaymentResponseDto> {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Client profile not found');
    }
    return this.createPayment(profile.id, dto);
  }

  async hasEffectivePro(
    manager: EntityManager,
    clientProfileId: string,
  ): Promise<boolean> {
    const subscription = await manager
      .getRepository(ClientSubscription)
      .findOne({
        where: { clientProfileId },
      });
    return subscription ? this.effective(subscription).plan === 'PRO' : false;
  }

  async getForClient(
    clientProfileId: string,
    includeSinpe: boolean,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptions.findOne({
      where: { clientProfileId },
    });
    if (!subscription) {
      throw new NotFoundException('Client subscription not found');
    }

    const [pending, rejected] = await Promise.all([
      this.payments.findOne({
        where: { clientProfileId, status: SubscriptionPaymentStatus.Pending },
        order: { createdAt: 'DESC' },
      }),
      this.payments.findOne({
        where: { clientProfileId, status: SubscriptionPaymentStatus.Rejected },
        order: { createdAt: 'DESC' },
      }),
    ]);

    return {
      ...this.effective(subscription),
      periodDays: this.periodDays(),
      sinpe: includeSinpe ? this.sinpe() : null,
      pendingPayment: pending ? toSubscriptionPaymentResponse(pending) : null,
      lastRejectedPayment: rejected
        ? toSubscriptionPaymentResponse(rejected)
        : null,
    };
  }

  async createPayment(
    clientProfileId: string,
    dto: CreateSubscriptionPaymentDto,
  ): Promise<SubscriptionPaymentResponseDto> {
    const sinpe = this.sinpe();
    if (!sinpe) {
      throw new ServiceUnavailableException(PAYMENTS_NOT_CONFIGURED_MESSAGE);
    }
    this.assertPaidOnIsRecent(dto.paidOn);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const paymentRepository = manager.getRepository(SubscriptionPayment);
        const pending = await paymentRepository.findOne({
          where: { clientProfileId, status: SubscriptionPaymentStatus.Pending },
        });
        if (pending) {
          throw new ConflictException(PAYMENT_PENDING_EXISTS_MESSAGE);
        }

        const reference = dto.reference.trim();
        const usedReference = await paymentRepository
          .createQueryBuilder('payment')
          .where('payment.provider = :provider', {
            provider: SubscriptionPaymentProvider.SinpeMovil,
          })
          .andWhere('payment.reference = :reference', { reference })
          .andWhere('payment.status <> :rejected', {
            rejected: SubscriptionPaymentStatus.Rejected,
          })
          .getOne();
        if (usedReference) {
          throw new ConflictException(PAYMENT_REFERENCE_USED_MESSAGE);
        }

        const payment = paymentRepository.create({
          clientProfileId,
          provider: SubscriptionPaymentProvider.SinpeMovil,
          status: SubscriptionPaymentStatus.Pending,
          amountCrc: sinpe.priceCrc,
          reference,
          payerPhone: dto.payerPhone?.trim() || null,
          paidOn: dto.paidOn,
          periodStart: null,
          periodEnd: null,
          reviewedByUserId: null,
          reviewedAt: null,
          rejectionReason: null,
        });
        return toSubscriptionPaymentResponse(
          await paymentRepository.save(payment),
        );
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (isPostgresUniqueViolation(error)) {
        throw new ConflictException(PAYMENT_REFERENCE_USED_MESSAGE);
      }
      throw error;
    }
  }

  async approve(
    id: string,
    reviewerId: string,
  ): Promise<ApproveSubscriptionPaymentResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager
        .getRepository(SubscriptionPayment)
        .createQueryBuilder('payment')
        .setLock('pessimistic_write')
        .where('payment.id = :id', { id })
        .getOne();
      if (!payment) {
        throw new NotFoundException('Subscription payment not found');
      }
      if (payment.status !== SubscriptionPaymentStatus.Pending) {
        throw new ConflictException(PAYMENT_NOT_PENDING_MESSAGE);
      }

      const subscription = await manager
        .getRepository(ClientSubscription)
        .createQueryBuilder('subscription')
        .setLock('pessimistic_write')
        .where('subscription.clientProfileId = :clientProfileId', {
          clientProfileId: payment.clientProfileId,
        })
        .getOne();
      if (!subscription) {
        throw new NotFoundException('Client subscription not found');
      }

      const now = new Date();
      const start =
        subscription.proUntil && subscription.proUntil > now
          ? subscription.proUntil
          : now;
      const end = new Date(start.getTime() + this.periodDays() * 86_400_000);

      subscription.proUntil = end;
      subscription.updatedByUserId = reviewerId;
      payment.status = SubscriptionPaymentStatus.Approved;
      payment.periodStart = start;
      payment.periodEnd = end;
      payment.reviewedByUserId = reviewerId;
      payment.reviewedAt = now;

      await manager.save(subscription);
      await manager.save(payment);
      return { payment: toSubscriptionPaymentResponse(payment), proUntil: end };
    });
  }

  async reject(
    id: string,
    reason: string,
    reviewerId: string,
  ): Promise<SubscriptionPaymentResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager
        .getRepository(SubscriptionPayment)
        .createQueryBuilder('payment')
        .setLock('pessimistic_write')
        .where('payment.id = :id', { id })
        .getOne();
      if (!payment) {
        throw new NotFoundException('Subscription payment not found');
      }
      if (payment.status !== SubscriptionPaymentStatus.Pending) {
        throw new ConflictException(PAYMENT_NOT_PENDING_MESSAGE);
      }

      payment.status = SubscriptionPaymentStatus.Rejected;
      payment.rejectionReason = reason.trim();
      payment.reviewedByUserId = reviewerId;
      payment.reviewedAt = new Date();
      return toSubscriptionPaymentResponse(await manager.save(payment));
    });
  }

  async update(
    clientProfileId: string,
    dto: UpdateSubscriptionDto,
    actorId: string,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptions.findOne({
      where: { clientProfileId },
    });
    if (!subscription) {
      throw new NotFoundException('Client subscription not found');
    }
    subscription.complimentary = dto.complimentary;
    subscription.updatedByUserId = actorId;
    await this.subscriptions.save(subscription);
    return this.getForClient(clientProfileId, false);
  }

  async listPayments(
    status?: SubscriptionPaymentStatus,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedSubscriptionPaymentsResponseDto> {
    const query = this.payments
      .createQueryBuilder('payment')
      .innerJoinAndSelect('payment.clientProfile', 'profile')
      .innerJoinAndSelect('profile.user', 'user')
      .orderBy('payment.createdAt', 'DESC')
      .addOrderBy('payment.id', 'DESC');
    if (status) {
      query.where('payment.status = :status', { status });
    }
    const [rows, totalItems] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data: rows.map((payment) => this.toAdminPayment(payment)),
      meta: this.paginationMeta(page, pageSize, totalItems),
    };
  }

  async expiredWithTrainer(
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedExpiredSubscriptionClientsResponseDto> {
    const now = new Date();
    const query = this.profiles
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .innerJoin(
        TrainerClientAssignment,
        'assignment',
        'assignment.clientProfileId = profile.id AND assignment.endedAt IS NULL',
      )
      .innerJoin(
        ClientSubscription,
        'subscription',
        'subscription.clientProfileId = profile.id',
      )
      .where('subscription.complimentary = false')
      .andWhere(
        '(subscription.proUntil IS NULL OR subscription.proUntil <= :now)',
        {
          now,
        },
      )
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
      .addOrderBy('profile.id', 'ASC');
    const [rows, totalItems] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data: rows.map((profile) => ({
        id: profile.id,
        firstName: profile.user.firstName,
        lastName: profile.user.lastName,
        email: profile.user.email,
      })),
      meta: this.paginationMeta(page, pageSize, totalItems),
    };
  }

  effective(
    subscription: Pick<ClientSubscription, 'complimentary' | 'proUntil'>,
    now = new Date(),
  ): Pick<SubscriptionResponseDto, 'plan' | 'source' | 'proUntil'> {
    if (subscription.complimentary) {
      return { plan: 'PRO', source: 'COMPLIMENTARY', proUntil: null };
    }
    if (subscription.proUntil && subscription.proUntil > now) {
      return {
        plan: 'PRO',
        source: 'PAID',
        proUntil: subscription.proUntil,
      };
    }
    return { plan: 'FREE', source: null, proUntil: subscription.proUntil };
  }

  private assertPaidOnIsRecent(paidOn: string): void {
    const paidAt = new Date(`${paidOn}T00:00:00.000Z`);
    const now = new Date();
    if (
      Number.isNaN(paidAt.getTime()) ||
      paidAt > now ||
      paidAt < new Date(now.getTime() - 30 * 86_400_000)
    ) {
      throw new BadRequestException(PAYMENT_PAID_ON_INVALID_MESSAGE);
    }
  }

  private sinpe(): SubscriptionSinpeInstructionsDto | null {
    const phone = this.config.get('SUBSCRIPTION_SINPE_PHONE', { infer: true });
    const holderName = this.config.get('SUBSCRIPTION_SINPE_HOLDER_NAME', {
      infer: true,
    });
    const priceCrc = this.config.get('SUBSCRIPTION_PRO_PRICE_CRC', {
      infer: true,
    });
    return phone && holderName && priceCrc
      ? { phone, holderName, priceCrc }
      : null;
  }

  private periodDays(): number {
    return this.config.getOrThrow('SUBSCRIPTION_PRO_PERIOD_DAYS', {
      infer: true,
    });
  }

  private toAdminPayment(
    payment: SubscriptionPayment,
  ): AdminSubscriptionPaymentResponseDto {
    return {
      ...toSubscriptionPaymentResponse(payment),
      client: {
        id: payment.clientProfileId,
        firstName: payment.clientProfile.user.firstName,
        lastName: payment.clientProfile.user.lastName,
        email: payment.clientProfile.user.email,
      },
    };
  }

  private paginationMeta(page: number, limit: number, totalItems: number) {
    return {
      page,
      limit,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
    };
  }
}
