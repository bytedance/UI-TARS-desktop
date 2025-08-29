import React from 'react';
import { FiRewind, FiFastForward, FiShuffle } from 'react-icons/fi';
import { Tooltip, TooltipProps } from '@mui/material';

type ScreenshotStrategy = 'both' | 'beforeAction' | 'afterAction';

interface StrategySwitchProps {
  currentStrategy: ScreenshotStrategy;
  onStrategyChange: (strategy: ScreenshotStrategy) => void;
}

const strategyConfig = {
  beforeAction: {
    label: 'Before',
    icon: <FiRewind size={12} />,
    tooltip: 'Show screenshot before action execution',
  },
  afterAction: {
    label: 'After',
    icon: <FiFastForward size={12} />,
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

  // Tooltip styling for consistent appearance
  const tooltipProps: Partial<TooltipProps> = {
    arrow: true,
    placement: 'bottom',
    componentsProps: {
      tooltip: {
        sx: {
          backgroundColor: '#000000',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 500,
          padding: '8px 12px',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          margin: '8px !important',
          '.MuiTooltip-arrow': {
            color: '#000000',
          },
        },
      },
      popper: {
        sx: {
          '&[data-popper-placement*="bottom"] .MuiTooltip-tooltip': {
            marginTop: '8px',
          },
          '&[data-popper-placement*="top"] .MuiTooltip-tooltip': {
            marginBottom: '8px',
          },
          '&[data-popper-placement*="right"] .MuiTooltip-tooltip': {
            marginLeft: '8px',
          },
          '&[data-popper-placement*="left"] .MuiTooltip-tooltip': {
            marginRight: '8px',
          },
        },
      },
    },
  };

  return (
    <div className="flex items-center justify-end mt-2">
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
                className={`group px-4 py-2 text-xs font-medium transition-all duration-300 backdrop-blur-sm shadow-sm ${
                  isActive
                    ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-500/60 shadow-blue-100/50 dark:shadow-blue-900/30'
                    : 'bg-gradient-to-br from-white/90 to-slate-50/80 dark:from-slate-800/40 dark:to-slate-700/30 text-slate-600 dark:text-slate-300 hover:from-slate-50/95 hover:to-slate-100/90 dark:hover:from-slate-700/60 dark:hover:to-slate-600/50 hover:text-slate-700 dark:hover:text-slate-200 hover:shadow-md hover:scale-[1.02]'
                } ${
                  isFirst ? 'rounded-l-lg' : isLast ? 'rounded-r-lg border-l-0' : 'border-l-0'
                } border border-slate-200/60 dark:border-slate-600/40`}
              >
                <div className="flex items-center">
                  <span
                    className={`mr-2 transition-all duration-200 ${
                      isActive
                        ? 'opacity-100 text-blue-600 dark:text-blue-400 transform scale-110'
                        : 'opacity-75 group-hover:opacity-90 group-hover:scale-105'
                    }`}
                  >
                    {config.icon}
                  </span>
                  <span
                    className={`font-medium ${
                      isActive
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {config.label}
                  </span>
                </div>
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};
