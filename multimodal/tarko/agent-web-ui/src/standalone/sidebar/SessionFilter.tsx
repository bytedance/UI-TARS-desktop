import React, { useState, useCallback, useEffect } from 'react';
import { FiFilter, FiX, FiChevronDown } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

export interface SessionFilters {
  workspace?: string;
  agent?: string;
  tags?: string;
}

interface SessionFilterProps {
  onFiltersChange: (filters: SessionFilters) => void;
  availableWorkspaces: string[];
  availableAgents: string[];
  availableTags: string[];
}

export const SessionFilter: React.FC<SessionFilterProps> = ({
  onFiltersChange,
  availableWorkspaces,
  availableAgents,
  availableTags,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<SessionFilters>({});
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Update active filters count
  useEffect(() => {
    const count = Object.values(filters).filter(value => value && value.trim()).length;
    setActiveFiltersCount(count);
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = useCallback(
    (key: keyof SessionFilters, value: string) => {
      const newFilters = {
        ...filters,
        [key]: value || undefined,
      };
      setFilters(newFilters);
      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange],
  );

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters({});
    onFiltersChange({});
  }, [onFiltersChange]);

  // Clear specific filter
  const clearFilter = useCallback(
    (key: keyof SessionFilters) => {
      const newFilters = { ...filters };
      delete newFilters[key];
      setFilters(newFilters);
      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange],
  );

  return (
    <div className="px-3 py-2 border-b border-gray-100/40 dark:border-gray-700/20">
      {/* Filter toggle button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-xl transition-all ${
          isOpen || activeFiltersCount > 0
            ? 'bg-accent-50/80 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 border border-accent-200/50 dark:border-accent-700/30'
            : 'bg-gray-50/80 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border border-gray-200/50 dark:border-gray-700/30 hover:bg-gray-100/80 dark:hover:bg-gray-700/50'
        }`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center">
          <FiFilter size={14} className="mr-2" />
          <span>Filter Sessions</span>
          {activeFiltersCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-accent-500 text-white text-xs rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <FiChevronDown size={14} />
        </motion.div>
      </motion.button>

      {/* Filter panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3">
              {/* Workspace filter */}
              {availableWorkspaces.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Workspace
                  </label>
                  <div className="relative">
                    <select
                      value={filters.workspace || ''}
                      onChange={(e) => handleFilterChange('workspace', e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500/50 text-gray-700 dark:text-gray-300"
                    >
                      <option value="">All workspaces</option>
                      {availableWorkspaces.map((workspace) => (
                        <option key={workspace} value={workspace}>
                          {workspace}
                        </option>
                      ))}
                    </select>
                    {filters.workspace && (
                      <button
                        onClick={() => clearFilter('workspace')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <FiX size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Agent filter */}
              {availableAgents.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Agent
                  </label>
                  <div className="relative">
                    <select
                      value={filters.agent || ''}
                      onChange={(e) => handleFilterChange('agent', e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500/50 text-gray-700 dark:text-gray-300"
                    >
                      <option value="">All agents</option>
                      {availableAgents.map((agent) => (
                        <option key={agent} value={agent}>
                          {agent}
                        </option>
                      ))}
                    </select>
                    {filters.agent && (
                      <button
                        onClick={() => clearFilter('agent')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <FiX size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Tags filter */}
              {availableTags.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Tags
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={filters.tags || ''}
                      onChange={(e) => handleFilterChange('tags', e.target.value)}
                      placeholder="Enter tags (comma-separated)"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500/50 text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                    {filters.tags && (
                      <button
                        onClick={() => clearFilter('tags')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <FiX size={14} />
                      </button>
                    )}
                  </div>
                  {/* Tag suggestions */}
                  {availableTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {availableTags.slice(0, 6).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            const currentTags = filters.tags ? filters.tags.split(',').map(t => t.trim()) : [];
                            if (!currentTags.includes(tag)) {
                              const newTags = [...currentTags, tag].join(', ');
                              handleFilterChange('tags', newTags);
                            }
                          }}
                          className="px-2 py-1 text-xs bg-gray-100/80 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 rounded-md hover:bg-gray-200/80 dark:hover:bg-gray-600/50 transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Clear all filters button */}
              {activeFiltersCount > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={clearAllFilters}
                  className="w-full py-2 px-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg transition-colors flex items-center justify-center"
                >
                  <FiX size={14} className="mr-1" />
                  Clear All Filters
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
