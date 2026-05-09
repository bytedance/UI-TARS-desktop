'use client'

import { useState } from 'react'
import type { FileContent } from '@/lib/types'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Button } from '@/components/ui/button'
import { FileText, Copy, Check } from 'lucide-react'

interface FileResultProps {
  content: FileContent
}

export function FileResult({ content }: FileResultProps) {
  const [copied, setCopied] = useState(false)
  
  const filename = content.path.split('/').pop() || 'file'
  const extension = filename.split('.').pop() || ''
  const language = content.language || getLanguageFromExtension(extension)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-2">
      {/* File header */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-mono text-foreground truncate">
            {content.path}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Code content */}
      <div className="rounded-lg border border-border overflow-hidden">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '0.8125rem',
          }}
          showLineNumbers
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: 'var(--color-muted-foreground)',
          }}
        >
          {content.content}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

function getLanguageFromExtension(ext: string): string {
  const map: Record<string, string> = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    md: 'markdown',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
  }
  return map[ext.toLowerCase()] || 'text'
}
