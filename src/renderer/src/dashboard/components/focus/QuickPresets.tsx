import React from 'react';

interface QuickPresetsProps {
  onSelectPreset: (label: string, minutes: number) => void;
}

const presets = [
  { minutes: 15, label: '15 min', description: 'Quick Sprint' },
  { minutes: 25, label: '25 min', description: 'Standard Block' },
  { minutes: 45, label: '45 min', description: 'Deep Work' },
  { minutes: 60, label: '60 min', description: 'Study Session' },
];

export const QuickPresets: React.FC<QuickPresetsProps> = ({ onSelectPreset }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-micro text-roa-text-muted uppercase tracking-wider font-semibold">
        Quick Presets
      </h3>
      
      <div className="grid grid-cols-4 gap-3">
        {presets.map((preset) => (
          <button
            key={preset.minutes}
            onClick={() => onSelectPreset(preset.description, preset.minutes)}
            className="h-[72px] p-3 rounded-roa bg-transparent border border-roa-border hover:border-roa-sage hover:bg-roa-raised text-left transition-colors group"
          >
            <div className="text-body-medium font-semibold text-roa-text-primary group-hover:text-roa-sage transition-colors">
              {preset.label}
            </div>
            <div className="text-meta text-roa-text-muted mt-1">
              {preset.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
