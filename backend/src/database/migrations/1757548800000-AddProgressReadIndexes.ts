import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProgressReadIndexes1757548800000 implements MigrationInterface {
  name = 'AddProgressReadIndexes1757548800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX "IDX_workout_session_exercises_exercise_id"
        ON "workout_session_exercises" ("exercise_id", "workout_session_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_workout_session_exercises_exercise_id"`,
    );
  }
}
