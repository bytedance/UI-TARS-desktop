import React from 'react';
import { motion } from 'framer-motion';
import { FiTerminal, FiClock, FiPlay, FiCheckCircle, FiXCircle } from 'react-icons/fi';
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
        className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm overflow-hidden"
      >
        <div className="flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-indigo-500/5 to-blue-500/5 dark:from-indigo-400/10 dark:to-blue-400/10 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg">
            <FiPlay size={16} className="text-white ml-0.5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg">Input</h3>
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mt-1">
              <div className="flex items-center gap-1.5">
                <FiClock size={11} />
                <span className="font-medium">{formatTimestamp(toolCall.timestamp, true)}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500"></div>
              <span className="font-mono text-xs px-2 py-0.5 bg-slate-200/60 dark:bg-slate-700/60 rounded-md">
                {toolCall.toolCallId.slice(-8)}
              </span>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-5">
            <div>
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <FiTerminal size={14} className="text-slate-500" />
                Tool
              </div>
              <div className="px-4 py-3 bg-white/60 dark:bg-slate-800/60 rounded-xl font-mono text-sm text-slate-800 dark:text-slate-200 border border-slate-200/40 dark:border-slate-700/40">
                {toolCall.name}
              </div>
            </div>
            {toolCall.arguments && (
              <div>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Parameters
                </div>
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/40 dark:border-slate-700/40">
                  <JsonRenderer data={toolCall.arguments} emptyMessage="No parameters provided" />
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
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm overflow-hidden"
      >
        <div
          className={`flex items-center gap-4 px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50 ${
            toolResult
              ? toolResult.error
                ? 'bg-gradient-to-r from-red-500/5 to-rose-500/5 dark:from-red-400/10 dark:to-rose-400/10'
                : 'bg-gradient-to-r from-emerald-500/5 to-green-500/5 dark:from-emerald-400/10 dark:to-green-400/10'
              : 'bg-gradient-to-r from-slate-500/5 to-gray-500/5 dark:from-slate-400/10 dark:to-gray-400/10'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
              toolResult
                ? toolResult.error
                  ? 'bg-gradient-to-br from-red-500 to-rose-600'
                  : 'bg-gradient-to-br from-emerald-500 to-green-600'
                : 'bg-gradient-to-br from-slate-400 to-gray-500'
            }`}
          >
            {toolResult ? (
              toolResult.error ? (
                <FiXCircle size={16} className="text-white" />
              ) : (
                <FiCheckCircle size={16} className="text-white" />
              )
            ) : (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg">Output</h3>
            {toolResult ? (
              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mt-1">
                <div className="flex items-center gap-1.5">
                  <FiClock size={11} />
                  <span className="font-medium">{formatTimestamp(toolResult.timestamp, true)}</span>
                </div>
                {toolResult.elapsedMs && (
                  <>
                    <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500"></div>
                    <span className="font-mono text-xs px-2 py-0.5 bg-slate-200/60 dark:bg-slate-700/60 rounded-md">
                      {toolResult.elapsedMs}ms
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Processing...</div>
            )}
          </div>
        </div>
        <div className="p-6">
          {toolResult ? (
            <div className="space-y-5">
              {toolResult.error && (
                <div>
                  <div className="text-sm font-semibold text-red-700 dark:text-red-300 mb-3 flex items-center gap-2">
                    <FiXCircle size={14} className="text-red-500" />
                    Error
                  </div>
                  <div className="px-4 py-3 bg-red-50/80 dark:bg-red-900/20 rounded-xl text-sm text-red-800 dark:text-red-200 font-mono border border-red-200/40 dark:border-red-800/40">
                    {toolResult.error}
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Response
                </div>
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/40 dark:border-slate-700/40">
                  <JsonRenderer data={toolResult.content} emptyMessage="No response data" />
                </div>
              </div>
              {toolResult._extra && (
                <div>
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    Metadata
                  </div>
                  <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/40 dark:border-slate-700/40">
                    <JsonRenderer data={toolResult._extra} emptyMessage="No metadata" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 border-t-slate-600 dark:border-t-slate-300 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Processing request...
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
