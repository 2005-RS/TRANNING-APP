import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { assertSafeTestDatabaseName } from '../src/database/assert-safe-test-database';
import { ClientProfile } from '../src/modules/clients/entities/client-profile.entity';
import { ClientExperienceLevel } from '../src/modules/clients/enums/client-experience-level.enum';
import { ClientPrimaryGoal } from '../src/modules/clients/enums/client-primary-goal.enum';
import { ClientSubscription } from '../src/modules/subscriptions/entities/client-subscription.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { clearIdentityGraph } from './helpers/clear-identity-graph';

describe('Registration (e2e)', () => {
  let app: INestApplication;
  let http: App;
  let dataSource: DataSource;
  let users: Repository<User>;
  let profiles: Repository<ClientProfile>;
  let subscriptions: Repository<ClientSubscription>;

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
    profiles = dataSource.getRepository(ClientProfile);
    subscriptions = dataSource.getRepository(ClientSubscription);
  });

  beforeEach(async () => {
    await clearIdentityGraph(dataSource);
  });

  afterAll(async () => {
    await app.close();
    delete process.env.AUTH_E2E_SKIP_THROTTLE;
  });

  function payload(overrides: Record<string, unknown> = {}) {
    return {
      email: 'new.client@example.com',
      password: 'correct horse battery',
      firstName: 'New',
      lastName: 'Client',
      primaryGoal: ClientPrimaryGoal.MUSCLE_GAIN,
      experienceLevel: ClientExperienceLevel.BEGINNER,
      acceptTerms: true,
      ...overrides,
    };
  }

  it('creates a FREE client, subscription, access token, and refresh cookie', async () => {
    const response = await request(http)
      .post('/api/v1/auth/register')
      .send(payload({ email: ' New.Client@Example.com ' }))
      .expect(201);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      email: 'new.client@example.com',
      role: UserRole.CLIENT,
    });
    expect(response.headers['set-cookie']).toBeDefined();
    const profile = await profiles.findOneByOrFail({
      userId: response.body.user.id,
    });
    expect(
      await subscriptions.findOneBy({ clientProfileId: profile.id }),
    ).toMatchObject({
      complimentary: false,
      proUntil: null,
    });
    await request(http)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${response.body.accessToken}`)
      .expect(200);
  });

  it('rejects duplicate emails, extra fields, weak passwords, and unaccepted terms', async () => {
    await request(http)
      .post('/api/v1/auth/register')
      .send(payload())
      .expect(201);
    await request(http)
      .post('/api/v1/auth/register')
      .send(payload())
      .expect(409);
    await request(http)
      .post('/api/v1/auth/register')
      .send(payload({ email: 'extra@example.com', role: UserRole.ADMIN }))
      .expect(400);
    await request(http)
      .post('/api/v1/auth/register')
      .send(payload({ email: 'weak@example.com', password: 'weak' }))
      .expect(400);
    await request(http)
      .post('/api/v1/auth/register')
      .send(payload({ email: 'terms@example.com', acceptTerms: false }))
      .expect(400);
    expect(await users.countBy({ role: UserRole.CLIENT })).toBe(1);
  });
});
