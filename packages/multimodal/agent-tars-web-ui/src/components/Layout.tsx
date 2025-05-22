import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ChatPanel } from './ChatPanel';
import { ToolPanel } from './ToolPanel';
import { Shell } from './Shell';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export const Layout: React.FC = () => {
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        <div className="flex gap-4 h-full">
          <div className={`${isPanelCollapsed ? 'flex-1' : 'w-[60%]'} transition-all duration-300`}>
            <Shell>
              <ChatPanel isPanelCollapsed={isPanelCollapsed} />
            </Shell>
          </div>
          
          <div className={`${isPanelCollapsed ? 'w-12' : 'w-[40%]'} transition-all duration-300`}>
            <Shell
              headerActions={
                <button
                  onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {isPanelCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
                </button>
              }
              title={!isPanelCollapsed ? "Tool Results" : undefined}
            >
              <ToolPanel 
                isCollapsed={isPanelCollapsed} 
                onToggleCollapse={() => setIsPanelCollapsed(!isPanelCollapsed)} 
              />
            </Shell>
          </div>
        </div>
      </div>
    </div>
  );
};
