import './e2e-env';

process.env.NODE_ENV = 'test';
process.env.DATABASE_NAME = 'training_test';
process.env.OBJECT_STORAGE_DRIVER = 's3';
process.env.OBJECT_STORAGE_FORCE_PATH_STYLE = 'true';
