import React, { useState } from 'react';
import { useDarkMode } from '../../hooks/useDarkMode';

export interface TooltipProps {
  title: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement;
  className?: string;
}

/**
 * Standard Tooltip component with consistent styling across the application
 */
export const Tooltip: React.FC<TooltipProps> = ({ 
  title, 
  placement = 'bottom', 
  children, 
  className 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const isDarkMode = useDarkMode();

  if (!title) {
    return children;
  }

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    backgroundColor: '#000000',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 500,
    padding: '8px 12px',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    zIndex: 10000,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    opacity: isVisible ? 1 : 0,
    visibility: isVisible ? 'visible' : 'hidden',
    transition: 'opacity 150ms, visibility 150ms',
  };

  // Position the tooltip based on placement
  const getTooltipPosition = () => {
    const offset = 8;
    switch (placement) {
      case 'top':
        return {
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: `${offset}px`,
        };
      case 'bottom':
        return {
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: `${offset}px`,
        };
      case 'left':
        return {
          right: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          marginRight: `${offset}px`,
        };
      case 'right':
        return {
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          marginLeft: `${offset}px`,
        };
      default:
        return {};
    }
  };

  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
  };

  const getArrowStyle = () => {
    const arrowSize = 4;
    switch (placement) {
      case 'top':
        return {
          ...arrowStyle,
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: `${arrowSize}px ${arrowSize}px 0 ${arrowSize}px`,
          borderColor: '#000000 transparent transparent transparent',
        };
      case 'bottom':
        return {
          ...arrowStyle,
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: `0 ${arrowSize}px ${arrowSize}px ${arrowSize}px`,
          borderColor: 'transparent transparent #000000 transparent',
        };
      case 'left':
        return {
          ...arrowStyle,
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`,
          borderColor: 'transparent transparent transparent #000000',
        };
      case 'right':
        return {
          ...arrowStyle,
          right: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`,
          borderColor: 'transparent #000000 transparent transparent',
        };
      default:
        return arrowStyle;
    }
  };

  const positionStyle = getTooltipPosition();
  const finalTooltipStyle = { ...tooltipStyle, ...positionStyle };
  const finalArrowStyle = getArrowStyle();

  return (
    <div 
      className={className}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      <div style={finalTooltipStyle}>
        {title}
        <div style={finalArrowStyle} />
      </div>
    </div>
  );
};
