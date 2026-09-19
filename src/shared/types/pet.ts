import { z } from 'zod';

export const PetMoodSchema = z.enum(['idle', 'happy', 'sleeping']);
export type PetMood = z.infer<typeof PetMoodSchema>;

export const PetPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type PetPosition = z.infer<typeof PetPositionSchema>;

export const AnimationDefinitionSchema = z.object({
  file: z.string(),
  frames: z.number().int().positive(),
  frameRate: z.number().int().positive(),
  loop: z.boolean(),
});
export type AnimationDefinition = z.infer<typeof AnimationDefinitionSchema>;

export const CharacterManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  author: z.string(),
  description: z.string(),
  preview: z.string(),
  animations: z.record(AnimationDefinitionSchema),
  moods: z.array(z.string()),
  behaviors: z
    .object({
      idleIntervalMs: z.tuple([z.number(), z.number()]).optional(),
      walkProbability: z.number().optional(),
      walkDistancePx: z.tuple([z.number(), z.number()]).optional(),
      speechIntervalMs: z.tuple([z.number(), z.number()]).optional(),
    })
    .optional(),
});
export type CharacterManifest = z.infer<typeof CharacterManifestSchema>;

export interface PetState {
  characterId: string;
  mood: PetMood;
  position: PetPosition;
  alwaysOnTop: boolean;
  visible: boolean;
}
