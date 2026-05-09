'use client'

import { useAtom, useSetAtom } from 'jotai'
import { 
  sidebarOpenAtom, 
  settingsOpenAtom,
  currentSessionIdAtom,
  sessionsAtom 
} from '@/lib/store'
import { SessionList } from './session-list'
import { SessionSearch } from './session-search'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip'
import { 
  PanelLeftClose, 
  PanelLeft, 
  Plus, 
  Settings, 
  Github,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'
import { useRouter } from 'next/navigation'

export function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom)
  const setSettingsOpen = useSetAtom(settingsOpenAtom)
  const [sessions, setSessions] = useAtom(sessionsAtom)
  const setCurrentSessionId = useSetAtom(currentSessionIdAtom)
  const router = useRouter()

  const handleNewSession = () => {
    const newSession = {
      id: uuidv4(),
      title: 'New Session',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        totalMessages: 0,
      },
    }
    setSessions([newSession, ...sessions])
    setCurrentSessionId(newSession.id)
    router.push(`/${newSession.id}`)
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'relative flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
          sidebarOpen ? 'w-[280px]' : 'w-[60px]'
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between px-3">
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-foreground">Agent TARS</span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(false)}
                    className="h-8 w-8"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Collapse sidebar</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                  className="h-8 w-8 mx-auto"
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          )}
        </div>

        <Separator />

        {/* New Session Button */}
        <div className="p-3">
          {sidebarOpen ? (
            <Button
              onClick={handleNewSession}
              className="w-full justify-start gap-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600"
            >
              <Plus className="h-4 w-4" />
              New Session
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleNewSession}
                  size="icon"
                  className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">New Session</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Search */}
        {sidebarOpen && (
          <div className="px-3 pb-2">
            <SessionSearch />
          </div>
        )}

        {/* Session List */}
        <ScrollArea className="flex-1">
          <SessionList collapsed={!sidebarOpen} />
        </ScrollArea>

        <Separator />

        {/* Footer */}
        <div className="p-3">
          <div className={cn('flex gap-2', sidebarOpen ? 'justify-between' : 'flex-col items-center')}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSettingsOpen(true)}
                  className="h-8 w-8"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={sidebarOpen ? 'top' : 'right'}>Settings</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="h-8 w-8"
                >
                  <a
                    href="https://github.com/anthropics/agent-tars"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent side={sidebarOpen ? 'top' : 'right'}>GitHub</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
