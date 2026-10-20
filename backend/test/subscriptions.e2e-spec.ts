import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { EnvironmentVariables } from '../src/config/env.validation';
import { assertSafeTestDatabaseName } from '../src/database/assert-safe-test-database';
import { PasswordHasherService } from '../src/modules/auth/services/password-hasher.service';
import { ClientExperienceLevel } from '../src/modules/clients/enums/client-experience-level.enum';
import { ClientPrimaryGoal } from '../src/modules/clients/enums/client-primary-goal.enum';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { UserStatus } from '../src/modules/users/enums/user-status.enum';
import { clearIdentityGraph } from './helpers/clear-identity-graph';

const PASSWORD = 'correct horse battery';
const PERIOD_DAYS = 30;

type ProvisionedClient = { id: string; user: { email: string } };
type ProvisionedTrainer = { id: string; user: { email: string } };

function isoDate(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

describe('Subscriptions (e2e)', () => {
  let app: INestApplication;
  let http: App;
  let dataSource: DataSource;
  let users: Repository<User>;
  let hasher: PasswordHasherService;

  beforeAll(async () => {
    assertSafeTestDatabaseName(process.env.DATABASE_NAME ?? '');
    process.env.AUTH_E2E_SKIP_THROTTLE = 'true';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    http = app.getHttpServer() as App;
    dataSource = app.get(DataSource);
    users = dataSource.getRepository(User);
    hasher = app.get(PasswordHasherService);
  });

  beforeEach(async () => {
    await clearIdentityGraph(dataSource);
  });

  afterAll(async () => {
    await app.close();
    delete process.env.AUTH_E2E_SKIP_THROTTLE;
  });

  async function createAdmin(email = 'admin@example.com'): Promise<User> {
    return users.save(
      users.create({
        email,
        passwordHash: await hasher.hash(PASSWORD),
        firstName: 'Ada',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      }),
    );
  }

  async function authorization(email: string): Promise<string> {
    const response = await request(http)
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return `Bearer ${response.body.accessToken as string}`;
  }

  async function provisionClient(
    adminAuthorization: string,
    email = 'client@example.com',
  ): Promise<ProvisionedClient> {
    return (
      await request(http)
        .post('/api/v1/clients')
        .set('Authorization', adminAuthorization)
        .send({
          email,
          password: PASSWORD,
          firstName: 'Cara',
          lastName: 'Client',
          primaryGoal: ClientPrimaryGoal.MUSCLE_GAIN,
          experienceLevel: ClientExperienceLevel.BEGINNER,
        })
        .expect(201)
    ).body as ProvisionedClient;
  }

  async function provisionTrainer(
    adminAuthorization: string,
  ): Promise<ProvisionedTrainer> {
    return (
      await request(http)
        .post('/api/v1/trainers')
        .set('Authorization', adminAuthorization)
        .send({
          email: 'trainer@example.com',
          password: PASSWORD,
          firstName: 'Tia',
          lastName: 'Trainer',
        })
        .expect(201)
    ).body as ProvisionedTrainer;
  }

  function report(
    clientAuthorization: string,
    reference: string,
    paidOn = isoDate(),
  ) {
    return request(http)
      .post('/api/v1/clients/me/subscription/payments')
      .set('Authorization', clientAuthorization)
      .send({ reference, paidOn, payerPhone: '88887777' });
  }

  it('reports configured payments, rejects invalid dates, and permits a rejected reference to be reused', async () => {
    const admin = await createAdmin();
    const adminAuthorization = await authorization(admin.email);
    const firstClient = await provisionClient(adminAuthorization);
    const secondClient = await provisionClient(
      adminAuthorization,
      'second@example.com',
    );
    const firstClientAuthorization = await authorization(
      firstClient.user.email,
    );
    const secondClientAuthorization = await authorization(
      secondClient.user.email,
    );

    const first = await report(firstClientAuthorization, 'SINPE-ONE').expect(
      201,
    );
    expect(first.body).toMatchObject({
      status: 'PENDING',
      amountCrc: 12500,
      reference: 'SINPE-ONE',
      payerPhone: '88887777',
      paidOn: isoDate(),
    });
    await report(firstClientAuthorization, 'SINPE-TWO').expect(409);
    await report(secondClientAuthorization, 'SINPE-ONE').expect(409);
    await request(http)
      .post(
        `/api/v1/admin/subscription-payments/${first.body.id as string}/reject`,
      )
      .set('Authorization', adminAuthorization)
      .send({ reason: 'Receipt does not match the bank record.' })
      .expect(200);
    await report(firstClientAuthorization, 'SINPE-ONE').expect(201);

    const dateClient = await provisionClient(
      adminAuthorization,
      'dates@example.com',
    );
    const dateClientAuthorization = await authorization(dateClient.user.email);
    await report(dateClientAuthorization, 'FUTURE', isoDate(1)).expect(400);
    await report(dateClientAuthorization, 'OLD', isoDate(-31)).expect(400);
  });

  it('approves from FREE, extends from the active period, and cannot approve twice', async () => {
    const admin = await createAdmin();
    const adminAuthorization = await authorization(admin.email);
    const client = await provisionClient(adminAuthorization);
    const clientAuthorization = await authorization(client.user.email);
    const before = Date.now();
    const firstPayment = await report(
      clientAuthorization,
      'APPROVE-ONE',
    ).expect(201);
    const firstApproval = await request(http)
      .post(
        `/api/v1/admin/subscription-payments/${firstPayment.body.id as string}/approve`,
      )
      .set('Authorization', adminAuthorization)
      .expect(200);
    const firstProUntil = Date.parse(firstApproval.body.proUntil as string);
    expect(firstProUntil).toBeGreaterThan(
      before + (PERIOD_DAYS - 1) * 86_400_000,
    );
    expect(firstProUntil).toBeLessThan(before + (PERIOD_DAYS + 1) * 86_400_000);
    await request(http)
      .get('/api/v1/clients/me/subscription')
      .set('Authorization', clientAuthorization)
      .expect(200)
      .expect(({ body }: { body: { plan: string; source: string } }) => {
        expect(body).toMatchObject({ plan: 'PRO', source: 'PAID' });
      });

    const secondPayment = await report(
      clientAuthorization,
      'APPROVE-TWO',
    ).expect(201);
    const secondApproval = await request(http)
      .post(
        `/api/v1/admin/subscription-payments/${secondPayment.body.id as string}/approve`,
      )
      .set('Authorization', adminAuthorization)
      .expect(200);
    expect(
      Date.parse(secondApproval.body.proUntil as string) - firstProUntil,
    ).toBe(PERIOD_DAYS * 86_400_000);
    await request(http)
      .post(
        `/api/v1/admin/subscription-payments/${secondPayment.body.id as string}/approve`,
      )
      .set('Authorization', adminAuthorization)
      .expect(409);
  });

  it('rejects without changing the plan and supports complimentary Pro changes', async () => {
    const admin = await createAdmin();
    const adminAuthorization = await authorization(admin.email);
    const client = await provisionClient(adminAuthorization);
    const clientAuthorization = await authorization(client.user.email);
    const payment = await report(clientAuthorization, 'REJECT-ONE').expect(201);
    await request(http)
      .post(
        `/api/v1/admin/subscription-payments/${payment.body.id as string}/reject`,
      )
      .set('Authorization', adminAuthorization)
      .send({ reason: 'Receipt could not be verified.' })
      .expect(200)
      .expect(
        ({ body }: { body: { rejectionReason: string; status: string } }) => {
          expect(body).toMatchObject({
            status: 'REJECTED',
            rejectionReason: 'Receipt could not be verified.',
          });
        },
      );
    await request(http)
      .get('/api/v1/clients/me/subscription')
      .set('Authorization', clientAuthorization)
      .expect(200)
      .expect(({ body }: { body: { plan: string } }) => {
        expect(body.plan).toBe('FREE');
      });
    await request(http)
      .patch(`/api/v1/clients/${client.id}/subscription`)
      .set('Authorization', adminAuthorization)
      .send({ complimentary: true })
      .expect(200)
      .expect(({ body }: { body: Record<string, unknown> }) => {
        expect(body).toMatchObject({
          plan: 'PRO',
          source: 'COMPLIMENTARY',
          proUntil: null,
        });
      });
    await request(http)
      .patch(`/api/v1/clients/${client.id}/subscription`)
      .set('Authorization', adminAuthorization)
      .send({ complimentary: false })
      .expect(200)
      .expect(({ body }: { body: { plan: string; source: null } }) => {
        expect(body).toMatchObject({ plan: 'FREE', source: null });
      });
  });

  it('lists exactly the expired clients that still have a trainer', async () => {
    const admin = await createAdmin();
    const adminAuthorization = await authorization(admin.email);
    const trainer = await provisionTrainer(adminAuthorization);
    const client = await provisionClient(adminAuthorization);
    await request(http)
      .patch(`/api/v1/clients/${client.id}/subscription`)
      .set('Authorization', adminAuthorization)
      .send({ complimentary: true })
      .expect(200);
    await request(http)
      .put(`/api/v1/clients/${client.id}/trainer`)
      .set('Authorization', adminAuthorization)
      .send({ trainerId: trainer.id })
      .expect(200);
    await request(http)
      .patch(`/api/v1/clients/${client.id}/subscription`)
      .set('Authorization', adminAuthorization)
      .send({ complimentary: false })
      .expect(200);
    const response = await request(http)
      .get('/api/v1/admin/subscriptions/expired-with-trainer')
      .set('Authorization', adminAuthorization)
      .expect(200);
    expect(response.body.data).toEqual([
      expect.objectContaining({ id: client.id }),
    ]);
  });

  it('enforces subscription authorization and does not expose client payment data', async () => {
    const admin = await createAdmin();
    const adminAuthorization = await authorization(admin.email);
    const client = await provisionClient(adminAuthorization);
    const otherClient = await provisionClient(
      adminAuthorization,
      'other@example.com',
    );
    const trainer = await provisionTrainer(adminAuthorization);
    const clientAuthorization = await authorization(client.user.email);
    const trainerAuthorization = await authorization(trainer.user.email);
    await report(clientAuthorization, 'PRIVATE-ONE').expect(201);
    await request(http)
      .get('/api/v1/admin/subscription-payments')
      .set('Authorization', clientAuthorization)
      .expect(403);
    await request(http)
      .get(`/api/v1/clients/${otherClient.id}/subscription`)
      .set('Authorization', clientAuthorization)
      .expect(403);
    await request(http)
      .get('/api/v1/clients/me/subscription')
      .set('Authorization', trainerAuthorization)
      .expect(403);
    const ownSubscription = await request(http)
      .get('/api/v1/clients/me/subscription')
      .set('Authorization', clientAuthorization)
      .expect(200);
    expect(ownSubscription.body.pendingPayment).toMatchObject({
      reference: 'PRIVATE-ONE',
    });
    expect(ownSubscription.body.pendingPayment).not.toHaveProperty('client');
  });

  it('returns 503 when payment configuration is unavailable', async () => {
    const admin = await createAdmin();
    const adminAuthorization = await authorization(admin.email);
    const client = await provisionClient(adminAuthorization);
    const clientAuthorization = await authorization(client.user.email);
    const config = app.get(ConfigService<EnvironmentVariables, true>);
    const originalGet = config.get.bind(config) as (key: string) => unknown;
    const unconfigured = new Set([
      'SUBSCRIPTION_SINPE_PHONE',
      'SUBSCRIPTION_SINPE_HOLDER_NAME',
      'SUBSCRIPTION_PRO_PRICE_CRC',
    ]);
    // ConfigService caches validated values, so `set` does not reach the
    // service; intercept the read instead and restore it afterwards.
    const spy = jest
      .spyOn(config, 'get')
      .mockImplementation(((key: string) =>
        unconfigured.has(key) ? undefined : originalGet(key)) as never);
    try {
      await report(clientAuthorization, 'UNCONFIGURED').expect(503);
    } finally {
      spy.mockRestore();
    }
  });
});
