'use client'

import Image from 'next/image'
import type { LinkContent } from '@/lib/types'
import { ExternalLink, Link } from 'lucide-react'

interface LinkResultProps {
  content: LinkContent
}

export function LinkResult({ content }: LinkResultProps) {
  return (
    <a
      href={content.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-border bg-card hover:bg-accent transition-colors overflow-hidden group"
    >
      {/* Image preview */}
      {content.image && (
        <div className="relative aspect-video bg-muted">
          <Image
            src={content.image}
            alt={content.title || 'Link preview'}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Link className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-foreground group-hover:text-primary truncate">
                {content.title || content.url}
              </h4>
              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {content.url}
            </p>
            {content.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {content.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </a>
  )
}
