import React from 'react';
import { useAtom } from 'jotai';
import { FiColumns, FiSidebar } from 'react-icons/fi';
import { layoutModeAtom } from '@/common/state/atoms/ui';
import { LayoutMode } from '@tarko/interface';

export const LayoutSwitchButton: React.FC = () => {
  const [layoutMode, setLayoutMode] = useAtom(layoutModeAtom);

  const toggleLayout = () => {
    const newMode: LayoutMode = layoutMode === 'default' ? 'narrow-chat' : 'default';
    setLayoutMode(newMode);
  };

  const isNarrowChat = layoutMode === 'narrow-chat';

  return (
    <button
      onClick={toggleLayout}
      className="w-6 h-6 rounded-lg flex items-center justify-center bg-white dark:bg-gray-800 text-black dark:text-white hover:shadow-md transition-all hover:scale-105 active:scale-95"
      title={isNarrowChat ? 'Switch to Equal Layout' : 'Switch to Narrow Chat Layout'}
    >
      <div className="transition-all duration-200">
        {isNarrowChat ? <FiColumns size={12} /> : <FiSidebar size={12} />}
      </div>
    </button>
  );
};
