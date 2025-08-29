import { atom } from 'jotai';
import { AgentProcessingPhase, AgentStatusInfo, SessionItemInfo, LayoutMode } from '@tarko/interface';
import { getDefaultLayoutMode } from '@/common/constants/shared';
import {
  ConnectionStatus,
  PanelContent,
  SanitizedAgentOptions,
} from '@/common/types';

/**
 * Atom for the content currently displayed in the panel
 */
export const activePanelContentAtom = atom<PanelContent | null>(null);

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
 * Session metadata atom using server-side SessionItemInfo metadata type
 * This eliminates type duplication and ensures consistency with persistence layer
 */
export const sessionMetadataAtom = atom<SessionItemInfo['metadata']>({});

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
 * Enhanced agent status atom for TTFT optimization
 * Replaces the redundant isProcessingAtom
 */
export const agentStatusAtom = atom<AgentStatusInfo>({
  isProcessing: false,
});

/**
 * Derived atom for backward compatibility
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
 * Atom for layout mode with localStorage persistence
 */
export const layoutModeAtom = atom<LayoutMode>(
  'default',
  (get, set, newValue: LayoutMode) => {
    set(layoutModeAtom, newValue);
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
      set(layoutModeAtom, savedLayout);
    } else {
      set(layoutModeAtom, defaultLayout);
    }
  } catch (error) {
    console.warn('Failed to initialize layout mode:', error);
    set(layoutModeAtom, 'default');
  }
});
