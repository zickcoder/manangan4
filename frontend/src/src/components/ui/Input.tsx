import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold text-[#334155]">
            {label}
          </label>
        )}
        <input
          type={type}
          ref={ref}
          className={twMerge(
            clsx(
              "w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8]",
              "focus:border-[#2563eb] focus:outline-none focus:ring-4 focus:ring-[#2563eb]/10 transition-all",
              error && "border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]/10",
              className
            )
          )}
          {...props}
        />
        {error && <p className="text-[11px] text-[#ef4444] font-medium">{error}</p>}
        {helperText && !error && <p className="text-[11px] text-[#64748b]">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
