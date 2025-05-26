import React from 'react';
import { ToolResultContentPart } from '@agent-tars/core';
import { motion } from 'framer-motion';
import { FiExternalLink, FiSearch } from 'react-icons/fi';

interface SearchResultRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

/**
 * Renders search results with title, URL, and snippet
 */
export const SearchResultRenderer: React.FC<SearchResultRendererProps> = ({ part }) => {
  const { results, query } = part;

  if (!results || !Array.isArray(results)) {
    return <div className="text-gray-500 italic">Search results missing</div>;
  }

  return (
    <div className="space-y-6">
      {query && (
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <FiSearch className="text-gray-600 dark:text-gray-400 mr-2.5" size={18} />
            <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">Search query</h3>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl px-5 py-4 text-sm font-medium text-gray-800 dark:text-gray-200 border border-gray-100/50 dark:border-gray-700/20 shadow-sm">
            {query}
          </div>
        </div>
      )}

      {results.map((result, index) => (
        <motion.div key={index} whileHover={{ y: -3 }} className="group relative">
          <div className="absolute -left-3 top-0 w-0.5 h-full bg-accent-400/30 dark:bg-accent-500/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden transition-all duration-200 border border-gray-100/50 dark:border-gray-700/30 hover:border-accent-200/60 dark:hover:border-accent-700/40 relative">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-accent-400/20 dark:bg-accent-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>

            <div className="p-5">
              <div className="flex items-start">
                <div className="min-w-0 flex-1">
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center group/link"
                  >
                    <h3 className="font-semibold text-accent-600 dark:text-accent-500 mb-2 text-lg group-hover/link:text-accent-700 dark:group-hover/link:text-accent-400 transition-colors duration-200 pr-1.5">
                      {result.title}
                    </h3>

                    <FiExternalLink
                      className="text-accent-500 opacity-0 group-hover/link:opacity-100 transition-opacity duration-200"
                      size={16}
                    />
                  </a>

                  <div className="flex items-center mb-3 text-xs text-gray-500 dark:text-gray-400">
                    <div className="max-w-[300px] truncate">{result.url}</div>
                  </div>

                  <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {result.snippet}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50/80 dark:bg-gray-800/80 px-5 py-3 border-t border-gray-100/40 dark:border-gray-700/20 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-accent-500 mr-1.5" />
                  <span>Search result #{index + 1}</span>
                </div>
              </div>

              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-600 dark:text-accent-500 hover:text-accent-700 dark:hover:text-accent-400 font-medium flex items-center transition-colors"
              >
                Visit <FiExternalLink className="ml-1.5" size={14} />
              </a>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
