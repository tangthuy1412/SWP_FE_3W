import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: string;
  rightIcon?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  // Styles mapping to Lumen UI guidelines
  const baseStyles = 'inline-flex items-center justify-center font-label-md rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 active:translate-y-px disabled:opacity-50 disabled:pointer-events-none cursor-pointer';
  
  const variants = {
    primary: 'bg-primary text-on-primary hover:bg-primary/90 shadow-[0_6px_16px_rgba(39,54,44,0.14)] border border-transparent',
    secondary: 'bg-surface-container hover:bg-surface-container-high text-on-surface border border-transparent',
    outline: 'border border-outline-variant bg-surface text-on-surface hover:border-primary/30 hover:bg-primary-fixed/25',
    danger: 'bg-error text-on-error hover:opacity-90 border border-transparent shadow-sm',
    ghost: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low border border-transparent',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3.5 text-base gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      
      {!isLoading && leftIcon && (
        <span className="material-symbols-outlined select-none" style={{ fontSize: size === 'sm' ? '18px' : '20px' }}>
          {leftIcon}
        </span>
      )}
      
      {children}
      
      {!isLoading && rightIcon && (
        <span className="material-symbols-outlined select-none" style={{ fontSize: size === 'sm' ? '18px' : '20px' }}>
          {rightIcon}
        </span>
      )}
    </button>
  );
};
export default Button;
