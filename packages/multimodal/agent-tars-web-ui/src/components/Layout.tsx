import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ChatPanel } from './ChatPanel';
import { ToolPanel } from './ToolPanel';
import { Shell } from './Shell';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { motion } from 'framer-motion';

export const Layout: React.FC = () => {
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 lg:bg-zinc-100 lg:dark:bg-[#131315] text-gray-900 dark:text-gray-100 overflow-hidden">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        <div className="flex gap-4 h-full">
          <motion.div
            layout
            className={`${isPanelCollapsed ? 'flex-1' : 'w-[30%] md:w-[45%] lg:w-[40%]'} transition-all duration-300`}
          >
            <Shell>
              <ChatPanel isPanelCollapsed={isPanelCollapsed} />
            </Shell>
          </motion.div>

          <motion.div
            layout
            className={`${isPanelCollapsed ? 'w-12' : 'w-[70%] md:w-[55%] lg:w-[60%]'} transition-all duration-300`}
          >
            <Shell
              headerActions={
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100/70 dark:hover:bg-gray-700/40 transition-all duration-200"
                >
                  {isPanelCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
                </motion.button>
              }
              title={!isPanelCollapsed ? 'Result View' : undefined}
            >
              <ToolPanel
                isCollapsed={isPanelCollapsed}
                onToggleCollapse={() => setIsPanelCollapsed(!isPanelCollapsed)}
              />
            </Shell>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
