import React from 'react';
import { motion } from 'framer-motion';
import { FiEye, FiCode, FiActivity } from 'react-icons/fi';
import { WorkspaceDisplayMode } from '@/common/state/atoms/workspace';

interface WorkspaceDisplayModeToggleProps {
  value: WorkspaceDisplayMode;
  onChange: (mode: WorkspaceDisplayMode) => void;
}

const modes: Array<{
  value: WorkspaceDisplayMode;
  label: string;
  icon: React.ReactNode;
}> = [
  { value: 'interaction', label: 'UI', icon: <FiEye size={12} /> },
  { value: 'events', label: 'Events', icon: <FiActivity size={12} /> },
  { value: 'raw', label: 'RAW', icon: <FiCode size={12} /> },
];

export const WorkspaceDisplayModeToggle: React.FC<WorkspaceDisplayModeToggleProps> = ({
  value,
  onChange,
}) => {
  const currentIndex = modes.findIndex((mode) => mode.value === value);

  return (
    <div className="relative flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {/* Background slider */}
      <motion.div
        className="absolute top-1 bottom-1 bg-white dark:bg-gray-700 rounded-md shadow-sm"
        initial={false}
        animate={{
          left: `${(currentIndex * 100) / modes.length}%`,
          width: `${100 / modes.length}%`,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      />

      {/* Mode buttons */}
      {modes.map((mode, index) => (
        <button
          key={mode.value}
          onClick={() => onChange(mode.value)}
          className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
            value === mode.value
              ? 'text-gray-900 dark:text-gray-100'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
          style={{ width: `${100 / modes.length}%` }}
        >
          {mode.icon}
          <span className="whitespace-nowrap">{mode.label}</span>
        </button>
      ))}
    </div>
  );
};
