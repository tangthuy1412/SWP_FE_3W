import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  const baseStyles = 'px-1.5 py-0.5 rounded-full text-[10px] font-medium border transition-colors select-none w-fit inline-flex items-center';

  const variants = {
    primary: 'bg-primary-container/30 text-primary border-primary/20',
    secondary: 'bg-secondary-container text-on-secondary-container border-transparent',
    success: 'bg-success-container/30 text-success border-success/20', // Note: we can use tailwind's green if success is not explicitly defined in theme
    warning: 'bg-tertiary-container/30 text-tertiary border-tertiary/20',
    error: 'bg-error-container text-error border-error/20',
    neutral: 'bg-surface-container-high text-secondary border-transparent',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
export default Badge;
