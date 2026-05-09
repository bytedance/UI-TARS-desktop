'use client'

import type { EmbedContent } from '@/lib/types'

interface EmbedResultProps {
  content: EmbedContent
}

export function EmbedResult({ content }: EmbedResultProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <iframe
        src={content.url}
        title={content.title || 'Embedded content'}
        className="w-full h-[500px] bg-background"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  )
}
