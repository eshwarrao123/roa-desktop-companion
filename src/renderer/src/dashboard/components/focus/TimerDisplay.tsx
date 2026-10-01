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
        focus: 'Focus session',
        short_break: 'Short break',
        long_break: 'Long break',
      };
      return phaseLabels[timer.pomodoro_phase];
    }
    return timer.label;
  };

  return (
    <div className="text-center space-y-4 py-8">
      <p className="text-sm font-medium text-roa-text-muted uppercase tracking-wide">
        {getStateLabel()}
      </p>
      
      <div className="font-mono text-[80px] font-bold leading-none tracking-tight text-roa-text-primary">
        {formatTime(displaySeconds)}
      </div>
      
      {timer && timer.state === 'running' && (
        <div className="w-64 h-1 bg-roa-border rounded-full mx-auto overflow-hidden">
          <div
            className="h-full bg-roa-sage rounded-full transition-all duration-1000 ease-linear"
            style={{
              width: `${Math.min(100, Math.max(0, ((Math.ceil(timer.duration_ms / 1000) - displaySeconds) / Math.ceil(timer.duration_ms / 1000)) * 100))}%`
            }}
          />
        </div>
      )}
    </div>
  );
};
