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
    <div className="space-y-4">
      <h3 className="text-micro text-roa-text-muted uppercase tracking-wider font-semibold">
        Custom Timer
      </h3>
      
      <form onSubmit={handleSubmit} className="bg-roa-raised border border-roa-border rounded-roa p-5 space-y-4">
        <div>
          <label className="block text-meta font-medium text-roa-text-muted mb-2">
            Label (optional)
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Code Review, Reading"
            className="w-full h-10 px-3 rounded-roa border border-roa-border bg-roa-raised text-body text-roa-text-primary placeholder-roa-text-muted focus:outline-none focus:ring-[1.5px] focus:ring-roa-sage transition-shadow"
          />
        </div>

        <div>
          <label className="block text-meta font-medium text-roa-text-muted mb-2">
            Duration (minutes)
          </label>
          <input
            type="number"
            min="1"
            max="360"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="w-full h-10 px-3 rounded-roa border border-roa-border bg-roa-raised text-body text-roa-text-primary focus:outline-none focus:ring-[1.5px] focus:ring-roa-sage transition-shadow"
          />
        </div>

        <button
          type="submit"
          className="w-full h-9 flex items-center justify-center gap-2 px-4 rounded-roa bg-roa-sage hover:bg-roa-sage-hover text-roa-canvas text-secondary font-semibold transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          Start Custom Timer
        </button>
      </form>
    </div>
  );
};
