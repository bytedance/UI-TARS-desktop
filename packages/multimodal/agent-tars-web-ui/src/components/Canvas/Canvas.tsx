import React, { useMemo } from 'react';
import { CanvasProps, Block } from './types';
import { useCanvas } from './CanvasContext';
import './Canvas.css';

/**
 * Canvas content component that renders blocks and active panel
 */
function CanvasContent<T extends Block>({
  blocks,
  blockRenderer: BlockRenderer,
  panelRenderer: PanelRenderer,
  className = '',
}: CanvasProps<T>): JSX.Element {
  const { activeBlock, setActiveBlock } = useCanvas();

  // Find currently active block data
  const activeBlockData = useMemo(
    () => blocks.find((b) => b.id === activeBlock),
    [blocks, activeBlock],
  );

  return (
    <div className={`canvas-container ${className}`} data-testid="canvas-container">
      <div className="canvas-blocks">
        <div className="blocks-wrapper">
          {blocks.map((block) => (
            <BlockRenderer
              key={block.id}
              block={block}
              isActive={block.id === activeBlock}
              onClick={() => setActiveBlock(block.id)}
            />
          ))}
        </div>
      </div>

      <div className={`canvas-panel ${activeBlock ? 'active' : ''}`}>
        {activeBlockData && (
          <PanelRenderer block={activeBlockData} onClose={() => setActiveBlock(null)} />
        )}
      </div>
    </div>
  );
}

/**
 * Canvas component for displaying interactive content blocks
 * Serves as a container for different content types such as
 * documentation, code snippets, and visualizations
 */
export function Canvas<T extends Block>(props: CanvasProps<T>): JSX.Element {
  return <CanvasContent {...props} />;
}
