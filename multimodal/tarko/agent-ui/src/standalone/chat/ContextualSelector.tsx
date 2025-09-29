import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFile, FiFolder, FiLoader, FiHome } from 'react-icons/fi';
import { apiService, WorkspaceItem } from '@/common/services/apiService';
import { useSession } from '@/common/hooks/useSession';

/**
 * Re-export ContextualItem interface for consistency
 */
export interface ContextualItem {
  id: string;
  type: 'file' | 'directory' | 'workspace';
  name: string;
  path: string;
  relativePath: string;
}

interface ContextualSelectorProps {
  isOpen: boolean;
  query: string;
  onSelect: (item: ContextualItem) => void;
  onClose: () => void;
}

/**
 * ContextualSelector - Enhanced file/directory selector with rich default display
 *
 * Features:
 * - Shows comprehensive default options when @ is entered (workspace, common dirs, recent files)
 * - Real-time search as user types after @
 * - Keyboard navigation with arrow keys and Enter
 * - Visual distinction between different item types
 * - Fixed width container to avoid layout shifts
 */
export const ContextualSelector: React.FC<ContextualSelectorProps> = ({
  isOpen,
  query,
  onSelect,
  onClose,
}) => {
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { activeSessionId } = useSession();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !activeSessionId) {
      setItems([]);
      return;
    }

    const searchItems = async () => {
      setLoading(true);
      try {
        let results: WorkspaceItem[] = [];

        if (query.length === 0) {
          const workspaceFiles = await apiService.searchWorkspaceItems(activeSessionId, '', 'all');

          const defaultEntries: WorkspaceItem[] = [
            {
              name: 'workspace',
              path: '/',
              type: 'directory',
              relativePath: '.',
            },
          ];

          const directories = workspaceFiles
            .filter((item) => item.type === 'directory')
            .slice(0, 8);

          const files = workspaceFiles.filter((item) => item.type === 'file').slice(0, 10);

          results = [...defaultEntries, ...directories, ...files];
        } else {
          results = await apiService.searchWorkspaceItems(activeSessionId, query);
        }

        setItems(results);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Failed to search workspace items:', error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    if (query.length === 0) {
      searchItems();
    } else {
      const debounceTimer = setTimeout(searchItems, 200);
      return () => clearTimeout(debounceTimer);
    }
  }, [isOpen, activeSessionId, query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (items[selectedIndex]) {
            handleSelect(items[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items, selectedIndex, onClose]);

  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex]);

  const handleSelect = (item: WorkspaceItem) => {
    const contextualItem: ContextualItem = {
      id: `${item.type}-${item.relativePath}`,
      type: item.name === 'workspace' ? 'workspace' : item.type,
      name: item.name,
      path: item.path,
      relativePath: item.relativePath,
    };
    onSelect(contextualItem);
  };

  const getItemIcon = (item: WorkspaceItem, isSelected: boolean) => {
    if (item.name === 'workspace') {
      return (
        <FiHome
          size={16}
          className={
            isSelected
              ? 'text-accent-500 dark:text-accent-400'
              : 'text-indigo-500 dark:text-indigo-400'
          }
        />
      );
    } else if (item.type === 'directory') {
      return (
        <FiFolder
          size={16}
          className={
            isSelected ? 'text-accent-500 dark:text-accent-400' : 'text-blue-500 dark:text-blue-400'
          }
        />
      );
    } else {
      return (
        <FiFile
          size={16}
          className={
            isSelected ? 'text-accent-500 dark:text-accent-400' : 'text-gray-500 dark:text-gray-400'
          }
        />
      );
    }
  };

  const getItemDisplayText = (item: WorkspaceItem) => {
    if (item.name === 'workspace') {
      return {
        name: 'workspace',
        description: 'Current workspace root',
      };
    } else {
      return {
        name: item.name,
        description: `${item.type === 'directory' ? '@dir:' : '@file:'}${item.relativePath}`,
      };
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className="w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/40 shadow-xl backdrop-blur-sm max-h-80 overflow-hidden"
      >
        <div className="px-3 py-2 bg-gray-50/70 dark:bg-gray-700/30 border-b border-gray-200/40 dark:border-gray-600/30">
          <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
            {loading ? (
              <FiLoader className="animate-spin mr-2" size={12} />
            ) : (
              <FiHome className="mr-2" size={12} />
            )}
            <span>
              {loading
                ? 'Searching...'
                : query.length === 0
                  ? 'Select workspace context'
                  : `${items.length} items found`}
            </span>
          </div>
        </div>

        <div ref={listRef} className="max-h-64 overflow-y-auto py-1">
          {items.length === 0 && !loading ? (
            <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              {query.length === 0 ? 'No files found in workspace' : 'No items found'}
            </div>
          ) : (
            items.map((item, index) => {
              const isSelected = index === selectedIndex;
              const displayText = getItemDisplayText(item);

              return (
                <motion.button
                  key={`${item.type}-${item.relativePath}`}
                  whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
                  onClick={() => handleSelect(item)}
                  className={`w-full px-3 py-2 text-left flex items-center gap-2 text-sm transition-colors ${
                    isSelected
                      ? 'bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/30 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex-shrink-0">{getItemIcon(item, isSelected)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{displayText.name}</div>
                    <div className="text-xs opacity-60 truncate">{displayText.description}</div>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>

        <div className="px-3 py-2 bg-gray-50/70 dark:bg-gray-700/30 border-t border-gray-200/40 dark:border-gray-600/30">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Use ↑↓ to navigate, Enter to select, Esc to close
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
