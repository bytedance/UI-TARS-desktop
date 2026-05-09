'use client'

import { useAtom } from 'jotai'
import { browserConfigAtom } from '@/lib/store'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'

export function BrowserSettings() {
  const [config, setConfig] = useAtom(browserConfigAtom)

  const updateConfig = <K extends keyof typeof config>(
    key: K,
    value: (typeof config)[K]
  ) => {
    setConfig({ ...config, [key]: value })
  }

  return (
    <div className="space-y-6">
      {/* Headless Mode */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="headless">Headless Mode</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Run browser without visible window (faster, less resources).
          </p>
        </div>
        <Switch
          id="headless"
          checked={config.headless}
          onCheckedChange={(checked) => updateConfig('headless', checked)}
        />
      </div>

      {/* Viewport Width */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="viewportWidth">Viewport Width</Label>
          <span className="text-sm text-muted-foreground">
            {config.viewport.width}px
          </span>
        </div>
        <Slider
          id="viewportWidth"
          min={800}
          max={1920}
          step={80}
          value={[config.viewport.width]}
          onValueChange={([value]) =>
            updateConfig('viewport', { ...config.viewport, width: value })
          }
        />
      </div>

      {/* Viewport Height */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="viewportHeight">Viewport Height</Label>
          <span className="text-sm text-muted-foreground">
            {config.viewport.height}px
          </span>
        </div>
        <Slider
          id="viewportHeight"
          min={600}
          max={1080}
          step={60}
          value={[config.viewport.height]}
          onValueChange={([value]) =>
            updateConfig('viewport', { ...config.viewport, height: value })
          }
        />
      </div>

      {/* Timeout */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="timeout">Navigation Timeout</Label>
          <span className="text-sm text-muted-foreground">
            {config.timeout / 1000}s
          </span>
        </div>
        <Slider
          id="timeout"
          min={5000}
          max={120000}
          step={5000}
          value={[config.timeout]}
          onValueChange={([value]) => updateConfig('timeout', value)}
        />
        <p className="text-xs text-muted-foreground">
          Maximum time to wait for page navigation.
        </p>
      </div>
    </div>
  )
}
