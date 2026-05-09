import type { WorkspaceContent } from '@/lib/types'

export function getContentTitle(content: WorkspaceContent): string {
  switch (content.type) {
    case 'browser':
      return content.title || content.url || 'Browser'
    case 'search':
      return `Search: ${content.query}`
    case 'file':
      return content.path.split('/').pop() || 'File'
    case 'terminal':
      return 'Terminal'
    case 'image':
      return 'Images'
    case 'embed':
      return content.title || 'Embed'
    case 'diff':
      return 'Diff'
    case 'link':
      return content.title || 'Link'
    case 'empty':
    default:
      return 'Workspace'
  }
}
