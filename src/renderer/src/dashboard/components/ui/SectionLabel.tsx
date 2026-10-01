import React from 'react';

export interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * ROA Midnight Companion Section Label Component
 * 
 * Uppercase structural label:
 * - 11px font size
 * - 600 weight
 * - +0.08em letter spacing
 * - #9BA39D color (text-muted)
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
    <h3 className={`text-micro uppercase text-roa-text-muted tracking-wide font-semibold ${className}`}>
      {children}
    </h3>
  );
};
