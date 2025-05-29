import React from 'react';
import { motion } from 'framer-motion';
import { FiMonitor, FiEye, FiSettings, FiCode, FiInfo } from 'react-icons/fi';

interface BrowserControlDisplayProps {
  mode: string;
  tools: string[];
}

/**
 * BrowserControlDisplay - Component to display browser control mode and active tools
 *
 * Design principles:
 * - Elegant, minimal interface that shows essential information without overwhelming
 * - Visually differentiates between different browser control strategies
 * - Expandable to show active tools with appropriate categorization
 * - Consistent with overall UI design language
 */
export const BrowserControlDisplay: React.FC<BrowserControlDisplayProps> = ({ mode, tools }) => {
  const [expanded, setExpanded] = React.useState(false);

  // Format the mode name for display
  const formatModeName = (mode: string): string => {
    switch (mode) {
      case 'default':
        return 'Hybrid Browser Control';
      case 'browser-use-only':
        return 'DOM-based Browser Control';
      case 'gui-agent-only':
        return 'Vision-based Browser Control';
      default:
        return `Browser Control: ${mode}`;
    }
  };

  // Get icon based on mode
  const getModeIcon = () => {
    switch (mode) {
      case 'default':
        return <FiSettings className="text-purple-500" />;
      case 'browser-use-only':
        return <FiCode className="text-blue-500" />;
      case 'gui-agent-only':
        return <FiEye className="text-green-500" />;
      default:
        return <FiMonitor className="text-gray-500" />;
    }
  };

  // Group tools by category for better organization
  const groupedTools = React.useMemo(() => {
    const groups: Record<string, string[]> = {
      navigation: [],
      interaction: [],
      content: [],
      visual: [],
      status: [],
      other: [],
    };

    tools.forEach((tool) => {
      if (
        tool.includes('navigate') ||
        tool.includes('back') ||
        tool.includes('forward') ||
        tool.includes('refresh') ||
        tool.includes('tab')
      ) {
        groups.navigation.push(tool);
      } else if (
        tool.includes('click') ||
        tool.includes('type') ||
        tool.includes('press') ||
        tool.includes('hover') ||
        tool.includes('drag') ||
        tool.includes('scroll')
      ) {
        groups.interaction.push(tool);
      } else if (
        tool.includes('get_markdown') ||
        tool.includes('get_html') ||
        tool.includes('get_text')
      ) {
        groups.content.push(tool);
      } else if (tool.includes('screenshot') || tool === 'browser_vision_control') {
        groups.visual.push(tool);
      } else if (
        tool.includes('get_url') ||
        tool.includes('get_title') ||
        tool.includes('get_elements')
      ) {
        groups.status.push(tool);
      } else {
        groups.other.push(tool);
      }
    });

    // Only return non-empty groups
    return Object.entries(groups)
      .filter(([_, tools]) => tools.length > 0)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  }, [tools]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'navigation':
        return <FiMonitor size={12} className="text-blue-500" />;
      case 'interaction':
        return <FiSettings size={12} className="text-purple-500" />;
      case 'content':
        return <FiCode size={12} className="text-amber-500" />;
      case 'visual':
        return <FiEye size={12} className="text-green-500" />;
      case 'status':
        return <FiInfo size={12} className="text-cyan-500" />;
      default:
        return <FiSettings size={12} className="text-gray-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[#E5E6EC] dark:border-gray-700/20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm overflow-hidden mb-4"
    >
      <motion.div
        className="p-3 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
        whileTap={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
      >
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100/80 dark:bg-gray-700/80 mr-3">
            {getModeIcon()}
          </div>
          <div>
            <div className="font-medium text-gray-800 dark:text-gray-200">
              {formatModeName(mode)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {tools.length} active tools
            </div>
          </div>
        </div>

        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gray-400"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </motion.div>
      </motion.div>

      <motion.div
        initial="collapsed"
        animate={expanded ? 'expanded' : 'collapsed'}
        variants={{
          expanded: { height: 'auto', opacity: 1 },
          collapsed: { height: 0, opacity: 0 },
        }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-3 space-y-3">
          {Object.entries(groupedTools).map(([category, categoryTools]) => (
            <div key={category}>
              <div className="flex items-center my-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                {getCategoryIcon(category)}
                <span className="ml-1.5 capitalize">{category}</span>
                <span className="ml-1 text-gray-400 dark:text-gray-500">
                  ({categoryTools.length})
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {categoryTools.map((tool) => (
                  <div
                    key={tool}
                    className="text-xs px-2 py-1 rounded-full bg-gray-100/70 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border border-gray-200/40 dark:border-gray-700/30"
                  >
                    {tool.replace(/^browser_/, '')}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};
