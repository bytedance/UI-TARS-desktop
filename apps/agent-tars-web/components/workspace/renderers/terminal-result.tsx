'use client'

import type { TerminalContent } from '@/lib/types'
import { Terminal, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TerminalResultProps {
  content: TerminalContent
}

export function TerminalResult({ content }: TerminalResultProps) {
  const isSuccess = content.exitCode === 0 || content.exitCode === undefined
  
  return (
    <div className="space-y-2">
      {/* Command header */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
        <Terminal className="h-4 w-4 text-muted-foreground" />
        <code className="text-sm font-mono text-foreground flex-1 truncate">
          $ {content.command}
        </code>
        {content.exitCode !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-xs',
            isSuccess ? 'text-green-500' : 'text-red-500'
          )}>
            {isSuccess ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            <span>Exit {content.exitCode}</span>
          </div>
        )}
      </div>

      {/* Output */}
      <div className="rounded-lg border border-border bg-[#1e1e1e] p-4 overflow-auto max-h-[400px]">
        <pre className="text-sm font-mono text-gray-200 whitespace-pre-wrap break-all">
          {content.output || '(no output)'}
        </pre>
      </div>
    </div>
  )
}
