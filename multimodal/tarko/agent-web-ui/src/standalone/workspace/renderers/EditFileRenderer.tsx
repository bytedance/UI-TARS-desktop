import React from 'react';
import { DiffEditor } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { FiCopy, FiGitBranch } from 'react-icons/fi';
import { StandardPanelContent } from '../types/panelContent';
import { FileDisplayMode } from '../types';
import '@/sdk/code-editor/MonacoCodeEditor.css';

/**
 * EditFileRenderer - Dedicated renderer for file editing operations
 * Handles edit_file type content with proper diff display for str_replace_editor
 */

interface EditFileRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

export const EditFileRenderer: React.FC<EditFileRendererProps> = ({
  panelContent,
  onAction,
  displayMode,
}) => {
  // Validate that this is indeed an edit_file type
  if (panelContent.type !== 'edit_file') {
    console.warn(`EditFileRenderer received unexpected type: ${panelContent.type}`);
    return null;
  }

  // Extract diff data from str_replace_editor content
  const diffData = extractStrReplaceEditorDiffData(panelContent);

  if (!diffData) {
    return (
      <div className="p-4 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/30">
        <div className="font-medium mb-1">No Diff Data Available</div>
        <div className="text-sm">Unable to extract diff information from the edit operation.</div>
      </div>
    );
  }

  const { oldContent, newContent, path } = diffData;
  const fileName = path ? path.split('/').pop() || path : 'Edited File';

  return (
    <div className="space-y-4">
      <StrReplaceEditorDiffViewer
        oldContent={oldContent}
        newContent={newContent}
        fileName={fileName}
        filePath={path}
        maxHeight="calc(100vh - 215px)"
      />
    </div>
  );
};

function extractStrReplaceEditorDiffData(panelContent: StandardPanelContent): {
  oldContent: string;
  newContent: string;
  path?: string;
} | null {
  try {
    // For str_replace_editor, the content structure should be:
    // {
    //   "prev_exist": true,
    //   "old_content": "...",
    //   "new_content": "...",
    //   "path": "/path/to/file"
    // }
    const source = panelContent.source;

    if (typeof source === 'object' && source !== null) {
      const { old_content, new_content, path } = source as any;

      if (typeof old_content === 'string' && typeof new_content === 'string') {
        return {
          oldContent: old_content,
          newContent: new_content,
          path: typeof path === 'string' ? path : undefined,
        };
      }
    }

    // Fallback: try to extract from arguments
    const args = panelContent.arguments;
    if (args && typeof args === 'object') {
      const { old_str, new_str, path } = args as any;

      if (typeof old_str === 'string' && typeof new_str === 'string') {
        return {
          oldContent: old_str,
          newContent: new_str,
          path: typeof path === 'string' ? path : undefined,
        };
      }
    }

    return null;
  } catch (error) {
    console.warn('Failed to extract str_replace_editor diff data:', error);
    return null;
  }
}

// Get language from filename
function getLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    html: 'html',
    css: 'css',
    json: 'json',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'shell',
    bash: 'shell',
  };
  return langMap[ext] || 'plaintext';
}

interface StrReplaceEditorDiffViewerProps {
  oldContent: string;
  newContent: string;
  fileName?: string;
  filePath?: string;
  maxHeight?: string;
}

const StrReplaceEditorDiffViewer: React.FC<StrReplaceEditorDiffViewerProps> = ({
  oldContent,
  newContent,
  fileName = 'Edited File',
  filePath,
  maxHeight = '400px',
}) => {
  const language = getLanguage(fileName);

  // Calculate diff stats
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const additions = newLines.length - oldLines.length;
  const deletions = Math.max(0, -additions);
  const actualAdditions = Math.max(0, additions);

  const editorOptions: editor.IStandaloneDiffEditorConstructionOptions = {
    readOnly: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    lineNumbers: 'on',
    renderSideBySide: true,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 13,
    automaticLayout: true,
    ignoreTrimWhitespace: false,
    renderWhitespace: 'boundary',
  };

  const handleCopy = () => {
    // Copy the new content
    navigator.clipboard.writeText(newContent);
  };

  return (
    <div className="code-editor-container">
      <div className="code-editor-wrapper">
        {/* Header */}
        <div className="code-editor-header">
          <div className="code-editor-header-left">
            <div className="code-editor-controls">
              <div className="code-editor-control-btn code-editor-control-red" />
              <div className="code-editor-control-btn code-editor-control-yellow" />
              <div className="code-editor-control-btn code-editor-control-green" />
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <FiGitBranch className="mr-1" size={12} />
                <span className="code-editor-file-name">{fileName}</span>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-green-400">+{actualAdditions}</span>
                <span className="text-red-400">-{deletions}</span>
              </div>
            </div>
          </div>
          <div className="code-editor-actions">
            <button
              onClick={handleCopy}
              className="code-editor-action-btn"
              title="Copy new content"
            >
              <FiCopy size={14} />
            </button>
          </div>
        </div>

        {/* Diff Editor */}
        <div className="code-editor-monaco-container" style={{ height: maxHeight }}>
          <DiffEditor
            original={oldContent}
            modified={newContent}
            language={language}
            theme="vs-dark"
            options={editorOptions}
            loading={
              <div className="flex items-center justify-center h-full bg-[#0d1117] text-gray-400">
                <div className="text-sm">Loading diff...</div>
              </div>
            }
          />
        </div>

        {/* Status Bar */}
        <div className="code-editor-status-bar">
          <div className="code-editor-status-left">
            <span className="code-editor-status-item text-green-400">+{actualAdditions}</span>
            <span className="code-editor-status-item text-red-400">-{deletions}</span>
            {filePath && <span className="code-editor-status-item text-gray-400">{filePath}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
