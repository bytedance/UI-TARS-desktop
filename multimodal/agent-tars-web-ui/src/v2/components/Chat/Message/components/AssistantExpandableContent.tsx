import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarkdownRenderer } from '../../../Markdown';
import { ToggleButton } from './ToggleButton';

interface AssistantExpandableContentProps {
  content: string;
  showSteps: boolean;
  setShowSteps: (show: boolean) => void;
}

/**
 * Component for assistant messages with expandable content
 * 
 * Design principles:
 * - Progressive disclosure of detailed information
 * - Smooth animations for content expansion
 * - Maintains readability by showing summary first
 */
export const AssistantExpandableContent: React.FC<AssistantExpandableContentProps> = ({
  content,
  showSteps,
  setShowSteps,
}) => {
  // Extract just the first paragraph as summary
  const summary = content.split('\n')[0];
  const hasMoreContent = content.length > summary.length;

  return (
    <>
      <div className="prose dark:prose-invert prose-sm max-w-none text-xs">
        <MarkdownRenderer content={summary} />
      </div>

      <AnimatePresence>
        {showSteps && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mt-1"
          >
            <div className="prose dark:prose-invert prose-sm max-w-none text-xs border-t border-gray-100/30 dark:border-gray-700/20 pt-1 mt-1">
              <MarkdownRenderer content={content.substring(summary.length)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hasMoreContent && (
        <ToggleButton
          isExpanded={showSteps}
          onToggle={() => setShowSteps(!showSteps)}
          expandedText="Hide detailed steps"
          collapsedText="Show detailed steps"
        />
      )}
    </>
  );
};