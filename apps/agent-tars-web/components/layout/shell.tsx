'use client'

import { useAtom } from 'jotai'
import { sidebarOpenAtom, workspaceOpenAtom } from '@/lib/store'
import { Sidebar } from '@/components/sidebar/sidebar-container'
import { cn } from '@/lib/utils'

interface ShellProps {
  children: React.ReactNode
  workspace?: React.ReactNode
}

export function Shell({ children, workspace }: ShellProps) {
  const [sidebarOpen] = useAtom(sidebarOpenAtom)
  const [workspaceOpen] = useAtom(workspaceOpenAtom)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content area */}
      <main 
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-all duration-300',
          sidebarOpen ? 'ml-0' : 'ml-0'
        )}
      >
        <div className="flex flex-1 overflow-hidden">
          {/* Chat/Main content */}
          <div 
            className={cn(
              'flex flex-1 flex-col overflow-hidden',
              workspaceOpen && workspace ? 'border-r border-border' : ''
            )}
          >
            {children}
          </div>
          
          {/* Workspace panel */}
          {workspaceOpen && workspace && (
            <aside className="w-[480px] flex-shrink-0 overflow-hidden border-l border-border bg-card">
              {workspace}
            </aside>
          )}
        </div>
      </main>
    </div>
  )
}
