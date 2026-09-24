import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkoutSessions1757462400000 implements MigrationInterface {
  name = 'CreateWorkoutSessions1757462400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "workout_session_status" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "workout_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "client_profile_id" uuid NOT NULL,
        "training_plan_id" uuid NOT NULL,
        "source_training_plan_workout_id" uuid NOT NULL,
        "workout_name_snapshot" character varying(150) NOT NULL,
        "workout_description_snapshot" character varying(2000),
        "scheduled_day_snapshot" "training_plan_day_of_week",
        "status" "workout_session_status" NOT NULL,
        "started_at" TIMESTAMPTZ NOT NULL,
        "completed_at" TIMESTAMPTZ,
        "cancelled_at" TIMESTAMPTZ,
        "notes" character varying(1000),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workout_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workout_sessions_client_profile_id"
          FOREIGN KEY ("client_profile_id") REFERENCES "client_profiles"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_workout_sessions_training_plan_id"
          FOREIGN KEY ("training_plan_id") REFERENCES "training_plans"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_workout_sessions_name_snapshot"
          CHECK (char_length(btrim("workout_name_snapshot")) > 0),
        CONSTRAINT "CHK_workout_sessions_lifecycle_timestamps"
          CHECK (
            ("status" = 'IN_PROGRESS' AND "completed_at" IS NULL AND "cancelled_at" IS NULL)
            OR ("status" = 'COMPLETED' AND "completed_at" IS NOT NULL AND "cancelled_at" IS NULL)
            OR ("status" = 'CANCELLED' AND "cancelled_at" IS NOT NULL AND "completed_at" IS NULL)
          )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_workout_sessions_training_plan_id"
        ON "workout_sessions" ("training_plan_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workout_sessions_client_started_at"
        ON "workout_sessions" ("client_profile_id", "started_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_workout_sessions_one_in_progress_per_client"
        ON "workout_sessions" ("client_profile_id")
        WHERE "status" = 'IN_PROGRESS'`,
    );
    await queryRunner.query(`
      CREATE TABLE "workout_session_exercises" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workout_session_id" uuid NOT NULL,
        "source_training_plan_exercise_id" uuid NOT NULL,
        "exercise_id" uuid NOT NULL,
        "exercise_name_snapshot" character varying(150) NOT NULL,
        "position" integer NOT NULL,
        "prescribed_sets" integer NOT NULL,
        "prescription_type" "workout_prescription_type" NOT NULL,
        "prescribed_reps_min" integer,
        "prescribed_reps_max" integer,
        "prescribed_duration_seconds" integer,
        "prescribed_rest_seconds" integer NOT NULL,
        "prescribed_target_load_kg" numeric(7,2),
        "prescribed_target_rpe" numeric(3,1),
        "prescribed_target_rir" integer,
        "prescribed_tempo" character varying(20),
        "prescribed_notes" character varying(1000),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workout_session_exercises_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_workout_session_exercises_session_position"
          UNIQUE ("workout_session_id", "position"),
        CONSTRAINT "FK_workout_session_exercises_workout_session_id"
          FOREIGN KEY ("workout_session_id")
          REFERENCES "workout_sessions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workout_session_exercises_exercise_id"
          FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_workout_session_exercises_name_snapshot"
          CHECK (char_length(btrim("exercise_name_snapshot")) > 0),
        CONSTRAINT "CHK_workout_session_exercises_position"
          CHECK ("position" > 0),
        CONSTRAINT "CHK_workout_session_exercises_sets"
          CHECK ("prescribed_sets" >= 1 AND "prescribed_sets" <= 20),
        CONSTRAINT "CHK_workout_session_exercises_rest_seconds"
          CHECK ("prescribed_rest_seconds" >= 0 AND "prescribed_rest_seconds" <= 3600),
        CONSTRAINT "CHK_workout_session_exercises_target_load_kg"
          CHECK ("prescribed_target_load_kg" IS NULL OR "prescribed_target_load_kg" >= 0),
        CONSTRAINT "CHK_workout_session_exercises_target_rpe"
          CHECK (
            "prescribed_target_rpe" IS NULL
            OR ("prescribed_target_rpe" >= 1 AND "prescribed_target_rpe" <= 10)
          ),
        CONSTRAINT "CHK_workout_session_exercises_target_rir"
          CHECK (
            "prescribed_target_rir" IS NULL
            OR ("prescribed_target_rir" >= 0 AND "prescribed_target_rir" <= 10)
          ),
        CONSTRAINT "CHK_workout_session_exercises_rpe_xor_rir"
          CHECK ("prescribed_target_rpe" IS NULL OR "prescribed_target_rir" IS NULL),
        CONSTRAINT "CHK_workout_session_exercises_prescription"
          CHECK (
            (
              "prescription_type" = 'REPS'
              AND "prescribed_reps_min" IS NOT NULL
              AND "prescribed_reps_max" IS NOT NULL
              AND "prescribed_reps_min" > 0
              AND "prescribed_reps_max" >= "prescribed_reps_min"
              AND "prescribed_duration_seconds" IS NULL
            )
            OR
            (
              "prescription_type" = 'DURATION'
              AND "prescribed_duration_seconds" IS NOT NULL
              AND "prescribed_duration_seconds" > 0
              AND "prescribed_reps_min" IS NULL
              AND "prescribed_reps_max" IS NULL
            )
          )
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "workout_sets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workout_session_exercise_id" uuid NOT NULL,
        "set_number" integer NOT NULL,
        "actual_reps" integer,
        "actual_duration_seconds" integer,
        "actual_load_kg" numeric(7,2),
        "actual_rpe" numeric(3,1),
        "actual_rir" integer,
        "notes" character varying(500),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workout_sets_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_workout_sets_exercise_set_number"
          UNIQUE ("workout_session_exercise_id", "set_number"),
        CONSTRAINT "FK_workout_sets_workout_session_exercise_id"
          FOREIGN KEY ("workout_session_exercise_id")
          REFERENCES "workout_session_exercises"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_workout_sets_set_number"
          CHECK ("set_number" > 0),
        CONSTRAINT "CHK_workout_sets_actual_xor"
          CHECK (
            ("actual_reps" IS NOT NULL AND "actual_duration_seconds" IS NULL)
            OR ("actual_duration_seconds" IS NOT NULL AND "actual_reps" IS NULL)
          ),
        CONSTRAINT "CHK_workout_sets_actual_reps"
          CHECK ("actual_reps" IS NULL OR "actual_reps" >= 0),
        CONSTRAINT "CHK_workout_sets_actual_duration"
          CHECK (
            "actual_duration_seconds" IS NULL
            OR "actual_duration_seconds" > 0
          ),
        CONSTRAINT "CHK_workout_sets_actual_load_kg"
          CHECK ("actual_load_kg" IS NULL OR "actual_load_kg" >= 0),
        CONSTRAINT "CHK_workout_sets_actual_rpe"
          CHECK ("actual_rpe" IS NULL OR ("actual_rpe" >= 1 AND "actual_rpe" <= 10)),
        CONSTRAINT "CHK_workout_sets_actual_rir"
          CHECK ("actual_rir" IS NULL OR ("actual_rir" >= 0 AND "actual_rir" <= 10)),
        CONSTRAINT "CHK_workout_sets_rpe_xor_rir"
          CHECK ("actual_rpe" IS NULL OR "actual_rir" IS NULL)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "workout_sets"`);
    await queryRunner.query(`DROP TABLE "workout_session_exercises"`);
    await queryRunner.query(
      `DROP INDEX "UQ_workout_sessions_one_in_progress_per_client"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_workout_sessions_client_started_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_workout_sessions_training_plan_id"`,
    );
    await queryRunner.query(`DROP TABLE "workout_sessions"`);
    await queryRunner.query(`DROP TYPE "workout_session_status"`);
  }
}
