import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-1 font-small rounded-button select-none ' +
    'transition-colors duration-150 ease-out-soft ' +
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'disabled:opacity-40 disabled:cursor-not-allowed';

  const variants: Record<string, string> = {
    primary:
      'bg-[#1E3A5F] text-white hover:bg-[#142843] ' +
      'focus-visible:outline-[#1E3A5F]',
    secondary:
      'bg-white text-[#111827] border border-[#E5E7EB] hover:bg-[#F9FAFB] ' +
      'focus-visible:outline-[#1E3A5F]',
    danger:
      'bg-white text-[#991B1B] border border-[#FCA5A5] hover:bg-[#FEF2F2] ' +
      'focus-visible:outline-[#991B1B]',
    ghost:
      'bg-transparent text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] ' +
      'focus-visible:outline-[#1E3A5F]',
  };

  const sizes: Record<string, string> = {
    sm: 'text-xs px-2.5 py-1.5 min-h-[1.75rem] h-auto leading-tight',
    md: 'text-sm px-3 py-2 min-h-[2.25rem] h-auto leading-normal',
    lg: 'text-sm px-4 py-2.5 min-h-[2.5rem] h-auto leading-normal',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          {/* Skeleton pulse inline instead of spinner — per motion guide: no spin loaders */}
          <span className="inline-block w-3.5 h-3.5 rounded bg-current opacity-30 skeleton shrink-0" />
          <span>Procesando...</span>
        </>
      ) : children}
    </button>
  );
};
