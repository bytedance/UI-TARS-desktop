import React, { useMemo } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { FiCopy, FiGitBranch } from 'react-icons/fi';
import './MonacoCodeEditor.css';

interface DiffViewerProps {
  diffContent: string;
  fileName?: string;
  maxHeight?: string;
  className?: string;
}

// Parse unified diff to original/modified content
function parseDiff(diffContent: string) {
  const lines = diffContent.split('\n');
  let original = '';
  let modified = '';
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    // Skip diff headers
    if (
      line.startsWith('@@') ||
      line.startsWith('---') ||
      line.startsWith('+++') ||
      line.startsWith('diff ') ||
      line.startsWith('index ')
    ) {
      continue;
    }

    if (line.startsWith('-')) {
      original += line.slice(1) + '\n';
      deletions++;
    } else if (line.startsWith('+')) {
      modified += line.slice(1) + '\n';
      additions++;
    } else {
      // Context line (starts with space or empty)
      const content = line.startsWith(' ') ? line.slice(1) : line;
      original += content + '\n';
      modified += content + '\n';
    }
  }

  return { original: original.trim(), modified: modified.trim(), additions, deletions };
}

// Extract filename from diff content
function extractFileName(diffContent: string): string {
  const fileMatch = diffContent.match(/\+\+\+ b\/(.+?)\n/);
  if (fileMatch) {
    return fileMatch[1].split('/').pop() || fileMatch[1];
  }
  return 'diff';
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
  };
  return langMap[ext] || 'plaintext';
}

const EDITOR_OPTIONS: editor.IStandaloneDiffEditorConstructionOptions = {
  readOnly: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  lineNumbers: 'on',
  renderSideBySide: false,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  fontSize: 13,
  automaticLayout: true,
};

export const DiffViewer: React.FC<DiffViewerProps> = ({
  diffContent,
  fileName,
  maxHeight = '400px',
  className = '',
}) => {
  const { original, modified, additions, deletions } = useMemo(
    () => parseDiff(diffContent),
    [diffContent],
  );

  const displayFileName = fileName || extractFileName(diffContent);
  const language = getLanguage(displayFileName);

  const handleCopy = () => {
    navigator.clipboard.writeText(diffContent);
  };

  return (
    <div className={`code-editor-container ${className}`}>
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
                <span className="code-editor-file-name">{displayFileName}</span>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-green-400">+{additions}</span>
                <span className="text-red-400">-{deletions}</span>
              </div>
            </div>
          </div>
          <div className="code-editor-actions">
            <button onClick={handleCopy} className="code-editor-action-btn" title="Copy diff">
              <FiCopy size={14} />
            </button>
          </div>
        </div>

        {/* Diff Editor */}
        <div className="code-editor-monaco-container" style={{ height: maxHeight }}>
          <DiffEditor
            original={original}
            modified={modified}
            language={language}
            theme="vs-dark"
            options={EDITOR_OPTIONS}
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
            <span className="code-editor-status-item text-green-400">+{additions}</span>
            <span className="code-editor-status-item text-red-400">-{deletions}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
