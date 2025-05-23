import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ChatPanel } from './ChatPanel';
import { WorkspacePanel } from './WorkspacePanel';
import { Shell } from './Shell';
import { motion } from 'framer-motion';

export const Layout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 lg:bg-zinc-100 lg:dark:bg-[#131315] text-gray-900 dark:text-gray-100 overflow-hidden">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        <div className="flex gap-4 h-full">
          <motion.div layout className="w-[40%] transition-all duration-300">
            <Shell>
              <ChatPanel isPanelCollapsed={false} />
            </Shell>
          </motion.div>

          <motion.div layout className="w-[60%] transition-all duration-300">
            <Shell>
              <WorkspacePanel isCollapsed={false} onToggleCollapse={() => {}} />
            </Shell>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
