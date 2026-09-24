import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTrainingPlans1757376000000 implements MigrationInterface {
  name = 'CreateTrainingPlans1757376000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "training_plan_status" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "training_plan_day_of_week" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')`,
    );
    await queryRunner.query(`
      CREATE TABLE "training_plans" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "client_profile_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "description" character varying(2000),
        "status" "training_plan_status" NOT NULL DEFAULT 'DRAFT',
        "start_date" date,
        "end_date" date,
        "created_by_user_id" uuid NOT NULL,
        "activated_at" TIMESTAMPTZ,
        "archived_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_training_plans_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_training_plans_client_profile_id"
          FOREIGN KEY ("client_profile_id") REFERENCES "client_profiles"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_training_plans_created_by_user_id"
          FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_training_plans_date_range"
          CHECK (
            "end_date" IS NULL
            OR "start_date" IS NULL
            OR "end_date" >= "start_date"
          ),
        CONSTRAINT "CHK_training_plans_lifecycle_timestamps"
          CHECK (
            ("status" = 'DRAFT' AND "archived_at" IS NULL)
            OR ("status" = 'ACTIVE' AND "activated_at" IS NOT NULL AND "archived_at" IS NULL)
            OR ("status" = 'ARCHIVED' AND "archived_at" IS NOT NULL)
          )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_training_plans_client_profile_id"
        ON "training_plans" ("client_profile_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_training_plans_status"
        ON "training_plans" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_training_plans_client_created_at"
        ON "training_plans" ("client_profile_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_training_plans_one_active_per_client"
        ON "training_plans" ("client_profile_id")
        WHERE "status" = 'ACTIVE'`,
    );
    await queryRunner.query(`
      CREATE TABLE "training_plan_workouts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "training_plan_id" uuid NOT NULL,
        "source_workout_template_id" uuid NOT NULL,
        "name_snapshot" character varying(150) NOT NULL,
        "description_snapshot" character varying(2000),
        "position" integer NOT NULL,
        "scheduled_day" "training_plan_day_of_week",
        "notes" character varying(1000),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_training_plan_workouts_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_training_plan_workouts_plan_position"
          UNIQUE ("training_plan_id", "position"),
        CONSTRAINT "FK_training_plan_workouts_training_plan_id"
          FOREIGN KEY ("training_plan_id")
          REFERENCES "training_plans"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_training_plan_workouts_source_workout_template_id"
          FOREIGN KEY ("source_workout_template_id")
          REFERENCES "workout_templates"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_training_plan_workouts_position"
          CHECK ("position" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "training_plan_exercises" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "training_plan_workout_id" uuid NOT NULL,
        "exercise_id" uuid NOT NULL,
        "exercise_name_snapshot" character varying(150) NOT NULL,
        "position" integer NOT NULL,
        "sets" integer NOT NULL,
        "prescription_type" "workout_prescription_type" NOT NULL,
        "reps_min" integer,
        "reps_max" integer,
        "duration_seconds" integer,
        "rest_seconds" integer NOT NULL,
        "target_load_kg" numeric(7,2),
        "target_rpe" numeric(3,1),
        "target_rir" integer,
        "tempo" character varying(20),
        "notes" character varying(1000),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_training_plan_exercises_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_training_plan_exercises_workout_position"
          UNIQUE ("training_plan_workout_id", "position"),
        CONSTRAINT "FK_training_plan_exercises_training_plan_workout_id"
          FOREIGN KEY ("training_plan_workout_id")
          REFERENCES "training_plan_workouts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_training_plan_exercises_exercise_id"
          FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_training_plan_exercises_position"
          CHECK ("position" > 0),
        CONSTRAINT "CHK_training_plan_exercises_sets"
          CHECK ("sets" >= 1 AND "sets" <= 20),
        CONSTRAINT "CHK_training_plan_exercises_rest_seconds"
          CHECK ("rest_seconds" >= 0 AND "rest_seconds" <= 3600),
        CONSTRAINT "CHK_training_plan_exercises_target_load_kg"
          CHECK ("target_load_kg" IS NULL OR "target_load_kg" >= 0),
        CONSTRAINT "CHK_training_plan_exercises_target_rpe"
          CHECK ("target_rpe" IS NULL OR ("target_rpe" >= 1 AND "target_rpe" <= 10)),
        CONSTRAINT "CHK_training_plan_exercises_target_rir"
          CHECK ("target_rir" IS NULL OR ("target_rir" >= 0 AND "target_rir" <= 10)),
        CONSTRAINT "CHK_training_plan_exercises_rpe_xor_rir"
          CHECK ("target_rpe" IS NULL OR "target_rir" IS NULL),
        CONSTRAINT "CHK_training_plan_exercises_prescription"
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
      `CREATE INDEX "IDX_training_plan_exercises_exercise_id"
        ON "training_plan_exercises" ("exercise_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_training_plan_exercises_exercise_id"`,
    );
    await queryRunner.query(`DROP TABLE "training_plan_exercises"`);
    await queryRunner.query(`DROP TABLE "training_plan_workouts"`);
    await queryRunner.query(
      `DROP INDEX "UQ_training_plans_one_active_per_client"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_training_plans_client_created_at"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_training_plans_status"`);
    await queryRunner.query(
      `DROP INDEX "IDX_training_plans_client_profile_id"`,
    );
    await queryRunner.query(`DROP TABLE "training_plans"`);
    await queryRunner.query(`DROP TYPE "training_plan_day_of_week"`);
    await queryRunner.query(`DROP TYPE "training_plan_status"`);
  }
}
