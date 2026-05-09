'use client'

import { useAtomValue } from 'jotai'
import { workspaceContentAtom } from '@/lib/store'
import { BrowserResult } from './renderers/browser-result'
import { SearchResult } from './renderers/search-result'
import { FileResult } from './renderers/file-result'
import { TerminalResult } from './renderers/terminal-result'
import { ImageResult } from './renderers/image-result'
import { EmbedResult } from './renderers/embed-result'
import { DiffResult } from './renderers/diff-result'
import { LinkResult } from './renderers/link-result'
import { Layers } from 'lucide-react'

export function WorkspaceContent() {
  const content = useAtomValue(workspaceContentAtom)

  switch (content.type) {
    case 'browser':
      return <BrowserResult content={content} />
    case 'search':
      return <SearchResult content={content} />
    case 'file':
      return <FileResult content={content} />
    case 'terminal':
      return <TerminalResult content={content} />
    case 'image':
      return <ImageResult content={content} />
    case 'embed':
      return <EmbedResult content={content} />
    case 'diff':
      return <DiffResult content={content} />
    case 'link':
      return <LinkResult content={content} />
    case 'empty':
    default:
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Layers className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No content selected</p>
        </div>
      )
  }
}
