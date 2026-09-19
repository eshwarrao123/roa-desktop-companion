import { describe, it, expect } from 'vitest';
import type Database from 'better-sqlite3';
import { runMigrations, migrations } from '../../src/main/db/migrations';

describe('SQLite Migrations', () => {
  it('applies pending migrations and updates schema_version', () => {
    const executedSql: string[] = [];
    const appliedVersions: Array<{ version: number; applied_at: number; description: string }> = [];

    const mockDb = {
      exec: (sql: string) => {
        executedSql.push(sql);
      },
      prepare: (sql: string) => {
        if (sql.includes('SELECT version FROM schema_version')) {
          return {
            get: () => appliedVersions[appliedVersions.length - 1],
          };
        }
        if (sql.includes('INSERT INTO schema_version')) {
          return {
            run: (version: number, applied_at: number, description: string) => {
              appliedVersions.push({ version, applied_at, description });
              return { changes: 1 };
            },
          };
        }
        return {
          run: () => ({ changes: 1 }),
          get: () => undefined,
          all: () => [],
        };
      },
      transaction: (fn: () => void) => () => fn(),
    } as unknown as Database.Database;

    runMigrations(mockDb);

    // Verify migrations were recorded
    expect(appliedVersions.length).toBe(migrations.length);
    expect(appliedVersions[0].version).toBe(1);
    expect(appliedVersions[0].description).toContain('Initial schema');
    expect(appliedVersions[1].version).toBe(2);
    expect(appliedVersions[1].description).toContain('Phase 2');

    // Verify executed SQL contains core tables
    const joinedSql = executedSql.join('\n');
    expect(joinedSql).toContain('CREATE TABLE IF NOT EXISTS settings');
    expect(joinedSql).toContain('CREATE TABLE IF NOT EXISTS characters');
    expect(joinedSql).toContain('CREATE TABLE IF NOT EXISTS reminders');
  });

  it('is idempotent when already at latest version', () => {
    const appliedVersions = [{ version: migrations[migrations.length - 1].version, applied_at: Date.now(), description: 'Latest' }];

    const mockDb = {
      exec: () => {},
      prepare: (sql: string) => {
        if (sql.includes('SELECT version FROM schema_version')) {
          return {
            get: () => appliedVersions[0],
          };
        }
        return {
          run: () => ({ changes: 1 }),
          get: () => undefined,
          all: () => [],
        };
      },
      transaction: (fn: () => void) => () => fn(),
    } as unknown as Database.Database;

    expect(() => runMigrations(mockDb)).not.toThrow();
  });
});
