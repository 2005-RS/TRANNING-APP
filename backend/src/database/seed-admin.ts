import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EnvironmentVariables } from '../config/env.validation';
import { PasswordHasherService } from '../modules/auth/services/password-hasher.service';
import { assertPasswordPolicy } from '../modules/auth/password.policy';
import { UsersService } from '../modules/users/users.service';

async function seedAdmin(): Promise<void> {
  const logger = new Logger('SeedAdmin');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const config = app.get(ConfigService<EnvironmentVariables, true>);
    const email = config.get('INITIAL_ADMIN_EMAIL', { infer: true });
    const password = config.get('INITIAL_ADMIN_PASSWORD', { infer: true });
    const firstName = config.get('INITIAL_ADMIN_FIRST_NAME', { infer: true });
    const lastName = config.get('INITIAL_ADMIN_LAST_NAME', { infer: true });

    if (!email || !password || !firstName || !lastName) {
      throw new Error(
        'INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD, INITIAL_ADMIN_FIRST_NAME and INITIAL_ADMIN_LAST_NAME are required to seed an administrator.',
      );
    }

    const policyError = assertPasswordPolicy(password);
    if (policyError) {
      throw new Error(policyError);
    }

    const nodeEnv = config.get('NODE_ENV', { infer: true });
    if (nodeEnv === 'production') {
      const normalizedEmail = email.trim().toLowerCase();
      if (
        normalizedEmail === 'admin@example.com' ||
        normalizedEmail.endsWith('@example.com')
      ) {
        throw new Error(
          'INITIAL_ADMIN_EMAIL cannot use an example.com address in production.',
        );
      }

      const normalizedPassword = password.toLowerCase();
      if (
        normalizedPassword === 'password123' ||
        normalizedPassword === 'changeme' ||
        normalizedPassword.includes('password123')
      ) {
        throw new Error(
          'INITIAL_ADMIN_PASSWORD is too weak for production use.',
        );
      }
    }

    const hasher = app.get(PasswordHasherService);
    const users = app.get(UsersService);
    const passwordHash = await hasher.hash(password);
    const result = await users.createAdminIfAbsent({
      email,
      passwordHash,
      firstName,
      lastName,
    });

    if (result === 'exists') {
      logger.log('Administrator already exists; password was not changed.');
      return;
    }

    logger.log('Administrator created.');
  } finally {
    await app.close();
  }
}

void seedAdmin();
