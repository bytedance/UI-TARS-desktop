import React, { useState } from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { motion } from 'framer-motion';
import { FiPlay, FiCode, FiTerminal } from 'react-icons/fi';
import { CodeEditor } from '@/sdk/code-editor';
import { TerminalOutput } from '../components/TerminalOutput';
import { FileDisplayMode } from '../types';

interface ScriptResultRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
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
 * Language to file extension mapping
 */
const LANGUAGE_EXTENSIONS: Record<string, string> = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
};

/**
 * Get language identifier for syntax highlighting
 */
const getLanguageFromInterpreter = (interpreter: string): string => {
  const languageMap: Record<string, string> = {
    python: 'python',
    python3: 'python',
    node: 'javascript',
    nodejs: 'javascript',
    bash: 'bash',
    sh: 'bash',
  };

  return languageMap[interpreter.toLowerCase()] || 'text';
};

/**
 * Renders script execution results with professional code editor and terminal output
 */
export const ScriptResultRenderer: React.FC<ScriptResultRendererProps> = ({ panelContent }) => {
  const [displayMode, setDisplayMode] = useState<'both' | 'script' | 'execution'>('both');

  // Extract script data from panelContent
  const scriptData = extractScriptData(panelContent);

  if (!scriptData) {
    return <div className="text-gray-500 italic">Script result is empty</div>;
  }

  const { script, interpreter, stdout, stderr, exitCode } = scriptData;

  // Exit code styling
  const isError = exitCode !== 0 && exitCode !== undefined;
  const hasOutput = stdout || stderr;

  // Get language for syntax highlighting
  const language = getLanguageFromInterpreter(interpreter);

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

      {/* Script content with professional code editor */}
      {(displayMode === 'both' || displayMode === 'script') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          {/* Professional code editor */}
          <CodeEditor
            code={script || ''}
            language={language}
            fileName={`script.${LANGUAGE_EXTENSIONS[language]}`}
            showLineNumbers={true}
            maxHeight={displayMode === 'both' ? '40vh' : '80vh'}
          />
        </motion.div>
      )}

      {/* Execution results with terminal interface */}
      {(displayMode === 'both' || displayMode === 'execution') && hasOutput && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: displayMode === 'both' ? 0.1 : 0 }}
        >
          <TerminalOutput
            title={(
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <FiPlay size={10} />
                <span>Script Execution - {interpreter}</span>
              </div>
            )}
            command={(
              <>
                {highlightCommand(`${interpreter} << 'EOF'`)}
                <div className="mt-2">
                  <span className="text-gray-500 text-xs">EOF</span>
                </div>
              </>
            )}
            stdout={stdout}
            stderr={stderr}
            exitCode={exitCode}
            maxHeight={displayMode === 'both' ? '40vh' : '80vh'}
          />
        </motion.div>
      )}
    </div>
  );
};

function extractScriptData(panelContent: StandardPanelContent): {
  script: string;
  interpreter: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
} | null {
  try {
    /**
     * Handle JupyterCI tool specifically
     *
     * For Omni-TARS "JupyterCI" tool.
     *
     * {
     *   "panelContent": {
     *       "type": "script_result",
     *       "source": {
     *           "kernel_name": "python3",
     *           "status": "ok",
     *           "execution_count": 1,
     *           "outputs": [
     *               {
     *                   "output_type": "stream",
     *                   "name": "stdout",
     *                   "text": "The square root of 20250818 is: 4500.090887971041\\n",
     *                   "data": null,
     *                   "metadata": null,
     *                   "execution_count": null,
     *                   "ename": null,
     *                   "evalue": null,
     *                   "traceback": null
     *               }
     *           ],
     *           "code": "\\nimport math\\n\\n# Calculate the square root of 20250818\\nresult = math.sqrt(20250818)\\nprint(f\\",
     *           "msg_id": "82e5deeb-88fea96549e1f526424799aa_62_2"
     *       },
     *       "title": "JupyterCI",
     *       "timestamp": 1755468609322,
     *       "toolCallId": "call_1755468607268_81apyi3tw",
     *       "arguments": {
     *           "code": "\\nimport math\\n\\n# Calculate the square root of 20250818\\nresult = math.sqrt(20250818)\\nprint(f\\",
     *       }
     *   }
     * }
     */
    if (
      panelContent.title === 'JupyterCI' &&
      typeof panelContent.source === 'object' &&
      panelContent.source !== null
    ) {
      const sourceObj = panelContent.source as any;
      const script = panelContent.arguments?.code || sourceObj.code;
      const kernelName = sourceObj.kernel_name || 'python3';
      const status = sourceObj.status;
      const outputs = sourceObj.outputs || [];

      // Extract stdout from outputs
      let stdout = '';
      let stderr = '';

      for (const output of outputs) {
        if (output.output_type === 'stream') {
          if (output.name === 'stdout') {
            stdout += output.text || '';
          } else if (output.name === 'stderr') {
            stderr += output.text || '';
          }
        } else if (output.output_type === 'error') {
          stderr += output.traceback ? output.traceback.join('\n') : output.evalue || '';
        }
      }

      if (script && typeof script === 'string') {
        return {
          script,
          interpreter: kernelName,
          stdout: stdout || undefined,
          stderr: stderr || undefined,
          exitCode: status === 'ok' ? 0 : 1,
        };
      }
    }

    // Try arguments first for other tools
    if (panelContent.arguments) {
      const { script, interpreter = 'python', stdout, stderr, exitCode } = panelContent.arguments;

      if (script && typeof script === 'string') {
        return {
          script,
          interpreter: String(interpreter),
          stdout: stdout ? String(stdout) : undefined,
          stderr: stderr ? String(stderr) : undefined,
          exitCode: typeof exitCode === 'number' ? exitCode : undefined,
        };
      }
    }

    // Try to extract from source for other tools
    if (typeof panelContent.source === 'object' && panelContent.source !== null) {
      const sourceObj = panelContent.source as any;
      const { script, interpreter = 'python', stdout, stderr, exitCode } = sourceObj;

      if (script && typeof script === 'string') {
        return {
          script,
          interpreter: String(interpreter),
          stdout: stdout ? String(stdout) : undefined,
          stderr: stderr ? String(stderr) : undefined,
          exitCode: typeof exitCode === 'number' ? exitCode : undefined,
        };
      }
    }

    return null;
  } catch (error) {
    console.warn('Failed to extract script data:', error);
    return null;
  }
}
