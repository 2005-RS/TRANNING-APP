import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckIns1757808000000 implements MigrationInterface {
  name = 'CreateCheckIns1757808000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "check_in_status" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "check_ins" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "client_profile_id" uuid NOT NULL,
        "period_start" date NOT NULL,
        "period_end" date NOT NULL,
        "status" "check_in_status" NOT NULL DEFAULT 'DRAFT',
        "sleep_quality" integer,
        "energy_level" integer,
        "stress_level" integer,
        "hunger_level" integer,
        "recovery_level" integer,
        "training_adherence_pct" integer,
        "nutrition_adherence_pct" integer,
        "wins" character varying(2000),
        "challenges" character varying(2000),
        "general_notes" character varying(2000),
        "submitted_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_check_ins_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_check_ins_client_period"
          UNIQUE ("client_profile_id", "period_start", "period_end"),
        CONSTRAINT "FK_check_ins_client_profile_id"
          FOREIGN KEY ("client_profile_id")
          REFERENCES "client_profiles"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_check_ins_period"
          CHECK (
            "period_end" >= "period_start"
            AND ("period_end" - "period_start") <= 31
          ),
        CONSTRAINT "CHK_check_ins_sleep_quality"
          CHECK ("sleep_quality" IS NULL OR ("sleep_quality" BETWEEN 1 AND 5)),
        CONSTRAINT "CHK_check_ins_energy_level"
          CHECK ("energy_level" IS NULL OR ("energy_level" BETWEEN 1 AND 5)),
        CONSTRAINT "CHK_check_ins_stress_level"
          CHECK ("stress_level" IS NULL OR ("stress_level" BETWEEN 1 AND 5)),
        CONSTRAINT "CHK_check_ins_hunger_level"
          CHECK ("hunger_level" IS NULL OR ("hunger_level" BETWEEN 1 AND 5)),
        CONSTRAINT "CHK_check_ins_recovery_level"
          CHECK ("recovery_level" IS NULL OR ("recovery_level" BETWEEN 1 AND 5)),
        CONSTRAINT "CHK_check_ins_training_adherence_pct"
          CHECK (
            "training_adherence_pct" IS NULL
            OR ("training_adherence_pct" BETWEEN 0 AND 100)
          ),
        CONSTRAINT "CHK_check_ins_nutrition_adherence_pct"
          CHECK (
            "nutrition_adherence_pct" IS NULL
            OR ("nutrition_adherence_pct" BETWEEN 0 AND 100)
          ),
        CONSTRAINT "CHK_check_ins_lifecycle_submitted_at"
          CHECK (
            ("status" = 'DRAFT' AND "submitted_at" IS NULL)
            OR (
              "status" IN ('SUBMITTED', 'REVIEWED')
              AND "submitted_at" IS NOT NULL
            )
          )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_check_ins_client_period_start"
        ON "check_ins" ("client_profile_id", "period_start" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_check_ins_status" ON "check_ins" ("status")`,
    );
    await queryRunner.query(`
      CREATE TABLE "check_in_reviews" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "check_in_id" uuid NOT NULL,
        "reviewed_by_user_id" uuid NOT NULL,
        "feedback" character varying(4000) NOT NULL,
        "action_items" character varying(2000),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_check_in_reviews_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_check_in_reviews_check_in_id" UNIQUE ("check_in_id"),
        CONSTRAINT "FK_check_in_reviews_check_in_id"
          FOREIGN KEY ("check_in_id")
          REFERENCES "check_ins"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_check_in_reviews_reviewed_by_user_id"
          FOREIGN KEY ("reviewed_by_user_id")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_check_in_reviews_feedback"
          CHECK (char_length(btrim("feedback")) >= 1)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "check_in_reviews"`);
    await queryRunner.query(`DROP INDEX "IDX_check_ins_status"`);
    await queryRunner.query(`DROP INDEX "IDX_check_ins_client_period_start"`);
    await queryRunner.query(`DROP TABLE "check_ins"`);
    await queryRunner.query(`DROP TYPE "check_in_status"`);
  }
}
