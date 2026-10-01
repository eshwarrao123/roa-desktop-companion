import React, { useEffect, useState } from 'react';
import { Timer, PomodoroState } from '@shared/types/timers';
import { SectionLabel } from '../ui/SectionLabel';

interface FocusSummaryProps {
  onNavigateToFocus: () => void;
}

export const FocusSummary: React.FC<FocusSummaryProps> = ({ onNavigateToFocus }) => {
  const [activeTimer, setActiveTimer] = useState<Timer | null>(null);
  const [pomodoroState, setPomodoroState] = useState<PomodoroState | null>(null);
  const [displaySeconds, setDisplaySeconds] = useState<number>(0);

  useEffect(() => {
    if (window.roa?.timers && window.roa?.pomodoro) {
      window.roa.timers.getActive().then((timer) => {
        setActiveTimer(timer);
        updateDisplayTime(timer);
      }).catch(console.error);

      window.roa.pomodoro.getState().then(setPomodoroState).catch(console.error);

      const unsubTimer = window.roa.timers.onStateChanged((timer) => {
        setActiveTimer(timer);
        updateDisplayTime(timer);
      });

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

  return (
    <div className="space-y-3">
      <SectionLabel>FOCUS</SectionLabel>
      
      <div className="h-px bg-roa-border" />

      {activeTimer ? (
        <div className="py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-roa-text-secondary">{activeTimer.label}</p>
              <p className="text-xs text-roa-text-muted mt-0.5 capitalize">
                {activeTimer.type === 'pomodoro' ? `${activeTimer.pomodoro_phase}` : 'Timer'} · {activeTimer.state}
              </p>
            </div>
            <p className="font-mono text-2xl font-medium text-roa-text-primary tracking-tight tabular-nums">
              {formatTime(displaySeconds)}
            </p>
          </div>

          <button
            onClick={onNavigateToFocus}
            className="text-secondary text-roa-sage hover:text-roa-sage-hover transition-colors"
          >
            View Focus →
          </button>
        </div>
      ) : (
        <div className="py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-roa-text-secondary">Ready to focus</p>
            <button
              onClick={onNavigateToFocus}
              className="text-secondary text-roa-sage hover:text-roa-sage-hover transition-colors"
            >
              Start Focus →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
