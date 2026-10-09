import fs from 'node:fs';
import path from 'node:path';
import { logger } from '@moonstar-x/logger';
import { database } from '../client/postgres.js';

export interface Migration {
  created_at: Date;
  id: number;
  name: string;
}

const getMigrationFiles = async (directory: string): Promise<string[]> => {
  const directoryStat = await fs.promises.stat(directory);
  if (!directoryStat.isDirectory()) {
    throw new Error('Migrations directory provided does not exist or is not a directory.');
  }

  const files = await fs.promises.readdir(directory);
  return files.filter((file) => file.endsWith('.sql'));
};

const initializeMigrationTable = async (): Promise<void> => {
  await database.tx(async (t) => {
    const statement = 'CREATE TABLE IF NOT EXISTS __migrations(id SERIAL PRIMARY KEY, name VARCHAR(256) NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now())';
    await t.any(statement);
  });
};

const getNewMigrations = async (migrations: string[]): Promise<string[]> => {
  const query = 'SELECT * FROM __migrations';
  const storedMigrations = await database.manyOrNone<Migration>(query);

  const storedMigrationsSet = new Set(storedMigrations.map((migration) => migration.name));

  return migrations.filter((migration) => !storedMigrationsSet.has(migration));
};

const applyMigrations = async (migrationsDirectory: string, migrations: string[]): Promise<Migration[]> => await database.tx(async (t) => {
  const result: Migration[] = [];

  // Migrations must be applied sequentially and in order.
  /* eslint-disable no-await-in-loop */
  for (const migrationName of migrations) {
    const migrationFilename = path.join(migrationsDirectory, migrationName);
    const migrationStatement = await fs.promises.readFile(migrationFilename, { encoding: 'utf8' });
    await t.multi(migrationStatement);

    const query = 'INSERT INTO __migrations(name) VALUES($1) RETURNING *';
    result.push(await t.one<Migration>(query, [migrationName]));
  }
  /* eslint-enable no-await-in-loop */

  return result;
});

export const runMigrations = async (migrationsDirectory: string): Promise<Migration[]> => {
  const migrations = await getMigrationFiles(migrationsDirectory);

  if (migrations.length === 0) {
    throw new Error('Migrations directory is empty.');
  }

  await initializeMigrationTable();
  const newMigrations = await getNewMigrations(migrations);

  if (newMigrations.length === 0) {
    return [];
  }

  return await applyMigrations(migrationsDirectory, newMigrations);
};

export const runMigrationsForApp = async (migrationsDirectory: string): Promise<Migration[]> => {
  const newMigrations = await runMigrations(migrationsDirectory);

  for (const migration of newMigrations) {
    logger.info(`New migration applied: ${migration.name}`);
  }

  return newMigrations;
};
