import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-sm font-semibold text-gray-700 ml-1">
        {label}
      </label>
      <input
        className={`
          w-full px-4 py-3 rounded-xl border bg-white
          text-gray-900 placeholder-gray-400
          transition-all duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-nubank/20 focus:border-nubank
          ${error ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 hover:border-gray-300'}
          ${className}
        `}
        {...props}
      />
      {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
    </div>
  );
};
