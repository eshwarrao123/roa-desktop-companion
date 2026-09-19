import { z } from 'zod';

export const BatteryStatusSchema = z.object({
  isOnBattery: z.boolean(),
  percent: z.number().min(0).max(100).nullable(),
  isCharging: z.boolean().nullable(),
});
export type BatteryStatus = z.infer<typeof BatteryStatusSchema>;

export const SystemIdleStatusSchema = z.object({
  idleTimeSeconds: z.number().int().nonnegative(),
  isIdle: z.boolean(),
});
export type SystemIdleStatus = z.infer<typeof SystemIdleStatusSchema>;

export const GlobalShortcutStatusSchema = z.object({
  accelerator: z.string(),
  registered: z.boolean(),
  error: z.string().nullable(),
});
export type GlobalShortcutStatus = z.infer<typeof GlobalShortcutStatusSchema>;
