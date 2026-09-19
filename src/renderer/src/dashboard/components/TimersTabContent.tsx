import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  X,
  Flame,
  Coffee,
  Sparkles,
  Clock,
  Plus,
  FastForward,
} from 'lucide-react';
import { Timer, PomodoroState, PomodoroPhase } from '@shared/types/timers';

export const TimersTabContent: React.FC = () => {
  const [activeTimer, setActiveTimer] = useState<Timer | null>(null);
  const [pomodoroState, setPomodoroState] = useState<PomodoroState | null>(null);
  const [displaySeconds, setDisplaySeconds] = useState<number>(0);

  // Custom timer form state
  const [customLabel, setCustomLabel] = useState('');
  const [customMinutes, setCustomMinutes] = useState('25');

  // 1. Initial data fetch
  useEffect(() => {
    if (window.roa?.timers && window.roa?.pomodoro) {
      window.roa.timers.getActive().then((timer) => {
        setActiveTimer(timer);
        updateDisplayTime(timer);
      }).catch(console.error);

      window.roa.pomodoro.getState().then(setPomodoroState).catch(console.error);

      // Listen for timer updates
      const unsubTimer = window.roa.timers.onStateChanged((timer) => {
        setActiveTimer(timer);
        updateDisplayTime(timer);
      });

      // Listen for pomodoro updates
      const unsubPomodoro = window.roa.pomodoro.onStateChanged((state) => {
        setPomodoroState(state);
        if (state.activeTimer) {
          setActiveTimer(state.activeTimer);
          updateDisplayTime(state.activeTimer);
        }
      });

      return () => {
        unsubTimer();
        unsubPomodoro();
      };
    }
    return undefined;
  }, []);

  // 2. Local countdown ticker (runs every 1s when a timer is 'running')
  useEffect(() => {
    if (!activeTimer || activeTimer.state !== 'running' || !activeTimer.ends_at) {
      return;
    }

    const interval = setInterval(() => {
      const remainingMs = Math.max(0, activeTimer.ends_at! - Date.now());
      setDisplaySeconds(Math.ceil(remainingMs / 1000));

      if (remainingMs <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  const updateDisplayTime = (timer: Timer | null) => {
    if (!timer) {
      setDisplaySeconds(0);
      return;
    }
    if (timer.state === 'running' && timer.ends_at) {
      const remainingMs = Math.max(0, timer.ends_at - Date.now());
      setDisplaySeconds(Math.ceil(remainingMs / 1000));
    } else {
      setDisplaySeconds(Math.ceil(timer.remaining_ms / 1000));
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Timer controls
  const handleStartPreset = (label: string, minutes: number) => {
    window.roa?.timers?.create({
      label,
      duration_ms: minutes * 60 * 1000,
      type: 'countdown',
    }).then((created) => {
      return window.roa.timers.start(created.id);
    }).then((started) => {
      setActiveTimer(started);
      updateDisplayTime(started);
    }).catch(console.error);
  };

  const handleStartCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(customMinutes, 10);
    if (isNaN(mins) || mins <= 0) return;

    const label = customLabel.trim() || `Timer (${mins}m)`;
    handleStartPreset(label, mins);
    setCustomLabel('');
  };

  const handlePause = () => {
    if (!activeTimer) return;
    window.roa?.timers?.pause(activeTimer.id).then((paused) => {
      setActiveTimer(paused);
      updateDisplayTime(paused);
    }).catch(console.error);
  };

  const handleResume = () => {
    if (!activeTimer) return;
    window.roa?.timers?.resume(activeTimer.id).then((resumed) => {
      setActiveTimer(resumed);
      updateDisplayTime(resumed);
    }).catch(console.error);
  };

  const handleReset = () => {
    if (!activeTimer) return;
    window.roa?.timers?.reset(activeTimer.id).then((reset) => {
      setActiveTimer(reset);
      updateDisplayTime(reset);
    }).catch(console.error);
  };

  const handleCancel = () => {
    if (!activeTimer) return;
    window.roa?.timers?.cancel(activeTimer.id).then(() => {
      setActiveTimer(null);
      setDisplaySeconds(0);
    }).catch(console.error);
  };

  // Pomodoro controls
  const handleStartPomodoro = (phase?: PomodoroPhase) => {
    window.roa?.pomodoro?.start(phase).then((state) => {
      setPomodoroState(state);
      if (state.activeTimer) {
        setActiveTimer(state.activeTimer);
        updateDisplayTime(state.activeTimer);
      }
    }).catch(console.error);
  };

  const handleSkipPomodoro = () => {
    window.roa?.pomodoro?.skip().then((state) => {
      setPomodoroState(state);
      if (state.activeTimer) {
        setActiveTimer(state.activeTimer);
        updateDisplayTime(state.activeTimer);
      }
    }).catch(console.error);
  };

  // Progress percentage
  const totalDurationSeconds = activeTimer ? Math.round(activeTimer.duration_ms / 1000) : 1;
  const progressPercent = activeTimer
    ? Math.min(100, Math.max(0, ((totalDurationSeconds - displaySeconds) / totalDurationSeconds) * 100))
    : 0;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Timers & Focus</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Boost your productivity with offline countdown timers and Pomodoro focus sessions.
        </p>
      </div>

      {/* Hero: Active Countdown Display Card */}
      <div className="bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {activeTimer ? activeTimer.label : 'No Active Timer'}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {activeTimer?.type === 'pomodoro' ? `Pomodoro • ${activeTimer.pomodoro_phase}` : 'Countdown Timer'}
              </p>
            </div>
          </div>

          {activeTimer && (
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${
                activeTimer.state === 'running'
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                  : activeTimer.state === 'paused'
                  ? 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              {activeTimer.state}
            </span>
          )}
        </div>

        {/* Big Countdown Digits */}
        <div className="flex flex-col items-center justify-center py-4">
          <span className="font-mono text-6xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {formatTime(displaySeconds)}
          </span>

          {/* Progress Bar */}
          <div className="w-full max-w-md h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Active Timer Controls */}
        <div className="flex items-center justify-center gap-3 pt-2">
          {activeTimer?.state === 'running' ? (
            <button
              onClick={handlePause}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
          ) : activeTimer?.state === 'paused' ? (
            <button
              onClick={handleResume}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Play className="w-4 h-4" />
              Resume
            </button>
          ) : null}

          {activeTimer && (
            <>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-100 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>

              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pomodoro Mode Section */}
      <div className="bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Pomodoro Technique</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                25m Focus • 5m Short Break • 15m Long Break (after 4 cycles)
              </p>
            </div>
          </div>

          {/* Completed Cycles Tracker */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-zinc-500 mr-1">
              Cycle {((pomodoroState?.completedCycles ?? 0) % 4) + 1}/4
            </span>
            {[0, 1, 2, 3].map((idx) => {
              const currentInFour = (pomodoroState?.completedCycles ?? 0) % 4;
              const isFilled = idx < currentInFour;
              return (
                <div
                  key={idx}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    isFilled
                      ? 'bg-rose-500'
                      : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                />
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            onClick={() => handleStartPomodoro('focus')}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-50 text-rose-700 dark:text-rose-300 text-xs font-medium transition-all"
          >
            <Flame className="w-4 h-4 text-rose-500" />
            Start Focus (25m)
          </button>

          <button
            onClick={() => handleStartPomodoro('short_break')}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 text-emerald-700 dark:text-emerald-300 text-xs font-medium transition-all"
          >
            <Coffee className="w-4 h-4 text-emerald-500" />
            Short Break (5m)
          </button>

          <button
            onClick={() => handleStartPomodoro('long_break')}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-teal-200 dark:border-teal-900 bg-teal-50/50 dark:bg-teal-950/20 hover:bg-teal-50 text-teal-700 dark:text-teal-300 text-xs font-medium transition-all"
          >
            <Sparkles className="w-4 h-4 text-teal-500" />
            Long Break (15m)
          </button>
        </div>

        {pomodoroState?.activeTimer && (
          <div className="flex justify-end pt-1">
            <button
              onClick={handleSkipPomodoro}
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 font-medium transition-colors"
            >
              <FastForward className="w-3.5 h-3.5" />
              Skip to Next Phase
            </button>
          </div>
        )}
      </div>

      {/* Quick Presets & Custom Timer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Presets */}
        <div className="bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] rounded-2xl p-5 shadow-sm space-y-3">
          <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
            Quick Presets
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleStartPreset('Quick Focus', 15)}
              className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors text-left"
            >
              <span className="block font-semibold">15 Minutes</span>
              <span className="text-[11px] text-zinc-400">Quick Sprint</span>
            </button>

            <button
              onClick={() => handleStartPreset('Standard Focus', 25)}
              className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors text-left"
            >
              <span className="block font-semibold">25 Minutes</span>
              <span className="text-[11px] text-zinc-400">Standard Block</span>
            </button>

            <button
              onClick={() => handleStartPreset('Deep Work', 45)}
              className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors text-left"
            >
              <span className="block font-semibold">45 Minutes</span>
              <span className="text-[11px] text-zinc-400">Deep Work</span>
            </button>

            <button
              onClick={() => handleStartPreset('Long Session', 60)}
              className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors text-left"
            >
              <span className="block font-semibold">60 Minutes</span>
              <span className="text-[11px] text-zinc-400">Study Session</span>
            </button>
          </div>
        </div>

        {/* Custom Timer */}
        <div className="bg-white dark:bg-[#252542] border border-zinc-200 dark:border-[#3D3D6B] rounded-2xl p-5 shadow-sm space-y-3">
          <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
            Custom Timer
          </h4>
          <form onSubmit={handleStartCustom} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1">
                Label / Task
              </label>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g. Code Review, Reading"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="360"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Start Custom Timer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
