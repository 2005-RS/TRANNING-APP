import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTrainerProfiles1756771200000 implements MigrationInterface {
  name = 'CreateTrainerProfiles1756771200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "trainer_profiles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "phone" character varying(32),
        "professional_title" character varying(120),
        "bio" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trainer_profiles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_trainer_profiles_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_trainer_profiles_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "trainer_profiles"`);
  }
}
