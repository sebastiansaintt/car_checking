import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  hint,
  error,
  options,
  placeholder,
  id,
  className = '',
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-medium text-[#374151]"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={[
          'w-full h-8 px-3 text-sm bg-white appearance-none',
          'border rounded-input text-[#111827]',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          'bg-[right_10px_center] bg-no-repeat',
          error
            ? 'border-[#FCA5A5] focus:ring-[#FCA5A5]/30 focus:border-[#FCA5A5]'
            : 'border-[#E5E7EB] focus:ring-[#111827]/10 focus:border-[#111827]',
          className,
        ].join(' ')}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          paddingRight: '2rem',
        }}
        {...props}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && !error && (
        <p className="text-xs text-[#9CA3AF]">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-[#991B1B]">{error}</p>
      )}
    </div>
  );
};
