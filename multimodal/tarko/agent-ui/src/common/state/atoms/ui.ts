import { atom } from 'jotai';
import { SessionItemMetadata, LayoutMode, WorkspaceNavItem } from '@tarko/interface';
import { getDefaultLayoutMode } from '@/config/web-ui-config';
import { ConnectionStatus, SanitizedAgentOptions } from '@/common/types';
import { activeSessionIdAtom } from './session';
import { StandardPanelContent } from '@/standalone/workspace/types/panelContent';

/**
 * Session-specific panel content storage
 */
export const sessionPanelContentAtom = atom<Record<string, StandardPanelContent | null>>({});

/**
 * Derived atom for the content currently displayed in the panel
 * Automatically isolates content by active session
 */
export const activePanelContentAtom = atom(
  (get) => {
    const activeSessionId = get(activeSessionIdAtom);
    const sessionPanelContent = get(sessionPanelContentAtom);
    return activeSessionId ? sessionPanelContent[activeSessionId] || null : null;
  },
  (get, set, update: StandardPanelContent | null) => {
    const activeSessionId = get(activeSessionIdAtom);
    if (activeSessionId) {
      set(sessionPanelContentAtom, (prev) => ({
        ...prev,
        [activeSessionId]: update,
      }));
    }
  },
);

/**
 * Atom for server connection status
 */
export const connectionStatusAtom = atom<ConnectionStatus>({
  connected: false,
  lastConnected: null,
  lastError: null,
  reconnecting: false,
});

/**
 * Atom for agent options (sanitized)
 */
export const agentOptionsAtom = atom<SanitizedAgentOptions | null>(null);

/**
 * Atom for sidebar collapsed state
 */
export const sidebarCollapsedAtom = atom<boolean>(true);

/**
 * Atom for workspace panel collapsed state
 */
export const workspacePanelCollapsedAtom = atom<boolean>(false);

/**
 * Session-isolated processing state atom based on SSE events
 * Maps session IDs to their processing states
 */
export const sessionProcessingStatesAtom = atom<Record<string, boolean>>({});

/**
 * Derived atom for the current active session's processing state
 * Automatically isolates state by active session
 */
export const isProcessingAtom = atom(
  (get) => {
    const activeSessionId = get(activeSessionIdAtom);
    const sessionProcessingStates = get(sessionProcessingStatesAtom);
    return activeSessionId ? sessionProcessingStates[activeSessionId] ?? false : false;
  },
  (get, set, update: boolean) => {
    const activeSessionId = get(activeSessionIdAtom);
    if (activeSessionId) {
      set(sessionProcessingStatesAtom, (prev) => ({
        ...prev,
        [activeSessionId]: update,
      }));
    }
  },
);

/**
 * Workspace display mode - determines what content is shown in the workspace
 */
export type WorkspaceDisplayMode =
  | 'idle' // Empty state
  | 'embed-frame' // Show embed frame (VNC, Code Server, etc.)
  | 'tool-content'; // Show tool call result

/**
 * Workspace display state - unified state for workspace content
 */
export interface WorkspaceDisplayState {
  mode: WorkspaceDisplayMode;
  embedFrame?: WorkspaceNavItem; // Only when mode is 'embed-frame'
  toolContent?: StandardPanelContent; // Only when mode is 'tool-content'
}

/**
 * Session-specific workspace display state storage
 */
export const sessionWorkspaceDisplayStateAtom = atom<Record<string, WorkspaceDisplayState>>({});

/**
 * Derived atom for current workspace display state
 * Automatically isolates state by active session
 */
export const workspaceDisplayStateAtom = atom(
  (get) => {
    const activeSessionId = get(activeSessionIdAtom);
    const sessionWorkspaceDisplayState = get(sessionWorkspaceDisplayStateAtom);
    return (
      activeSessionId
        ? sessionWorkspaceDisplayState[activeSessionId] || { mode: 'idle' }
        : { mode: 'idle' }
    ) as WorkspaceDisplayState;
  },
  (get, set, update: Partial<WorkspaceDisplayState> | WorkspaceDisplayState) => {
    const activeSessionId = get(activeSessionIdAtom);
    if (activeSessionId) {
      const currentState = get(workspaceDisplayStateAtom);
      const newState: WorkspaceDisplayState =
        'mode' in update ? (update as WorkspaceDisplayState) : { ...currentState, ...update };
      set(sessionWorkspaceDisplayStateAtom, (prev) => ({
        ...prev,
        [activeSessionId]: newState,
      }));
    }
  },
);

/**
 * Convenience atoms for specific actions
 */
export const showEmbedFrameAtom = atom(null, (get, set, navItem: WorkspaceNavItem) => {
  set(workspaceDisplayStateAtom, {
    mode: 'embed-frame',
    embedFrame: navItem,
  });
});

export const hideEmbedFrameAtom = atom(null, (get, set) => {
  set(workspaceDisplayStateAtom, { mode: 'idle' });
});

export const showToolContentAtom = atom(null, (get, set, content: StandardPanelContent) => {
  set(workspaceDisplayStateAtom, {
    mode: 'tool-content',
    toolContent: content,
  });
});

export const clearWorkspaceAtom = atom(null, (get, set) => {
  set(workspaceDisplayStateAtom, { mode: 'idle' });
});

/**
 * Backward compatibility - derived atoms for existing code
 */
export const sessionActiveEmbedFrameAtom = atom<Record<string, WorkspaceNavItem | null>>({});

export const activeEmbedFrameAtom = atom(
  (get) => {
    const workspaceState = get(workspaceDisplayStateAtom);
    return workspaceState.mode === 'embed-frame' ? workspaceState.embedFrame || null : null;
  },
  (get, set, update: WorkspaceNavItem | null) => {
    if (update) {
      set(showEmbedFrameAtom, update);
    } else {
      set(hideEmbedFrameAtom);
    }
  },
);

/**
 * Atom for offline mode state (view-only when disconnected)
 */
export const offlineModeAtom = atom<boolean>(false);

/**
 * Base atom for layout mode
 */
const baseLayoutModeAtom = atom<LayoutMode>('default');

/**
 * Atom for layout mode with localStorage persistence
 */
export const layoutModeAtom = atom(
  (get) => get(baseLayoutModeAtom),
  (get, set, newValue: LayoutMode) => {
    set(baseLayoutModeAtom, newValue);
    // Persist to localStorage
    try {
      localStorage.setItem('tarko-layout-mode', newValue);
    } catch (error) {
      console.warn('Failed to save layout mode to localStorage:', error);
    }
  },
);

/**
 * Initialize layout mode from localStorage or web UI config
 */
export const initializeLayoutModeAtom = atom(null, (get, set) => {
  try {
    const defaultLayout = getDefaultLayoutMode();

    // Try to get from localStorage first
    const savedLayout = localStorage.getItem('tarko-layout-mode') as LayoutMode;
    if (savedLayout && (savedLayout === 'default' || savedLayout === 'narrow-chat')) {
      set(baseLayoutModeAtom, savedLayout);
    } else {
      set(baseLayoutModeAtom, defaultLayout);
    }
  } catch (error) {
    console.warn('Failed to initialize layout mode:', error);
    set(baseLayoutModeAtom, 'default');
  }
});

/**
 * Mobile bottom sheet state
 */
export const mobileBottomSheetAtom = atom({
  isOpen: false,
  isFullscreen: false,
});

/**
 * Actions for mobile bottom sheet
 */
export const openMobileBottomSheetAtom = atom(null, (get, set, fullscreen = false) => {
  set(mobileBottomSheetAtom, {
    isOpen: true,
    isFullscreen: fullscreen as boolean,
  });
});

export const closeMobileBottomSheetAtom = atom(null, (get, set) => {
  set(mobileBottomSheetAtom, {
    isOpen: false,
    isFullscreen: false,
  });
});

export const toggleMobileBottomSheetFullscreenAtom = atom(null, (get, set) => {
  const current = get(mobileBottomSheetAtom);
  set(mobileBottomSheetAtom, {
    ...current,
    isFullscreen: !current.isFullscreen,
  });
});
