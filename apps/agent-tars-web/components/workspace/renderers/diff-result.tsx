'use client'

import type { DiffContent } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Minus, Plus } from 'lucide-react'

interface DiffResultProps {
  content: DiffContent
}

export function DiffResult({ content }: DiffResultProps) {
  const originalLines = content.original.split('\n')
  const modifiedLines = content.modified.split('\n')

  // Simple line-by-line diff visualization
  return (
    <div className="space-y-4">
      {/* Original */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-red-400 border-red-400/50">
            <Minus className="h-3 w-3 mr-1" />
            Original
          </Badge>
        </div>
        <div className="rounded-lg border border-border bg-red-500/5 p-4 overflow-auto max-h-[200px]">
          <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">
            {content.original}
          </pre>
        </div>
      </div>

      {/* Modified */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-400 border-green-400/50">
            <Plus className="h-3 w-3 mr-1" />
            Modified
          </Badge>
        </div>
        <div className="rounded-lg border border-border bg-green-500/5 p-4 overflow-auto max-h-[200px]">
          <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">
            {content.modified}
          </pre>
        </div>
      </div>
    </div>
  )
}
