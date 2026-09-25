import React from 'react';

export interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * ROA Canonical Section Label Component
 * 
 * Uppercase structural label:
 * - 10px font size
 * - 700 weight
 * - +0.10em letter spacing
 * - #A8A49E color
 * - Uppercase text transform
 * 
 * Usage in Settings:
 * <SectionLabel>COMPANION</SectionLabel>
 * <SectionLabel>DESKTOP</SectionLabel>
 * <SectionLabel>AI ASSISTANT</SectionLabel>
 * 
 * Standard spacing: 12px gap below label before content
 */
export const SectionLabel: React.FC<SectionLabelProps> = ({
  children,
  className = '',
}) => {
  return (
    <h3 className={`text-label uppercase text-roa-label tracking-wider font-bold ${className}`}>
      {children}
    </h3>
  );
};
