import React, { useState } from 'react';
import { FiCopy, FiCheck, FiGitBranch } from 'react-icons/fi';

interface CodeEditorHeaderProps {
  fileName?: string;
  filePath?: string;
  fileSize?: string;
  language?: string;
  onCopy?: () => void;
  copyButtonTitle?: string;
  children?: React.ReactNode;
}

export const CodeEditorHeader: React.FC<CodeEditorHeaderProps> = ({
  fileName,
  filePath,
  fileSize,
  language,
  onCopy,
  copyButtonTitle = 'Copy code',
  children,
}) => {
  const [copied, setCopied] = useState(false);

  const displayFileName =
    fileName || (filePath ? filePath.split('/').pop() || filePath : 'Untitled');
  const showDiffIcon = children;

  const handleCopy = () => {
    if (onCopy) {
      onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="code-editor-header">
      <div className="code-editor-header-left">
        <div className="code-editor-controls">
          <div className="code-editor-control-btn code-editor-control-red" />
          <div className="code-editor-control-btn code-editor-control-yellow" />
          <div className="code-editor-control-btn code-editor-control-green" />
        </div>

        <div className="code-editor-file-info">
          <div className="flex items-center space-x-2">
            {showDiffIcon && <FiGitBranch size={12} />}
            <span className="code-editor-file-name" title={filePath || displayFileName}>
              {displayFileName}
            </span>
          </div>
        </div>

        {children}

        {language && <div className="code-editor-language-badge">{language}</div>}
      </div>

      <div className="code-editor-actions">
        {onCopy && (
          <button onClick={handleCopy} className="code-editor-action-btn" title={copyButtonTitle}>
            {copied ? <FiCheck size={14} className="text-green-400" /> : <FiCopy size={14} />}
          </button>
        )}
      </div>
    </div>
  );
};
