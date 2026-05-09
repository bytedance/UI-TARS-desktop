'use client'

import { useAtom } from 'jotai'
import { sessionSearchQueryAtom } from '@/lib/store'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SessionSearch() {
  const [query, setQuery] = useAtom(sessionSearchQueryAtom)

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search sessions..."
        className="h-8 pl-8 pr-8 bg-sidebar-accent/50 border-sidebar-border text-sm"
      />
      {query && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
          onClick={() => setQuery('')}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
