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

  it('emits change event when settings are updated', () => {
    const changeListener = vi.fn();
    store.on('change', changeListener);

    store.set('pet.currentMood', 'happy');

    expect(changeListener).toHaveBeenCalledTimes(1);
    expect(changeListener).toHaveBeenCalledWith({ 'pet.currentMood': 'happy' });
  });

  it('emits multiple change events when using update()', () => {
    const changeListener = vi.fn();
    store.on('change', changeListener);

    store.update({
      'pet.alwaysOnTop': false,
      'pet.currentMood': 'sleeping',
    });

    expect(changeListener).toHaveBeenCalledTimes(2);
    expect(changeListener).toHaveBeenCalledWith({ 'pet.alwaysOnTop': false });
    expect(changeListener).toHaveBeenCalledWith({ 'pet.currentMood': 'sleeping' });
  });

  it('persists settings across store initialization', () => {
    // Set a value
    store.set('pet.currentMood', 'celebrating');
    store.set('pet.position', { x: 500, y: 600 });

    // Create new store instance with same database
    const newStore = new SettingsStore(mockDb);

    // Verify persisted values are loaded
    expect(newStore.get('pet.currentMood')).toBe('celebrating');
    expect(newStore.get('pet.position')).toEqual({ x: 500, y: 600 });
  });

  it('does not overwrite unrelated settings on partial update', () => {
    store.set('pet.currentMood', 'happy');
    store.set('pet.position', { x: 200, y: 300 });
    store.set('pet.alwaysOnTop', true);

    // Update only one setting
    store.set('pet.currentMood', 'sleeping');

    // Verify other settings remain intact
    expect(store.get('pet.position')).toEqual({ x: 200, y: 300 });
    expect(store.get('pet.alwaysOnTop')).toBe(true);
  });

  it('validates settings against schema', () => {
    const all = store.getAll();

    // Verify all settings conform to schema constraints
    expect(all['system.lowBatteryThreshold']).toBeGreaterThanOrEqual(5);
    expect(all['system.lowBatteryThreshold']).toBeLessThanOrEqual(50);
    expect(all['pomodoro.focusDurationMinutes']).toBeGreaterThanOrEqual(1);
    expect(all['pomodoro.focusDurationMinutes']).toBeLessThanOrEqual(120);
  });

  it('handles malformed stored JSON gracefully', () => {
    // Simulate corrupted database entry
    tableData.set('pet.currentMood', {
      key: 'pet.currentMood',
      value_json: 'invalid-json{',
      updated_at: Date.now(),
    });

    // Create new store that loads corrupted data
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const newStore = new SettingsStore(mockDb);

    // Should fall back to default instead of crashing
    expect(newStore.get('pet.currentMood')).toBe('idle');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
