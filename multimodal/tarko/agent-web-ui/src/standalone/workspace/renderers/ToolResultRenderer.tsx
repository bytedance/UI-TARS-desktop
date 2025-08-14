import React from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { FileDisplayMode } from '../types';

/**
 * ToolResultRenderer - 已废弃，直接使用各自的 Renderer
 *
 * @deprecated 这个文件已经不再使用。
 * 现在所有的渲染器都直接在 WorkspaceDetail.tsx 中的 CONTENT_RENDERERS 注册，
 * 并直接接收 StandardPanelContent 参数。
 *
 * 保留这个文件只是为了避免潜在的导入错误，
 * 实际功能已经移到 WorkspaceDetail.tsx 中。
 */

interface ToolResultRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  className?: string;
  displayMode?: FileDisplayMode;
}

/**
 * @deprecated 请直接使用各自的 Renderer 组件
 */
export const ToolResultRenderer: React.FC<ToolResultRendererProps> = ({
  panelContent,
  onAction,
  className = '',
  displayMode,
}) => {
  console.warn(
    '[ToolResultRenderer] This component is deprecated. Use individual renderers directly through WorkspaceDetail.tsx',
  );

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="p-4 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/30">
        <div className="font-medium mb-1">Deprecated Component</div>
        <div className="text-sm">
          ToolResultRenderer is deprecated. Content is now rendered directly through
          WorkspaceDetail.tsx
        </div>
      </div>
    </div>
  );
};

/**
 * @deprecated No longer used
 */
export function registerRenderer(): void {
  console.warn('[ToolResultRenderer] registerRenderer is deprecated.');
}
