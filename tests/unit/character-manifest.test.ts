import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CharacterManifestSchema, CharacterPersonalitySchema } from '../../src/shared/types/pet';

describe('Character Manifest Validation', () => {
  it('validates roa-cat bundled manifest correctly', () => {
    const manifestPath = join(__dirname, '../../assets/characters/roa-cat/manifest.json');
    const rawData = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    const manifest = CharacterManifestSchema.parse(rawData);

    expect(manifest.id).toBe('roa-cat');
    expect(manifest.name).toBe('Roa Cat');
    expect(manifest.animations.idle).toBeDefined();
    expect(manifest.animations.walking).toBeDefined();
    expect(manifest.animations.sleeping).toBeDefined();
    expect(manifest.animations.happy).toBeDefined();
    expect(manifest.animations.thinking).toBeDefined();
    expect(manifest.animations.reminding).toBeDefined();
    expect(manifest.animations.celebrating).toBeDefined();
    expect(manifest.personality?.playful).toBe(0.7);
  });

  it('validates roa-bunny bundled manifest correctly', () => {
    const manifestPath = join(__dirname, '../../assets/characters/roa-bunny/manifest.json');
    const rawData = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    const manifest = CharacterManifestSchema.parse(rawData);

    expect(manifest.id).toBe('roa-bunny');
    expect(manifest.name).toBe('Roa Bunny');
    expect(manifest.animations.walking.frames).toBe(4);
    expect(manifest.animations.walking.frameRate).toBe(6);
    expect(manifest.personality?.energetic).toBe(0.8);
  });

  it('validates personality schema values between 0 and 1', () => {
    const valid = { playful: 0.8, calm: 0.2, sarcastic: 0.1 };
    expect(CharacterPersonalitySchema.parse(valid)).toEqual(valid);

    const invalid = { playful: 1.5 };
    expect(() => CharacterPersonalitySchema.parse(invalid)).toThrow();

    const negative = { calm: -0.1 };
    expect(() => CharacterPersonalitySchema.parse(negative)).toThrow();
  });

  it('rejects manifest with missing required fields', () => {
    const invalidManifest = {
      id: 'incomplete-pet',
      name: 'Incomplete',
      // missing version, author, description, preview, animations, moods
    };
    expect(() => CharacterManifestSchema.parse(invalidManifest)).toThrow();
  });

  it('rejects manifest with invalid animation frame rate', () => {
    const invalidManifest = {
      id: 'bad-anim',
      name: 'Bad Anim',
      version: '1.0.0',
      author: 'Test',
      description: 'Test',
      preview: 'preview.png',
      animations: {
        idle: { file: 'idle.png', frames: 0, frameRate: -5, loop: true },
      },
      moods: ['idle'],
    };
    expect(() => CharacterManifestSchema.parse(invalidManifest)).toThrow();
  });
});
