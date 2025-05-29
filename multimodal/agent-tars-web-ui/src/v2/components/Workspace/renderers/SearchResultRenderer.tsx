import React from 'react';
import { ToolResultContentPart } from '@agent-tars/core';
import { motion } from 'framer-motion';
import { FiExternalLink, FiSearch, FiInfo, FiGlobe } from 'react-icons/fi';

interface SearchResultRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

/**
 * Renders search results with refined visual design
 * 
 * Design improvements:
 * - Clean, minimalist card layout with subtle animations
 * - Consistent typography with proper hierarchy
 * - Refined spacing and subtle borders
 * - Simplified URL display
 * - Elegant interaction feedback
 */
export const SearchResultRenderer: React.FC<SearchResultRendererProps> = ({ part }) => {
  const { results, query } = part;

  if (!results || !Array.isArray(results)) {
    return <div className="text-gray-500 italic">Search results missing</div>;
  }

  return (
    <div className="space-y-5">
      {/* Search query section with minimal styling */}
      {query && (
        <div className="mb-5">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/50 flex items-center justify-center mr-4 text-gray-600 dark:text-gray-400">
              <FiSearch size={20} />
            </div>
            <div>
              <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200">Search Results</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{results.length} results found for your query</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-gray-200 border border-gray-200/70 dark:border-gray-700/50">
            <div className="flex items-center">
              <FiSearch className="text-gray-500 dark:text-gray-400 mr-2" size={14} />
              <span>{query}</span>
            </div>
          </div>
        </div>
      )}

      {/* No results state with simplified design */}
      {results.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 text-center border border-gray-200/70 dark:border-gray-700/50">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
            <FiInfo className="text-gray-400" size={24} />
          </div>
          <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">No search results found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Try using different search terms or broaden your query.
          </p>
        </div>
      )}

      {/* Results list with refined card design */}
      <div className="space-y-4">
        {results.map((result, index) => (
          <motion.div 
            key={index} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ y: -2 }} 
            className="group"
          >
            {/* Simplified result card with minimal styling */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/70 dark:border-gray-700/50 overflow-hidden transition-all duration-200 hover:border-gray-300/70 dark:hover:border-gray-600/50">
              <div className="p-4">
                {/* Title and link with improved layout */}
                <div className="flex items-start">
                  <div className="min-w-0 flex-1">
                    {/* Title with subtle external link icon */}
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/link"
                    >
                      <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2 flex items-center hover:text-accent-600 dark:hover:text-accent-400 transition-colors">
                        <span className="mr-2">{index + 1}. {result.title}</span>
                        <FiExternalLink
                          className="text-gray-400 dark:text-gray-500 opacity-0 group-hover/link:opacity-100 transition-opacity duration-200"
                          size={14}
                        />
                      </h3>
                    </a>

                    {/* URL with simplified display */}
                    <div className="mb-3">
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <FiGlobe size={12} className="mr-1.5" />
                        <span className="truncate">{result.url}</span>
                      </div>
                    </div>

                    {/* Snippet with clean typography */}
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      {result.snippet}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
