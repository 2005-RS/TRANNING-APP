import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNutritionNutrientsFoundation1757980800000 implements MigrationInterface {
  name = 'CreateNutritionNutrientsFoundation1757980800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "nutrient_unit" AS ENUM ('kcal', 'g', 'mg', 'ug')
    `);
    await queryRunner.query(`
      CREATE TYPE "nutrient_category" AS ENUM (
        'ENERGY', 'MACRO', 'FIBER_SUGAR', 'FAT_DETAIL', 'MINERAL', 'VITAMIN', 'OTHER'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "nutrition_food_source" AS ENUM (
        'MANUAL', 'USDA_FDC', 'OPEN_FOOD_FACTS'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "food_nutrient_derivation" AS ENUM (
        'MEASURED', 'CALCULATED', 'ESTIMATED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "nutrition_food_name_origin" AS ENUM (
        'MANUAL', 'SOURCE', 'AI_GENERATED', 'HUMAN_TRANSLATED'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "nutrients" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" varchar(64) NOT NULL,
        "name_en" varchar(100) NOT NULL,
        "name_es" varchar(100) NOT NULL,
        "unit" "nutrient_unit" NOT NULL,
        "category" "nutrient_category" NOT NULL,
        "fdc_nutrient_id" integer,
        "display_order" integer NOT NULL,
        "is_core" boolean NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_nutrients_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_nutrients_code" UNIQUE ("code"),
        CONSTRAINT "UQ_nutrients_fdc_nutrient_id" UNIQUE ("fdc_nutrient_id")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "nutrients" (
        "code", "name_en", "name_es", "unit", "category", "fdc_nutrient_id", "display_order", "is_core"
      ) VALUES
        ('energy_kcal', 'Energy', 'Energía', 'kcal', 'ENERGY', 1008, 1, true),
        ('protein_g', 'Protein', 'Proteína', 'g', 'MACRO', 1003, 2, true),
        ('carbohydrates_g', 'Carbohydrates', 'Carbohidratos', 'g', 'MACRO', 1005, 3, true),
        ('fat_g', 'Total fat', 'Grasas totales', 'g', 'MACRO', 1004, 4, true),
        ('fiber_g', 'Dietary fiber', 'Fibra dietética', 'g', 'FIBER_SUGAR', 1079, 5, true),
        ('sugars_g', 'Total sugars', 'Azúcares totales', 'g', 'FIBER_SUGAR', 2000, 6, false),
        ('saturated_fat_g', 'Saturated fat', 'Grasas saturadas', 'g', 'FAT_DETAIL', 1258, 7, false),
        ('monounsaturated_fat_g', 'Monounsaturated fat', 'Grasas monoinsaturadas', 'g', 'FAT_DETAIL', 1292, 8, false),
        ('polyunsaturated_fat_g', 'Polyunsaturated fat', 'Grasas poliinsaturadas', 'g', 'FAT_DETAIL', 1293, 9, false),
        ('cholesterol_mg', 'Cholesterol', 'Colesterol', 'mg', 'FAT_DETAIL', 1253, 10, false),
        ('sodium_mg', 'Sodium', 'Sodio', 'mg', 'MINERAL', 1093, 11, false),
        ('potassium_mg', 'Potassium', 'Potasio', 'mg', 'MINERAL', 1092, 12, false),
        ('calcium_mg', 'Calcium', 'Calcio', 'mg', 'MINERAL', 1087, 13, false),
        ('iron_mg', 'Iron', 'Hierro', 'mg', 'MINERAL', 1089, 14, false),
        ('magnesium_mg', 'Magnesium', 'Magnesio', 'mg', 'MINERAL', 1090, 15, false),
        ('zinc_mg', 'Zinc', 'Zinc', 'mg', 'MINERAL', 1095, 16, false),
        ('vitamin_a_ug', 'Vitamin A', 'Vitamina A', 'ug', 'VITAMIN', 1106, 17, false),
        ('vitamin_c_mg', 'Vitamin C', 'Vitamina C', 'mg', 'VITAMIN', 1162, 18, false),
        ('vitamin_d_ug', 'Vitamin D', 'Vitamina D', 'ug', 'VITAMIN', 1114, 19, false),
        ('vitamin_b12_ug', 'Vitamin B12', 'Vitamina B12', 'ug', 'VITAMIN', 1178, 20, false),
        ('folate_ug', 'Folate', 'Folato', 'ug', 'VITAMIN', 1177, 21, false)
    `);
    await queryRunner.query(`
      ALTER TABLE "nutrition_foods"
        ADD COLUMN "source" "nutrition_food_source" NOT NULL DEFAULT 'MANUAL',
        ADD COLUMN "external_id" varchar(64),
        ADD COLUMN "source_data_type" varchar,
        ADD COLUMN "source_version" varchar,
        ADD COLUMN "imported_at" TIMESTAMPTZ,
        ADD COLUMN "imported_by_user_id" uuid,
        ADD COLUMN "density_g_per_ml" numeric(10, 3),
        ADD COLUMN "name_original" varchar(300),
        ADD COLUMN "name_origin" "nutrition_food_name_origin" NOT NULL DEFAULT 'MANUAL',
        ADD COLUMN "name_verified_at" TIMESTAMPTZ,
        ADD COLUMN "name_verified_by_user_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "nutrition_foods"
        ADD CONSTRAINT "FK_nutrition_foods_imported_by_user_id"
          FOREIGN KEY ("imported_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        ADD CONSTRAINT "FK_nutrition_foods_name_verified_by_user_id"
          FOREIGN KEY ("name_verified_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        ADD CONSTRAINT "CHK_nutrition_foods_source_external_id"
          CHECK ("source" = 'MANUAL' OR "external_id" IS NOT NULL),
        ADD CONSTRAINT "CHK_nutrition_foods_density_g_per_ml"
          CHECK ("density_g_per_ml" IS NULL OR "density_g_per_ml" > 0)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_nutrition_foods_source_external_id"
        ON "nutrition_foods" ("source", "external_id")
        WHERE "external_id" IS NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "nutrition_foods"
      SET "source" = 'MANUAL', "name_origin" = 'MANUAL', "name_original" = NULL
    `);
    await queryRunner.query(`
      CREATE TABLE "food_nutrients" (
        "food_id" uuid NOT NULL,
        "nutrient_id" uuid NOT NULL,
        "amount_per_100g" numeric(12, 4),
        "derivation" "food_nutrient_derivation" NOT NULL DEFAULT 'MEASURED',
        "source" "nutrition_food_source" NOT NULL DEFAULT 'MANUAL',
        "source_nutrient_ref" varchar(64),
        "updated_by_user_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_food_nutrients" PRIMARY KEY ("food_id", "nutrient_id"),
        CONSTRAINT "FK_food_nutrients_food_id"
          FOREIGN KEY ("food_id") REFERENCES "nutrition_foods"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_food_nutrients_nutrient_id"
          FOREIGN KEY ("nutrient_id") REFERENCES "nutrients"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_food_nutrients_updated_by_user_id"
          FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      INSERT INTO "food_nutrients" (
        "food_id", "nutrient_id", "amount_per_100g", "derivation", "source"
      )
      SELECT
        food."id",
        nutrient."id",
        CASE nutrient."code"
          WHEN 'energy_kcal' THEN food."calories_per_100g"
          WHEN 'protein_g' THEN food."protein_g_per_100g"
          WHEN 'carbohydrates_g' THEN food."carbohydrates_g_per_100g"
          WHEN 'fat_g' THEN food."fat_g_per_100g"
          WHEN 'fiber_g' THEN food."fiber_g_per_100g"
        END,
        'MEASURED',
        'MANUAL'
      FROM "nutrition_foods" food
      CROSS JOIN "nutrients" nutrient
      WHERE nutrient."is_core" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "food_nutrients"`);
    await queryRunner.query(
      `DROP INDEX "UQ_nutrition_foods_source_external_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "nutrition_foods"
        DROP CONSTRAINT "CHK_nutrition_foods_density_g_per_ml",
        DROP CONSTRAINT "CHK_nutrition_foods_source_external_id",
        DROP CONSTRAINT "FK_nutrition_foods_name_verified_by_user_id",
        DROP CONSTRAINT "FK_nutrition_foods_imported_by_user_id",
        DROP COLUMN "name_verified_by_user_id",
        DROP COLUMN "name_verified_at",
        DROP COLUMN "name_origin",
        DROP COLUMN "name_original",
        DROP COLUMN "density_g_per_ml",
        DROP COLUMN "imported_by_user_id",
        DROP COLUMN "imported_at",
        DROP COLUMN "source_version",
        DROP COLUMN "source_data_type",
        DROP COLUMN "external_id",
        DROP COLUMN "source"
    `);
    await queryRunner.query(`DROP TABLE "nutrients"`);
    await queryRunner.query(`DROP TYPE "nutrition_food_name_origin"`);
    await queryRunner.query(`DROP TYPE "food_nutrient_derivation"`);
    await queryRunner.query(`DROP TYPE "nutrition_food_source"`);
    await queryRunner.query(`DROP TYPE "nutrient_category"`);
    await queryRunner.query(`DROP TYPE "nutrient_unit"`);
  }
}
