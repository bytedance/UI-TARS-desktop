import React from 'react';
import { FiClock, FiCheckCircle, FiShuffle } from 'react-icons/fi';
import { Tooltip, TooltipProps } from '@mui/material';

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
    <div className="flex items-center justify-center mt-4">
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
