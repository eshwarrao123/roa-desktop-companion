import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Database from 'better-sqlite3';

vi.mock('electron', () => ({
  app: {
    getPath: () => '/mock/path',
  },
}));

import { SettingsStore } from '../../src/main/services/settings-store';

describe('SettingsStore', () => {
  let mockDb: Database.Database;
  let store: SettingsStore;
  let tableData: Map<string, { key: string; value_json: string; updated_at: number }>;

  beforeEach(() => {
    tableData = new Map();

    mockDb = {
      prepare: (sql: string) => {
        if (sql.includes('SELECT key, value_json FROM settings')) {
          return {
            all: () => Array.from(tableData.values()),
          };
        }
        if (sql.includes('INSERT INTO settings')) {
          return {
            run: (key: string, value_json: string, updated_at: number) => {
              tableData.set(key, { key, value_json, updated_at });
              return { changes: 1 };
            },
          };
        }
        if (sql.includes('SELECT value_json FROM settings WHERE key = ?')) {
          return {
            get: (key: string) => tableData.get(key),
          };
        }
        return {
          run: () => ({ changes: 1 }),
          get: () => undefined,
          all: () => [],
        };
      },
    } as unknown as Database.Database;

    store = new SettingsStore(mockDb);
  });

  it('returns default settings when nothing is saved', () => {
    const defaultMood = store.get('pet.currentMood');
    expect(defaultMood).toBe('idle');

    const alwaysOnTop = store.get('pet.alwaysOnTop');
    expect(alwaysOnTop).toBe(true);

    const pos = store.get('pet.position');
    expect(pos).toEqual({ x: 100, y: 100 });
  });

  it('persists and retrieves updated settings', () => {
    store.set('pet.currentMood', 'happy');
    expect(store.get('pet.currentMood')).toBe('happy');

    store.set('pet.position', { x: 450, y: 320 });
    expect(store.get('pet.position')).toEqual({ x: 450, y: 320 });

    // Verify row was written
    const entry = tableData.get('pet.currentMood');
    expect(entry).toBeDefined();
    expect(JSON.parse(entry!.value_json)).toBe('happy');
  });

  it('updates multiple settings via update()', () => {
    store.update({
      'pet.alwaysOnTop': false,
      'pet.currentMood': 'sleeping',
    });

    expect(store.get('pet.alwaysOnTop')).toBe(false);
    expect(store.get('pet.currentMood')).toBe('sleeping');
  });

  it('returns all settings via getAll()', () => {
    const all = store.getAll();
    expect(all['pet.activeCharacterId']).toBe('roa-cat');
    expect(all['pet.alwaysOnTop']).toBe(true);
    expect(all['pet.visible']).toBe(true);
  });
});
