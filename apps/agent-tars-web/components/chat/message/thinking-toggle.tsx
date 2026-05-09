'use client'

import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible'
import { Brain, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThinkingToggleProps {
  thinking: string
  duration?: number
  isOpen: boolean
  onToggle: () => void
}

export function ThinkingToggle({ thinking, duration, isOpen, onToggle }: ThinkingToggleProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm',
            'bg-agent-thinking/10 text-agent-thinking hover:bg-agent-thinking/20',
            isOpen && 'rounded-b-none'
          )}
        >
          <Brain className="h-4 w-4" />
          <span>Thinking</span>
          {duration && (
            <span className="text-xs text-muted-foreground">
              ({(duration / 1000).toFixed(1)}s)
            </span>
          )}
          <ChevronDown
            className={cn(
              'h-3 w-3 ml-1 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 py-2 bg-agent-thinking/5 rounded-b-lg border-t border-agent-thinking/20">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {thinking}
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
