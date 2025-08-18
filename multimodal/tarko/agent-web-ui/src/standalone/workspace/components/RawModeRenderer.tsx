import React from 'react';
import { motion } from 'framer-motion';
import { FiCode, FiClock } from 'react-icons/fi';
import { JsonRenderer } from '@/common/components/JsonRenderer';
import { RawToolMapping } from '@/common/state/atoms/rawEvents';
import { formatTimestamp } from '@/common/utils/formatters';

interface RawModeRendererProps {
  toolMapping: RawToolMapping;
}

export const RawModeRenderer: React.FC<RawModeRendererProps> = ({ toolMapping }) => {
  const { toolCall, toolResult } = toolMapping;

  return (
    <div className="space-y-4 mt-4">
      {/* Tool Call Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/30">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center">
            <FiCode size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-blue-900 dark:text-blue-100">Tool Call Input</h3>
            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
              <FiClock size={12} />
              <span>{formatTimestamp(toolCall.timestamp, true)}</span>
              <span>•</span>
              <span className="font-mono">{toolCall.toolCallId}</span>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tool Name</div>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg font-mono text-sm text-gray-800 dark:text-gray-200">
                {toolCall.name}
              </div>
            </div>
            {toolCall.arguments && (
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Arguments</div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <JsonRenderer 
                    data={toolCall.arguments} 
                    emptyMessage="No arguments provided"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>



      {/* Tool Result Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${
          toolResult
            ? toolResult.error
              ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30'
              : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/30'
            : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/30'
        }`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            toolResult
              ? toolResult.error
                ? 'bg-red-100 dark:bg-red-800/30'
                : 'bg-green-100 dark:bg-green-800/30'
              : 'bg-gray-100 dark:bg-gray-700/30'
          }`}>
            <FiCode size={16} className={`${
              toolResult
                ? toolResult.error
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
                : 'text-gray-500 dark:text-gray-400'
            }`} />
          </div>
          <div className="flex-1">
            <h3 className={`font-medium ${
              toolResult
                ? toolResult.error
                  ? 'text-red-900 dark:text-red-100'
                  : 'text-green-900 dark:text-green-100'
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              Tool Call Output
            </h3>
            {toolResult ? (
              <div className={`flex items-center gap-2 text-xs ${
                toolResult.error
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                <FiClock size={12} />
                <span>{formatTimestamp(toolResult.timestamp, true)}</span>
                {toolResult.elapsedMs && (
                  <>
                    <span>•</span>
                    <span>{toolResult.elapsedMs}ms</span>
                  </>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Waiting for result...
              </div>
            )}
          </div>
        </div>
        <div className="p-4">
          {toolResult ? (
            <div className="space-y-4">
              {toolResult.error && (
                <div>
                  <div className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">Error</div>
                  <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-800 dark:text-red-200 font-mono">
                    {toolResult.error}
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content</div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <JsonRenderer 
                    data={toolResult.content} 
                    emptyMessage="No content returned"
                  />
                </div>
              </div>
              {toolResult._extra && (
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Extra Data</div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <JsonRenderer 
                      data={toolResult._extra} 
                      emptyMessage="No extra data"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto mb-2"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">Waiting for tool result...</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
