import { describe, it, expect } from 'vitest';
import { PetMoodSchema, PetPositionSchema, CharacterManifestSchema } from '../../src/shared/types/pet';
import { AppSettingsSchema } from '../../src/shared/types/settings';

describe('IPC Schemas & Zod Validation', () => {
  it('validates PetMood correctly', () => {
    expect(PetMoodSchema.parse('idle')).toBe('idle');
    expect(PetMoodSchema.parse('happy')).toBe('happy');
    expect(PetMoodSchema.parse('sleeping')).toBe('sleeping');

    expect(() => PetMoodSchema.parse('angry')).toThrow();
    expect(() => PetMoodSchema.parse(123)).toThrow();
  });

  it('validates PetPosition correctly', () => {
    expect(PetPositionSchema.parse({ x: 200, y: 350 })).toEqual({ x: 200, y: 350 });
    expect(() => PetPositionSchema.parse({ x: 'invalid', y: 350 })).toThrow();
    expect(() => PetPositionSchema.parse({})).toThrow();
  });

  it('validates CharacterManifest correctly', () => {
    const validManifest = {
      id: 'roa-cat',
      name: 'Roa Cat',
      version: '1.0.0',
      author: 'ROA Team',
      description: 'A test cat',
      preview: 'preview.png',
      animations: {
        idle: { file: 'idle.png', frames: 4, frameRate: 4, loop: true },
      },
      moods: ['idle'],
    };

    const parsed = CharacterManifestSchema.parse(validManifest);
    expect(parsed.id).toBe('roa-cat');
    expect(parsed.animations.idle.frames).toBe(4);

    expect(() =>
      CharacterManifestSchema.parse({
        id: 'bad-manifest',
      })
    ).toThrow();
  });

  it('validates and applies AppSettings defaults', () => {
    const defaults = AppSettingsSchema.parse({});
    expect(defaults['pet.currentMood']).toBe('idle');
    expect(defaults['pet.alwaysOnTop']).toBe(true);
    expect(defaults['pet.activeCharacterId']).toBe('roa-cat');
  });
});
