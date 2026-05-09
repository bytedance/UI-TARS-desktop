'use client'

import Image from 'next/image'
import type { SearchContent } from '@/lib/types'
import { ExternalLink, Search } from 'lucide-react'

interface SearchResultProps {
  content: SearchContent
}

export function SearchResult({ content }: SearchResultProps) {
  return (
    <div className="space-y-4">
      {/* Search query */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
        <Search className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{content.query}</span>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {content.results.map((result, index) => (
          <a
            key={index}
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors group"
          >
            <div className="flex items-start gap-3">
              {/* Favicon */}
              {result.favicon && (
                <Image
                  src={result.favicon}
                  alt=""
                  width={16}
                  height={16}
                  className="mt-1 shrink-0"
                  unoptimized
                />
              )}
              
              <div className="flex-1 min-w-0">
                {/* Title */}
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground group-hover:text-primary truncate">
                    {result.title}
                  </h4>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </div>
                
                {/* URL */}
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {result.url}
                </p>
                
                {/* Snippet */}
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {result.snippet}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>

      {content.results.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No results found
        </div>
      )}
    </div>
  )
}
