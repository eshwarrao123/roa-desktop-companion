import React, { useState } from 'react';
import { Play } from 'lucide-react';

interface CustomTimerProps {
  onStart: (label: string, minutes: number) => void;
}

export const CustomTimer: React.FC<CustomTimerProps> = ({ onStart }) => {
  const [label, setLabel] = useState('');
  const [minutes, setMinutes] = useState('25');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(minutes, 10);
    if (isNaN(mins) || mins <= 0) return;

    const timerLabel = label.trim() || `Timer (${mins}m)`;
    onStart(timerLabel, mins);
    setLabel('');
  };

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-roa-structural-label">
        Custom Timer
      </h3>
      
      <form onSubmit={handleSubmit} className="bg-roa-surface border border-roa-border rounded-lg p-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-roa-text-muted mb-1.5">
            Label (optional)
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Code Review, Reading"
            className="w-full px-3 py-2 rounded-lg border border-roa-border bg-roa-background text-sm text-roa-text-secondary placeholder-roa-text-muted focus:outline-none focus:border-roa-sage transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-roa-text-muted mb-1.5">
            Duration (minutes)
          </label>
          <input
            type="number"
            min="1"
            max="360"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-roa-border bg-roa-background text-sm text-roa-text-secondary focus:outline-none focus:border-roa-sage transition-colors"
          />
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-roa-sage hover:bg-roa-sage-hover text-roa-surface text-sm font-semibold transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          Start Custom Timer
        </button>
      </form>
    </div>
  );
};
