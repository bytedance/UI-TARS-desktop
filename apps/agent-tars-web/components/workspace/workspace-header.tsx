'use client'

import { useAtom, useAtomValue } from 'jotai'
import { workspaceOpenAtom, workspaceContentAtom } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { X, ExternalLink, Download, Maximize2 } from 'lucide-react'
import { getContentTitle } from './utils'

export function WorkspaceHeader() {
  const [isOpen, setIsOpen] = useAtom(workspaceOpenAtom)
  const content = useAtomValue(workspaceContentAtom)
  const title = getContentTitle(content)

  const handleOpenExternal = () => {
    if (content.type === 'browser' && content.url) {
      window.open(content.url, '_blank')
    } else if (content.type === 'embed' && content.url) {
      window.open(content.url, '_blank')
    }
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-12 items-center justify-between px-4">
        <h3 className="font-medium text-foreground truncate">{title}</h3>
        <div className="flex items-center gap-1">
          {(content.type === 'browser' || content.type === 'embed') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleOpenExternal}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open in new tab</TooltipContent>
            </Tooltip>
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Close panel</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
