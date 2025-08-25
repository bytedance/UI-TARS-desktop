import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiCopy, FiCheck, FiInfo, FiFolder, FiGitBranch } from 'react-icons/fi';

interface CodeEditorHeaderProps {
  fileName?: string;
  filePath?: string;
  fileSize?: string;
  language?: string;
  onCopy?: () => void;
  copyButtonTitle?: string;
  showCopyState?: boolean;
  children?: React.ReactNode; // For additional content like diff stats
}

/**
 * Shared CodeEditor Header component
 * 
 * Features:
 * - Consistent file name display (basename only)
 * - Enhanced tooltip with full path and file info
 * - Browser-style control buttons
 * - Language badge
 * - Copy functionality with visual feedback
 * - Extensible for additional content (like diff stats)
 */
export const CodeEditorHeader: React.FC<CodeEditorHeaderProps> = ({
  fileName,
  filePath,
  fileSize,
  language,
  onCopy,
  copyButtonTitle = 'Copy code',
  showCopyState = true,
  children,
}) => {
  const [copied, setCopied] = useState(false);
  const [pathCopied, setPathCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Timeout refs for tooltip management
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  // Enhanced tooltip interaction handlers
  const handleFileInfoEnter = useCallback(() => {
    if (!filePath && !fileSize) return;

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    showTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 200);
  }, [filePath, fileSize]);

  const handleFileInfoLeave = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    hideTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 150);
  }, []);

  const handleTooltipEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handleTooltipLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  // Handle copy functionality
  const handleCopy = useCallback(() => {
    onCopy?.();
    if (showCopyState) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [onCopy, showCopyState]);

  // Handle path copy functionality
  const handleCopyPath = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (filePath) {
        navigator.clipboard.writeText(filePath);
        setPathCopied(true);
        setTimeout(() => setPathCopied(false), 2000);
      }
    },
    [filePath],
  );

  // Extract basename from full path for display
  const displayFileName = fileName || (filePath ? filePath.split('/').pop() || filePath : 'Untitled');
  const hasFileInfo = filePath || fileSize;
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

        {/* File name with tooltip */}
        <div
          className="code-editor-file-info"
          onMouseEnter={handleFileInfoEnter}
          onMouseLeave={handleFileInfoLeave}
        >
          <div className="flex items-center space-x-2">
            {showDiffIcon && <FiGitBranch size={12} />}
            <span className="code-editor-file-name" title={filePath || displayFileName}>
              {displayFileName}
            </span>
          </div>

          {/* Enhanced tooltip */}
          {hasFileInfo && showTooltip && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.15 }}
              className="code-editor-tooltip"
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >
              <div className="code-editor-tooltip-content">
                {filePath && (
                  <div className="code-editor-tooltip-section">
                    <FiFolder className="code-editor-tooltip-icon" size={12} />
                    <div>
                      <div className="code-editor-tooltip-label">File Path</div>
                      <div className="code-editor-tooltip-value">{filePath}</div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopyPath}
                        className="code-editor-tooltip-btn"
                      >
                        {pathCopied ? <FiCheck size={10} /> : <FiCopy size={10} />}
                        {pathCopied ? 'Copied!' : 'Copy Path'}
                      </motion.button>
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
            </motion.div>
          )}
        </div>

        {/* Additional content (like diff stats) */}
        {children}

        {/* Language badge */}
        {language && <div className="code-editor-language-badge">{language}</div>}
      </div>

      {/* Actions */}
      <div className="code-editor-actions">
        {onCopy && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            className="code-editor-action-btn"
            title={copyButtonTitle}
          >
            {showCopyState && copied ? (
              <FiCheck size={14} className="text-green-400" />
            ) : (
              <FiCopy size={14} />
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
};
