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
  },
  afterAction: {
    label: 'After',
    icon: <FiFastForward size={12} />,
  },
  both: {
    label: 'Both',
    icon: <FiShuffle size={12} />,
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
      <Tooltip title="Screenshot display mode" {...tooltipProps}>
        <div className="inline-flex rounded-md" role="group">
          {strategies.map((strategy, index) => {
            const config = strategyConfig[strategy];
            const isActive = currentStrategy === strategy;
            const isFirst = index === 0;
            const isLast = index === strategies.length - 1;

            return (
              <button
                key={strategy}
                type="button"
                onClick={() => onStrategyChange(strategy)}
                className={`px-3 py-1.5 text-xs font-medium transition-all duration-200 backdrop-blur-sm ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300/80 dark:border-slate-500/60'
                    : 'bg-white/80 dark:bg-slate-800/30 text-slate-600 dark:text-slate-300 hover:bg-slate-50/90 dark:hover:bg-slate-700/80 hover:text-slate-700 dark:hover:text-slate-200'
                } ${
                  isFirst ? 'rounded-l-md' : isLast ? 'rounded-r-md border-l-0' : 'border-l-0'
                } border border-slate-200/60 dark:border-slate-600/40`}
              >
                <div className="flex items-center">
                  <span className={`mr-1.5 ${isActive ? 'opacity-90' : 'opacity-70'}`}>
                    {config.icon}
                  </span>
                  <span>{config.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </Tooltip>
    </div>
  );
};
