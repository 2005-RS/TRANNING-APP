import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBodyProgress1757635200000 implements MigrationInterface {
  name = 'CreateBodyProgress1757635200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "body_measurements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "client_profile_id" uuid NOT NULL,
        "measured_at" TIMESTAMPTZ NOT NULL,
        "body_weight_kg" numeric(6,2),
        "body_fat_percentage" numeric(5,2),
        "neck_cm" numeric(6,2),
        "shoulders_cm" numeric(6,2),
        "chest_cm" numeric(6,2),
        "waist_cm" numeric(6,2),
        "hips_cm" numeric(6,2),
        "left_arm_cm" numeric(6,2),
        "right_arm_cm" numeric(6,2),
        "left_thigh_cm" numeric(6,2),
        "right_thigh_cm" numeric(6,2),
        "left_calf_cm" numeric(6,2),
        "right_calf_cm" numeric(6,2),
        "notes" character varying(1000),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_body_measurements_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_body_measurements_client_profile_id"
          FOREIGN KEY ("client_profile_id") REFERENCES "client_profiles"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_body_measurements_body_weight_kg"
          CHECK ("body_weight_kg" IS NULL OR ("body_weight_kg" > 0 AND "body_weight_kg" <= 500)),
        CONSTRAINT "CHK_body_measurements_body_fat_percentage"
          CHECK ("body_fat_percentage" IS NULL OR ("body_fat_percentage" > 0 AND "body_fat_percentage" <= 100)),
        CONSTRAINT "CHK_body_measurements_neck_cm"
          CHECK ("neck_cm" IS NULL OR ("neck_cm" > 0 AND "neck_cm" <= 500)),
        CONSTRAINT "CHK_body_measurements_shoulders_cm"
          CHECK ("shoulders_cm" IS NULL OR ("shoulders_cm" > 0 AND "shoulders_cm" <= 500)),
        CONSTRAINT "CHK_body_measurements_chest_cm"
          CHECK ("chest_cm" IS NULL OR ("chest_cm" > 0 AND "chest_cm" <= 500)),
        CONSTRAINT "CHK_body_measurements_waist_cm"
          CHECK ("waist_cm" IS NULL OR ("waist_cm" > 0 AND "waist_cm" <= 500)),
        CONSTRAINT "CHK_body_measurements_hips_cm"
          CHECK ("hips_cm" IS NULL OR ("hips_cm" > 0 AND "hips_cm" <= 500)),
        CONSTRAINT "CHK_body_measurements_left_arm_cm"
          CHECK ("left_arm_cm" IS NULL OR ("left_arm_cm" > 0 AND "left_arm_cm" <= 500)),
        CONSTRAINT "CHK_body_measurements_right_arm_cm"
          CHECK ("right_arm_cm" IS NULL OR ("right_arm_cm" > 0 AND "right_arm_cm" <= 500)),
        CONSTRAINT "CHK_body_measurements_left_thigh_cm"
          CHECK ("left_thigh_cm" IS NULL OR ("left_thigh_cm" > 0 AND "left_thigh_cm" <= 500)),
        CONSTRAINT "CHK_body_measurements_right_thigh_cm"
          CHECK ("right_thigh_cm" IS NULL OR ("right_thigh_cm" > 0 AND "right_thigh_cm" <= 500)),
        CONSTRAINT "CHK_body_measurements_left_calf_cm"
          CHECK ("left_calf_cm" IS NULL OR ("left_calf_cm" > 0 AND "left_calf_cm" <= 500)),
        CONSTRAINT "CHK_body_measurements_right_calf_cm"
          CHECK ("right_calf_cm" IS NULL OR ("right_calf_cm" > 0 AND "right_calf_cm" <= 500)),
        CONSTRAINT "CHK_body_measurements_at_least_one_metric"
          CHECK (
            "body_weight_kg" IS NOT NULL
            OR "body_fat_percentage" IS NOT NULL
            OR "neck_cm" IS NOT NULL
            OR "shoulders_cm" IS NOT NULL
            OR "chest_cm" IS NOT NULL
            OR "waist_cm" IS NOT NULL
            OR "hips_cm" IS NOT NULL
            OR "left_arm_cm" IS NOT NULL
            OR "right_arm_cm" IS NOT NULL
            OR "left_thigh_cm" IS NOT NULL
            OR "right_thigh_cm" IS NOT NULL
            OR "left_calf_cm" IS NOT NULL
            OR "right_calf_cm" IS NOT NULL
          )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_body_measurements_client_measured_at"
        ON "body_measurements" ("client_profile_id", "measured_at" DESC)`,
    );

    await queryRunner.query(
      `CREATE TYPE "progress_photo_pose" AS ENUM ('FRONT', 'SIDE', 'BACK', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "progress_photo_status" AS ENUM ('PENDING_UPLOAD', 'READY', 'FAILED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "progress_photos" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "client_profile_id" uuid NOT NULL,
        "body_measurement_id" uuid,
        "pose" "progress_photo_pose" NOT NULL,
        "status" "progress_photo_status" NOT NULL,
        "storage_key" character varying(512) NOT NULL,
        "original_file_name" character varying(255) NOT NULL,
        "mime_type" character varying(100) NOT NULL,
        "file_size_bytes" bigint,
        "captured_at" TIMESTAMPTZ NOT NULL,
        "finalized_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_progress_photos_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_progress_photos_storage_key" UNIQUE ("storage_key"),
        CONSTRAINT "FK_progress_photos_client_profile_id"
          FOREIGN KEY ("client_profile_id") REFERENCES "client_profiles"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_progress_photos_body_measurement_id"
          FOREIGN KEY ("body_measurement_id") REFERENCES "body_measurements"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_progress_photos_file_size_bytes"
          CHECK ("file_size_bytes" IS NULL OR "file_size_bytes" > 0),
        CONSTRAINT "CHK_progress_photos_finalized_at"
          CHECK (
            ("status" = 'READY' AND "finalized_at" IS NOT NULL)
            OR
            ("status" <> 'READY' AND "finalized_at" IS NULL)
          )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_progress_photos_client_captured_at"
        ON "progress_photos" ("client_profile_id", "captured_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_progress_photos_body_measurement_id"
        ON "progress_photos" ("body_measurement_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_progress_photos_pending_created_at"
        ON "progress_photos" ("created_at")
        WHERE "status" = 'PENDING_UPLOAD'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_progress_photos_pending_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_progress_photos_body_measurement_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_progress_photos_client_captured_at"`,
    );
    await queryRunner.query(`DROP TABLE "progress_photos"`);
    await queryRunner.query(`DROP TYPE "progress_photo_status"`);
    await queryRunner.query(`DROP TYPE "progress_photo_pose"`);
    await queryRunner.query(
      `DROP INDEX "IDX_body_measurements_client_measured_at"`,
    );
    await queryRunner.query(`DROP TABLE "body_measurements"`);
  }
}
