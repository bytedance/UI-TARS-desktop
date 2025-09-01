import React from 'react';
import { FiClock, FiCheckCircle, FiShuffle } from 'react-icons/fi';
import { Tooltip } from '@mui/material';
import { getTooltipProps } from '@/common/components/TooltipConfig';

type ScreenshotStrategy = 'both' | 'beforeAction' | 'afterAction';

interface StrategySwitchProps {
  currentStrategy: ScreenshotStrategy;
  onStrategyChange: (strategy: ScreenshotStrategy) => void;
}

const strategyConfig = {
  beforeAction: {
    label: 'Before',
    icon: <FiClock size={12} />,
    tooltip: 'Show screenshot before action execution',
  },
  afterAction: {
    label: 'After',
    icon: <FiCheckCircle size={12} />,
    tooltip: 'Show screenshot after action execution',
  },
  both: {
    label: 'Both',
    icon: <FiShuffle size={12} />,
    tooltip: 'Show screenshots before and after action execution',
  },
} as const;

export const StrategySwitch: React.FC<StrategySwitchProps> = ({
  currentStrategy,
  onStrategyChange,
}) => {
  const strategies: ScreenshotStrategy[] = ['beforeAction', 'afterAction', 'both'];

  const tooltipProps = getTooltipProps('bottom');

  return (
    <div className="flex items-center justify-center">
      <div className="inline-flex rounded-md" role="group">
        {strategies.map((strategy, index) => {
          const config = strategyConfig[strategy];
          const isActive = currentStrategy === strategy;
          const isFirst = index === 0;
          const isLast = index === strategies.length - 1;

          return (
            <Tooltip key={strategy} title={config.tooltip} {...tooltipProps}>
              <button
                type="button"
                onClick={() => onStrategyChange(strategy)}
                className={`group px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300'
                } ${
                  isFirst ? 'rounded-l-md' : isLast ? 'rounded-r-md border-l-0' : 'border-l-0'
                } border border-slate-200 dark:border-slate-600`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span
                    className={`transition-opacity duration-200 ${
                      isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-90'
                    }`}
                  >
                    {config.icon}
                  </span>
                  <span className="text-xs font-medium">{config.label}</span>
                </div>
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};
