import React, { useState, useEffect } from 'react';
import { Timer, PomodoroState, PomodoroPhase } from '@shared/types/timers';
import { TimerDisplay } from './TimerDisplay';
import { FocusControls } from './FocusControls';
import { BreakControls } from './BreakControls';
import { PomodoroCycle } from './PomodoroCycle';
import { QuickPresets } from './QuickPresets';
import { CustomTimer } from './CustomTimer';

export const FocusTabContent: React.FC = () => {
  const [activeTimer, setActiveTimer] = useState<Timer | null>(null);
  const [pomodoroState, setPomodoroState] = useState<PomodoroState | null>(null);
  const [displaySeconds, setDisplaySeconds] = useState<number>(0);

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

  return (
    <div className="w-full max-w-[840px] mx-auto pt-roa-margin px-roa-gutter space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-page-title text-roa-text-primary">Focus</h1>
        <p className="text-secondary text-roa-text-secondary mt-1">
          Stay focused with timers and Pomodoro sessions
        </p>
      </div>

      {/* Breathing space before timer */}
      <div className="h-8" />

      {/* Timer Display - Visual Anchor */}
      <TimerDisplay timer={activeTimer} displaySeconds={displaySeconds} />

      {/* Primary Focus Controls */}
      <FocusControls
        timer={activeTimer}
        onPause={handlePause}
        onResume={handleResume}
        onReset={handleReset}
        onCancel={handleCancel}
        onStartFocus={() => handleStartPomodoro('focus')}
      />

      {/* Break Controls */}
      <BreakControls
        onStartShortBreak={() => handleStartPomodoro('short_break')}
        onStartLongBreak={() => handleStartPomodoro('long_break')}
      />

      {/* Pomodoro Cycle */}
      <PomodoroCycle pomodoroState={pomodoroState} />

      {/* Divider */}
      <div className="border-t border-roa-border my-9" />

      {/* Quick Presets */}
      <QuickPresets onSelectPreset={handleStartPreset} />

      {/* Custom Timer */}
      <CustomTimer onStart={handleStartPreset} />
    </div>
  );
};
