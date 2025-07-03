import React, { useState } from 'react';
import { ToolResultContentPart } from '../types';
import { motion } from 'framer-motion';
import { FiPlay, FiCode, FiTerminal } from 'react-icons/fi';
import { MarkdownRenderer } from '@/sdk/markdown-renderer';
import { ToggleSwitch } from './generic/components/ToggleSwitch';

interface ScriptResultRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

/**
 * Custom script highlighting function for command display
 */
const highlightCommand = (command: string) => {
  return (
    <div className="command-line whitespace-nowrap">
      <span className="text-cyan-400 font-bold">{command}</span>
    </div>
  );
};

/**
 * Renders script execution results with script source and terminal output
 */
export const ScriptResultRenderer: React.FC<ScriptResultRendererProps> = ({ part }) => {
  const { script, interpreter = 'python', cwd, stdout, stderr, exitCode } = part;
  const [displayMode, setDisplayMode] = useState<'both' | 'script' | 'execution'>('both');

  if (!script && !stdout && !stderr) {
    return <div className="text-gray-500 italic">Script result is empty</div>;
  }

  // Exit code styling
  const isError = exitCode !== 0 && exitCode !== undefined;
  const hasOutput = stdout || stderr;

  // Create markdown-formatted script content
  const scriptMarkdown = `\`\`\`${interpreter === 'python' ? 'python' : interpreter}\n${script}\n\`\`\``;

  return (
    <div className="space-y-4">
      {/* Display mode toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            onClick={() => setDisplayMode('both')}
            className={`px-3 py-1.5 text-xs font-medium ${
              displayMode === 'both'
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
            } rounded-l-lg border border-gray-200 dark:border-gray-600`}
          >
            <div className="flex items-center">
              <FiCode size={12} className="mr-1.5" />
              <span>Both</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('script')}
            className={`px-3 py-1.5 text-xs font-medium ${
              displayMode === 'script'
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
            } border-t border-b border-gray-200 dark:border-gray-600`}
          >
            <div className="flex items-center">
              <FiCode size={12} className="mr-1.5" />
              <span>Script</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('execution')}
            className={`px-3 py-1.5 text-xs font-medium ${
              displayMode === 'execution'
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
            } rounded-r-lg border border-gray-200 dark:border-gray-600 border-l-0`}
          >
            <div className="flex items-center">
              <FiTerminal size={12} className="mr-1.5" />
              <span>Execution</span>
            </div>
          </button>
        </div>
      </div>

      {/* Script content */}
      {(displayMode === 'both' || displayMode === 'script') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/30 overflow-hidden"
        >
          <div className="px-4 py-3 bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-100/50 dark:border-gray-700/30 flex items-center">
            <FiCode className="text-gray-600 dark:text-gray-400 mr-2.5" size={16} />
            <div className="font-medium text-gray-700 dark:text-gray-300">
              Script ({interpreter})
            </div>
            {cwd && (
              <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                Working directory: {cwd}
              </div>
            )}
          </div>
          <div className="p-4">
            <div className="prose dark:prose-invert prose-sm max-w-none">
              <MarkdownRenderer content={scriptMarkdown} />
            </div>
          </div>
        </motion.div>
      )}

      {/* Execution results */}
      {(displayMode === 'both' || displayMode === 'execution') && hasOutput && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: displayMode === 'both' ? 0.1 : 0 }}
        >
          <div className="rounded-lg overflow-hidden border border-gray-900">
            {/* Terminal title bar */}
            <div className="bg-[#111111] px-3 py-1.5 border-b border-gray-900 flex items-center">
              <div className="flex space-x-1.5 mr-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
              </div>
              <div className="text-gray-400 text-xs font-medium mx-auto">
                Script Execution - {interpreter}
                {exitCode !== undefined && (
                  <span className={`ml-2 ${isError ? 'text-red-400' : 'text-green-400'}`}>
                    (exit code: {exitCode})
                  </span>
                )}
              </div>
            </div>

            {/* Terminal content area */}
            <div className="bg-black p-2 font-mono text-xs terminal-content overflow-auto max-h-[80vh]">
              <div className="overflow-x-auto min-w-full">
                {/* Command section */}
                <div className="flex items-start whitespace-nowrap mb-2">
                  <span className="select-none text-green-400 mr-2 font-bold terminal-prompt-symbol">
                    $
                  </span>
                  <div className="flex-1 text-gray-200">
                    {highlightCommand(`${interpreter} << 'EOF'`)}
                  </div>
                </div>

                {/* Output section */}
                {stdout && (
                  <pre className="whitespace-pre overflow-x-visible text-gray-200 mt-3 ml-3">
                    {stdout}
                  </pre>
                )}

                {/* Error output */}
                {stderr && (
                  <pre className="whitespace-pre overflow-x-visible text-red-400 my-3 ml-3">
                    {stderr}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
