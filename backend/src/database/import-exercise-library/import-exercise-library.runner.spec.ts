import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { UserRole } from '../../modules/users/enums/user-role.enum';
import { UserStatus } from '../../modules/users/enums/user-status.enum';
import { ExerciseMediaStatus } from '../../modules/exercises/media/enums/exercise-media-status.enum';
import { ExerciseMediaType } from '../../modules/exercises/media/enums/exercise-media-type.enum';
import { ImportExerciseLibraryRunner } from './import-exercise-library.runner';
import { fakeMp4Fixture } from './media-validate';
import { missingPackMessage } from './pack-loader';

const admin = {
  id: 'admin-1',
  email: 'admin@example.com',
  firstName: 'Ada',
  lastName: 'Admin',
  role: UserRole.ADMIN,
  status: UserStatus.ACTIVE,
};

function writePack(options?: {
  name?: string;
  exerciseId?: string;
  withVideo?: boolean;
  invalidVideo?: boolean;
}): string {
  const dir = mkdtempSync(join(tmpdir(), 'vital-pack-'));
  const exerciseId = options?.exerciseId ?? 'va-bench';
  writeFileSync(
    join(dir, 'exercises.json'),
    JSON.stringify([
      {
        exerciseId,
        name: options?.name ?? 'Barbell Bench Press',
        bodyPart: 'chest',
        equipment: 'barbell',
        target: 'pectorals',
        difficulty: 'intermediate',
        description: 'Press.',
        instructions: ['Unrack.', 'Press.'],
      },
    ]),
  );
  if (options?.withVideo !== false) {
    const video = join(dir, `${exerciseId}.mp4`);
    writeFileSync(
      video,
      options?.invalidVideo
        ? Buffer.from('not-mp4-content-padding-xx')
        : fakeMp4Fixture(128),
    );
  }
  return dir;
}

function buildRunner(overrides?: {
  existing?: { id: string; name: string } | null;
  list?: unknown[];
  upload?: jest.Mock;
  query?: jest.Mock;
}) {
  const created = { id: 'ex-new', name: 'Barbell Bench Press' };
  const exercises = {
    findActiveByNormalizedName: jest
      .fn()
      .mockResolvedValue(overrides?.existing ?? null),
    create: jest.fn().mockResolvedValue(created),
    update: jest.fn().mockResolvedValue(created),
  };
  const media = {
    list: jest.fn().mockResolvedValue(overrides?.list ?? []),
    createUploadRequest: jest.fn().mockResolvedValue({
      media: { id: 'media-1' },
      upload: {
        url: 'http://127.0.0.1/upload',
        fields: { key: 'exercises/ex-new/media-1/file.mp4' },
      },
    }),
    finalize: jest.fn().mockResolvedValue({ id: 'media-1' }),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const users = {
    findByEmailWithPassword: jest.fn().mockResolvedValue(admin),
  };
  const config = {
    get: jest.fn().mockReturnValue(admin.email),
  };
  const dataSource = {
    query: overrides?.query ?? jest.fn().mockResolvedValue([]),
  };
  const upload = overrides?.upload ?? jest.fn().mockResolvedValue(undefined);

  return {
    runner: new ImportExerciseLibraryRunner(
      exercises as never,
      media as never,
      users as never,
      config as never,
      dataSource as never,
      upload,
    ),
    exercises,
    media,
    upload,
    dataSource,
  };
}

describe('ImportExerciseLibraryRunner', () => {
  it('stops when the official pack is missing', async () => {
    const { runner } = buildRunner();
    const packDir = join(tmpdir(), `vital-missing-${Date.now()}`);
    await expect(
      runner.run({ dryRun: true, packDir, skipCleanup: true }),
    ).rejects.toThrow(missingPackMessage(packDir));
  });

  it('dry-runs without creating exercises or uploading', async () => {
    const packDir = writePack();
    const { runner, exercises, media, upload } = buildRunner();
    const report = await runner.run({
      dryRun: true,
      packDir,
      skipCleanup: true,
    });
    expect(report.dryRun).toBe(true);
    expect(report.curatedCount).toBe(1);
    expect(report.exercises[0]).toMatchObject({
      action: 'create',
      media: 'upload',
    });
    expect(exercises.create).not.toHaveBeenCalled();
    expect(media.createUploadRequest).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it('imports an exercise and animation, then reuses them on rerun', async () => {
    const packDir = writePack();
    const first = buildRunner();
    const created = await first.runner.run({
      dryRun: false,
      packDir,
      skipCleanup: true,
    });
    expect(first.exercises.create).toHaveBeenCalledTimes(1);
    expect(first.media.createUploadRequest).toHaveBeenCalledTimes(1);
    expect(first.upload).toHaveBeenCalledTimes(1);
    expect(first.media.finalize).toHaveBeenCalledWith(
      'ex-new',
      'media-1',
      expect.objectContaining({ id: admin.id }),
    );
    expect(created.exercises[0]).toMatchObject({
      action: 'create',
      media: 'upload',
    });

    const second = buildRunner({
      existing: { id: 'ex-new', name: 'Barbell Bench Press' },
      list: [
        {
          id: 'media-1',
          mediaType: ExerciseMediaType.VIDEO,
          status: ExerciseMediaStatus.READY,
        },
      ],
    });
    const rerun = await second.runner.run({
      dryRun: false,
      packDir,
      skipCleanup: true,
    });
    expect(second.exercises.create).not.toHaveBeenCalled();
    expect(second.media.createUploadRequest).not.toHaveBeenCalled();
    expect(rerun.exercises[0]).toMatchObject({
      action: 'reuse',
      media: 'reuse',
    });
  });

  it('records missing and invalid animations without failing the catalog row', async () => {
    const missingDir = writePack({ withVideo: false });
    const missing = buildRunner();
    const missingReport = await missing.runner.run({
      dryRun: false,
      packDir: missingDir,
      skipCleanup: true,
    });
    expect(missing.exercises.create).toHaveBeenCalled();
    expect(missingReport.exercises[0].media).toBe('missing');

    const invalidDir = writePack({
      exerciseId: 'va-bad',
      name: 'Invalid Clip',
      invalidVideo: true,
    });
    const invalid = buildRunner();
    const invalidReport = await invalid.runner.run({
      dryRun: false,
      packDir: invalidDir,
      skipCleanup: true,
    });
    expect(invalid.media.createUploadRequest).not.toHaveBeenCalled();
    expect(invalidReport.exercises[0].media).toBe('invalid');
  });

  it('cleans up pending media when the MinIO upload fails', async () => {
    const packDir = writePack();
    const { runner, media, exercises } = buildRunner({
      upload: jest.fn().mockRejectedValue(new Error('upload failed')),
    });
    const report = await runner.run({
      dryRun: false,
      packDir,
      skipCleanup: true,
    });
    expect(exercises.create).toHaveBeenCalled();
    expect(media.remove).toHaveBeenCalledWith(
      'ex-new',
      'media-1',
      expect.objectContaining({ id: admin.id }),
    );
    expect(report.exercises[0].media).toBe('invalid');
  });

  it('lists unreferenced disposable names and deletes only those without media', async () => {
    const packDir = writePack();
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        { id: 'keep-1', name: 'Barbell Bench Press' },
        { id: 'test-1', name: 'MinIO Live Verify Bench' },
        { id: 'test-2', name: 'E2E press' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ id: 'media-x' }]);
    const { runner } = buildRunner({ query });
    const report = await runner.run({
      dryRun: false,
      packDir,
      skipCleanup: false,
    });
    expect(report.cleanupCandidates).toEqual([
      'MinIO Live Verify Bench',
      'E2E press',
    ]);
    expect(report.cleanupRemoved).toEqual(['MinIO Live Verify Bench']);
  });
});
