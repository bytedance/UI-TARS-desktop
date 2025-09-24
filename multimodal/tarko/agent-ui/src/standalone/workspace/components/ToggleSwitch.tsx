import React from 'react';

export interface ToggleSwitchProps<T> {
  leftLabel: string;
  rightLabel: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  value: T;
  leftValue: T;
  rightValue: T;
  onChange: (value: T) => void;
}

export const ToggleSwitch = <T,>({
  leftLabel,
  rightLabel,
  leftIcon,
  rightIcon,
  value,
  leftValue,
  rightValue,
  onChange,
}: ToggleSwitchProps<T>) => {
  const isLeft = value === leftValue;

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      <button
        onClick={() => onChange(leftValue)}
        className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm transition-all ${
          isLeft
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
        }`}
      >
        {leftIcon}
        {leftLabel}
      </button>
      <button
        onClick={() => onChange(rightValue)}
        className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm transition-all ${
          !isLeft
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
        }`}
      >
        {rightIcon}
        {rightLabel}
      </button>
    </div>
  );
};