import React from 'react';

interface QuickPresetsProps {
  onSelectPreset: (label: string, minutes: number) => void;
}

const presets = [
  { minutes: 15, label: '15 min', description: 'Quick sprint' },
  { minutes: 25, label: '25 min', description: 'Standard block' },
  { minutes: 45, label: '45 min', description: 'Deep work' },
  { minutes: 60, label: '60 min', description: 'Study session' },
];

export const QuickPresets: React.FC<QuickPresetsProps> = ({ onSelectPreset }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-roa-structural-label">
        Quick Presets
      </h3>
      
      <div className="grid grid-cols-4 gap-2">
        {presets.map((preset) => (
          <button
            key={preset.minutes}
            onClick={() => onSelectPreset(preset.description, preset.minutes)}
            className="p-3 rounded-lg bg-roa-surface border border-roa-border hover:border-roa-sage hover:bg-roa-raised text-left transition-colors group"
          >
            <div className="text-sm font-semibold text-roa-text-primary group-hover:text-roa-sage transition-colors">
              {preset.label}
            </div>
            <div className="text-xs text-roa-text-muted mt-0.5 capitalize">
              {preset.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
