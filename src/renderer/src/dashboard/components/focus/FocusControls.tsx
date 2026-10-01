import React from 'react';
import { Timer } from '@shared/types/timers';
import { Play, Pause, RotateCcw, X } from 'lucide-react';

interface FocusControlsProps {
  timer: Timer | null;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onCancel: () => void;
  onStartFocus: () => void;
}

export const FocusControls: React.FC<FocusControlsProps> = ({
  timer,
  onPause,
  onResume,
  onReset,
  onCancel,
  onStartFocus,
}) => {
  if (!timer) {
    return (
      <div className="flex justify-center">
        <button
          onClick={onStartFocus}
          className="px-8 py-3 rounded-lg bg-roa-sage hover:bg-roa-sage-hover text-roa-surface text-sm font-semibold transition-colors"
        >
          Start Focus
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3">
      {timer.state === 'running' ? (
        <button
          onClick={onPause}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg border-[1.5px] border-roa-sage text-roa-sage hover:bg-roa-raised text-sm font-semibold transition-colors"
        >
          <Pause className="w-4 h-4" />
          Pause
        </button>
      ) : timer.state === 'paused' ? (
        <button
          onClick={onResume}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-roa-sage hover:bg-roa-sage-hover text-roa-surface text-sm font-semibold transition-colors"
        >
          <Play className="w-4 h-4" />
          Resume
        </button>
      ) : null}

      {timer && (
        <>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-roa-border bg-roa-surface hover:bg-roa-raised text-roa-text-secondary text-sm font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-roa-border bg-roa-surface hover:bg-roa-raised text-roa-text-muted text-sm font-medium transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
        </>
      )}
    </div>
  );
};
