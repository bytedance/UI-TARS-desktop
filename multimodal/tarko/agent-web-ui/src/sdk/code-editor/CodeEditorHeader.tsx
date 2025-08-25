import React from 'react';
import { FiCopy, FiGitBranch } from 'react-icons/fi';

interface CodeEditorHeaderProps {
  fileName?: string;
  filePath?: string;
  language?: string;
  onCopy?: () => void;
  copyButtonTitle?: string;
  children?: React.ReactNode;
}

/**
 * Simplified shared CodeEditor Header component
 * Displays basename only, with full path in title attribute
 */
export const CodeEditorHeader: React.FC<CodeEditorHeaderProps> = ({
  fileName,
  filePath,
  language,
  onCopy,
  copyButtonTitle = 'Copy code',
  children,
}) => {
  // Extract basename from full path for display
  const displayFileName = fileName || (filePath ? filePath.split('/').pop() || filePath : 'Untitled');
  const showDiffIcon = children; // Show git branch icon if there are diff stats

  return (
    <div className="code-editor-header">
      <div className="code-editor-header-left">
        {/* Browser-style control buttons */}
        <div className="code-editor-controls">
          <div className="code-editor-control-btn code-editor-control-red" />
          <div className="code-editor-control-btn code-editor-control-yellow" />
          <div className="code-editor-control-btn code-editor-control-green" />
        </div>

        {/* File name */}
        <div className="code-editor-file-info">
          <div className="flex items-center space-x-2">
            {showDiffIcon && <FiGitBranch size={12} />}
            <span className="code-editor-file-name" title={filePath || displayFileName}>
              {displayFileName}
            </span>
          </div>
        </div>

        {/* Additional content (like diff stats) */}
        {children}

        {/* Language badge */}
        {language && <div className="code-editor-language-badge">{language}</div>}
      </div>

      {/* Actions */}
      <div className="code-editor-actions">
        {onCopy && (
          <button
            onClick={onCopy}
            className="code-editor-action-btn"
            title={copyButtonTitle}
          >
            <FiCopy size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
