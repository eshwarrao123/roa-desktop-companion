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
 * ROA Midnight Companion Status Pip Component
 * 
 * Small circular indicator for status/connection states (6px diameter)
 * 
 * Colors:
 * - sage: #91C4A0 (connected, active, verified)
 * - clay: #D59A70 (warning, attention, overdue)
 * - gray: #9BA39D (inactive, disabled)
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
    red: 'bg-roa-clay',
  };
  
  const sizeStyles = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
  };
  
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`rounded-full ${colorStyles[color]} ${sizeStyles[size]}`}
        aria-hidden="true"
      />
      {label && (
        <span className="text-secondary text-roa-text-secondary">
          {label}
        </span>
      )}
    </div>
  );
};
