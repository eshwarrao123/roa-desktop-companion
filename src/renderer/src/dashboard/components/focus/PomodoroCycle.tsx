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
    <div className="flex items-center justify-center gap-4 pt-2">
      <span className="text-secondary text-roa-text-secondary font-medium">
        Cycle {cycleNumber} of 4
      </span>
      
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3].map((idx) => {
          const isFilled = idx < currentInFour;
          return (
            <div
              key={idx}
              className={`h-1.5 w-8 transition-colors ${
                isFilled ? 'bg-roa-sage' : 'bg-roa-border'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};
