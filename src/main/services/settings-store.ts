import type Database from 'better-sqlite3';
import { EventEmitter } from 'events';
import { AppSettings, AppSettingsSchema, SettingKey } from '@shared/types/settings';
import { getDb } from '../db';

export class SettingsStore extends EventEmitter {
  private db: Database.Database;
  private cache: Map<string, unknown> = new Map();

  constructor(db?: Database.Database) {
    super();
    this.db = db ?? getDb();
    this.loadAll();
  }

  private loadAll(): void {
    const rows = this.db.prepare('SELECT key, value_json FROM settings').all() as Array<{
      key: string;
      value_json: string;
    }>;

    for (const row of rows) {
      try {
        this.cache.set(row.key, JSON.parse(row.value_json));
      } catch (err) {
        console.error(`[SettingsStore] Failed to parse setting ${row.key}:`, err);
      }
    }
  }

  public get<K extends SettingKey>(key: K): AppSettings[K] {
    if (this.cache.has(key)) {
      return this.cache.get(key) as AppSettings[K];
    }
    // Return default from schema
    const defaults = AppSettingsSchema.parse({});
    return defaults[key];
  }

  public set<K extends SettingKey>(key: K, value: AppSettings[K]): void {
    this.cache.set(key, value);
    const valueJson = JSON.stringify(value);
    const now = Date.now();

    this.db
      .prepare(
        `INSERT INTO settings (key, value_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
      )
      .run(key, valueJson, now);

    this.emit('change', { [key]: value });
  }

  public getAll(): AppSettings {
    const defaults = AppSettingsSchema.parse({});
    const result: Record<string, unknown> = { ...defaults };
    for (const [k, v] of this.cache.entries()) {
      result[k] = v;
    }
    return AppSettingsSchema.parse(result);
  }

  public update(partial: Partial<AppSettings>): void {
    for (const [key, value] of Object.entries(partial)) {
      this.set(key as SettingKey, value as AppSettings[SettingKey]);
    }
  }
}

let settingsStoreInstance: SettingsStore | null = null;

export function getSettingsStore(db?: Database.Database): SettingsStore {
  if (!settingsStoreInstance || db) {
    settingsStoreInstance = new SettingsStore(db);
  }
  return settingsStoreInstance;
}
