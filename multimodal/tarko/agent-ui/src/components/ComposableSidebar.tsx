import React, { ReactNode } from 'react';
import { Sidebar as OriginalSidebar } from '../standalone/sidebar';

export interface ComposableSidebarProps {
  // Custom items to render
  items?: ReactNode;
  
  // Configuration
  showSessions?: boolean;
  showAgentConfig?: boolean;
  showWorkspace?: boolean;
  
  // Event handlers
  onSessionSelect?: (sessionId: string) => void;
  onSessionCreate?: () => void;
  onSessionDelete?: (sessionId: string) => void;
  
  // Custom sections
  header?: ReactNode;
  footer?: ReactNode;
  customSections?: ReactNode[];
  
  // Styling
  className?: string;
  variant?: 'default' | 'minimal' | 'compact';
  width?: number | string;
}

export const ComposableSidebar: React.FC<ComposableSidebarProps> = ({
  items,
  showSessions = true,
  showAgentConfig = true,
  showWorkspace = true,
  onSessionSelect,
  onSessionCreate,
  onSessionDelete,
  header,
  footer,
  customSections,
  className = '',
  variant = 'default',
  width = 320
}) => {
  const sidebarStyle = {
    width: typeof width === 'number' ? `${width}px` : width
  };

  if (items) {
    // Custom items provided, render them
    return (
      <div className={`sidebar-container ${className}`} style={sidebarStyle}>
        {header && (
          <div className="sidebar-header">
            {header}
          </div>
        )}
        
        <div className="sidebar-content">
          {items}
        </div>
        
        {footer && (
          <div className="sidebar-footer">
            {footer}
          </div>
        )}
      </div>
    );
  }

  // Use original sidebar with configuration
  return (
    <div className={`sidebar-wrapper ${variant} ${className}`} style={sidebarStyle}>
      {header && (
        <div className="sidebar-header">
          {header}
        </div>
      )}
      
      <OriginalSidebar 
        // Pass through configuration props
        // Note: This would need to be enhanced in the original Sidebar component
      />
      
      {customSections && customSections.map((section, index) => (
        <div key={index} className="sidebar-custom-section">
          {section}
        </div>
      ))}
      
      {footer && (
        <div className="sidebar-footer">
          {footer}
        </div>
      )}
    </div>
  );
};

export default ComposableSidebar;
