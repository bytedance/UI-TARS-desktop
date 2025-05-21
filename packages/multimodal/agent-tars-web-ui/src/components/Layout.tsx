import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ChatPanel } from './ChatPanel';
import { ToolPanel } from './ToolPanel';

export const Layout: React.FC = () => {
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Sidebar />
      <ChatPanel isPanelCollapsed={isPanelCollapsed} />
      <ToolPanel
        isCollapsed={isPanelCollapsed}
        onToggleCollapse={() => setIsPanelCollapsed(!isPanelCollapsed)}
      />
    </div>
  );
};
