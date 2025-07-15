import { useAtom } from 'jotai';
import { sidebarCollapsedAtom, workspacePanelCollapsedAtom } from '../state/atoms/ui';

/**
 * Hook for layout management
 *
 * Provides:
 * - Sidebar state (collapsed/expanded)
 * - Workspace panel state (collapsed/expanded)
 * - Toggle functions for both
 */
export function useLayout() {
  const [isSidebarCollapsed, setSidebarCollapsed] = useAtom(sidebarCollapsedAtom);
  const [isWorkspacePanelCollapsed, setWorkspacePanelCollapsed] = useAtom(
    workspacePanelCollapsedAtom,
  );

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);
  const toggleWorkspacePanel = () => setWorkspacePanelCollapsed((prev) => !prev);

  return {
    isSidebarCollapsed,
    isWorkspacePanelCollapsed,
    toggleSidebar,
    toggleWorkspacePanel,
  };
}
