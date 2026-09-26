import React, { useEffect, useState } from 'react';
import { Timer, PomodoroState } from '@shared/types/timers';
import { Clock, Flame, PlayCircle } from 'lucide-react';

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

  const completedToday = pomodoroState?.completedCycles ?? 0;
  const currentCycle = (completedToday % 4) + 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-roa-text-primary">Focus</h2>
        <button
          onClick={onNavigateToFocus}
          className="text-xs text-roa-primary-sage hover:text-roa-dark-sage font-medium transition-colors"
        >
          View Focus →
        </button>
      </div>

      {activeTimer ? (
        <div className="bg-roa-surface border border-roa-divider rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeTimer.type === 'pomodoro' ? (
                <div className="w-10 h-10 rounded-lg bg-roa-surface-tint flex items-center justify-center">
                  <Flame className="w-5 h-5 text-roa-primary-sage" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-roa-surface-tint flex items-center justify-center">
                  <Clock className="w-5 h-5 text-roa-primary-sage" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-roa-text-primary">{activeTimer.label}</p>
                <p className="text-xs text-roa-text-muted capitalize">
                  {activeTimer.type === 'pomodoro' ? `${activeTimer.pomodoro_phase}` : 'Timer'} · {activeTimer.state}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="font-mono text-2xl font-bold text-roa-text-primary tracking-tight">
                {formatTime(displaySeconds)}
              </p>
              {activeTimer.type === 'pomodoro' && (
                <p className="text-xs text-roa-text-muted mt-0.5">
                  Cycle {currentCycle}/4
                </p>
              )}
            </div>
          </div>

          {activeTimer.type === 'pomodoro' && (
            <div className="flex items-center gap-1.5 pt-1">
              {[0, 1, 2, 3].map((idx) => {
                const currentInFour = completedToday % 4;
                const isFilled = idx < currentInFour;
                return (
                  <div
                    key={idx}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      isFilled ? 'bg-roa-primary-sage' : 'bg-roa-divider'
                    }`}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-roa-surface border border-roa-divider rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-roa-surface-tint flex items-center justify-center">
              <PlayCircle className="w-5 h-5 text-roa-text-muted" />
            </div>
            <div>
              <p className="text-sm font-medium text-roa-text-secondary">Ready to focus</p>
              <p className="text-xs text-roa-text-muted">Start a session to begin tracking your time</p>
            </div>
          </div>

          {completedToday > 0 && (
            <div className="pt-2 border-t border-roa-divider">
              <p className="text-xs text-roa-text-muted">
                <span className="font-semibold text-roa-primary-sage">{completedToday}</span> Pomodoro{completedToday !== 1 ? 's' : ''} completed today
              </p>
            </div>
          )}

          <button
            onClick={onNavigateToFocus}
            className="w-full px-4 py-2.5 rounded-lg border-[1.5px] border-roa-primary-sage text-roa-primary-sage hover:bg-roa-surface-tint text-sm font-semibold transition-colors"
          >
            Start Focus Session
          </button>
        </div>
      )}
    </div>
  );
};
