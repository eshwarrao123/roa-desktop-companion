import React from 'react';
import { Timer } from '@shared/types/timers';

interface TimerDisplayProps {
  timer: Timer | null;
  displaySeconds: number;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ timer, displaySeconds }) => {
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getStateLabel = () => {
    if (!timer) return 'Ready to focus';
    if (timer.type === 'pomodoro' && timer.pomodoro_phase) {
      const phaseLabels = {
        focus: 'Deep Work',
        short_break: 'Short Break',
        long_break: 'Long Break',
      };
      return phaseLabels[timer.pomodoro_phase];
    }
    return timer.label;
  };

  return (
    <div className="text-center space-y-6 py-4">
      <p className="text-micro text-roa-text-muted uppercase tracking-wider">
        {getStateLabel()}
      </p>
      
      <div className="text-timer-display text-roa-text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatTime(displaySeconds)}
      </div>
      
      {timer && timer.state === 'running' && (
        <div className="w-80 h-0.5 bg-roa-border mx-auto overflow-hidden">
          <div
            className="h-full bg-roa-sage transition-all duration-1000 ease-linear"
            style={{
              width: `${Math.min(100, Math.max(0, ((Math.ceil(timer.duration_ms / 1000) - displaySeconds) / Math.ceil(timer.duration_ms / 1000)) * 100))}%`
            }}
          />
        </div>
      )}
    </div>
  );
};
