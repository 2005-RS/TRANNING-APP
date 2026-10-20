import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ClientProfile } from '../clients/entities/client-profile.entity';
import {
  PAYMENT_NOT_PENDING_MESSAGE,
  PAYMENT_PAID_ON_INVALID_MESSAGE,
  PAYMENTS_NOT_CONFIGURED_MESSAGE,
} from './subscriptions.constants';
import { ClientSubscription } from './entities/client-subscription.entity';
import { SubscriptionPayment } from './entities/subscription-payment.entity';
import {
  SubscriptionPaymentProvider,
  SubscriptionPaymentStatus,
} from './enums/subscription-payment.enum';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService', () => {
  const subscriptionRepository = {} as Repository<ClientSubscription>;
  const paymentRepository = {} as Repository<SubscriptionPayment>;
  const profileRepository = {} as Repository<ClientProfile>;

  function createService(
    configValues: Record<string, string | number | undefined> = {
      SUBSCRIPTION_PRO_PERIOD_DAYS: 30,
    },
    dataSource = {} as DataSource,
  ): SubscriptionsService {
    const config = {
      get: jest.fn((key: string) => configValues[key]),
      getOrThrow: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService<Record<string, string | number>, true>;
    return new SubscriptionsService(
      subscriptionRepository,
      paymentRepository,
      profileRepository,
      config as never,
      dataSource,
    );
  }

  it('calculates complimentary, future, past, and missing Pro plans', () => {
    const service = createService();
    const now = new Date('2026-10-09T12:00:00.000Z');

    expect(
      service.effective({ complimentary: true, proUntil: null }, now),
    ).toEqual({ plan: 'PRO', source: 'COMPLIMENTARY', proUntil: null });
    expect(
      service.effective(
        {
          complimentary: false,
          proUntil: new Date('2026-10-10T00:00:00.000Z'),
        },
        now,
      ),
    ).toEqual({
      plan: 'PRO',
      source: 'PAID',
      proUntil: new Date('2026-10-10T00:00:00.000Z'),
    });
    expect(
      service.effective(
        {
          complimentary: false,
          proUntil: new Date('2026-10-08T00:00:00.000Z'),
        },
        now,
      ),
    ).toMatchObject({ plan: 'FREE', source: null });
    expect(
      service.effective({ complimentary: false, proUntil: null }, now),
    ).toEqual({ plan: 'FREE', source: null, proUntil: null });
  });

  it('rejects unconfigured and invalid payment reports before persistence', async () => {
    const unconfigured = createService();
    await expect(
      unconfigured.createPayment('client-id', {
        reference: 'SINPE-1',
        paidOn: '2026-10-09',
      }),
    ).rejects.toThrow(
      new ServiceUnavailableException(PAYMENTS_NOT_CONFIGURED_MESSAGE),
    );

    const configured = createService({
      SUBSCRIPTION_SINPE_PHONE: '88888888',
      SUBSCRIPTION_SINPE_HOLDER_NAME: 'Holder',
      SUBSCRIPTION_PRO_PRICE_CRC: 1000,
      SUBSCRIPTION_PRO_PERIOD_DAYS: 30,
    });
    await expect(
      configured.createPayment('client-id', {
        reference: 'SINPE-2',
        paidOn: '2999-01-01',
      }),
    ).rejects.toThrow(new BadRequestException(PAYMENT_PAID_ON_INVALID_MESSAGE));
    await expect(
      configured.createPayment('client-id', {
        reference: 'SINPE-3',
        paidOn: '2000-01-01',
      }),
    ).rejects.toThrow(new BadRequestException(PAYMENT_PAID_ON_INVALID_MESSAGE));
  });

  it('extends an active Pro period from proUntil and rejects non-pending review', async () => {
    const now = new Date();
    const activeUntil = new Date(now.getTime() + 10 * 86_400_000);
    const payment = {
      id: 'payment-id',
      clientProfileId: 'client-id',
      status: SubscriptionPaymentStatus.Pending,
      provider: SubscriptionPaymentProvider.SinpeMovil,
      amountCrc: 1000,
      reference: 'SINPE-4',
      payerPhone: null,
      paidOn: '2026-10-09',
      periodStart: null,
      periodEnd: null,
      reviewedByUserId: null,
      reviewedAt: null,
      rejectionReason: null,
      createdAt: now,
    } as SubscriptionPayment;
    const subscription = {
      clientProfileId: 'client-id',
      complimentary: false,
      proUntil: activeUntil,
      updatedByUserId: null,
    } as ClientSubscription;
    const queryResults = [payment, subscription];
    const manager = {
      getRepository: jest.fn(() => ({
        createQueryBuilder: jest.fn(() => ({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn(() => Promise.resolve(queryResults.shift())),
        })),
      })),
      save: jest.fn((entity: object) => Promise.resolve(entity)),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(
        (run: (transactionManager: EntityManager) => unknown) => run(manager),
      ),
    } as unknown as DataSource;
    const service = createService(
      { SUBSCRIPTION_PRO_PERIOD_DAYS: 30 },
      dataSource,
    );

    const approved = await service.approve('payment-id', 'admin-id');
    expect(approved.proUntil.getTime()).toBe(
      activeUntil.getTime() + 30 * 86_400_000,
    );
    expect(payment.status).toBe(SubscriptionPaymentStatus.Approved);

    payment.status = SubscriptionPaymentStatus.Approved;
    const nonPendingManager = {
      getRepository: jest.fn(() => ({
        createQueryBuilder: jest.fn(() => ({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn(() => Promise.resolve(payment)),
        })),
      })),
    } as unknown as EntityManager;
    const nonPendingSource = {
      transaction: jest.fn(
        (run: (transactionManager: EntityManager) => unknown) =>
          run(nonPendingManager),
      ),
    } as unknown as DataSource;
    const nonPendingService = createService(
      { SUBSCRIPTION_PRO_PERIOD_DAYS: 30 },
      nonPendingSource,
    );

    await expect(
      nonPendingService.approve('payment-id', 'admin-id'),
    ).rejects.toThrow(new ConflictException(PAYMENT_NOT_PENDING_MESSAGE));
    await expect(
      nonPendingService.reject('payment-id', 'reason', 'admin-id'),
    ).rejects.toThrow(new ConflictException(PAYMENT_NOT_PENDING_MESSAGE));
  });
});
