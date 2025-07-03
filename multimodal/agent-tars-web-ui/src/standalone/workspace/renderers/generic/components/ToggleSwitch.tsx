import React from 'react';
import { FiCode, FiEye } from 'react-icons/fi';

interface ToggleSwitchProps {
  leftLabel: string;
  rightLabel: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  leftValue: string;
  rightValue: string;
  className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  leftLabel,
  rightLabel,
  leftIcon = <FiCode size={12} />,
  rightIcon = <FiEye size={12} />,
  value,
  onChange,
  leftValue,
  rightValue,
  className = '',
}) => {
  return (
    <div className={`flex justify-center ${className}`}>
      <div className="inline-flex rounded-md shadow-sm" role="group">
        <button
          type="button"
          onClick={() => onChange(leftValue)}
          className={`px-3 py-1.5 text-xs font-medium ${
            value === leftValue
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
          } rounded-l-lg border border-gray-200 dark:border-gray-600`}
        >
          <div className="flex items-center">
            {leftIcon && <span className="mr-1.5">{leftIcon}</span>}
            <span>{leftLabel}</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onChange(rightValue)}
          className={`px-3 py-1.5 text-xs font-medium ${
            value === rightValue
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
          } rounded-r-lg border border-gray-200 dark:border-gray-600 border-l-0`}
        >
          <div className="flex items-center">
            {rightIcon && <span className="mr-1.5">{rightIcon}</span>}
            <span>{rightLabel}</span>
          </div>
        </button>
      </div>
    </div>
  );
};
