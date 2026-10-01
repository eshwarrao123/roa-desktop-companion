import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

/**
 * ROA Midnight Companion Button Component
 * 
 * Variants:
 * - primary: Sage CTA button (height 44px, bg #91C4A0, text #080A09)
 * - secondary: Outlined button (border #91C4A0, text #91C4A0)
 * - quiet: Borderless text link (#91C4A0)
 * 
 * Usage:
 * <Button variant="primary">Start Focus</Button>
 * <Button variant="secondary">Cancel</Button>
 * <Button variant="quiet">Learn more →</Button>
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  children,
  className = '',
  disabled = false,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-colors duration-200 rounded-roa focus:outline-none focus:ring-2 focus:ring-roa-sage focus:ring-offset-2 focus:ring-offset-roa-canvas disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: 'bg-roa-sage text-roa-canvas hover:bg-roa-sage-hover active:bg-roa-sage-hover',
    secondary: 'bg-transparent text-roa-sage border border-roa-sage hover:bg-roa-sage/[0.08] active:bg-roa-sage/[0.12]',
    quiet: 'text-roa-sage hover:text-roa-sage-hover bg-transparent border-none font-medium',
  };
  
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm h-9',
    md: 'px-5 py-2.5 text-sm h-11',
    lg: 'px-6 py-3 text-[15px] h-11',
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
