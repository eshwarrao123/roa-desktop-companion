import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

/**
 * ROA Midnight Companion Toggle Component
 * 
 * Active state: sage (#91C4A0) track, white thumb
 * Inactive state: #303631 track, #9BA39D thumb
 * Size: 36px × 20px
 * 
 * Usage:
 * <Toggle 
 *   checked={alwaysOnTop} 
 *   onChange={setAlwaysOnTop}
 *   label="Always on Top"
 * />
 */
export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
}) => {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };
  
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={handleToggle}
      disabled={disabled}
      className={`
        inline-flex items-center gap-2.5
        focus:outline-none focus:ring-2 focus:ring-roa-sage focus:ring-offset-2 focus:ring-offset-roa-canvas
        disabled:opacity-50 disabled:cursor-not-allowed
        ${label ? 'cursor-pointer' : ''}
      `}
    >
      <div
        className={`
          relative inline-flex h-5 w-9 items-center rounded-full
          transition-colors duration-200
          ${checked ? 'bg-roa-sage' : 'bg-roa-border'}
          ${disabled ? 'opacity-50' : ''}
        `}
      >
        <span
          className={`
            inline-block h-3.5 w-3.5 transform rounded-full shadow-sm
            transition-transform duration-200
            ${checked ? 'translate-x-[18px] bg-white' : 'translate-x-1 bg-roa-text-muted'}
          `}
        />
      </div>
      {label && (
        <span className="text-sm font-medium text-roa-text-secondary">
          {label}
        </span>
      )}
    </button>
  );
};
