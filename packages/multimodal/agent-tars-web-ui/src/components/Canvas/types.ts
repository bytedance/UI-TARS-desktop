export interface Block {
  id: string;
  title: string;
  type: string;
  content: string;
}

export interface BlockRendererProps {
  block: Block;
  isActive: boolean;
  onClick: (id: string) => void;
}

export interface PanelRendererProps {
  block: Block;
  onClose: () => void;
}

export interface CanvasProps<T extends Block> {
  blocks: T[];
  blockRenderer: React.FC<{ block: T; isActive: boolean; onClick: (id: string) => void }>;
  panelRenderer: React.FC<{ block: T; onClose: () => void }>;
  className?: string;
}
