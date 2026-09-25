import React from 'react';

export type StatusPipColor = 'sage' | 'clay' | 'gray' | 'red';
export type StatusPipSize = 'sm' | 'md';

export interface StatusPipProps {
  color?: StatusPipColor;
  size?: StatusPipSize;
  label?: string;
  className?: string;
}

/**
 * ROA Canonical Status Pip Component
 * 
 * Small circular indicator for status/connection states
 * 
 * Colors:
 * - sage: #5F7D66 (connected, active, verified)
 * - clay: #D29A6A (warning, attention)
 * - gray: #747970 (inactive, disabled)
 * - red: error state
 * 
 * Usage:
 * <StatusPip color="sage" label="Connected" />
 * <StatusPip color="gray" label="Offline" />
 */
export const StatusPip: React.FC<StatusPipProps> = ({
  color = 'gray',
  size = 'sm',
  label,
  className = '',
}) => {
  const colorStyles = {
    sage: 'bg-roa-sage',
    clay: 'bg-roa-clay',
    gray: 'bg-roa-text-muted',
    red: 'bg-red-500',
  };
  
  const sizeStyles = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
  };
  
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`rounded-full ${colorStyles[color]} ${sizeStyles[size]}`}
        aria-hidden="true"
      />
      {label && (
        <span className="text-sm text-roa-text-secondary">
          {label}
        </span>
      )}
    </div>
  );
};
