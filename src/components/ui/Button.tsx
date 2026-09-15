import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  isLoading,
  fullWidth = false,
  className = '',
  disabled,
  type = 'button',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none touch-manipulation cursor-pointer';

  const sizeStyles = {
    sm: 'px-3 py-2 text-sm h-11 min-h-[44px] gap-1.5',
    md: 'px-4 py-2.5 text-base h-12 min-h-[48px] gap-2',
    lg: 'px-6 py-3.5 text-lg h-14 min-h-[56px] gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm focus:ring-emerald-500',
    success: 'bg-green-600 hover:bg-green-700 text-white shadow-sm focus:ring-green-500',
    secondary: 'bg-slate-800 hover:bg-slate-900 text-white shadow-sm focus:ring-slate-700',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm focus:ring-red-500',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm focus:ring-amber-400',
    outline: 'border-2 border-slate-300 hover:border-slate-400 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-400',
    ghost: 'text-slate-700 hover:bg-slate-100 focus:ring-slate-300',
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-5 w-5 text-current shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        icon
      )}
      <span>{children}</span>
    </button>
  );
};
