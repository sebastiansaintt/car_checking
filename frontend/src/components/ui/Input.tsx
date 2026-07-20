import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-primary">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 text-sm bg-white border border-border rounded-input text-primary placeholder:text-secondary-tertiary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-colors ${
          error ? 'border-red-400 focus:ring-red-400' : ''
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
};
