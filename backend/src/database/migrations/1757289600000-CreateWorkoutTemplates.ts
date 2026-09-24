import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkoutTemplates1757289600000 implements MigrationInterface {
  name = 'CreateWorkoutTemplates1757289600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "workout_template_status" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "workout_prescription_type" AS ENUM ('REPS', 'DURATION')`,
    );
    await queryRunner.query(`
      CREATE TABLE "workout_templates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(150) NOT NULL,
        "description" character varying(2000),
        "status" "workout_template_status" NOT NULL DEFAULT 'DRAFT',
        "created_by_user_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workout_templates_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workout_templates_created_by_user_id"
          FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_workout_templates_created_by_user_id"
        ON "workout_templates" ("created_by_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workout_templates_status"
        ON "workout_templates" ("status")`,
    );
    await queryRunner.query(`
      CREATE TABLE "workout_template_exercises" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workout_template_id" uuid NOT NULL,
        "exercise_id" uuid NOT NULL,
        "position" integer NOT NULL,
        "sets" integer NOT NULL,
        "prescription_type" "workout_prescription_type" NOT NULL,
        "reps_min" integer,
        "reps_max" integer,
        "duration_seconds" integer,
        "rest_seconds" integer NOT NULL,
        "target_rpe" numeric(3,1),
        "target_rir" integer,
        "tempo" character varying(20),
        "notes" character varying(1000),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workout_template_exercises_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_workout_template_exercises_template_position"
          UNIQUE ("workout_template_id", "position"),
        CONSTRAINT "FK_workout_template_exercises_workout_template_id"
          FOREIGN KEY ("workout_template_id")
          REFERENCES "workout_templates"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workout_template_exercises_exercise_id"
          FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_workout_template_exercises_position"
          CHECK ("position" > 0),
        CONSTRAINT "CHK_workout_template_exercises_sets"
          CHECK ("sets" >= 1 AND "sets" <= 20),
        CONSTRAINT "CHK_workout_template_exercises_rest_seconds"
          CHECK ("rest_seconds" >= 0 AND "rest_seconds" <= 3600),
        CONSTRAINT "CHK_workout_template_exercises_target_rpe"
          CHECK ("target_rpe" IS NULL OR ("target_rpe" >= 1 AND "target_rpe" <= 10)),
        CONSTRAINT "CHK_workout_template_exercises_target_rir"
          CHECK ("target_rir" IS NULL OR ("target_rir" >= 0 AND "target_rir" <= 10)),
        CONSTRAINT "CHK_workout_template_exercises_rpe_xor_rir"
          CHECK ("target_rpe" IS NULL OR "target_rir" IS NULL),
        CONSTRAINT "CHK_workout_template_exercises_prescription"
          CHECK (
            (
              "prescription_type" = 'REPS'
              AND "reps_min" IS NOT NULL
              AND "reps_max" IS NOT NULL
              AND "reps_min" > 0
              AND "reps_max" >= "reps_min"
              AND "duration_seconds" IS NULL
            )
            OR
            (
              "prescription_type" = 'DURATION'
              AND "duration_seconds" IS NOT NULL
              AND "duration_seconds" > 0
              AND "reps_min" IS NULL
              AND "reps_max" IS NULL
            )
          )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_workout_template_exercises_workout_template_id"
        ON "workout_template_exercises" ("workout_template_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_workout_template_exercises_workout_template_id"`,
    );
    await queryRunner.query(`DROP TABLE "workout_template_exercises"`);
    await queryRunner.query(`DROP INDEX "IDX_workout_templates_status"`);
    await queryRunner.query(
      `DROP INDEX "IDX_workout_templates_created_by_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "workout_templates"`);
    await queryRunner.query(`DROP TYPE "workout_prescription_type"`);
    await queryRunner.query(`DROP TYPE "workout_template_status"`);
  }
}
