import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.validation';
import { createTypeOrmCliOptions } from './postgres-connection.options';

loadEnv({ path: resolve(__dirname, '..', '..', '.env') });

const env = validateEnv(process.env as Record<string, unknown>);

export default new DataSource(createTypeOrmCliOptions(env));
