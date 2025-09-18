import React, { ReactNode } from 'react';
import HomePage from '../standalone/home/HomePage';

export interface ComposableHomeProps {
  // Custom welcome content
  welcomeMessage?: ReactNode;
  
  // Quick actions
  quickActions?: ReactNode[];
  
  // Recent sessions
  showRecentSessions?: boolean;
  recentSessionsLimit?: number;
  onSessionSelect?: (sessionId: string) => void;
  
  // Getting started
  showGettingStarted?: boolean;
  gettingStartedContent?: ReactNode;
  
  // Custom sections
  customSections?: ReactNode[];
  
  // Event handlers
  onNewChat?: () => void;
  onUploadFile?: (files: FileList) => void;
  onSelectTemplate?: (template: any) => void;
  
  // Styling
  className?: string;
  variant?: 'default' | 'minimal' | 'dashboard';
  
  // Layout
  layout?: 'grid' | 'list' | 'cards';
}

export const ComposableHome: React.FC<ComposableHomeProps> = ({
  welcomeMessage,
  quickActions,
  showRecentSessions = true,
  recentSessionsLimit = 5,
  onSessionSelect,
  showGettingStarted = true,
  gettingStartedContent,
  customSections,
  onNewChat,
  onUploadFile,
  onSelectTemplate,
  className = '',
  variant = 'default',
  layout = 'grid'
}) => {
  if (variant === 'minimal') {
    return (
      <div className={`home-minimal ${className}`}>
        {welcomeMessage || (
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome to Agent TARS
            </h1>
          </div>
        )}
        
        {quickActions && (
          <div className="flex justify-center gap-4 mt-8">
            {quickActions.map((action, index) => (
              <div key={index}>{action}</div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <div className={`home-dashboard ${layout} ${className}`}>
        {welcomeMessage && (
          <div className="dashboard-header mb-8">
            {welcomeMessage}
          </div>
        )}
        
        <div className="dashboard-grid grid gap-6">
          {quickActions && (
            <div className="quick-actions-card">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action, index) => (
                  <div key={index}>{action}</div>
                ))}
              </div>
            </div>
          )}
          
          {showRecentSessions && (
            <div className="recent-sessions-card">
              <h3 className="text-lg font-semibold mb-4">Recent Sessions</h3>
              {/* Recent sessions content would go here */}
            </div>
          )}
          
          {customSections && customSections.map((section, index) => (
            <div key={index} className="custom-section-card">
              {section}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default variant - use original HomePage with enhancements
  return (
    <div className={`home-wrapper ${className}`}>
      {welcomeMessage && (
        <div className="custom-welcome mb-6">
          {welcomeMessage}
        </div>
      )}
      
      <HomePage 
        // Pass through props to original component
        // Note: Original HomePage would need to be enhanced to accept these props
      />
      
      {customSections && (
        <div className="custom-sections mt-6">
          {customSections.map((section, index) => (
            <div key={index} className="custom-section mb-4">
              {section}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComposableHome;
