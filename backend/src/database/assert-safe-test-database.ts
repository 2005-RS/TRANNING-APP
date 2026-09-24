export const DEVELOPMENT_DATABASE_NAME = 'training';

export function assertSafeTestDatabaseName(databaseName: string): void {
  if (
    databaseName === DEVELOPMENT_DATABASE_NAME ||
    databaseName === 'postgres' ||
    !databaseName.endsWith('_test')
  ) {
    throw new Error(
      `Refusing destructive test operations against database "${databaseName}". Use a dedicated *_test database.`,
    );
  }
}
