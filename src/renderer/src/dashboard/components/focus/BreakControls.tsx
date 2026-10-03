import React from 'react';
import { PomodoroPhase } from '@shared/types/timers';
import { Coffee, Sparkles } from 'lucide-react';

interface BreakControlsProps {
  onStartShortBreak: () => void;
  onStartLongBreak: () => void;
}

export const BreakControls: React.FC<BreakControlsProps> = ({
  onStartShortBreak,
  onStartLongBreak,
}) => {
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={onStartShortBreak}
        className="h-9 flex items-center gap-2 px-4 rounded-roa border border-roa-border bg-transparent hover:bg-roa-raised text-roa-text-secondary text-secondary font-medium transition-colors"
      >
        <Coffee className="w-3.5 h-3.5" />
        Short Break
      </button>

      <button
        onClick={onStartLongBreak}
        className="h-9 flex items-center gap-2 px-4 rounded-roa border border-roa-border bg-transparent hover:bg-roa-raised text-roa-text-secondary text-secondary font-medium transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Long Break
      </button>
    </div>
  );
};
