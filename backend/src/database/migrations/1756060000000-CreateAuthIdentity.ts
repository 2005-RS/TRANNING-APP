import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthIdentity1756060000000 implements MigrationInterface {
  name = 'CreateAuthIdentity1756060000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "user_role" AS ENUM ('ADMIN', 'TRAINER', 'CLIENT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'DISABLED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(254) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "first_name" character varying(100) NOT NULL,
        "last_name" character varying(100) NOT NULL,
        "role" "user_role" NOT NULL,
        "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
        "last_login_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "auth_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "refresh_token_digest" character varying(64) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "revoked_at" TIMESTAMPTZ,
        "last_used_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_auth_sessions_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions" ("expires_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "auth_sessions"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "user_status"`);
    await queryRunner.query(`DROP TYPE "user_role"`);
  }
}
