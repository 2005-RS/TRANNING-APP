import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNutritionJournal1758067200000 implements MigrationInterface {
  name = 'CreateNutritionJournal1758067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "nutrition_food_visibility" AS ENUM ('GLOBAL', 'PRIVATE')
    `);
    await queryRunner.query(`
      CREATE TYPE "food_log_entry_status" AS ENUM ('EATEN', 'SKIPPED')
    `);

    // Existing foods stay GLOBAL: every TRAINER already sees every ACTIVE food.
    await queryRunner.query(`
      ALTER TABLE "nutrition_foods"
        ADD COLUMN "visibility" "nutrition_food_visibility" NOT NULL DEFAULT 'GLOBAL'
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_nutrition_foods_visibility_created_by"
        ON "nutrition_foods" ("visibility", "created_by_user_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "food_portions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "food_id" uuid NOT NULL,
        "label" varchar(60) NOT NULL,
        "gram_weight" numeric(10, 3) NOT NULL,
        "is_default" boolean NOT NULL DEFAULT false,
        "position" integer NOT NULL,
        "source" "nutrition_food_source" NOT NULL DEFAULT 'MANUAL',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_food_portions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_food_portions_food_id"
          FOREIGN KEY ("food_id") REFERENCES "nutrition_foods"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_food_portions_gram_weight" CHECK ("gram_weight" > 0),
        CONSTRAINT "CHK_food_portions_position" CHECK ("position" >= 0),
        CONSTRAINT "UQ_food_portions_food_position" UNIQUE ("food_id", "position")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_food_portions_one_default"
        ON "food_portions" ("food_id") WHERE "is_default" = true
    `);

    await queryRunner.query(`
      CREATE TABLE "food_log_entries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "client_profile_id" uuid NOT NULL,
        "local_date" date NOT NULL,
        "meal_type" "nutrition_meal_type" NOT NULL,
        "status" "food_log_entry_status" NOT NULL,
        "plan_item_id" uuid,
        "food_id" uuid,
        "food_name_snapshot" varchar(150),
        "brand_snapshot" varchar(150),
        "grams" numeric(10, 2),
        "portion_label" varchar(60),
        "portion_quantity" numeric(10, 3),
        "calories_kcal" numeric(10, 2),
        "protein_g" numeric(10, 2),
        "carbohydrates_g" numeric(10, 2),
        "fat_g" numeric(10, 2),
        "fiber_g" numeric(10, 2),
        "nutrients_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "note" varchar(500),
        "logged_by_user_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_food_log_entries_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_food_log_entries_client_profile_id"
          FOREIGN KEY ("client_profile_id") REFERENCES "client_profiles"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_food_log_entries_plan_item_id"
          FOREIGN KEY ("plan_item_id") REFERENCES "nutrition_plan_meal_items"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_food_log_entries_food_id"
          FOREIGN KEY ("food_id") REFERENCES "nutrition_foods"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_food_log_entries_logged_by_user_id"
          FOREIGN KEY ("logged_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_food_log_entries_eaten"
          CHECK (
            "status" <> 'EATEN'
            OR ("food_id" IS NOT NULL AND "food_name_snapshot" IS NOT NULL
                AND "grams" IS NOT NULL AND "grams" > 0 AND "calories_kcal" IS NOT NULL)
          ),
        -- plan_item_id may become NULL later (the Trainer replaced the plan meals);
        -- the skipped entry keeps its snapshot as history.
        CONSTRAINT "CHK_food_log_entries_skipped"
          CHECK (
            "status" <> 'SKIPPED'
            OR ("food_id" IS NULL AND "grams" IS NULL AND "food_name_snapshot" IS NOT NULL)
          ),
        CONSTRAINT "CHK_food_log_entries_portion_quantity"
          CHECK ("portion_quantity" IS NULL OR "portion_quantity" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_food_log_entries_client_date"
        ON "food_log_entries" ("client_profile_id", "local_date")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_food_log_entries_client_food_recent"
        ON "food_log_entries" ("client_profile_id", "created_at" DESC)
        WHERE "food_id" IS NOT NULL
    `);
    // A prescribed item is resolved at most once per day (eaten, replaced, or skipped).
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_food_log_entries_plan_item_per_day"
        ON "food_log_entries" ("client_profile_id", "local_date", "plan_item_id")
        WHERE "plan_item_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "food_log_entries"`);
    await queryRunner.query(`DROP TABLE "food_portions"`);
    await queryRunner.query(
      `DROP INDEX "IDX_nutrition_foods_visibility_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "nutrition_foods" DROP COLUMN "visibility"`,
    );
    await queryRunner.query(`DROP TYPE "food_log_entry_status"`);
    await queryRunner.query(`DROP TYPE "nutrition_food_visibility"`);
  }
}
