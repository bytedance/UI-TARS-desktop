import { atom } from 'jotai';
import { SessionItemMetadata, LayoutMode } from '@tarko/interface';
import { getDefaultLayoutMode } from '@/config/web-ui-config';
import { ConnectionStatus, PanelContent, SanitizedAgentOptions } from '@/common/types';
import { activeSessionIdAtom } from './session';

/**
 * Session-specific panel content storage
 */
export const sessionPanelContentAtom = atom<Record<string, PanelContent | null>>({});

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
  (get, set, update: PanelContent | null) => {
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
 * Simple processing state atom based on SSE events
 */
export const isProcessingAtom = atom<boolean>(false);

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
