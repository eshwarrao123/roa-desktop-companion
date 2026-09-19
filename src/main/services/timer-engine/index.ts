import { Notification, powerMonitor, app } from 'electron';
import { randomUUID } from 'crypto';
import path from 'path';
import { TimersRepository } from './timers.repository';
import {
  Timer,
  TimerType,
  PomodoroPhase,
  PomodoroState,
  CreateTimerInput,
} from '@shared/types/timers';
import { WindowManager, getWindowManager } from '../../window-manager';
import { SettingsStore, getSettingsStore } from '../settings-store';

const WATCHDOG_INTERVAL_MS = 15000; // 15 seconds

export class TimerEngine {
  private repo: TimersRepository;
  private windowManager: WindowManager;
  private settingsStore: SettingsStore;
  private activeTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private watchdogTimer: NodeJS.Timeout | null = null;
  private pomodoroCompletedCycles = 0;

  constructor(
    repo?: TimersRepository,
    windowManager?: WindowManager,
    settingsStore?: SettingsStore
  ) {
    this.repo = repo ?? new TimersRepository();
    this.windowManager = windowManager ?? getWindowManager();
    this.settingsStore = settingsStore ?? getSettingsStore();
  }

  public init(): void {
    console.log('[TimerEngine] Initializing local timer engine...');

    // 1. Startup recovery: Check for any running timers that elapsed while app was closed
    this.performStartupRecovery();

    // 2. Start watchdog
    this.startWatchdog();

    // 3. Register powerMonitor sleep/resume hooks
    if (powerMonitor) {
      powerMonitor.on('resume', () => {
        console.log('[TimerEngine] System resumed. Performing timer recovery...');
        this.handleSystemResume();
      });

      powerMonitor.on('suspend', () => {
        console.log('[TimerEngine] System suspending. Clearing active timeouts...');
        this.clearAllTimeouts();
      });
    }

    console.log('[TimerEngine] Timer engine initialized.');
  }

  public shutdown(): void {
    console.log('[TimerEngine] Shutting down timer engine...');
    this.clearAllTimeouts();
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  // ==========================================
  // COUNTDOWN TIMERS
  // ==========================================

  public createTimer(input: CreateTimerInput): Timer {
    const now = Date.now();
    const timer: Timer = {
      id: randomUUID(),
      label: input.label,
      type: input.type,
      duration_ms: input.duration_ms,
      started_at: null,
      ends_at: null,
      remaining_ms: input.duration_ms,
      state: 'idle',
      created_at: now,
      updated_at: now,
    };

    this.repo.create(timer);
    return timer;
  }

  public startTimer(id: string): Timer {
    const timer = this.repo.get(id);
    if (!timer) throw new Error(`Timer ${id} not found.`);

    const now = Date.now();
    const endsAt = now + timer.remaining_ms;

    this.repo.update(id, {
      state: 'running',
      started_at: timer.started_at ?? now,
      ends_at: endsAt,
    });

    const updated = this.repo.get(id)!;
    this.scheduleTimeout(updated);
    this.broadcastTimerUpdate(updated);

    // Broadcast pet reaction
    this.broadcastPetTimerEvent('timerStarted', updated.label, `Countdown timer started: ${updated.label}`);

    return updated;
  }

  public pauseTimer(id: string): Timer {
    const timer = this.repo.get(id);
    if (!timer) throw new Error(`Timer ${id} not found.`);
    if (timer.state !== 'running') return timer;

    this.clearTimeout(id);
    const now = Date.now();
    const remaining = timer.ends_at ? Math.max(0, timer.ends_at - now) : timer.remaining_ms;

    this.repo.update(id, {
      state: 'paused',
      remaining_ms: remaining,
      ends_at: null,
    });

    const updated = this.repo.get(id)!;
    this.broadcastTimerUpdate(updated);
    return updated;
  }

  public resumeTimer(id: string): Timer {
    return this.startTimer(id);
  }

  public resetTimer(id: string): Timer {
    const timer = this.repo.get(id);
    if (!timer) throw new Error(`Timer ${id} not found.`);

    this.clearTimeout(id);
    this.repo.update(id, {
      state: 'idle',
      started_at: null,
      ends_at: null,
      remaining_ms: timer.duration_ms,
    });

    const updated = this.repo.get(id)!;
    this.broadcastTimerUpdate(updated);
    return updated;
  }

  public cancelTimer(id: string): void {
    const timer = this.repo.get(id);
    if (!timer) return;

    this.clearTimeout(id);
    this.repo.update(id, {
      state: 'cancelled',
      ends_at: null,
    });

    const updated = this.repo.get(id)!;
    this.broadcastTimerUpdate(updated);
  }

  public getTimer(id: string): Timer | null {
    return this.repo.get(id);
  }

  public listTimers(limit = 50): Timer[] {
    return this.repo.list(limit);
  }

  public getActiveTimer(): Timer | null {
    return this.repo.getActive();
  }

  // ==========================================
  // POMODORO ENGINE
  // ==========================================

  public getPomodoroState(): PomodoroState {
    const active = this.repo.getActive('pomodoro');
    const focusMin = this.settingsStore.get('pomodoro.focusDurationMinutes');
    const shortBreakMin = this.settingsStore.get('pomodoro.shortBreakMinutes');
    const longBreakMin = this.settingsStore.get('pomodoro.longBreakMinutes');
    const longBreakInterval = this.settingsStore.get('pomodoro.longBreakInterval');

    const phase: PomodoroPhase = active?.pomodoro_phase ?? 'focus';
    const completedCycles = active?.pomodoro_cycle ?? this.pomodoroCompletedCycles;

    return {
      activeTimer: active,
      phase,
      completedCycles,
      focusDurationMinutes: focusMin,
      shortBreakMinutes: shortBreakMin,
      longBreakMinutes: longBreakMin,
      longBreakInterval,
    };
  }

  public startPomodoro(requestedPhase?: PomodoroPhase): PomodoroState {
    // Cancel any existing active pomodoro timer
    const existing = this.repo.getActive('pomodoro');
    if (existing) {
      this.cancelTimer(existing.id);
    }

    const state = this.getPomodoroState();
    const phase = requestedPhase ?? state.phase;
    let durationMs: number;
    let label: string;

    if (phase === 'focus') {
      durationMs = state.focusDurationMinutes * 60 * 1000;
      label = 'Pomodoro Focus';
    } else if (phase === 'short_break') {
      durationMs = state.shortBreakMinutes * 60 * 1000;
      label = 'Short Break';
    } else {
      durationMs = state.longBreakMinutes * 60 * 1000;
      label = 'Long Break';
    }

    const now = Date.now();
    const timer: Timer = {
      id: randomUUID(),
      label,
      type: 'pomodoro',
      duration_ms: durationMs,
      started_at: now,
      ends_at: now + durationMs,
      remaining_ms: durationMs,
      state: 'running',
      pomodoro_phase: phase,
      pomodoro_cycle: state.completedCycles,
      created_at: now,
      updated_at: now,
    };

    this.repo.create(timer);
    this.scheduleTimeout(timer);
    this.broadcastTimerUpdate(timer);

    // Pet reaction based on phase
    if (phase === 'focus') {
      this.broadcastPetTimerEvent('focusStarted', 'Focus Time', 'Pomodoro focus session started! Stay sharp 🎯');
    } else {
      this.broadcastPetTimerEvent('breakStarted', 'Break Time', 'Time to take a relaxing break 🌱');
    }

    const updatedState = this.getPomodoroState();
    this.broadcastPomodoroUpdate(updatedState);
    return updatedState;
  }

  public pausePomodoro(): PomodoroState {
    const active = this.repo.getActive('pomodoro');
    if (active && active.state === 'running') {
      this.pauseTimer(active.id);
    }
    const state = this.getPomodoroState();
    this.broadcastPomodoroUpdate(state);
    return state;
  }

  public resumePomodoro(): PomodoroState {
    const active = this.repo.getActive('pomodoro');
    if (active && active.state === 'paused') {
      this.resumeTimer(active.id);
    }
    const state = this.getPomodoroState();
    this.broadcastPomodoroUpdate(state);
    return state;
  }

  public resetPomodoro(): PomodoroState {
    const active = this.repo.getActive('pomodoro');
    if (active) {
      this.resetTimer(active.id);
    }
    const state = this.getPomodoroState();
    this.broadcastPomodoroUpdate(state);
    return state;
  }

  public skipPomodoro(): PomodoroState {
    const state = this.getPomodoroState();
    if (state.activeTimer) {
      this.cancelTimer(state.activeTimer.id);
    }

    // Advance to next logical phase
    let nextPhase: PomodoroPhase;
    let cycles = state.completedCycles;

    if (state.phase === 'focus') {
      cycles += 1;
      this.pomodoroCompletedCycles = cycles;
      nextPhase = cycles % state.longBreakInterval === 0 ? 'long_break' : 'short_break';
    } else {
      nextPhase = 'focus';
    }

    return this.startPomodoro(nextPhase);
  }

  // ==========================================
  // TIMEOUT & RECOVERY LOGIC
  // ==========================================

  private scheduleTimeout(timer: Timer): void {
    this.clearTimeout(timer.id);
    if (!timer.ends_at) return;

    const delay = Math.max(0, timer.ends_at - Date.now());
    const timeout = setTimeout(() => {
      this.completeTimer(timer.id);
    }, delay);

    this.activeTimeouts.set(timer.id, timeout);
  }

  private clearTimeout(id: string): void {
    if (this.activeTimeouts.has(id)) {
      clearTimeout(this.activeTimeouts.get(id)!);
      this.activeTimeouts.delete(id);
    }
  }

  private clearAllTimeouts(): void {
    for (const timeout of this.activeTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.activeTimeouts.clear();
  }

  private completeTimer(id: string): void {
    this.clearTimeout(id);
    const timer = this.repo.get(id);
    if (!timer || timer.state !== 'running') return;

    console.log(`[TimerEngine] Timer completed: "${timer.label}" (${timer.id})`);

    this.repo.update(id, {
      state: 'completed',
      remaining_ms: 0,
      ends_at: Date.now(),
    });

    const completed = this.repo.get(id)!;
    this.broadcastTimerUpdate(completed);

    // 1. Deliver native Windows notification
    this.showNativeNotification(completed);

    // 2. Trigger pet reaction and Pomodoro progression
    if (completed.type === 'pomodoro') {
      this.handlePomodoroCompletion(completed);
    } else {
      this.broadcastPetTimerEvent('timerCompleted', completed.label, `Timer complete: ${completed.label}! 🎉`);
    }
  }

  private handlePomodoroCompletion(timer: Timer): void {
    const focusMin = this.settingsStore.get('pomodoro.focusDurationMinutes');
    const shortBreakMin = this.settingsStore.get('pomodoro.shortBreakMinutes');
    const longBreakMin = this.settingsStore.get('pomodoro.longBreakMinutes');
    const interval = this.settingsStore.get('pomodoro.longBreakInterval');

    let nextPhase: PomodoroPhase;
    let cycles = timer.pomodoro_cycle ?? this.pomodoroCompletedCycles;

    if (timer.pomodoro_phase === 'focus') {
      cycles += 1;
      this.pomodoroCompletedCycles = cycles;
      nextPhase = cycles % interval === 0 ? 'long_break' : 'short_break';
      this.broadcastPetTimerEvent('focusCompleted', 'Focus Session Complete!', 'Awesome focus work! Time for a well-deserved break 🌟');
    } else {
      nextPhase = 'focus';
      this.broadcastPetTimerEvent('breakStarted', 'Break Ended', 'Break finished! Ready to begin your next focus session? 🎯');
    }

    const updatedState: PomodoroState = {
      activeTimer: null,
      phase: nextPhase,
      completedCycles: cycles,
      focusDurationMinutes: focusMin,
      shortBreakMinutes: shortBreakMin,
      longBreakMinutes: longBreakMin,
      longBreakInterval: interval,
    };

    this.broadcastPomodoroUpdate(updatedState);
  }

  private showNativeNotification(timer: Timer): void {
    if (!Notification.isSupported()) return;

    let title = 'ROA Timer';
    let body = `${timer.label} has finished!`;

    if (timer.type === 'pomodoro') {
      if (timer.pomodoro_phase === 'focus') {
        title = 'Focus Session Complete! 🍅';
        body = 'Great work! Take a break.';
      } else {
        title = 'Break Ended! ☕';
        body = 'Ready to focus again?';
      }
    }

    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, 'assets', 'icons', 'tray.png')
      : path.join(process.cwd(), 'assets', 'icons', 'tray.png');

    const notification = new Notification({
      title,
      body,
      icon: iconPath,
      silent: false,
    });

    notification.on('click', () => {
      this.windowManager.showDashboard();
    });

    notification.show();
  }

  private performStartupRecovery(): void {
    const now = Date.now();
    const running = this.repo.getRunningTimers();

    for (const timer of running) {
      if (timer.ends_at && timer.ends_at <= now) {
        console.log(`[TimerEngine] Completing timer that elapsed while closed: "${timer.label}"`);
        this.completeTimer(timer.id);
      } else if (timer.ends_at) {
        this.scheduleTimeout(timer);
      }
    }
  }

  private handleSystemResume(): void {
    this.clearAllTimeouts();
    const now = Date.now();
    const running = this.repo.getRunningTimers();

    for (const timer of running) {
      if (timer.ends_at && timer.ends_at <= now) {
        console.log(`[TimerEngine] Completing timer that elapsed during sleep: "${timer.label}"`);
        this.completeTimer(timer.id);
      } else if (timer.ends_at) {
        this.scheduleTimeout(timer);
      }
    }
  }

  private startWatchdog(): void {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);

    this.watchdogTimer = setInterval(() => {
      const now = Date.now();
      const running = this.repo.getRunningTimers();

      for (const timer of running) {
        if (timer.ends_at && timer.ends_at <= now) {
          console.log(`[TimerEngine] Watchdog completing overdue timer: "${timer.label}"`);
          this.completeTimer(timer.id);
        }
      }
    }, WATCHDOG_INTERVAL_MS);
  }

  // ==========================================
  // EVENT BROADCASTING
  // ==========================================

  private broadcastTimerUpdate(timer: Timer): void {
    const dashWin = this.windowManager.getDashboardWindow();
    if (dashWin && !dashWin.isDestroyed()) {
      dashWin.webContents.send('roa:timers:stateChanged', timer);
    }
  }

  private broadcastPomodoroUpdate(state: PomodoroState): void {
    const dashWin = this.windowManager.getDashboardWindow();
    if (dashWin && !dashWin.isDestroyed()) {
      dashWin.webContents.send('roa:pomodoro:stateChanged', state);
    }
  }

  private broadcastPetTimerEvent(type: string, title: string, message: string): void {
    const petWin = this.windowManager.getPetWindow();
    if (petWin && !petWin.isDestroyed()) {
      petWin.webContents.send('roa:pet:timerEvent', { type, title, message });
    }
  }
}

let timerEngineInstance: TimerEngine | null = null;

export function getTimerEngine(
  repo?: TimersRepository,
  windowManager?: WindowManager,
  settingsStore?: SettingsStore
): TimerEngine {
  if (!timerEngineInstance || repo || windowManager || settingsStore) {
    timerEngineInstance = new TimerEngine(repo, windowManager, settingsStore);
  }
  return timerEngineInstance;
}
