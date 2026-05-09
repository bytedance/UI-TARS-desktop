'use client'

import { useAtom } from 'jotai'
import { agentConfigAtom } from '@/lib/store'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'

const MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
  { value: 'custom', label: 'Custom Model' },
]

export function VLMSettings() {
  const [config, setConfig] = useAtom(agentConfigAtom)

  const updateConfig = <K extends keyof typeof config>(
    key: K,
    value: (typeof config)[K]
  ) => {
    setConfig({ ...config, [key]: value })
  }

  return (
    <div className="space-y-6">
      {/* API Base URL */}
      <div className="space-y-2">
        <Label htmlFor="apiBaseUrl">API Base URL</Label>
        <Input
          id="apiBaseUrl"
          value={config.apiBaseUrl}
          onChange={(e) => updateConfig('apiBaseUrl', e.target.value)}
          placeholder="https://api.openai.com/v1"
        />
        <p className="text-xs text-muted-foreground">
          Use custom endpoints for OpenRouter, local models, or other providers.
        </p>
      </div>

      {/* API Key */}
      <div className="space-y-2">
        <Label htmlFor="apiKey">API Key</Label>
        <Input
          id="apiKey"
          type="password"
          value={config.apiKey}
          onChange={(e) => updateConfig('apiKey', e.target.value)}
          placeholder="sk-..."
        />
        <p className="text-xs text-muted-foreground">
          Your API key is stored locally and never sent to our servers.
        </p>
      </div>

      {/* Model Selection */}
      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <Select
          value={MODELS.find((m) => m.value === config.model) ? config.model : 'custom'}
          onValueChange={(value) => updateConfig('model', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODELS.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!MODELS.find((m) => m.value === config.model) && (
          <Input
            value={config.model}
            onChange={(e) => updateConfig('model', e.target.value)}
            placeholder="Enter custom model name"
            className="mt-2"
          />
        )}
      </div>

      {/* Temperature */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="temperature">Temperature</Label>
          <span className="text-sm text-muted-foreground">
            {config.temperature.toFixed(1)}
          </span>
        </div>
        <Slider
          id="temperature"
          min={0}
          max={2}
          step={0.1}
          value={[config.temperature]}
          onValueChange={([value]) => updateConfig('temperature', value)}
        />
        <p className="text-xs text-muted-foreground">
          Lower values produce more focused outputs, higher values more creative.
        </p>
      </div>

      {/* Max Tokens */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="maxTokens">Max Tokens</Label>
          <span className="text-sm text-muted-foreground">{config.maxTokens}</span>
        </div>
        <Slider
          id="maxTokens"
          min={256}
          max={16384}
          step={256}
          value={[config.maxTokens]}
          onValueChange={([value]) => updateConfig('maxTokens', value)}
        />
      </div>

      {/* Top P */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="topP">Top P</Label>
          <span className="text-sm text-muted-foreground">
            {config.topP.toFixed(1)}
          </span>
        </div>
        <Slider
          id="topP"
          min={0}
          max={1}
          step={0.1}
          value={[config.topP]}
          onValueChange={([value]) => updateConfig('topP', value)}
        />
      </div>

      {/* Enable Thinking */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="enableThinking">Enable Thinking</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Show the model&apos;s reasoning process.
          </p>
        </div>
        <Switch
          id="enableThinking"
          checked={config.enableThinking}
          onCheckedChange={(checked) => updateConfig('enableThinking', checked)}
        />
      </div>

      {/* System Prompt */}
      <div className="space-y-2">
        <Label htmlFor="systemPrompt">System Prompt (Optional)</Label>
        <Textarea
          id="systemPrompt"
          value={config.systemPrompt || ''}
          onChange={(e) => updateConfig('systemPrompt', e.target.value)}
          placeholder="Enter a custom system prompt..."
          className="min-h-[100px]"
        />
      </div>
    </div>
  )
}
