import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClientProfiles1756944000000 implements MigrationInterface {
  name = 'CreateClientProfiles1756944000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "client_primary_goal" AS ENUM ('FAT_LOSS', 'MUSCLE_GAIN', 'STRENGTH', 'GENERAL_FITNESS', 'MAINTENANCE', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "client_experience_level" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "client_profiles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "phone" character varying(32),
        "date_of_birth" date,
        "primary_goal" "client_primary_goal" NOT NULL,
        "goal_notes" text,
        "experience_level" "client_experience_level" NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_profiles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_client_profiles_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_client_profiles_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "client_profiles"`);
    await queryRunner.query(`DROP TYPE "client_experience_level"`);
    await queryRunner.query(`DROP TYPE "client_primary_goal"`);
  }
}
