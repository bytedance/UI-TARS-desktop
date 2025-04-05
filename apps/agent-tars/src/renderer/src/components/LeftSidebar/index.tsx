import styles from './index.module.scss';
import { atom, useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { useThemeMode } from '@renderer/hooks/useThemeMode';
import { TopBar } from './TopBar';
import { BottomBar } from './BottomBar';
import { DeleteModal } from './DeleteModal';
import { SettingsModal } from './Settings';
import { SessionList } from './SessionList';
import { useChatSessions } from '@renderer/hooks/useChatSession';
import { useAppChat } from '@renderer/hooks/useAppChat';
import toast from 'react-hot-toast';
import { showCanvasAtom } from '@renderer/state/canvas';

const SIDEBAR_COLLAPSED_KEY = 'agent-tars-sidebar-collapsed';

// Get sidebar collapsed state from localStorage. Default to true (collapsed) if not found.
// Note: Using direct `localStorage` instead of `atomWithStorage` to avoid flash of expanded sidebar
// on app refresh. `atomWithStorage` would take some time to initialize where the sidebar would initially render
// as expanded and then collapse, creating an unpleasant UI flicker.
const getInitialCollapsedState = () => {
  try {
    const savedState = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return savedState ? JSON.parse(savedState) : true;
  } catch {
    return true;
  }
};

export const leftSidebarCollapsedAtom = atom(getInitialCollapsedState());
export const DEFAULT_APP_ID = 'omega-agent';

export function LeftSidebar() {
  const [isCollapsed, setIsCollapsed] = useAtom(leftSidebarCollapsedAtom);
  const { toggle: toggleTheme, value: isDarkMode } = useThemeMode();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const { messageSending } = useAppChat();
  const [, setShowCanvas] = useAtom(showCanvasAtom);
  const {
    chatSessions,
    currentSessionId,
    updateCurrentSessionId,
    addNewSession,
    removeSession,
    initializeSessions,
    updateChatSession,
  } = useChatSessions({
    appId: 'omega-agent',
    origin: 'omega',
  });

  // Save sidebar state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    initializeSessions();
  }, [initializeSessions]);

  const handleAddSession = () => {
    // Hide Canvas panel when creating a new session
    setShowCanvas(false);

    addNewSession({
      appId: 'omega-agent',
      name: 'New Session',
      messageCount: 0,
      origin: 'ami',
    });
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToDelete(sessionId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (sessionToDelete) {
      removeSession(sessionToDelete);
      setDeleteModalOpen(false);
      setSessionToDelete(null);
    }
  };

  const handleEditSession = (
    sessionId: string,
    currentName: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setEditingSessionId(sessionId);
    setEditingName(currentName);
  };

  const handleSaveEdit = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingName.trim()) {
      await updateChatSession(sessionId, { name: editingName.trim() });
      setEditingSessionId(null);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent, sessionId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingName.trim()) {
        await updateChatSession(sessionId, { name: editingName.trim() });
        setEditingSessionId(null);
      }
    } else if (e.key === 'Escape') {
      setEditingSessionId(null);
    }
  };

  return (
    <>
      <div
        className={`${styles.sidebarPlaceholder} ${isCollapsed ? styles.collapsed : styles.expanded}`}
      />

      <div
        className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : styles.expanded}`}
      >
        <TopBar
          isCollapsed={isCollapsed}
          isDarkMode={isDarkMode}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          onToggleTheme={toggleTheme}
          onAddSession={handleAddSession}
        />

        <div
          className={`${styles.messageList} ${isCollapsed ? styles.collapsed : ''}`}
        >
          <SessionList
            sessions={chatSessions}
            currentSessionId={currentSessionId}
            editingSessionId={editingSessionId}
            editingName={editingName}
            onEditingNameChange={setEditingName}
            onKeyDown={handleKeyDown}
            onSaveEdit={handleSaveEdit}
            onEditSession={handleEditSession}
            onDeleteSession={handleDeleteSession}
            onClick={(sessionId) => {
              if (messageSending) {
                toast.error('Please finish sending message first');
                return;
              }
              updateCurrentSessionId(sessionId);
            }}
          />
        </div>

        <BottomBar
          isCollapsed={isCollapsed}
          onOpenSettings={() => setSettingsModalOpen(true)}
        />
      </div>

      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSessionToDelete(null);
        }}
        onConfirm={confirmDelete}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </>
  );
}
