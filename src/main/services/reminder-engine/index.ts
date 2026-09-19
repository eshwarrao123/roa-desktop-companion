import { Notification, powerMonitor, app } from 'electron';
import path from 'path';
import { RemindersRepository } from './reminders.repository';
import { ReminderEventsRepository } from './reminder-events.repository';
import { calculateNextRun, calculateRecoveryNextRun, calculateSnooze } from './calculator';
import {
  Reminder,
  CreateReminderInput,
  UpdateReminderInput,
  parseScheduleData,
  ScheduleType,
} from '@shared/types/reminders';
import { WindowManager, getWindowManager } from '../../window-manager';

// Maximum delay for setTimeout in 32-bit Node.js environment (~24.8 days)
const MAX_SAFE_TIMEOUT_MS = 2147483647;
const WATCHDOG_INTERVAL_MS = 30000; // 30 seconds

export class ReminderEngine {
  private remindersRepo: RemindersRepository;
  private eventsRepo: ReminderEventsRepository;
  private windowManager: WindowManager;
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  private watchdogTimer: NodeJS.Timeout | null = null;
  private recentlyTriggered: Map<string, number> = new Map(); // Debounce duplicate triggers

  constructor(
    remindersRepo?: RemindersRepository,
    eventsRepo?: ReminderEventsRepository,
    windowManager?: WindowManager
  ) {
    this.remindersRepo = remindersRepo ?? new RemindersRepository();
    this.eventsRepo = eventsRepo ?? new ReminderEventsRepository();
    this.windowManager = windowManager ?? getWindowManager();
  }

  public init(): void {
    console.log('[ReminderEngine] Initializing local reminder engine...');

    // 1. Startup recovery: detect missed reminders and reschedule
    this.performStartupRecovery();

    // 2. Start periodic watchdog (every 30s)
    this.startWatchdog();

    // 3. Register powerMonitor sleep/resume lifecycle
    if (powerMonitor) {
      powerMonitor.on('resume', () => {
        console.log('[ReminderEngine] System resumed from sleep. Performing recovery...');
        this.handleSystemResume();
      });

      powerMonitor.on('suspend', () => {
        console.log('[ReminderEngine] System entering sleep. Clearing active timers...');
        this.clearAllTimers();
      });
    }

    console.log('[ReminderEngine] Reminder engine initialized successfully.');
  }

  public shutdown(): void {
    console.log('[ReminderEngine] Shutting down reminder engine...');
    this.clearAllTimers();
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  /**
   * Startup recovery:
   * Inspects all enabled reminders. If any are overdue (missed while app was closed),
   * fires at most 1 catch-up notification, recalculates the next occurrence, and schedules future runs.
   */
  private performStartupRecovery(): void {
    const now = Date.now();
    const enabledReminders = this.remindersRepo.getEnabledReminders();

    console.log(`[ReminderEngine] Checking ${enabledReminders.length} enabled reminders on startup...`);

    for (const reminder of enabledReminders) {
      if (reminder.next_run_at <= now) {
        console.log(`[ReminderEngine] Found overdue reminder: "${reminder.title}" (ID: ${reminder.id})`);
        // Missed while app was closed -> trigger catch-up
        this.triggerReminder(reminder.id, true);
      } else {
        // Schedule future run
        this.scheduleReminder(reminder);
      }
    }
  }

  /**
   * System resume recovery:
   * Clears old in-memory timers, queries SQLite, applies missed reminder policy, and reschedules.
   */
  public handleSystemResume(): void {
    this.clearAllTimers();
    const now = Date.now();
    const enabledReminders = this.remindersRepo.getEnabledReminders();

    for (const reminder of enabledReminders) {
      if (reminder.next_run_at <= now) {
        // Overdue during sleep
        console.log(`[ReminderEngine] Overdue reminder after sleep: "${reminder.title}"`);
        this.triggerReminder(reminder.id, true);
      } else {
        this.scheduleReminder(reminder);
      }
    }
  }

  /**
   * Schedules a Node.js timeout for an active reminder.
   */
  private scheduleReminder(reminder: Reminder): void {
    // Clear any existing timer for this reminder
    if (this.activeTimers.has(reminder.id)) {
      clearTimeout(this.activeTimers.get(reminder.id)!);
      this.activeTimers.delete(reminder.id);
    }

    if (!reminder.enabled) {
      return;
    }

    const now = Date.now();
    const delay = reminder.next_run_at - now;

    if (delay <= 0) {
      // Due immediately
      this.triggerReminder(reminder.id);
      return;
    }

    // Bound the delay to MAX_SAFE_TIMEOUT_MS
    const boundedDelay = Math.min(delay, MAX_SAFE_TIMEOUT_MS);

    const timer = setTimeout(() => {
      this.activeTimers.delete(reminder.id);
      if (delay > MAX_SAFE_TIMEOUT_MS) {
        // Intermediate timeout for very distant reminders: re-evaluate
        const current = this.remindersRepo.getById(reminder.id);
        if (current && current.enabled) {
          this.scheduleReminder(current);
        }
      } else {
        this.triggerReminder(reminder.id);
      }
    }, boundedDelay);

    this.activeTimers.set(reminder.id, timer);
  }

  /**
   * Fires a reminder: creates desktop notification, pet event, logs history, and reschedules.
   */
  public triggerReminder(reminderId: string, isRecovery: boolean = false): void {
    const reminder = this.remindersRepo.getById(reminderId);
    if (!reminder || !reminder.enabled) {
      return;
    }

    // Debounce duplicate triggers within 2 seconds
    const lastTriggered = this.recentlyTriggered.get(reminderId);
    const now = Date.now();
    if (lastTriggered && now - lastTriggered < 2000) {
      return;
    }
    this.recentlyTriggered.set(reminderId, now);

    console.log(
      `[ReminderEngine] Triggering reminder: "${reminder.title}" (ID: ${reminder.id})${
        isRecovery ? ' [RECOVERY]' : ''
      }`
    );

    // 1. Native Desktop Notification (works even if dashboard is closed)
    this.showNativeNotification(reminder);

    // 2. Pet Window Reaction
    this.notifyPetWindow(reminder);

    // 3. Record History Event
    this.eventsRepo.recordFired(reminder.id, now);

    // 4. Handle Next Occurrence
    if (reminder.schedule_type === 'one_time') {
      // One-time reminder completes after firing
      this.remindersRepo.update(reminder.id, {
        enabled: false,
        last_run_at: now,
      });
      this.eventsRepo.recordCompleted(reminder.id, now);
      console.log(`[ReminderEngine] One-time reminder completed: "${reminder.title}"`);
    } else {
      // Recurring reminder: recalculate nextRunAt strictly in the future (> now)
      const nextRun = calculateRecoveryNextRun(reminder.schedule_type, reminder.schedule_data, now);
      this.remindersRepo.updateNextRun(reminder.id, nextRun, now);

      const updated = this.remindersRepo.getById(reminder.id);
      if (updated && updated.enabled) {
        this.scheduleReminder(updated);
      }
    }

    // 5. Notify Dashboard if open
    this.notifyDashboardWindow(reminder);
  }

  /**
   * Displays native Windows notification.
   */
  private showNativeNotification(reminder: Reminder): void {
    try {
      if (Notification.isSupported()) {
        const iconPath = app.isPackaged
          ? path.join(process.resourcesPath, 'assets/icons/tray.png')
          : path.join(__dirname, '../../../../assets/icons/tray.png');

        const notification = new Notification({
          title: 'ROA Reminder',
          body: reminder.description ? `${reminder.title}\n${reminder.description}` : reminder.title,
          icon: iconPath,
          silent: false,
        });

        notification.show();
      }
    } catch (err) {
      console.error('[ReminderEngine] Failed to show desktop notification:', err);
    }
  }

  /**
   * Sends reminder event to Pet window renderer.
   */
  private notifyPetWindow(reminder: Reminder): void {
    const petWin = this.windowManager.getPetWindow();
    if (petWin && !petWin.isDestroyed()) {
      petWin.webContents.send('roa:pet:reminderFired', reminder);
    }
  }

  /**
   * Notifies dashboard window of reminder trigger / update.
   */
  private notifyDashboardWindow(reminder: Reminder): void {
    const dashWin = this.windowManager.getDashboardWindow();
    if (dashWin && !dashWin.isDestroyed()) {
      dashWin.webContents.send('roa:reminders:triggered', reminder);
    }
  }

  /**
   * Lightweight Watchdog:
   * Periodically checks for any overdue reminders in SQLite (e.g. if a timer was delayed or missed).
   */
  private startWatchdog(): void {
    this.watchdogTimer = setInterval(() => {
      const now = Date.now();
      const overdue = this.remindersRepo.getOverdueReminders(now);
      if (overdue.length > 0) {
        console.log(`[ReminderEngine Watchdog] Detected ${overdue.length} overdue reminders.`);
        for (const reminder of overdue) {
          this.triggerReminder(reminder.id, true);
        }
      }
    }, WATCHDOG_INTERVAL_MS);
  }

  private clearAllTimers(): void {
    for (const timer of this.activeTimers.values()) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();
  }

  // --- Public CRUD & Actions ---

  public list(): Reminder[] {
    return this.remindersRepo.listAll();
  }

  public get(id: string): Reminder | null {
    return this.remindersRepo.getById(id);
  }

  public create(input: CreateReminderInput): Reminder {
    const parsedSchedule = parseScheduleData(input.schedule_type, input.schedule_data);
    const now = Date.now();
    const nextRun = calculateNextRun(input.schedule_type, parsedSchedule, now);

    const reminder: Reminder = {
      id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: input.title,
      description: input.description ?? null,
      schedule_type: input.schedule_type,
      schedule_data: parsedSchedule,
      timezone: input.timezone ?? 'local',
      enabled: input.enabled ?? true,
      next_run_at: nextRun,
      created_at: now,
      updated_at: now,
      metadata_json: input.metadata_json ?? null,
    };

    const created = this.remindersRepo.create(reminder);
    if (created.enabled) {
      this.scheduleReminder(created);
    }

    return created;
  }

  public update(id: string, input: UpdateReminderInput): Reminder {
    const existing = this.remindersRepo.getById(id);
    if (!existing) {
      throw new Error(`Reminder with ID "${id}" not found.`);
    }

    let scheduleType = existing.schedule_type;
    let scheduleData = existing.schedule_data;

    if (input.schedule_type) {
      scheduleType = input.schedule_type as ScheduleType;
    }

    if (input.schedule_data !== undefined) {
      scheduleData = parseScheduleData(scheduleType, input.schedule_data);
    }

    const updates: Partial<Reminder> = {
      title: input.title ?? existing.title,
      description: input.description !== undefined ? input.description : existing.description,
      schedule_type: scheduleType,
      schedule_data: scheduleData,
      timezone: input.timezone ?? existing.timezone,
      enabled: input.enabled !== undefined ? input.enabled : existing.enabled,
      metadata_json: input.metadata_json !== undefined ? input.metadata_json : existing.metadata_json,
    };

    // If schedule changed or re-enabled, recalculate next_run_at
    if (input.schedule_type || input.schedule_data !== undefined || (input.enabled && !existing.enabled)) {
      const now = Date.now();
      updates.next_run_at = calculateNextRun(scheduleType, scheduleData, now);
    }

    const updated = this.remindersRepo.update(id, updates);
    if (!updated) {
      throw new Error(`Failed to update reminder "${id}".`);
    }

    if (updated.enabled) {
      this.scheduleReminder(updated);
    } else {
      if (this.activeTimers.has(id)) {
        clearTimeout(this.activeTimers.get(id)!);
        this.activeTimers.delete(id);
      }
    }

    return updated;
  }

  public delete(id: string): void {
    if (this.activeTimers.has(id)) {
      clearTimeout(this.activeTimers.get(id)!);
      this.activeTimers.delete(id);
    }
    this.remindersRepo.delete(id);
  }

  public enable(id: string): void {
    const reminder = this.remindersRepo.getById(id);
    if (!reminder) return;

    const now = Date.now();
    let nextRun = reminder.next_run_at;
    if (nextRun <= now) {
      nextRun = calculateNextRun(reminder.schedule_type, reminder.schedule_data, now);
    }

    this.remindersRepo.update(id, { enabled: true, next_run_at: nextRun });
    const updated = this.remindersRepo.getById(id);
    if (updated) {
      this.scheduleReminder(updated);
    }
  }

  public disable(id: string): void {
    if (this.activeTimers.has(id)) {
      clearTimeout(this.activeTimers.get(id)!);
      this.activeTimers.delete(id);
    }
    this.remindersRepo.setEnabled(id, false);
  }

  public snooze(id: string, minutes: number): void {
    const reminder = this.remindersRepo.getById(id);
    if (!reminder) {
      throw new Error(`Reminder "${id}" not found.`);
    }

    const now = Date.now();
    const snoozedUntil = calculateSnooze(minutes, now);

    this.remindersRepo.update(id, {
      next_run_at: snoozedUntil,
    });

    this.eventsRepo.recordSnoozed(id, snoozedUntil, now);

    const updated = this.remindersRepo.getById(id);
    if (updated && updated.enabled) {
      this.scheduleReminder(updated);
    }
    console.log(`[ReminderEngine] Snoozed reminder "${reminder.title}" for ${minutes} minutes.`);
  }

  public getHistory(reminderId: string, limit: number = 50) {
    return this.eventsRepo.getHistory(reminderId, limit);
  }
}

let engineInstance: ReminderEngine | null = null;

export function getReminderEngine(
  remindersRepo?: RemindersRepository,
  eventsRepo?: ReminderEventsRepository,
  windowManager?: WindowManager
): ReminderEngine {
  if (!engineInstance || remindersRepo) {
    engineInstance = new ReminderEngine(remindersRepo, eventsRepo, windowManager);
  }
  return engineInstance;
}
