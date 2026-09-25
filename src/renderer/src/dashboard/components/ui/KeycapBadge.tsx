import React from 'react';

export interface KeycapBadgeProps {
  keys: string[];
  className?: string;
}

/**
 * ROA Canonical Keycap Badge Component
 * 
 * Displays keyboard shortcuts in compact pill format
 * - 4px border radius
 * - #FFFDF9 surface
 * - 1px #E4DED5 border
 * - Monospace-style display
 * 
 * Usage:
 * <KeycapBadge keys={['Ctrl', 'Shift', 'Space']} />
 * <KeycapBadge keys={['⌘', 'K']} />
 */
export const KeycapBadge: React.FC<KeycapBadgeProps> = ({
  keys,
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <kbd
            className="
              inline-flex items-center justify-center
              min-w-[24px] h-6 px-2
              bg-roa-surface border border-roa-divider rounded-roa-sm
              text-xs font-medium text-roa-text-secondary
              shadow-sm
            "
          >
            {key}
          </kbd>
          {index < keys.length - 1 && (
            <span className="text-xs text-roa-text-muted">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
