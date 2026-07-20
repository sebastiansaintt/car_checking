import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
}

export const Select: React.FC<SelectProps> = ({ label, options, error, className = '', ...props }) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-primary">
          {label}
        </label>
      )}
      <select
        className={`w-full px-3 py-2 text-sm bg-white border border-border rounded-input text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-colors ${
          error ? 'border-red-400 focus:ring-red-400' : ''
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
};
