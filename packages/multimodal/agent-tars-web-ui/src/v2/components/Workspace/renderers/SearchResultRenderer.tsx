import React from 'react';
import { ToolResultContentPart } from '@agent-tars/core';
import { motion } from 'framer-motion';
import { FiExternalLink, FiSearch, FiInfo, FiArrowRight } from 'react-icons/fi';

interface SearchResultRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

/**
 * Renders search results with enhanced visual design
 * 
 * Design improvements:
 * - Card-based layout with hover effects for each result
 * - Clear visual hierarchy with proper typography
 * - Truncated URLs with hover expansion
 * - Visual indicators for result ranking
 * - Quick action buttons for visiting pages
 */
export const SearchResultRenderer: React.FC<SearchResultRendererProps> = ({ part }) => {
  const { results, query } = part;
  console.log('results', results);
  

  if (!results || !Array.isArray(results)) {
    return <div className="text-gray-500 italic">Search results missing</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search query section with enhanced styling */}
      {query && (
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100/70 dark:border-blue-800/30 flex items-center justify-center mr-3 text-blue-600 dark:text-blue-400">
              <FiSearch size={20} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Search Results</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{results.length} results found</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl px-5 py-4 text-sm font-medium text-gray-800 dark:text-gray-200 border border-blue-100/30 dark:border-blue-900/20 shadow-sm">
            <div className="flex items-center">
              <FiSearch className="text-blue-500 dark:text-blue-400 mr-2" size={14} />
              <span className="text-blue-700 dark:text-blue-300">{query}</span>
            </div>
          </div>
        </div>
      )}

      {/* No results state */}
      {results.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center border border-gray-100/50 dark:border-gray-700/30">
          <FiInfo className="mx-auto mb-2 text-gray-400" size={24} />
          <p className="text-gray-600 dark:text-gray-400">No search results found. Try different search terms.</p>
        </div>
      )}

      {/* Results list with enhanced card design */}
      <div className="space-y-4">
        {results.map((result, index) => (
          <motion.div 
            key={index} 
            whileHover={{ y: -3, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }} 
            transition={{ duration: 0.2 }}
            className="group"
          >
            {/* Result card with hover effects */}
            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100/50 dark:border-gray-700/30 hover:border-blue-200/60 dark:hover:border-blue-700/40 transition-all duration-200">
              {/* Colorful rank indicator */}
              <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-80"></div>
              
              <div className="p-5">
                {/* Title and link */}
                <div className="flex items-start">
                  {/* Rank indicator */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mr-3 text-blue-600 dark:text-blue-400 border border-blue-100/60 dark:border-blue-800/30 font-medium text-sm">
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

                    {/* URL with truncation and hover expansion */}
                    <div className="mb-3">
                      <div className="inline-block max-w-[320px] px-2 py-1 bg-gray-50 dark:bg-gray-700/40 rounded text-xs text-gray-500 dark:text-gray-400 truncate hover:max-w-full transition-all duration-300 border border-gray-100/40 dark:border-gray-700/40">
                        {result.url}
                      </div>
                    </div>

                    {/* Snippet with improved typography */}
                    <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all duration-300">
                      {result.snippet}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer with visit button */}
              <div className="bg-gray-50/80 dark:bg-gray-800/80 px-5 py-3 border-t border-gray-100/40 dark:border-gray-700/20 flex items-center justify-end">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors duration-200 group/btn border border-blue-100/60 dark:border-blue-800/30"
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
