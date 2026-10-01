import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * ROA Midnight Companion Input Component
 * 
 * Styling:
 * - #161A17 raised background
 * - 1px #303631 border (default)
 * - 1px #91C4A0 border (focus)
 * - 6px border radius
 * - 14px body text
 * - #9BA39D placeholder
 * 
 * Usage:
 * <Input placeholder="Enter reminder title" />
 * <Input label="API Key" type="password" error="Invalid key" />
 */
export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-roa-text-secondary mb-1.5"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full px-3 py-2.5 text-sm h-10
          bg-roa-raised text-roa-text-primary
          border border-roa-border rounded-roa
          placeholder:text-roa-text-muted
          focus:outline-none focus:border-roa-sage focus:ring-1 focus:ring-roa-sage
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-200
          ${error ? 'border-roa-clay focus:border-roa-clay focus:ring-roa-clay' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-roa-clay">
          {error}
        </p>
      )}
    </div>
  );
};
