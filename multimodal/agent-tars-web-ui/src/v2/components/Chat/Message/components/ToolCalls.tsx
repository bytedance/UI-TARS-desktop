import React from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight } from 'react-icons/fi';

interface ToolCallsProps {
  toolCalls: any[];
  onToolCallClick: (toolCall: any) => void;
  getToolIcon: (name: string) => React.ReactNode;
  isIntermediate?: boolean; // Add support for intermediate styling
}

/**
 * Component for displaying tool calls
 *
 * Design principles:
 * - Interactive tool buttons with clear visual feedback
 * - Consistent styling with subtle hover effects
 * - Clear visual hierarchy with appropriate icons
 * - Support for compact display in thinking sequences
 */
export const ToolCalls: React.FC<ToolCallsProps> = ({
  toolCalls,
  onToolCallClick,
  getToolIcon,
  isIntermediate = false,
}) => (
  <div className="mt-2 space-y-1.5">
    {toolCalls.map((toolCall) => (
      <button
        key={toolCall.id}
        onClick={() => onToolCallClick(toolCall)}
        className="flex items-center gap-2 px-2 py-1 text-[10px] font-medium rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-[#E5E6EC] dark:border-gray-700/30 bg-white dark:bg-gray-800 text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60 text-left group"
      >
        {getToolIcon(toolCall.function.name)}
        <div className="truncate flex-1">{toolCall.function.name}</div>
        <FiArrowRight
          className="ml-auto opacity-60 group-hover:opacity-100 transition-opacity duration-200"
          size={10}
        />
      </button>
    ))}
  </div>
);
