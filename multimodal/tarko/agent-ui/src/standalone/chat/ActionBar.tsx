import React from 'react';

interface ActionBarProps {
  sessionId: string | null;
  className?: string;
}

/**
 * ActionBar Component - Previously managed View Plan functionality
 *
 * Note: Plan functionality has been removed
 */
export const ActionBar: React.FC<ActionBarProps> = ({ sessionId, className = '' }) => {
  // ActionBar no longer displays any content since plan functionality was removed
  return null;
};
