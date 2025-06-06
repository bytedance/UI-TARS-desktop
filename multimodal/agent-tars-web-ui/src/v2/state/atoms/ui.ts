import { atom } from 'jotai';
import { ConnectionStatus, PanelContent } from '../../types';

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
 * Atom for model info (provider and model name)
 */
export const modelInfoAtom = atom<{ provider: string; model: string }>({
  provider: '',
  model: '',
});

/**
 * Atom for sidebar collapsed state
 */
export const sidebarCollapsedAtom = atom<boolean>(false);

/**
 * Atom for workspace panel collapsed state
 */
export const workspacePanelCollapsedAtom = atom<boolean>(false);

/**
 * Atom for tracking processing status (when agent is running)
 */
export const isProcessingAtom = atom<boolean>(false);

/**
 * Atom for offline mode state (view-only when disconnected)
 */
export const offlineModeAtom = atom<boolean>(false);