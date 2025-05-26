import React from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight } from 'react-icons/fi';

interface ToolCallsProps {
  toolCalls: any[];
  onToolCallClick: (toolCall: any) => void;
  getToolIcon: (name: string) => React.ReactNode;
}

/**
 * Component for displaying tool calls
 * 
 * Design principles:
 * - Interactive tool buttons with clear visual feedback
 * - Consistent styling with subtle hover effects
 * - Clear visual hierarchy with appropriate icons
 */
export const ToolCalls: React.FC<ToolCallsProps> = ({
  toolCalls,
  onToolCallClick,
  getToolIcon,
}) => (
  <div className="mt-3 space-y-2">
    {toolCalls.map((toolCall) => (
      <button
        key={toolCall.id}
        onClick={() => onToolCallClick(toolCall)}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-[#E5E6EC] dark:border-gray-700/30 bg-white dark:bg-gray-800 text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60 text-left group"
      >
        {getToolIcon(toolCall.function.name)}
        <div className="truncate flex-1">{toolCall.function.name}</div>
        <FiArrowRight
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          size={14}
        />
      </button>
    ))}
  </div>
);
