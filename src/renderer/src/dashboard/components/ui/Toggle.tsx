import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

/**
 * ROA Canonical Toggle Component
 * 
 * Active state: sage (#5F7D66)
 * Inactive state: muted gray
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
        focus:outline-none focus:ring-2 focus:ring-roa-sage focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${label ? 'cursor-pointer' : ''}
      `}
    >
      <div
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full
          transition-colors duration-base ease-spring
          ${checked ? 'bg-roa-sage' : 'bg-gray-300'}
          ${disabled ? 'opacity-50' : ''}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white shadow-sm
            transition-transform duration-base ease-spring
            ${checked ? 'translate-x-6' : 'translate-x-1'}
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
