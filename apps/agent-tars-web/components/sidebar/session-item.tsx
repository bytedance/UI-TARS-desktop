'use client'

import { useState } from 'react'
import { Session } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MessageSquare, MoreHorizontal, Trash2, Edit2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface SessionItemProps {
  session: Session
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}

export function SessionItem({ session, isActive, onSelect, onDelete }: SessionItemProps) {
  const [isHovered, setIsHovered] = useState(false)

  const timeAgo = formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer transition-colors',
        isActive 
          ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
          : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
      )}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{session.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {session.metadata.totalMessages} messages · {timeAgo}
        </p>
      </div>

      {(isHovered || isActive) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation()
              // TODO: Implement rename
            }}>
              <Edit2 className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
