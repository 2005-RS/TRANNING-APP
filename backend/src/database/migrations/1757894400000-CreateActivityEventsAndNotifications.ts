import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateActivityEventsAndNotifications1757894400000 implements MigrationInterface {
  name = 'CreateActivityEventsAndNotifications1757894400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "activity_event_type" AS ENUM (
        'CHECK_IN_SUBMITTED',
        'CHECK_IN_REVIEWED',
        'TRAINING_PLAN_ACTIVATED',
        'NUTRITION_PLAN_ACTIVATED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "activity_event_entity_type" AS ENUM (
        'CHECK_IN',
        'TRAINING_PLAN',
        'NUTRITION_PLAN'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "activity_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "type" "activity_event_type" NOT NULL,
        "actor_user_id" uuid NOT NULL,
        "client_profile_id" uuid,
        "related_entity_type" "activity_event_entity_type" NOT NULL,
        "related_entity_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_activity_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_activity_events_actor_user_id"
          FOREIGN KEY ("actor_user_id")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_activity_events_client_profile_id"
          FOREIGN KEY ("client_profile_id")
          REFERENCES "client_profiles"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "activity_event_id" uuid NOT NULL,
        "recipient_user_id" uuid NOT NULL,
        "read_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_notifications_event_recipient"
          UNIQUE ("activity_event_id", "recipient_user_id"),
        CONSTRAINT "FK_notifications_activity_event_id"
          FOREIGN KEY ("activity_event_id")
          REFERENCES "activity_events"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_notifications_recipient_user_id"
          FOREIGN KEY ("recipient_user_id")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_recipient_created_at"
        ON "notifications" ("recipient_user_id", "created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_unread_recipient_created_at"
        ON "notifications" ("recipient_user_id", "created_at" DESC)
        WHERE "read_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_notifications_unread_recipient_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_notifications_recipient_created_at"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "activity_events"`);
    await queryRunner.query(`DROP TYPE "activity_event_entity_type"`);
    await queryRunner.query(`DROP TYPE "activity_event_type"`);
  }
}
