import { z } from 'zod';

export const PetMoodSchema = z.enum([
  'idle',
  'happy',
  'sleeping',
  'thinking',
  'reminding',
  'celebrating',
]);
export type PetMood = z.infer<typeof PetMoodSchema>;

export const PetBehaviorSchema = z.enum(['idle', 'walking', 'sleeping', 'interacting']);
export type PetBehavior = z.infer<typeof PetBehaviorSchema>;

export const PetAnimationSchema = z.enum([
  'idle',
  'walking',
  'sleeping',
  'happy',
  'thinking',
  'reminding',
  'celebrating',
]);
export type PetAnimation = z.infer<typeof PetAnimationSchema>;

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
  frameSize: z
    .object({
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
});
export type AnimationDefinition = z.infer<typeof AnimationDefinitionSchema>;

export const CharacterPersonalitySchema = z.object({
  playful: z.number().min(0).max(1),
  calm: z.number().min(0).max(1),
  energetic: z.number().min(0).max(1).optional(),
  curious: z.number().min(0).max(1).optional(),
  sarcastic: z.number().min(0).max(1).optional(),
});
export type CharacterPersonality = z.infer<typeof CharacterPersonalitySchema>;

export const CharacterManifestSchema = z.object({
  $schema: z.string().optional(),
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string(),
  author: z.string(),
  description: z.string(),
  preview: z.string(),
  personality: CharacterPersonalitySchema.optional(),
  animations: z.record(AnimationDefinitionSchema),
  moods: z.array(z.string()),
  behaviors: z
    .object({
      idleIntervalMs: z.tuple([z.number(), z.number()]).optional(),
      walkProbability: z.number().min(0).max(1).optional(),
      walkDistancePx: z.tuple([z.number(), z.number()]).optional(),
      speechIntervalMs: z.tuple([z.number(), z.number()]).optional(),
    })
    .optional(),
});
export type CharacterManifest = z.infer<typeof CharacterManifestSchema>;

export interface PetState {
  characterId: string;
  mood: PetMood;
  behavior: PetBehavior;
  position: PetPosition;
  alwaysOnTop: boolean;
  visible: boolean;
}
