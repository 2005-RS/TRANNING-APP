import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { EnvironmentVariables } from '../../config/env.validation';
import { ExerciseMediaService } from '../../modules/exercises/media/exercise-media.service';
import { ExercisesService } from '../../modules/exercises/exercises.service';
import { UsersService } from '../../modules/users/users.service';
import { ImportExerciseLibraryRunner } from './import-exercise-library.runner';
import { DEFAULT_PACK_DIR } from './pack-loader';

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

async function main(): Promise<void> {
  const logger = new Logger('ImportExerciseLibrary');
  const dryRun = process.argv.includes('--dry-run');
  const skipCleanup = process.argv.includes('--skip-cleanup');
  const packDir = readArg('--pack-dir') ?? DEFAULT_PACK_DIR;

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const runner = new ImportExerciseLibraryRunner(
      app.get(ExercisesService),
      app.get(ExerciseMediaService),
      app.get(UsersService),
      app.get(ConfigService<EnvironmentVariables, true>),
      app.get(DataSource),
    );
    const report = await runner.run({ dryRun, packDir, skipCleanup });
    logger.log(
      JSON.stringify({
        event: 'exercise_library_import_complete',
        dryRun: report.dryRun,
        curatedCount: report.curatedCount,
        categories: report.categories,
        created: report.exercises.filter((item) => item.action === 'create')
          .length,
        reused: report.exercises.filter((item) => item.action === 'reuse')
          .length,
        updated: report.exercises.filter((item) => item.action === 'update')
          .length,
        skipped: report.exercises.filter((item) => item.action === 'skip')
          .length,
        mediaUploaded: report.exercises.filter(
          (item) => item.media === 'upload',
        ).length,
        mediaReused: report.exercises.filter((item) => item.media === 'reuse')
          .length,
        mediaMissing: report.exercises.filter(
          (item) => item.media === 'missing',
        ).length,
        mediaInvalid: report.exercises.filter(
          (item) => item.media === 'invalid',
        ).length,
        cleanupCandidates: report.cleanupCandidates,
        cleanupRemoved: report.cleanupRemoved,
      }),
    );
  } finally {
    await app.close();
  }
}

void main();
