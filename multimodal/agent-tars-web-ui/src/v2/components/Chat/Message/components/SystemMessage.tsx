import React from 'react';
import { FiInfo } from 'react-icons/fi';

interface SystemMessageProps {
  content: string;
}

/**
 * Component for displaying system messages
 * 
 * Design principles:
 * - Simple, informational styling
 * - Clear visual indication of system-generated content
 */
export const SystemMessage: React.FC<SystemMessageProps> = ({ content }) => (
  <div className="flex items-center gap-2 text-sm">
    <FiInfo className="shrink-0" />
    <span>{content}</span>
  </div>
);
