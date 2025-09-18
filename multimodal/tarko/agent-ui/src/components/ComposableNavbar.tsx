import React, { ReactNode } from 'react';
import { Navbar as OriginalNavbar } from '../standalone/navbar';

export interface ComposableNavbarProps {
  // Custom items to render
  items?: ReactNode;
  
  // Configuration
  showModelSelector?: boolean;
  showAgentSelector?: boolean;
  showSettings?: boolean;
  
  // Event handlers
  onModelChange?: (model: any) => void;
  onAgentChange?: (agent: any) => void;
  onSettingsClick?: () => void;
  
  // Custom actions
  leftActions?: ReactNode;
  rightActions?: ReactNode;
  
  // Styling
  className?: string;
  variant?: 'default' | 'minimal' | 'compact';
}

export const ComposableNavbar: React.FC<ComposableNavbarProps> = ({
  items,
  showModelSelector = true,
  showAgentSelector = true,
  showSettings = true,
  onModelChange,
  onAgentChange,
  onSettingsClick,
  leftActions,
  rightActions,
  className = '',
  variant = 'default'
}) => {
  if (items) {
    // Custom items provided, render them
    return (
      <div className={`navbar-container ${className}`}>
        {items}
      </div>
    );
  }

  // Use original navbar with configuration
  return (
    <div className={`navbar-wrapper ${variant} ${className}`}>
      {leftActions && (
        <div className="navbar-left-actions">
          {leftActions}
        </div>
      )}
      
      <OriginalNavbar 
        // Pass through configuration props
        // Note: This would need to be enhanced in the original Navbar component
      />
      
      {rightActions && (
        <div className="navbar-right-actions">
          {rightActions}
        </div>
      )}
    </div>
  );
};

export default ComposableNavbar;
