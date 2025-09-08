import React from 'react';
import { motion } from 'framer-motion';
import {
  FiEye,
  FiMousePointer,
  FiType,
  FiChevronsRight,
  FiCheckCircle,
  FiXCircle,
} from 'react-icons/fi';

interface OperationDetailsCardProps {
  thought?: string;
  step?: string;
  action?: string;
  status?: string;
}

export const OperationDetailsCard: React.FC<OperationDetailsCardProps> = ({
  thought,
  step,
  action,
  status,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <div className="bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50 rounded-xl border border-gray-200/60 dark:border-gray-700/40 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden backdrop-blur-sm">
        {/* Compact header with refined spacing */}
        <div className="relative px-5 py-3 bg-gradient-to-r from-gray-50/80 via-white/50 to-gray-50/80 dark:from-gray-800/60 dark:via-gray-800/40 dark:to-gray-800/60 border-b border-gray-100/60 dark:border-gray-700/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200/80 dark:from-slate-700 dark:to-slate-800/80 flex items-center justify-center shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-600/30">
                  <FiMousePointer className="text-slate-600 dark:text-slate-300" size={14} />
                </div>
                {status && (
                  <div
                    className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                      status === 'success'
                        ? 'bg-emerald-500 dark:bg-emerald-400'
                        : 'bg-rose-500 dark:bg-rose-400'
                    } shadow-sm`}
                  >
                    {status === 'success' ? (
                      <FiCheckCircle className="text-white" size={9} />
                    ) : (
                      <FiXCircle className="text-white" size={9} />
                    )}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-medium text-slate-800 dark:text-slate-100 text-sm leading-tight">
                  GUI Operation
                </h3>
              </div>
            </div>

            {status && (
              <div
                className={`px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm transition-all duration-200 ${
                  status === 'success'
                    ? 'bg-emerald-50/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50'
                    : 'bg-rose-50/80 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/50'
                }`}
              >
                {status === 'success' ? 'Completed' : 'Failed'}
              </div>
            )}
          </div>
        </div>

        {/* Compact content area with refined spacing */}
        <div className="p-5 space-y-4">
          {/* Thought process with compact styling */}
          {thought && (
            <div className="group">
              <div className="flex items-center mb-2">
                <div className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mr-2.5 ring-1 ring-blue-200/50 dark:ring-blue-800/50">
                  <FiEye className="text-blue-600 dark:text-blue-400" size={11} />
                </div>
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Thought
                </h4>
              </div>
              <div className="ml-7.5 p-3 bg-blue-50/30 dark:bg-blue-900/10 rounded-lg border border-blue-100/50 dark:border-blue-800/30 transition-colors group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/20">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {thought}
                </p>
              </div>
            </div>
          )}

          {/* Step with compact styling */}
          {step && step !== thought && (
            <div className="group">
              <div className="flex items-center mb-2">
                <div className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mr-2.5 ring-1 ring-indigo-200/50 dark:ring-indigo-800/50">
                  <FiChevronsRight className="text-indigo-600 dark:text-indigo-400" size={11} />
                </div>
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Step</h4>
              </div>
              <div className="ml-7.5 p-3 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-lg border border-indigo-100/50 dark:border-indigo-800/30 transition-colors group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-900/20">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{step}</p>
              </div>
            </div>
          )}

          {/* Action command with compact code styling */}
          {action && (
            <div className="group">
              <div className="flex items-center mb-2">
                <div className="w-5 h-5 rounded-md bg-slate-50 dark:bg-slate-800 flex items-center justify-center mr-2.5 ring-1 ring-slate-200/50 dark:ring-slate-600/50">
                  <FiType className="text-slate-600 dark:text-slate-400" size={11} />
                </div>
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Action</h4>
              </div>
              <div className="ml-7.5">
                <div className="relative p-3 bg-slate-50/80 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-700/40 font-mono text-xs transition-colors group-hover:bg-slate-100/80 dark:group-hover:bg-slate-800/80 overflow-x-auto">
                  <code className="text-slate-700 dark:text-slate-300 break-all">{action}</code>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
