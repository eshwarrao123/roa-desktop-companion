import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

/**
 * ROA Canonical Button Component
 * 
 * Variants:
 * - primary: 1.5px sage outline, #FFFDF9 surface (for high-priority actions)
 * - secondary: 1px divider outline, subtle appearance
 * - quiet: borderless text-based button
 * 
 * Usage:
 * <Button variant="primary">Start Focus</Button>
 * <Button variant="secondary">Cancel</Button>
 * <Button variant="quiet">Learn more</Button>
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  children,
  className = '',
  disabled = false,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors duration-base rounded-roa focus:outline-none focus:ring-2 focus:ring-roa-sage focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: 'bg-roa-surface text-roa-sage border-[1.5px] border-roa-sage hover:bg-roa-surface-tint hover:border-roa-sage-dark active:bg-roa-surface-tint',
    secondary: 'bg-roa-surface text-roa-text-secondary border border-roa-divider hover:border-roa-text-muted active:bg-roa-surface-tint',
    quiet: 'text-roa-sage hover:text-roa-sage-dark bg-transparent border-none',
  };
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
