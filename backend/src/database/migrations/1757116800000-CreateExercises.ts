import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExercises1757116800000 implements MigrationInterface {
  name = 'CreateExercises1757116800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "exercise_muscle_group" AS ENUM ('CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'FOREARMS', 'QUADRICEPS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'CORE', 'FULL_BODY', 'CARDIO', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "exercise_equipment_type" AS ENUM ('BODYWEIGHT', 'BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'KETTLEBELL', 'RESISTANCE_BAND', 'EZ_BAR', 'TRAP_BAR', 'CARDIO_MACHINE', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "exercise_difficulty_level" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "exercise_status" AS ENUM ('ACTIVE', 'ARCHIVED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "exercises" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(150) NOT NULL,
        "description" character varying(2000),
        "instructions" character varying(5000),
        "primary_muscle_group" "exercise_muscle_group" NOT NULL,
        "equipment_type" "exercise_equipment_type" NOT NULL,
        "difficulty_level" "exercise_difficulty_level" NOT NULL,
        "status" "exercise_status" NOT NULL DEFAULT 'ACTIVE',
        "created_by_user_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_exercises_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_exercises_created_by_user_id"
          FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_exercises_created_by_user_id" ON "exercises" ("created_by_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exercises_status" ON "exercises" ("status")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_exercises_creator_normalized_name"
        ON "exercises" (
          "created_by_user_id",
          (lower(regexp_replace(btrim("name"), '\\s+', ' ', 'g')))
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "UQ_exercises_creator_normalized_name"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_exercises_status"`);
    await queryRunner.query(`DROP INDEX "IDX_exercises_created_by_user_id"`);
    await queryRunner.query(`DROP TABLE "exercises"`);
    await queryRunner.query(`DROP TYPE "exercise_status"`);
    await queryRunner.query(`DROP TYPE "exercise_difficulty_level"`);
    await queryRunner.query(`DROP TYPE "exercise_equipment_type"`);
    await queryRunner.query(`DROP TYPE "exercise_muscle_group"`);
  }
}
