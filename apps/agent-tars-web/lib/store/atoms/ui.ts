import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { ConnectionStatus, WorkspaceContent, WorkspaceNavItem } from '@/lib/types'

// Sidebar state
export const sidebarOpenAtom = atomWithStorage('agent-tars-sidebar-open', true)
export const sidebarWidthAtom = atomWithStorage('agent-tars-sidebar-width', 280)

// Workspace panel state
export const workspaceOpenAtom = atomWithStorage('agent-tars-workspace-open', true)
export const workspaceWidthAtom = atomWithStorage('agent-tars-workspace-width', 480)

// Workspace navigation items (tool results)
export const workspaceNavItemsAtom = atom<WorkspaceNavItem[]>([])

// Current workspace content
export const workspaceContentAtom = atom<WorkspaceContent>({ type: 'empty' })

// Active workspace tab
export const activeWorkspaceTabAtom = atom<string | null>(null)

// Settings modal
export const settingsOpenAtom = atom(false)

// Connection status
export const connectionStatusAtom = atom<ConnectionStatus>('disconnected')

// Auto-scroll enabled
export const autoScrollAtom = atomWithStorage('agent-tars-auto-scroll', true)

// Theme (for future light mode support)
export const themeAtom = atomWithStorage<'dark' | 'light'>('agent-tars-theme', 'dark')

// Notification state
export const notificationAtom = atom<{
  type: 'success' | 'error' | 'info'
  message: string
  id: string
} | null>(null)

// Show notification helper
export const showNotificationAtom = atom(
  null,
  (get, set, notification: { type: 'success' | 'error' | 'info'; message: string }) => {
    const id = Math.random().toString(36).substring(7)
    set(notificationAtom, { ...notification, id })
    
    setTimeout(() => {
      const current = get(notificationAtom)
      if (current?.id === id) {
        set(notificationAtom, null)
      }
    }, 5000)
  }
)
