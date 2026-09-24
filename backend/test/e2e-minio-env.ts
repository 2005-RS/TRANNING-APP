import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import './e2e-env';

loadEnv({ path: resolve(__dirname, '..', '.env') });

process.env.NODE_ENV = 'test';
process.env.DATABASE_NAME = 'training_test';
process.env.OBJECT_STORAGE_DRIVER = 's3';
process.env.OBJECT_STORAGE_FORCE_PATH_STYLE = 'true';
