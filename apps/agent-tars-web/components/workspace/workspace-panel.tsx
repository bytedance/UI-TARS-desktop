'use client'

import { useAtom, useAtomValue } from 'jotai'
import { 
  workspaceOpenAtom, 
  workspaceContentAtom,
  workspaceNavItemsAtom,
  activeWorkspaceTabAtom 
} from '@/lib/store'
import { WorkspaceHeader } from './workspace-header'
import { WorkspaceContent } from './workspace-content'
import { WorkspaceNav } from './workspace-nav'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { Layers } from 'lucide-react'

export function WorkspacePanel() {
  const [isOpen, setIsOpen] = useAtom(workspaceOpenAtom)
  const content = useAtomValue(workspaceContentAtom)
  const navItems = useAtomValue(workspaceNavItemsAtom)

  if (content.type === 'empty' && navItems.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-4">
          <Layers className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-1">Workspace</h3>
        <p className="text-sm text-muted-foreground max-w-[200px]">
          Tool results and browser previews will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <WorkspaceHeader />
      <Separator />
      
      {navItems.length > 0 && (
        <>
          <WorkspaceNav />
          <Separator />
        </>
      )}
      
      <ScrollArea className="flex-1">
        <div className="p-4">
          <WorkspaceContent />
        </div>
      </ScrollArea>
    </div>
  )
}
