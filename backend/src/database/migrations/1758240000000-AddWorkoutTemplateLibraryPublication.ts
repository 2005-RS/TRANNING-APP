import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkoutTemplateLibraryPublication1758240000000 implements MigrationInterface {
  name = 'AddWorkoutTemplateLibraryPublication1758240000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workout_templates" ADD "is_library_published" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workout_templates_library_published" ON "workout_templates" ("is_library_published") WHERE "is_library_published" = true`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_workout_templates_library_published"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workout_templates" DROP COLUMN "is_library_published"`,
    );
  }
}
