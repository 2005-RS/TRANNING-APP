import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { collectVitalRecords, mapVitalRecord } from './vital-map';
import { MappedVitalExercise, VitalExerciseRecord } from './vital-types';

export const DEFAULT_PACK_DIR = resolve(
  __dirname,
  '../../../../assets/import/vital-animations',
);
export const OFFICIAL_PACK_URL =
  'https://vitalanimations.com/VitalAnimations.zip';
export const OFFICIAL_PACK_PAGE = 'https://vitalanimations.com/free-pack';

export type LoadedVitalPack = {
  packDir: string;
  exercises: MappedVitalExercise[];
  jsonFiles: string[];
  animationFiles: string[];
};

function walkFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) {
    return acc;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, acc);
      continue;
    }
    acc.push(full);
  }
  return acc;
}

export function resolveAnimationPath(
  record: VitalExerciseRecord,
  sourceId: string,
  animationFiles: string[],
): string | null {
  const explicit = [
    record.video,
    record.videoUrl,
    record.animation,
    record.file,
  ]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.replace(/^file:\/\//, '').replace(/\\/g, '/'));

  for (const candidate of explicit) {
    const match = animationFiles.find((file) =>
      file.replace(/\\/g, '/').toLowerCase().endsWith(candidate.toLowerCase()),
    );
    if (match) {
      return match;
    }
    const byName = animationFiles.find(
      (file) =>
        basename(file).toLowerCase() === basename(candidate).toLowerCase(),
    );
    if (byName) {
      return byName;
    }
  }

  const needle = sourceId.toLowerCase();
  const byId = animationFiles.find((file) =>
    basename(file, extname(file)).toLowerCase().includes(needle),
  );
  if (byId) {
    return byId;
  }

  if (typeof record.name === 'string') {
    const slug = record.name.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const bySlug = animationFiles.find((file) =>
      basename(file, extname(file))
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .includes(slug),
    );
    if (bySlug && slug.length >= 4) {
      return bySlug;
    }
  }

  return null;
}

export function extractZipIfNeeded(packDir: string): void {
  const zipPath = join(packDir, 'VitalAnimations.zip');
  if (!existsSync(zipPath)) {
    return;
  }
  const hasContent = walkFiles(packDir).some(
    (file) =>
      file !== zipPath && (file.endsWith('.json') || file.endsWith('.mp4')),
  );
  if (hasContent) {
    return;
  }
  execFileSync('tar', ['-xf', zipPath, '-C', packDir], { stdio: 'pipe' });
}

export function loadVitalPack(packDir: string): LoadedVitalPack {
  extractZipIfNeeded(packDir);
  const files = walkFiles(packDir);
  const jsonFiles = files.filter(
    (file) =>
      extname(file).toLowerCase() === '.json' &&
      !basename(file).startsWith('.'),
  );
  const animationFiles = files.filter(
    (file) => extname(file).toLowerCase() === '.mp4',
  );

  const records: VitalExerciseRecord[] = [];
  for (const jsonFile of jsonFiles) {
    try {
      const parsed = JSON.parse(readFileSync(jsonFile, 'utf8')) as unknown;
      records.push(...collectVitalRecords(parsed));
    } catch {
      continue;
    }
  }

  const exercises = records.map((record, index) => {
    const mapped = mapVitalRecord(record, index, null);
    return {
      ...mapped,
      animationPath: resolveAnimationPath(
        record,
        mapped.sourceId,
        animationFiles,
      ),
    };
  });

  return {
    packDir,
    exercises,
    jsonFiles,
    animationFiles,
  };
}

export function packPresent(packDir: string): boolean {
  if (!existsSync(packDir)) {
    return false;
  }
  if (existsSync(join(packDir, 'VitalAnimations.zip'))) {
    return true;
  }
  return walkFiles(packDir).some((file) => {
    const ext = extname(file).toLowerCase();
    return ext === '.json' || ext === '.mp4';
  });
}

export function missingPackMessage(packDir: string): string {
  return [
    'Official Vital Animations Free Pack was not found locally.',
    `Download it only from ${OFFICIAL_PACK_PAGE}`,
    `Direct ZIP: ${OFFICIAL_PACK_URL}`,
    `Place the ZIP at: ${join(packDir, 'VitalAnimations.zip')}`,
    'or extract the pack into that folder, then rerun the importer.',
    'Do not substitute unofficial GitHub/GymVisual/ExerciseDB mirrors.',
  ].join('\n');
}

export function fileSize(path: string): number {
  return statSync(path).size;
}
