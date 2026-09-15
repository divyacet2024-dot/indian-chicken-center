import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, helperText, icon, className = '', id, ...props }) => {
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label htmlFor={inputId} className="text-sm sm:text-base font-bold text-slate-800 flex items-center justify-between">
        <span>{label}</span>
      </label>
      <div className="relative flex items-center">
        {icon && <div className="absolute left-3.5 text-slate-400 pointer-events-none">{icon}</div>}
        <input
          id={inputId}
          className={`w-full h-12 ${icon ? 'pl-11' : 'px-4'} pr-4 text-base font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder:text-slate-400 disabled:opacity-60 ${
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
          } ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-xs sm:text-sm font-semibold text-red-600 mt-0.5">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
}

export const Select: React.FC<SelectProps> = ({ label, options, error, className = '', id, ...props }) => {
  const selectId = id || `select-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label htmlFor={selectId} className="text-sm sm:text-base font-bold text-slate-800">
        {label}
      </label>
      <select
        id={selectId}
        className={`w-full h-12 px-4 text-base font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all cursor-pointer ${
          error ? 'border-red-500' : ''
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs sm:text-sm font-semibold text-red-600 mt-0.5">{error}</p>}
    </div>
  );
};
