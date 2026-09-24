import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExerciseMedia1757203200000 implements MigrationInterface {
  name = 'CreateExerciseMedia1757203200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "exercise_media_type" AS ENUM ('VIDEO', 'IMAGE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "exercise_media_status" AS ENUM ('PENDING_UPLOAD', 'READY', 'FAILED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "exercise_media" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "exercise_id" uuid NOT NULL,
        "media_type" "exercise_media_type" NOT NULL,
        "storage_key" character varying(512) NOT NULL,
        "original_file_name" character varying(255),
        "mime_type" character varying(100) NOT NULL,
        "file_size_bytes" bigint,
        "status" "exercise_media_status" NOT NULL,
        "display_order" integer NOT NULL DEFAULT 0,
        "created_by_user_id" uuid NOT NULL,
        "finalized_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_exercise_media_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_exercise_media_storage_key" UNIQUE ("storage_key"),
        CONSTRAINT "FK_exercise_media_exercise_id"
          FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_exercise_media_created_by_user_id"
          FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_exercise_media_display_order"
          CHECK ("display_order" >= 0),
        CONSTRAINT "CHK_exercise_media_file_size_bytes"
          CHECK ("file_size_bytes" IS NULL OR "file_size_bytes" > 0),
        CONSTRAINT "CHK_exercise_media_finalized_at"
          CHECK (
            ("status" = 'READY' AND "finalized_at" IS NOT NULL)
            OR
            ("status" <> 'READY' AND "finalized_at" IS NULL)
          )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_exercise_media_exercise_id_media_type"
        ON "exercise_media" ("exercise_id", "media_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exercise_media_pending_created_at"
        ON "exercise_media" ("created_at")
        WHERE "status" = 'PENDING_UPLOAD'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_exercise_media_pending_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_exercise_media_exercise_id_media_type"`,
    );
    await queryRunner.query(`DROP TABLE "exercise_media"`);
    await queryRunner.query(`DROP TYPE "exercise_media_status"`);
    await queryRunner.query(`DROP TYPE "exercise_media_type"`);
  }
}
