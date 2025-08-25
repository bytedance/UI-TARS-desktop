import React, { useMemo } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import parseDiff from 'parse-diff';
import { normalizeFilePath } from '@/common/utils/pathNormalizer';
import { CodeEditorHeader } from './CodeEditorHeader';
import './MonacoCodeEditor.css';

interface DiffViewerProps {
  diffContent: string;
  fileName?: string;
  maxHeight?: string;
  className?: string;
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
  const { original, modified, additions, deletions, displayFileName, normalizedPath } = useMemo(() => {
    try {
      // Parse diff using mature library
      const files = parseDiff(diffContent);

      if (files.length === 0) {
        const baseFileName = fileName || 'diff';
        return {
        original: '',
        modified: diffContent,
        additions: 0,
        deletions: 0,
          displayFileName: baseFileName.split('/').pop() || baseFileName,
        normalizedPath: normalizeFilePath(baseFileName),
      };
      }

      const file = files[0];
      const chunks = file.chunks || [];

      const originalLines: string[] = [];
      const modifiedLines: string[] = [];
      let addCount = 0;
      let delCount = 0;

      // Process chunks to reconstruct original and modified content
      chunks.forEach((chunk) => {
        chunk.changes.forEach((change) => {
          switch (change.type) {
            case 'add':
              modifiedLines.push(change.content.slice(1)); // Remove '+' prefix
              addCount++;
              break;
            case 'del':
              originalLines.push(change.content.slice(1)); // Remove '-' prefix
              delCount++;
              break;
            case 'normal':
              const content = change.content.slice(1); // Remove ' ' prefix
              originalLines.push(content);
              modifiedLines.push(content);
              break;
          }
        });
      });

      const fullPath = fileName || file.to || file.from || 'diff';
      const baseFileName = fullPath.split('/').pop() || fullPath;
      return {
        original: originalLines.join('\n'),
        modified: modifiedLines.join('\n'),
        additions: addCount,
        deletions: delCount,
        displayFileName: baseFileName,
        normalizedPath: normalizeFilePath(fullPath),
      };
    } catch (error) {
      console.warn('Failed to parse diff, falling back to raw content:', error);
      const baseFileName = fileName || 'diff';
      return {
        original: '',
        modified: diffContent,
        additions: 0,
        deletions: 0,
        displayFileName: baseFileName.split('/').pop() || baseFileName,
        normalizedPath: normalizeFilePath(baseFileName),
      };
    }
  }, [diffContent, fileName]);

  const language = getLanguage(displayFileName);

  const handleCopy = () => {
    navigator.clipboard.writeText(diffContent);
  };

  return (
    <div className={`code-editor-container ${className}`}>
      <div className="code-editor-wrapper">
        {/* Header */}
        <CodeEditorHeader
          fileName={displayFileName}
          filePath={normalizedPath}
          language={language}
          onCopy={handleCopy}
          copyButtonTitle="Copy diff"
        >
          {/* Diff stats */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-green-400">+{additions}</span>
            <span className="text-red-400">-{deletions}</span>
          </div>
        </CodeEditorHeader>

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
