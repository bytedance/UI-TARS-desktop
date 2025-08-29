import React from 'react';

type ScreenshotStrategy = 'both' | 'beforeAction' | 'afterAction';

interface StrategySwitchProps {
  currentStrategy: ScreenshotStrategy;
  onStrategyChange: (strategy: ScreenshotStrategy) => void;
}

export const StrategySwitch: React.FC<StrategySwitchProps> = ({
  currentStrategy,
  onStrategyChange,
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Display Mode</span>
      </div>
      <div className="flex items-center bg-white dark:bg-gray-900 rounded-lg p-1 shadow-inner border border-gray-200 dark:border-gray-600">
        {(['beforeAction', 'afterAction', 'both'] as const).map((strategy) => (
          <button
            key={strategy}
            onClick={() => onStrategyChange(strategy)}
            className={`relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              currentStrategy === strategy
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md transform scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {strategy === 'beforeAction' ? 'Before' : strategy === 'afterAction' ? 'After' : 'Both'}
            {currentStrategy === strategy && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 rounded-md opacity-20 animate-pulse"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
