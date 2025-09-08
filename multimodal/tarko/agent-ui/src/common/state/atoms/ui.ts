import { atom } from 'jotai';
import { AgentProcessingPhase, AgentStatusInfo, SessionInfo, LayoutMode } from '@tarko/interface';
import { getDefaultLayoutMode } from '@/config/web-ui-config';
import {
  ConnectionStatus,
  PanelContent,
  SanitizedAgentOptions,
} from '@/common/types';
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
 * Session metadata atom using server-side SessionInfo metadata type
 * This eliminates type duplication and ensures consistency with persistence layer
 */
export const sessionMetadataAtom = atom<SessionInfo['metadata']>({});

/**
 * Atom for agent options (sanitized configuration)
 */
export const agentOptionsAtom = atom<SanitizedAgentOptions>({});

/**
 * Atom for sidebar collapsed state
 */
export const sidebarCollapsedAtom = atom<boolean>(true);

/**
 * Atom for workspace panel collapsed state
 */
export const workspacePanelCollapsedAtom = atom<boolean>(false);

/**
 * Session-specific agent status storage
 */
export const sessionAgentStatusAtom = atom<Record<string, AgentStatusInfo>>({});

/**
 * Enhanced agent status atom for TTFT optimization with session isolation
 */
export const agentStatusAtom = atom(
  (get) => {
    const activeSessionId = get(activeSessionIdAtom);
    const sessionAgentStatus = get(sessionAgentStatusAtom);
    return activeSessionId 
      ? sessionAgentStatus[activeSessionId] || { isProcessing: false }
      : { isProcessing: false };
  },
  (get, set, update: AgentStatusInfo | ((prev: AgentStatusInfo) => AgentStatusInfo)) => {
    const activeSessionId = get(activeSessionIdAtom);
    if (activeSessionId) {
      set(sessionAgentStatusAtom, (prev) => {
        const currentStatus = prev[activeSessionId] || { isProcessing: false };
        const newStatus = typeof update === 'function' ? update(currentStatus) : update;
        return {
          ...prev,
          [activeSessionId]: newStatus,
        };
      });
    }
  },
);

/**
 * Derived atom for backward compatibility with session isolation
 */
export const isProcessingAtom = atom(
  (get) => get(agentStatusAtom).isProcessing,
  (get, set, update: boolean) => {
    set(agentStatusAtom, (prev) => ({ ...prev, isProcessing: update }));
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
