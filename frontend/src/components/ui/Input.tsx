import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  hint,
  error,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-[#374151]"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={[
          'w-full h-8 px-3 text-sm bg-white',
          'border rounded-input text-[#111827]',
          'placeholder:text-[#9CA3AF]',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          error
            ? 'border-[#FCA5A5] focus:ring-[#FCA5A5]/30 focus:border-[#FCA5A5]'
            : 'border-[#E5E7EB] focus:ring-[#111827]/10 focus:border-[#111827]',
          className,
        ].join(' ')}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs text-[#9CA3AF]">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-[#991B1B]">{error}</p>
      )}
    </div>
  );
};
