import React, { useState } from 'react';

export interface TooltipProps {
  title: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement;
  className?: string;
}

/**
 * Simple Tooltip component
 */
export const Tooltip: React.FC<TooltipProps> = ({ 
  title, 
  placement = 'bottom', 
  children, 
  className 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!title) {
    return children;
  }

  const getTooltipStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      backgroundColor: '#000000',
      color: '#ffffff',
      fontSize: '12px',
      padding: '6px 8px',
      borderRadius: '4px',
      zIndex: 1000,
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      opacity: isVisible ? 1 : 0,
      transition: 'opacity 150ms',
    };

    switch (placement) {
      case 'top':
        return { ...baseStyle, bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '4px' };
      case 'bottom':
        return { ...baseStyle, top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '4px' };
      case 'left':
        return { ...baseStyle, right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '4px' };
      case 'right':
        return { ...baseStyle, left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '4px' };
      default:
        return baseStyle;
    }
  };

  return (
    <div 
      className={className}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <div style={getTooltipStyle()}>
        {title}
      </div>
    </div>
  );
};
