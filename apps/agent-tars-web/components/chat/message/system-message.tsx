'use client'

import { Info } from 'lucide-react'

interface SystemMessageProps {
  content: string
}

export function SystemMessage({ content }: SystemMessageProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 text-muted-foreground text-sm">
      <Info className="h-4 w-4 flex-shrink-0" />
      <span>{content}</span>
    </div>
  )
}
