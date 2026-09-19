import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { CharacterManifest, CharacterManifestSchema } from '@shared/types/pet';
import { SettingsStore, getSettingsStore } from './settings-store';

export class CharacterRegistry {
  private characters: Map<string, CharacterManifest> = new Map();
  private settingsStore: SettingsStore;

  constructor(settingsStore?: SettingsStore) {
    this.settingsStore = settingsStore ?? getSettingsStore();
    this.loadBuiltinCharacters();
  }

  private loadBuiltinCharacters(): void {
    const basePath = app && app.isPackaged
      ? path.join(process.resourcesPath, 'assets', 'characters')
      : path.join(process.cwd(), 'assets', 'characters');

    if (!fs.existsSync(basePath)) {
      // Fallback default roa-cat manifest if directory doesn't exist yet
      const defaultCat: CharacterManifest = {
        id: 'roa-cat',
        name: 'Roa Cat',
        version: '1.0.0',
        author: 'ROA Team',
        description: 'A curious and loyal desktop companion cat.',
        preview: 'preview.png',
        animations: {
          idle: { file: 'idle.png', frames: 4, frameRate: 4, loop: true },
          happy: { file: 'happy.png', frames: 4, frameRate: 6, loop: true },
          sleeping: { file: 'sleep.png', frames: 2, frameRate: 2, loop: true },
        },
        moods: ['idle', 'happy', 'sleeping'],
      };
      this.characters.set(defaultCat.id, defaultCat);
      return;
    }

    const entries = fs.readdirSync(basePath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const manifestPath = path.join(basePath, entry.name, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          try {
            const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            const parsed = CharacterManifestSchema.parse(raw);
            this.characters.set(parsed.id, parsed);
          } catch (err) {
            console.error(`[CharacterRegistry] Failed to parse manifest at ${manifestPath}:`, err);
          }
        }
      }
    }

    if (this.characters.size === 0) {
      const fallbackCat: CharacterManifest = {
        id: 'roa-cat',
        name: 'Roa Cat',
        version: '1.0.0',
        author: 'ROA Team',
        description: 'A curious and loyal desktop companion cat.',
        preview: 'preview.png',
        animations: {
          idle: { file: 'idle.png', frames: 4, frameRate: 4, loop: true },
          happy: { file: 'happy.png', frames: 4, frameRate: 6, loop: true },
          sleeping: { file: 'sleep.png', frames: 2, frameRate: 2, loop: true },
        },
        moods: ['idle', 'happy', 'sleeping'],
      };
      this.characters.set(fallbackCat.id, fallbackCat);
    }
  }

  private changeListeners: Set<(character: CharacterManifest) => void> = new Set();

  public get(id: string): CharacterManifest | null {
    return this.characters.get(id) ?? null;
  }

  public getActive(): CharacterManifest {
    const activeId = this.settingsStore.get('pet.activeCharacterId');
    return this.characters.get(activeId) ?? this.characters.values().next().value!;
  }

  public setActive(id: string): CharacterManifest {
    const character = this.characters.get(id);
    if (!character) {
      throw new Error(`Character with ID "${id}" not found.`);
    }

    this.settingsStore.set('pet.activeCharacterId', id);
    console.log(`[CharacterRegistry] Switched active character to "${character.name}" (${id})`);

    // Notify listeners
    for (const listener of this.changeListeners) {
      try {
        listener(character);
      } catch (err) {
        console.error('[CharacterRegistry] Error in change listener:', err);
      }
    }

    return character;
  }

  public onCharacterChanged(listener: (character: CharacterManifest) => void): () => void {
    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  public list(): CharacterManifest[] {
    return Array.from(this.characters.values());
  }
}

let characterRegistryInstance: CharacterRegistry | null = null;

export function getCharacterRegistry(settingsStore?: SettingsStore): CharacterRegistry {
  if (!characterRegistryInstance || settingsStore) {
    characterRegistryInstance = new CharacterRegistry(settingsStore);
  }
  return characterRegistryInstance;
}
