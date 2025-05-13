export interface Block {
  id: string;
  title: string;
  type: string;
  content: string;
}

export interface BlockRendererProps<T extends Block = Block> {
  block: T;
  isActive: boolean;
  onClick: (id: string) => void;
}

export interface PanelRendererProps<T extends Block = Block> {
  block: T;
  onClose: () => void;
}

export interface CanvasProps<T extends Block = Block> {
  blocks: T[];
  panelRenderer: React.FC<PanelRendererProps<T>>;
  className?: string;
}
