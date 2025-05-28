import React from 'react';
import { ToolResultContentPart } from '@agent-tars/core';
import { motion } from 'framer-motion';
import { FiExternalLink, FiSearch, FiInfo, FiArrowRight, FiBookmark, FiGlobe } from 'react-icons/fi';

interface SearchResultRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

/**
 * Renders search results with enhanced visual design
 * 
 * Design improvements:
 * - Modern card-based layout with subtle animations
 * - Clear visual hierarchy with proper typography
 * - Elegant URL display with hover effects
 * - Visual indicators for source reputation
 * - Quick action buttons with visual feedback
 */
export const SearchResultRenderer: React.FC<SearchResultRendererProps> = ({ part }) => {
  const { results, query } = part;

  if (!results || !Array.isArray(results)) {
    return <div className="text-gray-500 italic">Search results missing</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search query section with enhanced styling */}
      {query && (
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-100/70 dark:border-blue-800/30 flex items-center justify-center mr-4 text-blue-600 dark:text-blue-400 shadow-sm">
              <FiSearch size={24} />
            </div>
            <div>
              <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200">Search Results</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{results.length} results found for your query</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl px-5 py-4 text-sm font-medium text-gray-800 dark:text-gray-200 border border-blue-100/30 dark:border-blue-900/20 shadow-sm">
            <div className="flex items-center">
              <FiSearch className="text-blue-500 dark:text-blue-400 mr-2" size={16} />
              <span className="text-blue-700 dark:text-blue-300 font-medium">{query}</span>
            </div>
          </div>
        </div>
      )}

      {/* No results state with improved visual design */}
      {results.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center border border-gray-100/50 dark:border-gray-700/30 shadow-md">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
            <FiInfo className="text-gray-400" size={28} />
          </div>
          <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">No search results found</h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">Try using different search terms or broaden your query.</p>
        </div>
      )}

      {/* Results list with enhanced card design */}
      <div className="space-y-5">
        {results.map((result, index) => (
          <motion.div 
            key={index} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)' }} 
            className="group overflow-hidden"
          >
            {/* Redesigned result card with improved visual hierarchy */}
            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100/50 dark:border-gray-700/30 hover:border-blue-200/60 dark:hover:border-blue-700/40 transition-all duration-200 shadow-sm hover:shadow-md">
              {/* Result rank indicator with gradient */}
              <div className="h-1.5 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-80"></div>
              
              <div className="p-5">
                {/* Title and link with improved layout */}
                <div className="flex items-start">
                  {/* Rank indicator */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mr-4 text-blue-600 dark:text-blue-400 border border-blue-100/60 dark:border-blue-800/30 font-medium text-sm shadow-sm">
                    {index + 1}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    {/* Title with external link icon */}
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/link"
                    >
                      <h3 className="font-semibold text-blue-600 dark:text-blue-400 mb-2 text-lg group-hover/link:text-blue-700 dark:group-hover/link:text-blue-300 transition-colors duration-200 flex items-center">
                        <span className="mr-2">{result.title}</span>
                        <FiExternalLink
                          className="text-blue-400 dark:text-blue-500 opacity-0 group-hover/link:opacity-100 transition-opacity duration-200"
                          size={16}
                        />
                      </h3>
                    </a>

                    {/* URL with improved display and truncation */}
                    <div className="mb-3 flex items-center">
                      <FiGlobe size={14} className="text-gray-400 dark:text-gray-500 mr-2" />
                      <div className="inline-block max-w-[90%] px-2 py-1 bg-gray-50 dark:bg-gray-700/40 rounded text-xs text-gray-500 dark:text-gray-400 truncate hover:max-w-full transition-all duration-300 border border-gray-100/40 dark:border-gray-700/40">
                        {result.url}
                      </div>
                    </div>

                    {/* Snippet with improved typography and style */}
                    <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all duration-300 bg-gray-50/50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100/30 dark:border-gray-700/20">
                      {result.snippet}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer with improved action buttons */}
              <div className="bg-gray-50/80 dark:bg-gray-800/80 px-5 py-3 border-t border-gray-100/40 dark:border-gray-700/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400 transition-colors duration-200 border border-gray-200/50 dark:border-gray-700/30"
                  >
                    <FiBookmark size={12} />
                    <span>Save</span>
                  </motion.button>
                </div>
                
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors duration-200 group/btn border border-blue-100/60 dark:border-blue-800/30"
                >
                  <span>Visit page</span>
                  <FiArrowRight className="transition-transform duration-200 group-hover/btn:translate-x-0.5" size={12} />
                </a>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
