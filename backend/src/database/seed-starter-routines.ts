import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { Exercise } from '../modules/exercises/entities/exercise.entity';
import { ExerciseStatus } from '../modules/exercises/enums/exercise-status.enum';
import { User } from '../modules/users/entities/user.entity';
import { UserRole } from '../modules/users/enums/user-role.enum';
import { UserStatus } from '../modules/users/enums/user-status.enum';
import { WorkoutTemplateExercise } from '../modules/workout-templates/entities/workout-template-exercise.entity';
import { WorkoutTemplate } from '../modules/workout-templates/entities/workout-template.entity';
import { WorkoutPrescriptionType } from '../modules/workout-templates/enums/workout-prescription-type.enum';
import { WorkoutTemplateStatus } from '../modules/workout-templates/enums/workout-template-status.enum';

/**
 * One slot = one exercise. Candidates are tried in order (case-insensitive,
 * exact name) against the ACTIVE catalog; the first match wins. The first
 * candidates match the Vital pack names; the rest are common fallbacks for
 * other catalogs.
 */
type Slot = {
  candidates: string[];
  /** Duration-based item (seconds of work per set). Omit for reps 8–12. */
  durationSeconds?: number;
  sets?: number;
  restSeconds?: number;
};

type Routine = { name: string; description: string; slots: Slot[] };

const routines: Routine[] = [
  {
    name: 'Full body principiante',
    description:
      'Todo el cuerpo en una sesión, con máquinas y mancuernas. Ideal para empezar 2–3 veces por semana.',
    slots: [
      {
        candidates: [
          'dumbbell goblet squat',
          'goblet squat',
          'leg press machine',
          'bodyweight squat',
        ],
      },
      {
        candidates: ['pec deck machine fly', 'dumbbell bench press', 'push-up'],
      },
      {
        candidates: [
          'seated overhead press',
          'dumbbell overhead standard',
          'dumbbell shoulder press',
        ],
      },
      {
        candidates: [
          'dumbbell hip hinge',
          'barbell romanian deadlift',
          'romanian deadlift',
        ],
      },
      {
        candidates: [
          'seated leg curl machine',
          'lying leg curl machine',
          'leg curl',
        ],
      },
      {
        candidates: ['walk on treadmill', 'cycling'],
        durationSeconds: 600,
        sets: 1,
        restSeconds: 60,
      },
    ],
  },
  {
    name: 'Torso',
    description:
      'Pecho, hombros y brazos. Combínala con "Pierna y glúteo" en días alternos.',
    slots: [
      {
        candidates: ['pec deck machine fly', 'dumbbell bench press', 'push-up'],
      },
      {
        candidates: [
          'seated overhead press',
          'arnold press dumbbell',
          'dumbbell shoulder press',
        ],
      },
      {
        candidates: [
          'lateral raises (dumbbell)',
          'lateral raise machine',
          'lateral raise',
        ],
      },
      {
        candidates: ['rear delt fly (reverse pec deck)', 'rear delt cable fly'],
      },
      { candidates: ['triceps pushdown (cable - rope)', 'triceps pushdown'] },
      { candidates: ['svend press chest', 'front raise (dumbbell)'] },
    ],
  },
  {
    name: 'Pierna y glúteo',
    description:
      'Cuádriceps, femorales y glúteos. Empieza con cargas cómodas y aumenta poco a poco.',
    slots: [
      {
        candidates: [
          'leg press machine',
          'dumbbell goblet squat',
          'goblet squat',
        ],
      },
      {
        candidates: ['barbell hip thrust', 'hip thrust', 'dumbbell hip hinge'],
      },
      {
        candidates: [
          'dumbbell bulgarian split squat',
          'step-ups (weighted)',
          'walking lunge',
        ],
      },
      {
        candidates: [
          'seated leg curl machine',
          'lying leg curl machine',
          'leg curl',
        ],
      },
      { candidates: ['leg extension machine'] },
      { candidates: ['hip abduction machine', 'cable leg kickback'] },
    ],
  },
  {
    name: 'Cardio y core',
    description:
      'Sesión corta para mejorar tu condición. Trabaja por tiempo y descansa lo indicado.',
    slots: [
      {
        candidates: ['rowing machine', 'cycling'],
        durationSeconds: 300,
        sets: 1,
        restSeconds: 60,
      },
      {
        candidates: ['kettlebell swing', 'jumping jack'],
        durationSeconds: 40,
        sets: 3,
        restSeconds: 40,
      },
      {
        candidates: ['rope wave', 'mountain climber'],
        durationSeconds: 30,
        sets: 3,
        restSeconds: 45,
      },
      {
        candidates: ['air bike sprint', 'burpee'],
        durationSeconds: 20,
        sets: 4,
        restSeconds: 60,
      },
      {
        candidates: [
          'elliptical hiit machine',
          'stepmill machine',
          'run on treadmill',
        ],
        durationSeconds: 600,
        sets: 1,
        restSeconds: 60,
      },
    ],
  },
];

async function seedStarterRoutines(): Promise<void> {
  const logger = new Logger('SeedStarterRoutines');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const dataSource = app.get(DataSource);
    const users = dataSource.getRepository(User);
    const admin = await users.findOne({
      where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
      order: { createdAt: 'ASC' },
    });
    if (!admin)
      throw new Error(
        'An ACTIVE ADMIN user is required to seed starter routines.',
      );

    const exercises = dataSource.getRepository(Exercise);
    const templates = dataSource.getRepository(WorkoutTemplate);
    const templateExercises = dataSource.getRepository(WorkoutTemplateExercise);
    let createdOrUpdated = 0;
    let skipped = 0;
    for (const routine of routines) {
      const matched: Array<{ exercise: Exercise; slot: Slot }> = [];
      for (const slot of routine.slots) {
        for (const candidate of slot.candidates) {
          const exercise = await exercises
            .createQueryBuilder('exercise')
            .where('exercise.status = :status', {
              status: ExerciseStatus.ACTIVE,
            })
            .andWhere('LOWER(exercise.name) = :name', {
              name: candidate.toLowerCase(),
            })
            .orderBy('exercise.createdAt', 'ASC')
            .getOne();
          if (exercise) {
            if (!matched.some((item) => item.exercise.id === exercise.id)) {
              matched.push({ exercise, slot });
            }
            break;
          }
        }
      }
      if (matched.length < 3) {
        logger.warn(
          `Skipped ${routine.name}: only ${matched.length} matching ACTIVE exercises.`,
        );
        skipped += 1;
        continue;
      }
      let template = await templates
        .createQueryBuilder('template')
        .where('template.createdByUserId = :userId', { userId: admin.id })
        .andWhere('LOWER(template.name) = :name', {
          name: routine.name.toLowerCase(),
        })
        .getOne();
      if (!template)
        template = templates.create({
          name: routine.name,
          createdByUserId: admin.id,
        });
      template.description = routine.description;
      template.status = WorkoutTemplateStatus.ACTIVE;
      template.isLibraryPublished = true;
      template = await templates.save(template);
      await templateExercises.delete({ workoutTemplateId: template.id });
      await templateExercises.save(
        matched.map(({ exercise, slot }, index) => {
          const timed = slot.durationSeconds !== undefined;
          return templateExercises.create({
            workoutTemplateId: template.id,
            exerciseId: exercise.id,
            position: index + 1,
            sets: slot.sets ?? 3,
            prescriptionType: timed
              ? WorkoutPrescriptionType.DURATION
              : WorkoutPrescriptionType.REPS,
            repsMin: timed ? null : 8,
            repsMax: timed ? null : 12,
            durationSeconds: timed ? (slot.durationSeconds ?? null) : null,
            restSeconds: slot.restSeconds ?? 90,
            targetRpe: null,
            targetRir: null,
            tempo: null,
            notes: null,
          });
        }),
      );
      createdOrUpdated += 1;
      logger.log(`Seeded ${routine.name} with ${matched.length} exercises.`);
    }
    logger.log(
      `Starter routines complete: ${createdOrUpdated} created or updated, ${skipped} skipped.`,
    );
  } finally {
    await app.close();
  }
}

void seedStarterRoutines();
