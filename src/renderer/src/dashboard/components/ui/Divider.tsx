import React from 'react';

export interface DividerProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

/**
 * ROA Midnight Companion Divider Component
 * 
 * Hairline divider: 1px solid #303631
 * 
 * Usage:
 * <Divider />
 * <Divider orientation="vertical" className="h-full" />
 */
export const Divider: React.FC<DividerProps> = ({
  className = '',
  orientation = 'horizontal',
}) => {
  const baseStyles = 'bg-roa-border';
  
  const orientationStyles = orientation === 'horizontal'
    ? 'h-px w-full'
    : 'w-px h-full';
  
  return <div className={`${baseStyles} ${orientationStyles} ${className}`} />;
};
