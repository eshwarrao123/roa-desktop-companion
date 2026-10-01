import React from 'react';
import { PomodoroState } from '@shared/types/timers';

interface PomodoroCycleProps {
  pomodoroState: PomodoroState | null;
}

export const PomodoroCycle: React.FC<PomodoroCycleProps> = ({ pomodoroState }) => {
  if (!pomodoroState) return null;

  const currentInFour = (pomodoroState.completedCycles % 4);
  const cycleNumber = currentInFour + 1;

  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <span className="text-sm font-medium text-roa-text-muted">
        Cycle {cycleNumber} of 4
      </span>
      
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3].map((idx) => {
          const isFilled = idx < currentInFour;
          return (
            <div
              key={idx}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                isFilled ? 'bg-roa-sage' : 'bg-roa-border'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};
