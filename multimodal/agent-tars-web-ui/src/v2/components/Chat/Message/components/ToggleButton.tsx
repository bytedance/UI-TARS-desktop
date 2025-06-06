import React from 'react';
import { motion } from 'framer-motion';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

interface ToggleButtonProps {
  isExpanded: boolean;
  onToggle: () => void;
  expandedText: string;
  collapsedText: string;
  icon?: React.ReactNode;
}

/**
 * Reusable toggle button component
 * 
 * Design principles:
 * - Consistent interaction patterns
 * - Visual feedback for state changes
 * - Flexible styling with icon support
 */
export const ToggleButton: React.FC<ToggleButtonProps> = ({
  isExpanded,
  onToggle,
  expandedText,
  collapsedText,
  icon,
}) => (
  <motion.button
    whileHover={{ x: 3 }}
    onClick={onToggle}
    className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 py-1 px-2 mt-1 rounded-lg hover:bg-gray-50/70 dark:hover:bg-gray-700/20 transition-all duration-200"
  >
    {isExpanded ? <FiChevronUp className="mr-1.5" /> : <FiChevronDown className="mr-1.5" />}
    {icon}
    {isExpanded ? expandedText : collapsedText}
  </motion.button>
);
