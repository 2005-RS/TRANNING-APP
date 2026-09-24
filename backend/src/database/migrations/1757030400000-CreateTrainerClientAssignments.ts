import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTrainerClientAssignments1757030400000 implements MigrationInterface {
  name = 'CreateTrainerClientAssignments1757030400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "trainer_client_assignments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "trainer_profile_id" uuid NOT NULL,
        "client_profile_id" uuid NOT NULL,
        "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "ended_at" TIMESTAMPTZ,
        "assigned_by_user_id" uuid NOT NULL,
        "ended_by_user_id" uuid,
        CONSTRAINT "PK_trainer_client_assignments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trainer_client_assignments_trainer_profile_id"
          FOREIGN KEY ("trainer_profile_id") REFERENCES "trainer_profiles"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_trainer_client_assignments_client_profile_id"
          FOREIGN KEY ("client_profile_id") REFERENCES "client_profiles"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_trainer_client_assignments_assigned_by_user_id"
          FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_trainer_client_assignments_ended_by_user_id"
          FOREIGN KEY ("ended_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_trainer_client_assignments_ended_at"
          CHECK ("ended_at" IS NULL OR "ended_at" >= "assigned_at")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_trainer_client_assignments_active_client"
        ON "trainer_client_assignments" ("client_profile_id")
        WHERE "ended_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_trainer_client_assignments_active_trainer"
        ON "trainer_client_assignments" ("trainer_profile_id")
        WHERE "ended_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_trainer_client_assignments_client_assigned_at"
        ON "trainer_client_assignments" ("client_profile_id", "assigned_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_trainer_client_assignments_client_assigned_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_trainer_client_assignments_active_trainer"`,
    );
    await queryRunner.query(
      `DROP INDEX "UQ_trainer_client_assignments_active_client"`,
    );
    await queryRunner.query(`DROP TABLE "trainer_client_assignments"`);
  }
}
