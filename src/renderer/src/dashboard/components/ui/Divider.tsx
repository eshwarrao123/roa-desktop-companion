import React from 'react';

export interface DividerProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

/**
 * ROA Canonical Divider Component
 * 
 * Hairline divider: 1px solid #E4DED5
 * 
 * Usage:
 * <Divider />
 * <Divider orientation="vertical" className="h-full" />
 */
export const Divider: React.FC<DividerProps> = ({
  className = '',
  orientation = 'horizontal',
}) => {
  const baseStyles = 'bg-roa-divider';
  
  const orientationStyles = orientation === 'horizontal'
    ? 'h-px w-full'
    : 'w-px h-full';
  
  return <div className={`${baseStyles} ${orientationStyles} ${className}`} />;
};
