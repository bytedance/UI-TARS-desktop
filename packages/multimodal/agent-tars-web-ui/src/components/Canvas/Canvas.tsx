import React from 'react';
import { CanvasProps, Block } from './types';
import { useCanvas } from './CanvasContext';
import './Canvas.css';

function CanvasContent<T extends Block>({
  blocks,
  blockRenderer: BlockRenderer,
  panelRenderer: PanelRenderer,
  className = '',
}: CanvasProps<T>) {
  const { activeBlock, setActiveBlock } = useCanvas();

  const activeBlockData = blocks.find((b) => b.id === activeBlock);

  return (
    <div className={`canvas-container ${className}`}>
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

export function Canvas<T extends Block>(props: CanvasProps<T>) {
  return <CanvasContent {...props} />;
}
