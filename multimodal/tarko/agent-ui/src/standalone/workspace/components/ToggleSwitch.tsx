import React from 'react';

export interface ToggleSwitchProps<T> {
  value: T;
  onChange: (value: T) => void;
  leftValue: T;
  rightValue: T;
  leftLabel: string;
  rightLabel: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function ToggleSwitch<T>({
  value,
  onChange,
  leftValue,
  rightValue,
  leftLabel,
  rightLabel,
  leftIcon,
  rightIcon,
}: ToggleSwitchProps<T>) {
  const isLeft = value === leftValue;

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
      <button
        onClick={() => onChange(leftValue)}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
          isLeft
            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
        }`}
      >
        {leftIcon}
        {leftLabel}
      </button>
      <button
        onClick={() => onChange(rightValue)}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
          !isLeft
            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
        }`}
      >
        {rightIcon}
        {rightLabel}
      </button>
    </div>
  );
}
