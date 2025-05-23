import React from 'react';
import { FiSearch, FiMonitor, FiTerminal, FiFile, FiImage } from 'react-icons/fi';
import { ToolResult } from '../../types';

// Get icon based on tool type
export const getToolIcon = (type: ToolResult['type'] | string) => {
  switch (type) {
    case 'search':
      return <FiSearch />;
    case 'browser':
      return <FiMonitor />;
    case 'command':
      return <FiTerminal />;
    case 'file':
      return <FiFile />;
    case 'image':
      return <FiImage />;
    default:
      return <FiFile />;
  }
};
