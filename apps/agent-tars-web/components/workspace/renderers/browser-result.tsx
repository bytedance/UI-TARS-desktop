'use client'

import Image from 'next/image'
import type { BrowserContent } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Globe, ExternalLink } from 'lucide-react'

interface BrowserResultProps {
  content: BrowserContent
}

export function BrowserResult({ content }: BrowserResultProps) {
  return (
    <div className="space-y-4">
      {/* URL Bar */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <a 
          href={content.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-sm text-foreground hover:text-primary truncate"
        >
          {content.url}
        </a>
        <ExternalLink className="h-3 w-3 text-muted-foreground" />
      </div>

      {/* Screenshot */}
      {content.screenshot && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Image
            src={content.screenshot}
            alt={content.title || 'Browser screenshot'}
            width={800}
            height={600}
            className="w-full h-auto"
            unoptimized={content.screenshot.startsWith('data:')}
          />
        </div>
      )}

      {/* Clickable Elements */}
      {content.elements && content.elements.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">
            Clickable Elements ({content.elements.length})
          </h4>
          <ScrollArea className="h-[200px]">
            <div className="space-y-1">
              {content.elements.map((element, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-sm"
                >
                  <Badge variant="outline" className="shrink-0">
                    {element.index}
                  </Badge>
                  <div className="min-w-0">
                    <code className="text-xs text-muted-foreground">
                      {element.tag}
                    </code>
                    <p className="text-foreground truncate">{element.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
