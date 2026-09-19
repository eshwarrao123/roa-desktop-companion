import { z } from 'zod';

export const ScheduleTypeSchema = z.enum(['one_time', 'interval', 'daily', 'weekly']);
export type ScheduleType = z.infer<typeof ScheduleTypeSchema>;

export const OneTimeScheduleDataSchema = z.object({
  targetTimestamp: z.number().int().positive(),
});
export type OneTimeScheduleData = z.infer<typeof OneTimeScheduleDataSchema>;

export const IntervalScheduleDataSchema = z.object({
  intervalMinutes: z.number().int().positive().min(1).max(10080), // Up to 7 days in minutes
});
export type IntervalScheduleData = z.infer<typeof IntervalScheduleDataSchema>;

export const DailyScheduleDataSchema = z.object({
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm 24-hour format'),
});
export type DailyScheduleData = z.infer<typeof DailyScheduleDataSchema>;

export const WeeklyScheduleDataSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm 24-hour format'),
});
export type WeeklyScheduleData = z.infer<typeof WeeklyScheduleDataSchema>;

export const ScheduleDataSchema = z.union([
  OneTimeScheduleDataSchema,
  IntervalScheduleDataSchema,
  DailyScheduleDataSchema,
  WeeklyScheduleDataSchema,
]);
export type ScheduleData = z.infer<typeof ScheduleDataSchema>;

export function parseScheduleData(type: ScheduleType, data: unknown): ScheduleData {
  switch (type) {
    case 'one_time':
      return OneTimeScheduleDataSchema.parse(data);
    case 'interval':
      return IntervalScheduleDataSchema.parse(data);
    case 'daily':
      return DailyScheduleDataSchema.parse(data);
    case 'weekly':
      return WeeklyScheduleDataSchema.parse(data);
    default:
      throw new Error(`Unsupported schedule type: ${type}`);
  }
}

export const CreateReminderInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(128, 'Title is too long'),
  description: z.string().trim().max(1024, 'Description is too long').optional(),
  schedule_type: ScheduleTypeSchema,
  schedule_data: z.unknown(), // Validated conditionally via parseScheduleData
  timezone: z.string().optional().default('local'),
  enabled: z.boolean().optional().default(true),
  metadata_json: z.record(z.unknown()).optional(),
});
export type CreateReminderInput = z.infer<typeof CreateReminderInputSchema>;

export const UpdateReminderInputSchema = z.object({
  title: z.string().trim().min(1).max(128).optional(),
  description: z.string().trim().max(1024).optional().nullable(),
  schedule_type: ScheduleTypeSchema.optional(),
  schedule_data: z.unknown().optional(),
  timezone: z.string().optional(),
  enabled: z.boolean().optional(),
  metadata_json: z.record(z.unknown()).optional().nullable(),
});
export type UpdateReminderInput = z.infer<typeof UpdateReminderInputSchema>;

export const SnoozeInputSchema = z.object({
  id: z.string().min(1),
  minutes: z.number().int().positive().min(1).max(1440), // Up to 24 hours
});
export type SnoozeInput = z.infer<typeof SnoozeInputSchema>;

export interface Reminder {
  id: string;
  title: string;
  description?: string | null;
  schedule_type: ScheduleType;
  schedule_data: ScheduleData;
  timezone: string;
  enabled: boolean;
  next_run_at: number; // Unix timestamp in ms
  last_run_at?: number | null; // Unix timestamp in ms
  created_at: number; // Unix timestamp in ms
  updated_at: number; // Unix timestamp in ms
  metadata_json?: Record<string, unknown> | null;
}

export const ReminderHistoryActionSchema = z.enum(['triggered', 'dismissed', 'snoozed', 'completed']);
export type ReminderHistoryAction = z.infer<typeof ReminderHistoryActionSchema>;

export interface ReminderHistory {
  id: string;
  reminder_id: string;
  triggered_at: number;
  dismissed_at?: number | null;
  snoozed_until?: number | null;
  action: ReminderHistoryAction;
}
