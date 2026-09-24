import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNutrition1757721600000 implements MigrationInterface {
  name = 'CreateNutrition1757721600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "nutrition_food_status" AS ENUM ('ACTIVE', 'ARCHIVED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "nutrition_plan_status" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "nutrition_meal_type" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'OTHER')`,
    );
    await queryRunner.query(`
      CREATE TABLE "nutrition_foods" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(150) NOT NULL,
        "brand" character varying(150),
        "description" character varying(1000),
        "calories_per_100g" numeric(7,2) NOT NULL,
        "protein_g_per_100g" numeric(6,2) NOT NULL,
        "carbohydrates_g_per_100g" numeric(6,2) NOT NULL,
        "fat_g_per_100g" numeric(6,2) NOT NULL,
        "fiber_g_per_100g" numeric(6,2),
        "status" "nutrition_food_status" NOT NULL DEFAULT 'ACTIVE',
        "created_by_user_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_nutrition_foods_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_nutrition_foods_created_by_user_id"
          FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_nutrition_foods_name"
          CHECK (char_length(btrim("name")) >= 2),
        CONSTRAINT "CHK_nutrition_foods_calories_per_100g"
          CHECK ("calories_per_100g" >= 0),
        CONSTRAINT "CHK_nutrition_foods_protein_g_per_100g"
          CHECK ("protein_g_per_100g" >= 0),
        CONSTRAINT "CHK_nutrition_foods_carbohydrates_g_per_100g"
          CHECK ("carbohydrates_g_per_100g" >= 0),
        CONSTRAINT "CHK_nutrition_foods_fat_g_per_100g"
          CHECK ("fat_g_per_100g" >= 0),
        CONSTRAINT "CHK_nutrition_foods_fiber_g_per_100g"
          CHECK ("fiber_g_per_100g" IS NULL OR "fiber_g_per_100g" >= 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_nutrition_foods_status" ON "nutrition_foods" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_nutrition_foods_created_by_user_id"
        ON "nutrition_foods" ("created_by_user_id")`,
    );
    await queryRunner.query(`
      CREATE TABLE "nutrition_plans" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "client_profile_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "description" character varying(2000),
        "status" "nutrition_plan_status" NOT NULL DEFAULT 'DRAFT',
        "start_date" date,
        "end_date" date,
        "target_calories_kcal" numeric(8,2),
        "target_protein_g" numeric(8,2),
        "target_carbohydrates_g" numeric(8,2),
        "target_fat_g" numeric(8,2),
        "created_by_user_id" uuid NOT NULL,
        "activated_at" TIMESTAMPTZ,
        "archived_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_nutrition_plans_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_nutrition_plans_client_profile_id"
          FOREIGN KEY ("client_profile_id") REFERENCES "client_profiles"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_nutrition_plans_created_by_user_id"
          FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_nutrition_plans_name"
          CHECK (char_length(btrim("name")) >= 2),
        CONSTRAINT "CHK_nutrition_plans_date_range"
          CHECK (
            "end_date" IS NULL
            OR "start_date" IS NULL
            OR "end_date" >= "start_date"
          ),
        CONSTRAINT "CHK_nutrition_plans_target_calories_kcal"
          CHECK ("target_calories_kcal" IS NULL OR "target_calories_kcal" >= 0),
        CONSTRAINT "CHK_nutrition_plans_target_protein_g"
          CHECK ("target_protein_g" IS NULL OR "target_protein_g" >= 0),
        CONSTRAINT "CHK_nutrition_plans_target_carbohydrates_g"
          CHECK ("target_carbohydrates_g" IS NULL OR "target_carbohydrates_g" >= 0),
        CONSTRAINT "CHK_nutrition_plans_target_fat_g"
          CHECK ("target_fat_g" IS NULL OR "target_fat_g" >= 0),
        CONSTRAINT "CHK_nutrition_plans_lifecycle_timestamps"
          CHECK (
            ("status" = 'DRAFT' AND "archived_at" IS NULL)
            OR ("status" = 'ACTIVE' AND "activated_at" IS NOT NULL AND "archived_at" IS NULL)
            OR ("status" = 'ARCHIVED' AND "archived_at" IS NOT NULL)
          )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_nutrition_plans_status" ON "nutrition_plans" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_nutrition_plans_client_created_at"
        ON "nutrition_plans" ("client_profile_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_nutrition_plans_one_active_per_client"
        ON "nutrition_plans" ("client_profile_id")
        WHERE "status" = 'ACTIVE'`,
    );
    await queryRunner.query(`
      CREATE TABLE "nutrition_plan_meals" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "nutrition_plan_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "meal_type" "nutrition_meal_type" NOT NULL,
        "position" integer NOT NULL,
        "notes" character varying(1000),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_nutrition_plan_meals_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_nutrition_plan_meals_plan_position"
          UNIQUE ("nutrition_plan_id", "position"),
        CONSTRAINT "FK_nutrition_plan_meals_nutrition_plan_id"
          FOREIGN KEY ("nutrition_plan_id")
          REFERENCES "nutrition_plans"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_nutrition_plan_meals_name"
          CHECK (char_length(btrim("name")) >= 2),
        CONSTRAINT "CHK_nutrition_plan_meals_position"
          CHECK ("position" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "nutrition_plan_meal_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "nutrition_plan_meal_id" uuid NOT NULL,
        "source_food_id" uuid NOT NULL,
        "food_name_snapshot" character varying(150) NOT NULL,
        "brand_snapshot" character varying(150),
        "quantity_grams" numeric(8,2) NOT NULL,
        "calories_per_100g_snapshot" numeric(7,2) NOT NULL,
        "protein_g_per_100g_snapshot" numeric(6,2) NOT NULL,
        "carbohydrates_g_per_100g_snapshot" numeric(6,2) NOT NULL,
        "fat_g_per_100g_snapshot" numeric(6,2) NOT NULL,
        "fiber_g_per_100g_snapshot" numeric(6,2),
        "position" integer NOT NULL,
        "notes" character varying(1000),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_nutrition_plan_meal_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_nutrition_plan_meal_items_meal_position"
          UNIQUE ("nutrition_plan_meal_id", "position"),
        CONSTRAINT "FK_nutrition_plan_meal_items_nutrition_plan_meal_id"
          FOREIGN KEY ("nutrition_plan_meal_id")
          REFERENCES "nutrition_plan_meals"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_nutrition_plan_meal_items_source_food_id"
          FOREIGN KEY ("source_food_id")
          REFERENCES "nutrition_foods"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_nutrition_plan_meal_items_name"
          CHECK (char_length(btrim("food_name_snapshot")) >= 2),
        CONSTRAINT "CHK_nutrition_plan_meal_items_position"
          CHECK ("position" > 0),
        CONSTRAINT "CHK_nutrition_plan_meal_items_quantity_grams"
          CHECK ("quantity_grams" > 0),
        CONSTRAINT "CHK_nutrition_plan_meal_items_calories"
          CHECK ("calories_per_100g_snapshot" >= 0),
        CONSTRAINT "CHK_nutrition_plan_meal_items_protein"
          CHECK ("protein_g_per_100g_snapshot" >= 0),
        CONSTRAINT "CHK_nutrition_plan_meal_items_carbohydrates"
          CHECK ("carbohydrates_g_per_100g_snapshot" >= 0),
        CONSTRAINT "CHK_nutrition_plan_meal_items_fat"
          CHECK ("fat_g_per_100g_snapshot" >= 0),
        CONSTRAINT "CHK_nutrition_plan_meal_items_fiber"
          CHECK (
            "fiber_g_per_100g_snapshot" IS NULL
            OR "fiber_g_per_100g_snapshot" >= 0
          )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "nutrition_plan_meal_items"`);
    await queryRunner.query(`DROP TABLE "nutrition_plan_meals"`);
    await queryRunner.query(
      `DROP INDEX "UQ_nutrition_plans_one_active_per_client"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_nutrition_plans_client_created_at"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_nutrition_plans_status"`);
    await queryRunner.query(`DROP TABLE "nutrition_plans"`);
    await queryRunner.query(
      `DROP INDEX "IDX_nutrition_foods_created_by_user_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_nutrition_foods_status"`);
    await queryRunner.query(`DROP TABLE "nutrition_foods"`);
    await queryRunner.query(`DROP TYPE "nutrition_meal_type"`);
    await queryRunner.query(`DROP TYPE "nutrition_plan_status"`);
    await queryRunner.query(`DROP TYPE "nutrition_food_status"`);
  }
}
