import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubscriptions1758153600000 implements MigrationInterface {
  name = 'CreateSubscriptions1758153600000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "subscription_payment_provider" AS ENUM ('SINPE_MOVIL')`,
    );
    await queryRunner.query(
      `CREATE TYPE "subscription_payment_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "client_subscriptions" ("client_profile_id" uuid NOT NULL, "pro_until" TIMESTAMPTZ, "complimentary" boolean NOT NULL DEFAULT false, "updated_by_user_id" uuid, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_client_subscriptions" PRIMARY KEY ("client_profile_id"), CONSTRAINT "FK_client_subscriptions_profile" FOREIGN KEY ("client_profile_id") REFERENCES "client_profiles"("id") ON DELETE CASCADE, CONSTRAINT "FK_client_subscriptions_updated_by" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE "subscription_payments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "client_profile_id" uuid NOT NULL, "provider" "subscription_payment_provider" NOT NULL, "status" "subscription_payment_status" NOT NULL DEFAULT 'PENDING', "amount_crc" integer NOT NULL, "reference" varchar(40) NOT NULL, "payer_phone" varchar(16), "paid_on" date NOT NULL, "period_start" TIMESTAMPTZ, "period_end" TIMESTAMPTZ, "reviewed_by_user_id" uuid, "reviewed_at" TIMESTAMPTZ, "rejection_reason" varchar(300), "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_subscription_payments" PRIMARY KEY ("id"), CONSTRAINT "FK_subscription_payments_profile" FOREIGN KEY ("client_profile_id") REFERENCES "client_profiles"("id") ON DELETE CASCADE, CONSTRAINT "FK_subscription_payments_reviewer" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL, CONSTRAINT "CHK_subscription_payments_amount" CHECK ("amount_crc" > 0))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscription_payments_profile" ON "subscription_payments" ("client_profile_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_subscription_payments_reference_active" ON "subscription_payments" ("provider", "reference") WHERE "status" <> 'REJECTED'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_subscription_payments_pending_client" ON "subscription_payments" ("client_profile_id") WHERE "status" = 'PENDING'`,
    );
    await queryRunner.query(
      `INSERT INTO "client_subscriptions" ("client_profile_id", "complimentary") SELECT cp.id, EXISTS (SELECT 1 FROM trainer_client_assignments tca WHERE tca.client_profile_id = cp.id AND tca.ended_at IS NULL) FROM client_profiles cp`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "subscription_payments"`);
    await queryRunner.query(`DROP TABLE "client_subscriptions"`);
    await queryRunner.query(`DROP TYPE "subscription_payment_status"`);
    await queryRunner.query(`DROP TYPE "subscription_payment_provider"`);
  }
}
