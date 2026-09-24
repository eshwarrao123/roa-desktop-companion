import { z } from 'zod';

export type AIProviderId = 'gemini' | 'disabled';

/**
 * Internal provider status — kept for backward compatibility with the
 * provider interface. Use AICredentialStatus + AIServiceStatus for UI.
 */
export type AIProviderStatus =
  | 'not_configured'
  | 'connected'
  | 'invalid_credential'
  | 'rate_limited'
  | 'daily_quota_exceeded'
  | 'temporarily_unavailable'
  | 'offline'
  | 'error';

/** Credential validity — independent of transient service issues. */
export type AICredentialStatus = 'not_configured' | 'verified' | 'invalid';

/** Current Gemini service reachability. */
export type AIServiceStatus =
  | 'available'
  | 'temporarily_unavailable'
  | 'rate_limited'
  | 'daily_quota_exceeded'
  | 'offline'
  | 'unknown';

export interface AIStatusInfo {
  provider: AIProviderId;
  /** @deprecated use credentialStatus + serviceStatus */
  status: AIProviderStatus;
  isConfigured: boolean;
  /** Credential validity (not affected by transient service errors). */
  credentialStatus: AICredentialStatus;
  /** Current service reachability. */
  serviceStatus: AIServiceStatus;
  maskedKey?: string;
  lastTestedAt?: number;
  lastErrorCategory?: string;
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
  toolResults?: Array<{
    callId: string;
    name: string;
    result: unknown;
  }>;
  createdAt: number;
}

export interface AIChatResponse {
  message: AIMessage;
  toolActivity?: ToolActivity[];
}

export interface ToolActivity {
  toolName: string;
  status: 'running' | 'completed' | 'error';
  label: string;
  details?: string;
}

// ============================================================
// TOOL INPUT SCHEMAS (Validated strictly with Zod)
// ============================================================

export const CreateReminderToolSchema = z.object({
  title: z.string().min(1, 'Title is required').max(128),
  schedule_type: z.enum(['one_time', 'interval', 'daily', 'weekly']).default('one_time'),
  schedule_data: z.string().min(1, 'Schedule data is required'),
  description: z.string().max(1024).optional(),
});
export type CreateReminderToolInput = z.infer<typeof CreateReminderToolSchema>;

export const ListRemindersToolSchema = z.object({
  enabled_only: z.boolean().optional().default(false),
  limit: z.number().int().positive().max(50).optional().default(20),
});
export type ListRemindersToolInput = z.infer<typeof ListRemindersToolSchema>;

export const UpdateReminderToolSchema = z.object({
  id: z.string().min(1, 'Reminder ID is required'),
  title: z.string().min(1).max(128).optional(),
  enabled: z.boolean().optional(),
});
export type UpdateReminderToolInput = z.infer<typeof UpdateReminderToolSchema>;

export const DeleteReminderToolSchema = z.object({
  id: z.string().min(1, 'Reminder ID is required'),
});
export type DeleteReminderToolInput = z.infer<typeof DeleteReminderToolSchema>;

export const SnoozeReminderToolSchema = z.object({
  id: z.string().min(1, 'Reminder ID is required'),
  minutes: z.number().int().positive().default(10),
});
export type SnoozeReminderToolInput = z.infer<typeof SnoozeReminderToolSchema>;

export const StartTimerToolSchema = z.object({
  label: z.string().min(1).max(128).default('Timer'),
  duration_minutes: z.number().positive().default(25),
  is_pomodoro: z.boolean().optional().default(false),
});
export type StartTimerToolInput = z.infer<typeof StartTimerToolSchema>;

export const StopTimerToolSchema = z.object({
  id: z.string().optional(),
  action: z.enum(['pause', 'cancel']).default('cancel'),
});
export type StopTimerToolInput = z.infer<typeof StopTimerToolSchema>;

export const GetCurrentTimeToolSchema = z.object({});
export type GetCurrentTimeToolInput = z.infer<typeof GetCurrentTimeToolSchema>;

export const GetBatteryStatusToolSchema = z.object({});
export type GetBatteryStatusToolInput = z.infer<typeof GetBatteryStatusToolSchema>;

export const GetTodaySummaryToolSchema = z.object({});
export type GetTodaySummaryToolInput = z.infer<typeof GetTodaySummaryToolSchema>;
