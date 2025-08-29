import { TooltipProps } from '@mui/material';

/**
 * Standard tooltip configuration for consistent appearance across the application
 */
export const getTooltipProps = (placement: TooltipProps['placement'] = 'bottom'): Partial<TooltipProps> => ({
  arrow: true,
  placement,
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
});
