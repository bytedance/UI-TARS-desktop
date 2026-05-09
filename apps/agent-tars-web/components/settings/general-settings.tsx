'use client'

import { useAtom } from 'jotai'
import { autoScrollAtom, themeAtom } from '@/lib/store'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function GeneralSettings() {
  const [autoScroll, setAutoScroll] = useAtom(autoScrollAtom)
  const [theme, setTheme] = useAtom(themeAtom)

  return (
    <div className="space-y-6">
      {/* Auto Scroll */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="autoScroll">Auto Scroll</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Automatically scroll to new messages.
          </p>
        </div>
        <Switch
          id="autoScroll"
          checked={autoScroll}
          onCheckedChange={setAutoScroll}
        />
      </div>

      {/* Theme */}
      <div className="space-y-2">
        <Label htmlFor="theme">Theme</Label>
        <Select value={theme} onValueChange={(value: 'dark' | 'light') => setTheme(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="light">Light (Coming Soon)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* About */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-medium text-foreground">About Agent TARS</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Agent TARS is a multimodal AI agent capable of browsing the web, executing commands, and completing complex tasks autonomously.
        </p>
        <p className="text-xs text-muted-foreground mt-4">
          Version 0.1.0
        </p>
      </div>
    </div>
  )
}
