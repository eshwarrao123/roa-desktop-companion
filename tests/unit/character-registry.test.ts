import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: () => '/mock/path',
  },
}));

import { CharacterRegistry } from '../../src/main/services/character-registry';
import { SettingsStore } from '../../src/main/services/settings-store';
import type Database from 'better-sqlite3';

describe('CharacterRegistry', () => {
  let mockDb: Database.Database;
  let store: SettingsStore;
  let registry: CharacterRegistry;
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
    registry = new CharacterRegistry(store);
  });

  it('loads bundled characters (roa-cat and roa-bunny)', () => {
    const list = registry.list();
    expect(list.length).toBeGreaterThanOrEqual(2);

    const ids = list.map((c) => c.id);
    expect(ids).toContain('roa-cat');
    expect(ids).toContain('roa-bunny');
  });

  it('retrieves character by ID', () => {
    const cat = registry.get('roa-cat');
    expect(cat).not.toBeNull();
    expect(cat?.name).toBe('Roa Cat');

    const bunny = registry.get('roa-bunny');
    expect(bunny).not.toBeNull();
    expect(bunny?.name).toBe('Roa Bunny');

    const nonExistent = registry.get('unknown-character');
    expect(nonExistent).toBeNull();
  });

  it('returns default active character if not set', () => {
    const active = registry.getActive();
    expect(active.id).toBe('roa-cat');
  });

  it('sets active character, persists to settings, and notifies listeners', () => {
    let notifiedChar: string | null = null;
    const unsubscribe = registry.onCharacterChanged((char) => {
      notifiedChar = char.id;
    });

    const switched = registry.setActive('roa-bunny');
    expect(switched.id).toBe('roa-bunny');
    expect(registry.getActive().id).toBe('roa-bunny');
    expect(store.get('pet.activeCharacterId')).toBe('roa-bunny');
    expect(notifiedChar).toBe('roa-bunny');

    unsubscribe();
  });

  it('throws error when setting non-existent character ID', () => {
    expect(() => registry.setActive('non-existent-id')).toThrow(
      'Character with ID "non-existent-id" not found.'
    );
  });
});
