'use client'

import { useAtom, useAtomValue } from 'jotai'
import { workspaceNavItemsAtom, activeWorkspaceTabAtom } from '@/lib/store'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { 
  Globe, 
  Search, 
  FileText, 
  Terminal, 
  Image, 
  Link, 
  Code,
  X 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkspaceContentType } from '@/lib/types'

const typeIcons: Record<WorkspaceContentType, typeof Globe> = {
  browser: Globe,
  search: Search,
  file: FileText,
  terminal: Terminal,
  image: Image,
  embed: Link,
  diff: Code,
  link: Link,
  empty: Globe,
}

export function WorkspaceNav() {
  const navItems = useAtomValue(workspaceNavItemsAtom)
  const [activeTab, setActiveTab] = useAtom(activeWorkspaceTabAtom)

  if (navItems.length === 0) return null

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex p-2 gap-1">
        {navItems.map((item) => {
          const Icon = typeIcons[item.type] || Globe
          const isActive = activeTab === item.id

          return (
            <Button
              key={item.id}
              variant={isActive ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'flex items-center gap-2 shrink-0',
                isActive && 'bg-accent'
              )}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="max-w-[120px] truncate">{item.title}</span>
            </Button>
          )
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
