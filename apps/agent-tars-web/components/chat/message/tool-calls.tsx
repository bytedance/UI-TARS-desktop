'use client'

import { useState } from 'react'
import type { ToolCall, ToolResult } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible'
import { 
  Globe, 
  Search, 
  Terminal, 
  FileText, 
  MousePointer2, 
  Type, 
  Eye,
  ChevronDown,
  Check,
  X,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToolCallsProps {
  toolCalls: ToolCall[]
  toolResults?: ToolResult[]
}

const toolIcons: Record<string, typeof Globe> = {
  browser_navigate: Globe,
  browser_go_back: Globe,
  browser_go_forward: Globe,
  browser_click: MousePointer2,
  browser_form_input_fill: Type,
  browser_get_clickable_elements: Eye,
  browser_screenshot: Eye,
  browser_snapshot: Eye,
  browser_evaluate: Terminal,
  browser_tab_list: Globe,
  browser_tab_new: Globe,
  browser_tab_close: Globe,
  web_search: Search,
  file_read: FileText,
  file_write: FileText,
  terminal_execute: Terminal,
}

export function ToolCalls({ toolCalls, toolResults }: ToolCallsProps) {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set())

  const toggleTool = (id: string) => {
    const newExpanded = new Set(expandedTools)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedTools(newExpanded)
  }

  const getToolResult = (toolCallId: string) => {
    return toolResults?.find((r) => r.toolCallId === toolCallId)
  }

  return (
    <div className="space-y-2">
      {toolCalls.map((toolCall) => {
        const Icon = toolIcons[toolCall.function.name] || Terminal
        const result = getToolResult(toolCall.id)
        const isExpanded = expandedTools.has(toolCall.id)
        const isLoading = !result
        const isError = result?.isError

        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(toolCall.function.arguments)
        } catch {
          // Ignore parse errors
        }

        return (
          <Collapsible
            key={toolCall.id}
            open={isExpanded}
            onOpenChange={() => toggleTool(toolCall.id)}
          >
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors',
                  isError
                    ? 'border-destructive/50 bg-destructive/10'
                    : 'border-border bg-card hover:bg-accent'
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-md',
                    isError
                      ? 'bg-destructive/20 text-destructive'
                      : 'bg-agent-tool/20 text-agent-tool'
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                {/* Tool name and status */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium truncate">
                      {toolCall.function.name}
                    </span>
                    {result && (
                      <>
                        {isError ? (
                          <X className="h-3 w-3 text-destructive" />
                        ) : (
                          <Check className="h-3 w-3 text-agent-success" />
                        )}
                        {result.duration && (
                          <span className="text-xs text-muted-foreground">
                            {result.duration}ms
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {/* Brief preview of arguments */}
                  <p className="text-xs text-muted-foreground truncate">
                    {Object.entries(args)
                      .slice(0, 2)
                      .map(([k, v]) => `${k}: ${String(v).slice(0, 30)}`)
                      .join(', ')}
                  </p>
                </div>

                {/* Expand indicator */}
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    isExpanded && 'rotate-180'
                  )}
                />
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="mt-2 space-y-2 pl-11">
                {/* Arguments */}
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Arguments
                  </p>
                  <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all">
                    {JSON.stringify(args, null, 2)}
                  </pre>
                </div>

                {/* Result */}
                {result && (
                  <div
                    className={cn(
                      'rounded-md p-3',
                      isError ? 'bg-destructive/10' : 'bg-muted/50'
                    )}
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {isError ? 'Error' : 'Result'}
                    </p>
                    <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all max-h-48 overflow-auto">
                      {typeof result.result === 'string'
                        ? result.result
                        : JSON.stringify(result.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )
      })}
    </div>
  )
}
