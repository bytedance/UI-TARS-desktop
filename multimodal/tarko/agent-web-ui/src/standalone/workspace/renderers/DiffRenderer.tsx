import React from 'react';
import { DiffEditor } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { StandardPanelContent } from '../types/panelContent';
import { DiffViewer } from '@/sdk/code-editor';
import { FileDisplayMode } from '../types';
import { normalizeFilePath } from '@/common/utils/pathNormalizer';
import { CodeEditorHeader } from '@/sdk/code-editor/CodeEditorHeader';
import '@/sdk/code-editor/MonacoCodeEditor.css';

interface DiffRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

// Check if content is diff format
function isDiffContent(content: string): boolean {
  return /^@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@/m.test(content) && /^[+-]/m.test(content);
}

// Extract diff from markdown code blocks
function extractDiffContent(content: string): string {
  const codeBlockMatch = content.match(/^```(?:diff)?\n([\s\S]*?)\n```/m);
  return codeBlockMatch ? codeBlockMatch[1] : content;
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

export const DiffRenderer: React.FC<DiffRendererProps> = ({ panelContent }) => {
  // First try to extract str_replace_editor diff data (for edit_file type)
  const strReplaceData = extractStrReplaceEditorDiffData(panelContent);
  
  if (strReplaceData) {
    const { oldContent, newContent, path } = strReplaceData;
    const fileName = path ? path.split('/').pop() || path : 'Edited File';
    const displayPath = path ? normalizeFilePath(path) : undefined;

    return (
      <div className="space-y-4">
        <StrReplaceEditorDiffViewer
          oldContent={oldContent}
          newContent={newContent}
          fileName={fileName}
          filePath={displayPath}
          maxHeight="calc(100vh - 215px)"
        />
      </div>
    );
  }

  // Fallback to standard diff format
  const diffData = extractDiffData(panelContent);

  if (!diffData) {
    return (
      <div className="p-4 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/30">
        <div className="font-medium mb-1">No Diff Data Available</div>
        <div className="text-sm">Unable to extract diff information from the content.</div>
      </div>
    );
  }

  const { content, path, name } = diffData;
  const diffContent = extractDiffContent(content);

  if (!isDiffContent(diffContent)) {
    return (
      <div className="p-4 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/30">
        <div className="font-medium mb-1">Invalid Diff Format</div>
        <div className="text-sm">The content does not appear to be in a valid diff format.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DiffViewer
        diffContent={diffContent}
        fileName={path || name}
        maxHeight="calc(100vh - 215px)"
        className="rounded-none border-0"
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

function extractDiffData(panelContent: StandardPanelContent): {
  content: string;
  path?: string;
  name?: string;
} | null {
  try {
    // Extract diff content from source array
    const sourceArray = panelContent.source;
    if (!Array.isArray(sourceArray) || sourceArray.length === 0) {
      return null;
    }

    const textSource = sourceArray.find(
      (item) => typeof item === 'object' && item !== null && 'text' in item,
    );

    if (!textSource || typeof textSource.text !== 'string') {
      return null;
    }

    // Extract path from arguments
    const path = panelContent.arguments?.path ? String(panelContent.arguments.path) : undefined;

    return {
      content: textSource.text,
      path,
      name: path ? path.split('/').pop() : undefined,
    };
  } catch (error) {
    console.warn('Failed to extract diff data:', error);
    return null;
  }
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
        <CodeEditorHeader
          fileName={fileName}
          filePath={filePath}
          language={language}
          onCopy={handleCopy}
          copyButtonTitle="Copy new content"
        >
          {/* Diff stats */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-green-400">+{actualAdditions}</span>
            <span className="text-red-400">-{deletions}</span>
          </div>
        </CodeEditorHeader>

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
            {filePath && (
              <span className="code-editor-status-item text-gray-400 code-editor-file-name truncate max-w-md">
                {filePath}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
