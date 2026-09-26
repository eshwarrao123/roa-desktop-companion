import React from 'react';

interface QuickPromptsProps {
  prompts: Array<{ label: string; query: string }>;
  onSelectPrompt: (query: string) => void;
  disabled?: boolean;
}

export const QuickPrompts: React.FC<QuickPromptsProps> = ({ 
  prompts, 
  onSelectPrompt, 
  disabled = false 
}) => {
  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-roa-structural-label">
        Quick Actions
      </h4>
      
      <div className="space-y-1.5">
        {prompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(prompt.query)}
            disabled={disabled}
            className="w-full text-left px-3 py-2 rounded-lg bg-roa-surface border border-roa-divider hover:border-roa-primary-sage hover:bg-roa-surface-tint transition-colors disabled:opacity-50 disabled:hover:border-roa-divider disabled:hover:bg-roa-surface group"
          >
            <span className="text-xs font-medium text-roa-text-secondary block group-hover:text-roa-primary-sage transition-colors">
              {prompt.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
