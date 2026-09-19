import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolRegistry, ToolContext } from '../../src/main/services/ai/tools/registry';
import { registerDefaultTools } from '../../src/main/services/ai/tools/implementations';

describe('ToolRegistry & Implementations', () => {
  let registry: ToolRegistry;
  let mockContext: ToolContext;

  beforeEach(() => {
    registry = new ToolRegistry();
    registerDefaultTools(registry);

    mockContext = {
      reminderEngine: {
        create: vi.fn().mockReturnValue({
          id: 'rem-123',
          title: 'Drink water',
          next_run_at: Date.now() + 1800000,
        }),
        list: vi.fn().mockReturnValue([
          { id: 'rem-1', title: 'Task 1', enabled: true, schedule_type: 'one_time', next_run_at: Date.now() },
          { id: 'rem-2', title: 'Task 2', enabled: false, schedule_type: 'interval', next_run_at: Date.now() },
        ]),
        update: vi.fn().mockReturnValue({ id: 'rem-1', title: 'Updated' }),
        delete: vi.fn(),
        snooze: vi.fn(),
      } as any,
      timerEngine: {
        createTimer: vi.fn().mockReturnValue({ id: 'timer-1', label: 'Study' }),
        startTimer: vi.fn().mockReturnValue({
          id: 'timer-1',
          label: 'Study',
          ends_at: Date.now() + 1500000,
        }),
        pauseTimer: vi.fn().mockReturnValue({ id: 'timer-1', label: 'Study' }),
        cancelTimer: vi.fn(),
        getActiveTimer: vi.fn().mockReturnValue({ id: 'timer-1', label: 'Study', state: 'running', remaining_ms: 1500000 }),
        getPomodoroState: vi.fn().mockReturnValue({ isRunning: false, phase: 'focus', cycle: 0, remainingMs: 1500000 }),
        startPomodoro: vi.fn().mockReturnValue({ isRunning: true, phase: 'focus', cycle: 0, remainingMs: 1500000 }),
        pausePomodoro: vi.fn(),
        resetPomodoro: vi.fn(),
      } as any,
      systemService: {
        getBatteryStatus: vi.fn().mockResolvedValue({
          hasBattery: true,
          percent: 85,
          isOnBattery: false,
          chargingState: 'charging',
        }),
      } as any,
      settingsStore: {
        get: vi.fn().mockReturnValue('idle'),
      } as any,
      characterRegistry: {
        getActive: vi.fn().mockReturnValue({ name: 'Poyo', personality: { traits: ['cheerful'] } }),
      } as any,
    };
  });

  it('registers all 10 safe application tools', () => {
    const tools = registry.getAll();
    expect(tools.length).toBe(10);

    const names = tools.map((t) => t.name);
    expect(names).toContain('create_reminder');
    expect(names).toContain('list_reminders');
    expect(names).toContain('update_reminder');
    expect(names).toContain('delete_reminder');
    expect(names).toContain('snooze_reminder');
    expect(names).toContain('start_timer');
    expect(names).toContain('stop_timer');
    expect(names).toContain('get_current_time');
    expect(names).toContain('get_battery_status');
    expect(names).toContain('get_today_summary');
  });

  it('rejects tools not in the allowlist', async () => {
    const res = await registry.execute('arbitrary_bash_command', {}, mockContext);
    expect(res.success).toBe(false);
    expect(res.error).toContain('not in the allowlist');
  });

  it('validates tool arguments with Zod before execution', async () => {
    // Missing required fields
    const res = await registry.execute('create_reminder', { title: '' }, mockContext);
    expect(res.success).toBe(false);
    expect(res.error).toContain('validation failed');
  });

  it('executes create_reminder with valid arguments', async () => {
    const res = await registry.execute(
      'create_reminder',
      {
        title: 'Drink water',
        schedule_type: 'interval',
        schedule_data: '30m',
      },
      mockContext
    );

    expect(res.success).toBe(true);
    expect(mockContext.reminderEngine.create).toHaveBeenCalledWith({
      title: 'Drink water',
      schedule_type: 'interval',
      schedule_data: '30m',
      description: undefined,
      enabled: true,
      timezone: 'local',
    });
  });

  it('executes start_timer for countdown and pomodoro', async () => {
    // Countdown
    const countdownRes = await registry.execute(
      'start_timer',
      { label: 'Study', duration_minutes: 25 },
      mockContext
    );
    expect(countdownRes.success).toBe(true);
    expect(mockContext.timerEngine.createTimer).toHaveBeenCalled();

    // Pomodoro
    const pomodoroRes = await registry.execute(
      'start_timer',
      { label: 'Pomodoro', is_pomodoro: true },
      mockContext
    );
    expect(pomodoroRes.success).toBe(true);
    expect(mockContext.timerEngine.startPomodoro).toHaveBeenCalledWith('focus');
  });

  it('executes get_current_time and get_battery_status safely', async () => {
    const timeRes = await registry.execute('get_current_time', {}, mockContext);
    expect(timeRes.success).toBe(true);
    expect((timeRes.result as any).iso).toBeDefined();

    const batRes = await registry.execute('get_battery_status', {}, mockContext);
    expect(batRes.success).toBe(true);
    expect((batRes.result as any).battery_percentage).toBe(85);
  });
});
