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
          className={`px-3 py-1.5 text-xs font-medium transition-all duration-200 backdrop-blur-sm ${
            value === leftValue
              ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300/80 dark:border-slate-500/60'
              : 'bg-white/80 dark:bg-slate-800/30 text-slate-600 dark:text-slate-300 hover:bg-slate-50/90 dark:hover:bg-slate-700/80 hover:text-slate-700 dark:hover:text-slate-200'
          } rounded-l-lg border border-slate-200/60 dark:border-slate-600/40`}
        >
          <div className="flex items-center">
            {leftIcon && <span className={`mr-1.5 ${value === leftValue ? 'opacity-90' : 'opacity-70'}`}>{leftIcon}</span>}
            <span>{leftLabel}</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onChange(rightValue)}
          className={`px-3 py-1.5 text-xs font-medium transition-all duration-200 backdrop-blur-sm ${
            value === rightValue
              ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300/80 dark:border-slate-500/60'
              : 'bg-white/80 dark:bg-slate-800/30 text-slate-600 dark:text-slate-300 hover:bg-slate-50/90 dark:hover:bg-slate-700/80 hover:text-slate-700 dark:hover:text-slate-200'
          } rounded-r-lg border border-slate-200/60 dark:border-slate-600/40 border-l-0`}
        >
          <div className="flex items-center">
            {rightIcon && <span className={`mr-1.5 ${value === rightValue ? 'opacity-90' : 'opacity-70'}`}>{rightIcon}</span>}
            <span>{rightLabel}</span>
          </div>
        </button>
      </div>
    </div>
  );
};
