import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * ROA Canonical Input Component
 * 
 * Styling:
 * - #FFFDF9 surface background
 * - 1px #E4DED5 border (default)
 * - 1.5px #5F7D66 border (focus)
 * - 8px border radius
 * - 14px body text
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
          w-full px-3 py-2 text-sm
          bg-roa-surface text-roa-text-secondary
          border border-roa-divider rounded-roa
          placeholder:text-roa-text-light
          focus:outline-none focus:border-roa-sage focus:ring-1 focus:ring-roa-sage
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-base
          ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};
