import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { EnvironmentVariables } from '../../config/env.validation';
import { AuthenticatedUser } from '../../modules/auth/types/authenticated-user';
import { ExerciseMediaType } from '../../modules/exercises/media/enums/exercise-media-type.enum';
import { ExerciseMediaStatus } from '../../modules/exercises/media/enums/exercise-media-status.enum';
import { ExerciseMediaService } from '../../modules/exercises/media/exercise-media.service';
import { ExercisesService } from '../../modules/exercises/exercises.service';
import { UsersService } from '../../modules/users/users.service';
import { UserRole } from '../../modules/users/enums/user-role.enum';
import { UserStatus } from '../../modules/users/enums/user-status.enum';
import { curateVitalExercises, summarizeCategories } from './vital-curate';
import { validateVitalAnimation } from './media-validate';
import {
  DEFAULT_PACK_DIR,
  loadVitalPack,
  missingPackMessage,
  packPresent,
} from './pack-loader';
import { isDisposableTestExerciseName } from './test-exercise-names';
import { MappedVitalExercise } from './vital-types';
import { ExerciseDifficultyLevel } from '../../modules/exercises/enums/exercise-difficulty-level.enum';
import { ExerciseEquipmentType } from '../../modules/exercises/enums/exercise-equipment-type.enum';
import { ExerciseMuscleGroup } from '../../modules/exercises/enums/exercise-muscle-group.enum';

export type ImportOptions = {
  dryRun: boolean;
  packDir: string;
  skipCleanup: boolean;
};

export type ImportExerciseResult = {
  sourceId: string;
  name: string;
  action: 'create' | 'reuse' | 'update' | 'skip';
  media: 'upload' | 'reuse' | 'missing' | 'invalid' | 'skip';
  reason?: string;
};

export type ImportReport = {
  dryRun: boolean;
  packDir: string;
  curatedCount: number;
  categories: Record<string, number>;
  exercises: ImportExerciseResult[];
  cleanupCandidates: string[];
  cleanupRemoved: string[];
};

export type UploadFn = (
  url: string,
  fields: Record<string, string>,
  file: { buffer: Buffer; fileName: string; mimeType: string },
) => Promise<void>;

export async function defaultSignedPostUpload(
  url: string,
  fields: Record<string, string>,
  file: { buffer: Buffer; fileName: string; mimeType: string },
): Promise<void> {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }
  form.append(
    'file',
    new Blob([new Uint8Array(file.buffer)], { type: file.mimeType }),
    file.fileName,
  );
  const response = await fetch(url, { method: 'POST', body: form });
  if (!response.ok) {
    throw new Error(`Object storage upload failed (${response.status})`);
  }
}

export class ImportExerciseLibraryRunner {
  private readonly logger = new Logger('ImportExerciseLibrary');

  constructor(
    private readonly exercises: ExercisesService,
    private readonly media: ExerciseMediaService,
    private readonly users: UsersService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly dataSource: DataSource,
    private readonly upload: UploadFn = defaultSignedPostUpload,
  ) {}

  async run(options: ImportOptions): Promise<ImportReport> {
    const packDir = options.packDir || DEFAULT_PACK_DIR;
    if (!packPresent(packDir)) {
      throw new Error(missingPackMessage(packDir));
    }

    const pack = loadVitalPack(packDir);
    const curated = curateVitalExercises(pack.exercises);
    const actor = options.dryRun ? null : await this.requireAdminActor();
    const results: ImportExerciseResult[] = [];

    for (const item of curated) {
      results.push(await this.importOne(item, actor, options.dryRun));
    }

    const cleanup = await this.cleanupTestData(options);

    return {
      dryRun: options.dryRun,
      packDir,
      curatedCount: curated.length,
      categories: summarizeCategories(curated),
      exercises: results,
      cleanupCandidates: cleanup.candidates,
      cleanupRemoved: cleanup.removed,
    };
  }

  private async importOne(
    item: MappedVitalExercise,
    actor: AuthenticatedUser | null,
    dryRun: boolean,
  ): Promise<ImportExerciseResult> {
    const existing = await this.exercises.findActiveByNormalizedName(item.name);
    const action: ImportExerciseResult['action'] = existing
      ? metadataNeedsRefresh(existing, item)
        ? 'update'
        : 'reuse'
      : 'create';
    let exercise = existing
      ? {
          id: existing.id,
          name: existing.name,
        }
      : null;

    if (!existing && dryRun) {
      return {
        sourceId: item.sourceId,
        name: item.name,
        action: 'create',
        media: item.animationPath ? 'upload' : 'missing',
        reason: item.animationPath ? undefined : 'animation file not found',
      };
    }

    if (existing && action === 'update' && dryRun) {
      const media = await this.importMedia(existing.id, item, actor, true);
      return {
        sourceId: item.sourceId,
        name: item.name,
        action,
        ...media,
      };
    }

    if (!existing && actor) {
      const created = await this.exercises.create(
        {
          name: item.name,
          description: item.description ?? undefined,
          instructions: item.instructions ?? undefined,
          primaryMuscleGroup: item.primaryMuscleGroup as ExerciseMuscleGroup,
          equipmentType: item.equipmentType as ExerciseEquipmentType,
          difficultyLevel: item.difficultyLevel as ExerciseDifficultyLevel,
        },
        actor,
      );
      exercise = created;
    }

    if (existing && action === 'update' && actor) {
      await this.exercises.update(
        existing.id,
        {
          description: item.description,
          instructions: item.instructions,
          primaryMuscleGroup: item.primaryMuscleGroup as ExerciseMuscleGroup,
          equipmentType: item.equipmentType as ExerciseEquipmentType,
          difficultyLevel: item.difficultyLevel as ExerciseDifficultyLevel,
        },
        actor,
      );
    }

    if (!exercise) {
      return {
        sourceId: item.sourceId,
        name: item.name,
        action,
        media: 'skip',
        reason: 'exercise could not be created',
      };
    }

    const media = await this.importMedia(exercise.id, item, actor, dryRun);
    return {
      sourceId: item.sourceId,
      name: item.name,
      action,
      ...media,
    };
  }

  private async importMedia(
    exerciseId: string,
    item: MappedVitalExercise,
    actor: AuthenticatedUser | null,
    dryRun: boolean,
  ): Promise<Pick<ImportExerciseResult, 'media' | 'reason'>> {
    const listed = await this.media.list(exerciseId);
    const readyVideo = listed.find(
      (row) =>
        row.mediaType === ExerciseMediaType.VIDEO &&
        row.status === ExerciseMediaStatus.READY,
    );
    if (readyVideo) {
      return { media: 'reuse' };
    }
    if (!item.animationPath) {
      return { media: 'missing', reason: 'animation file not found' };
    }

    const buffer = readFileSync(item.animationPath);
    const validation = validateVitalAnimation(item.animationPath, buffer);
    if (!validation.ok) {
      return { media: 'invalid', reason: validation.reason };
    }
    if (dryRun || !actor) {
      return { media: 'upload' };
    }

    const fileName = basename(item.animationPath);
    const initiated = await this.media.createUploadRequest(
      exerciseId,
      {
        mediaType: ExerciseMediaType.VIDEO,
        fileName,
        mimeType: validation.mimeType,
        fileSizeBytes: validation.sizeBytes,
        displayOrder: 0,
      },
      actor,
    );

    try {
      await this.upload(initiated.upload.url, initiated.upload.fields, {
        buffer,
        fileName,
        mimeType: validation.mimeType,
      });
      await this.media.finalize(exerciseId, initiated.media.id, actor);
      return { media: 'upload' };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'upload failed';
      this.logger.warn(
        JSON.stringify({
          event: 'exercise_library_media_import_failed',
          exerciseId,
          reason,
        }),
      );
      try {
        await this.media.remove(exerciseId, initiated.media.id, actor);
      } catch {
        // Leave PENDING/FAILED metadata for a later rerun to observe.
      }
      return { media: 'invalid', reason };
    }
  }

  private async requireAdminActor(): Promise<AuthenticatedUser> {
    const email = this.config.get('INITIAL_ADMIN_EMAIL', { infer: true });
    if (!email) {
      throw new Error(
        'INITIAL_ADMIN_EMAIL is required. Seed an administrator first.',
      );
    }
    const user = await this.users.findByEmailWithPassword(email);
    if (
      !user ||
      user.role !== UserRole.ADMIN ||
      user.status !== UserStatus.ACTIVE
    ) {
      throw new Error(
        'Active administrator not found. Run npm run seed:admin first.',
      );
    }
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      sessionId: 'import-exercise-library',
    };
  }

  private async cleanupTestData(options: ImportOptions): Promise<{
    candidates: string[];
    removed: string[];
  }> {
    const rows: Array<{ id: string; name: string }> =
      await this.dataSource.query(
        `
      SELECT e.id, e.name
      FROM exercises e
      WHERE NOT EXISTS (
        SELECT 1 FROM workout_template_exercises t WHERE t.exercise_id = e.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM training_plan_exercises p WHERE p.exercise_id = e.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM workout_session_exercises s WHERE s.exercise_id = e.id
      )
      ORDER BY e.created_at ASC, e.id ASC
      `,
      );
    const candidates = rows
      .filter((row) => isDisposableTestExerciseName(row.name))
      .map((row) => row.name);

    if (options.dryRun || options.skipCleanup || !candidates.length) {
      return { candidates, removed: [] };
    }

    const removed: string[] = [];
    for (const row of rows.filter((item) =>
      isDisposableTestExerciseName(item.name),
    )) {
      const mediaRows: Array<{ id: string }> = await this.dataSource.query(
        `SELECT id FROM exercise_media WHERE exercise_id = $1`,
        [row.id],
      );
      if (mediaRows.length > 0) {
        this.logger.warn(
          JSON.stringify({
            event: 'exercise_library_cleanup_skipped_with_media',
            exerciseId: row.id,
          }),
        );
        continue;
      }
      await this.dataSource.query(`DELETE FROM exercises WHERE id = $1`, [
        row.id,
      ]);
      removed.push(row.name);
    }
    return { candidates, removed };
  }
}

function metadataNeedsRefresh(
  existing: {
    primaryMuscleGroup?: string;
    equipmentType?: string;
    difficultyLevel?: string;
    description?: string | null;
    instructions?: string | null;
  },
  item: MappedVitalExercise,
): boolean {
  if (!existing.primaryMuscleGroup || !existing.equipmentType) {
    return false;
  }
  return (
    existing.primaryMuscleGroup !== item.primaryMuscleGroup ||
    existing.equipmentType !== item.equipmentType ||
    existing.difficultyLevel !== item.difficultyLevel ||
    (existing.description ?? null) !== item.description ||
    (existing.instructions ?? null) !== item.instructions
  );
}
