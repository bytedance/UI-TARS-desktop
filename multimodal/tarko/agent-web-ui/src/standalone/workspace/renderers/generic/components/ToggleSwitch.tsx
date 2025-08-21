import React from 'react';
import { FiCode, FiEye } from 'react-icons/fi';

export interface ToggleSwitchProps<T extends string = string> {
  leftLabel: string;
  rightLabel: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  value: string;
  onChange: (value: T) => void;
  leftValue: T;
  rightValue: T;
  className?: string;
}

export const ToggleSwitch = <T extends string = string>({
  leftLabel,
  rightLabel,
  leftIcon = <FiCode size={12} />,
  rightIcon = <FiEye size={12} />,
  value,
  onChange,
  leftValue,
  rightValue,
  className = '',
}: ToggleSwitchProps<T>) => {
  return (
    <div className={`flex justify-center ${className}`}>
      <div className="inline-flex rounded-md" role="group">
        <button
          type="button"
          onClick={() => onChange(leftValue)}
          className={`px-3 py-1.5 text-xs font-medium transition-all duration-200 shadow-sm ${
            value === leftValue
              ? 'bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 text-slate-700 dark:text-slate-200'
              : 'bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 text-slate-600 dark:text-slate-300 hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-700 dark:hover:to-slate-600 hover:text-slate-700 dark:hover:text-slate-200'
          } rounded-l-lg border border-slate-200/60 dark:border-slate-600/40`}
        >
          <div className="flex items-center">
            {leftIcon && <span className="mr-1.5 opacity-70">{leftIcon}</span>}
            <span>{leftLabel}</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onChange(rightValue)}
          className={`px-3 py-1.5 text-xs font-medium transition-all duration-200 shadow-sm ${
            value === rightValue
              ? 'bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 text-slate-700 dark:text-slate-200'
              : 'bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 text-slate-600 dark:text-slate-300 hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-700 dark:hover:to-slate-600 hover:text-slate-700 dark:hover:text-slate-200'
          } rounded-r-lg border border-slate-200/60 dark:border-slate-600/40 border-l-0`}
        >
          <div className="flex items-center">
            {rightIcon && <span className="mr-1.5 opacity-70">{rightIcon}</span>}
            <span>{rightLabel}</span>
          </div>
        </button>
      </div>
    </div>
  );
};
