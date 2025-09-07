import React, { useState, useRef, useEffect } from 'react';
import { FiCopy, FiCheck, FiInfo, FiFolder, FiGitBranch } from 'react-icons/fi';

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
  const [pathCopied, setPathCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const displayFileName = fileName || (filePath ? filePath.split('/').pop() || filePath : 'Untitled');
  const hasFileInfo = filePath || fileSize;
  const showDiffIcon = children;

  const handleCopy = () => {
    if (onCopy) {
      onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyPath = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (filePath) {
      navigator.clipboard.writeText(filePath);
      setPathCopied(true);
      setTimeout(() => setPathCopied(false), 2000);
    }
  };

  const handleMouseEnter = () => {
    if (hasFileInfo) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setShowTooltip(true), 300);
    }
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowTooltip(false);
  };

  return (
    <div className="code-editor-header">
      <div className="code-editor-header-left">
        <div className="code-editor-controls">
          <div className="code-editor-control-btn code-editor-control-red" />
          <div className="code-editor-control-btn code-editor-control-yellow" />
          <div className="code-editor-control-btn code-editor-control-green" />
        </div>

        <div
          className="code-editor-file-info"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center space-x-2">
            {showDiffIcon && <FiGitBranch size={12} />}
            <span className="code-editor-file-name" title={filePath || displayFileName}>
              {displayFileName}
            </span>
          </div>

          {hasFileInfo && showTooltip && (
            <div className="code-editor-tooltip">
              <div className="code-editor-tooltip-content">
                {filePath && (
                  <div className="code-editor-tooltip-section">
                    <FiFolder className="code-editor-tooltip-icon" size={12} />
                    <div>
                      <div className="code-editor-tooltip-label">File Path</div>
                      <div className="code-editor-tooltip-value">{filePath}</div>
                      <button onClick={handleCopyPath} className="code-editor-tooltip-btn">
                        {pathCopied ? <FiCheck size={10} /> : <FiCopy size={10} />}
                        {pathCopied ? 'Copied!' : 'Copy Path'}
                      </button>
                    </div>
                  </div>
                )}

                {fileSize && (
                  <div className="code-editor-tooltip-info">
                    <FiInfo className="code-editor-tooltip-icon" size={12} />
                    <div>
                      <span className="code-editor-tooltip-label">Size: </span>
                      <span className="code-editor-tooltip-value">{fileSize}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="code-editor-tooltip-arrow" />
            </div>
          )}
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
