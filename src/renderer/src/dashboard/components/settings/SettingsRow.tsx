import React from 'react';

export interface SettingsRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Reusable settings row with label, optional description, and right-aligned control
 */
export const SettingsRow: React.FC<SettingsRowProps> = ({
  label,
  description,
  children,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between gap-6 py-4 ${className}`}>
      <div className="flex-1">
        <div className="text-sm font-medium text-roa-text-primary">
          {label}
        </div>
        {description && (
          <div className="text-xs text-roa-text-muted mt-0.5">
            {description}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {children}
      </div>
    </div>
  );
};
