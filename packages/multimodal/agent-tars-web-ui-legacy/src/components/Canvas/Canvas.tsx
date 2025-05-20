import React, { useMemo, useCallback } from 'react';
import { CanvasProps, Block } from './types';
import { useCanvas } from './CanvasContext';
import { FiX } from 'react-icons/fi';
import './Canvas.css';

/**
 * Canvas component for displaying workspace artifacts
 * Renders the workspace content for steps execution results
 */
export function Canvas<T extends Block>({
  blocks,
  panelRenderer: PanelRenderer,
  className = '',
}: CanvasProps<T>): JSX.Element {
  const { activeBlock, setActiveBlock, isCanvasVisible, setCanvasVisible } = useCanvas();

  // Find currently active block data - 使用useMemo避免不必要的计算
  const activeBlockData = useMemo(
    () => blocks.find((b) => b.id === activeBlock),
    [blocks, activeBlock],
  );

  const handleClose = useCallback(() => {
    setCanvasVisible(false);
    setActiveBlock(null); // 关闭时清除activeBlock状态
  }, [setCanvasVisible, setActiveBlock]);

  return (
    <div
      className={`canvas-container ${isCanvasVisible ? 'visible' : ''} ${className}`}
      data-testid="canvas-container"
    >
      <div className="workspace-title">
        Workspace
        <button className="close-button" onClick={handleClose}>
          <FiX />
        </button>
      </div>

      <div className="canvas-panel active">
        {activeBlockData ? (
          <PanelRenderer block={activeBlockData} onClose={handleClose} />
        ) : (
          <div className="workspace-content">
            <p>选择任何步骤中的"查看详情"按钮来查看相关内容。</p>
          </div>
        )}
      </div>
    </div>
  );
}
