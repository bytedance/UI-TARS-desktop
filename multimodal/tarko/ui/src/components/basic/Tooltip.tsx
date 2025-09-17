import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

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
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  if (!title) {
    return children;
  }

  const updatePosition = () => {
    if (!triggerRef.current) return;
    
    const rect = triggerRef.current.getBoundingClientRect();
    const offset = 8;
    
    let top = 0;
    let left = 0;
    
    switch (placement) {
      case 'top':
        top = rect.top - offset;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + offset;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - offset;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + offset;
        break;
    }
    
    setPosition({ top, left });
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  const getTooltipStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      top: position.top,
      left: position.left,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: '#ffffff',
      fontSize: '12px',
      padding: '6px 8px',
      borderRadius: '6px',
      zIndex: 50001,
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      opacity: isVisible ? 1 : 0,
      transition: 'opacity 150ms ease-in-out',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(8px)',
    };

    switch (placement) {
      case 'top':
        return { ...baseStyle, transform: 'translate(-50%, -100%)' };
      case 'bottom':
        return { ...baseStyle, transform: 'translateX(-50%)' };
      case 'left':
        return { ...baseStyle, transform: 'translate(-100%, -50%)' };
      case 'right':
        return { ...baseStyle, transform: 'translateY(-50%)' };
      default:
        return baseStyle;
    }
  };

  const tooltipElement = isVisible ? (
    <div style={getTooltipStyle()}>
      {title}
    </div>
  ) : null;

  return (
    <>
      <div 
        ref={triggerRef}
        className={className}
        style={{ position: 'relative', display: 'inline-block' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {tooltipElement && createPortal(tooltipElement, document.body)}
    </>
  );
};
