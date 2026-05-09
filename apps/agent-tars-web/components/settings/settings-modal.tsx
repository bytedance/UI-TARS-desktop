'use client'

import { useAtom } from 'jotai'
import { settingsOpenAtom, agentConfigAtom, browserConfigAtom } from '@/lib/store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VLMSettings } from './vlm-settings'
import { BrowserSettings } from './browser-settings'
import { GeneralSettings } from './general-settings'
import { Bot, Globe, Settings } from 'lucide-react'

export function SettingsModal() {
  const [open, setOpen] = useAtom(settingsOpenAtom)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure Agent TARS settings and preferences.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="vlm" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="vlm" className="gap-2">
              <Bot className="h-4 w-4" />
              VLM / AI
            </TabsTrigger>
            <TabsTrigger value="browser" className="gap-2">
              <Globe className="h-4 w-4" />
              Browser
            </TabsTrigger>
            <TabsTrigger value="general" className="gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            <TabsContent value="vlm" className="m-0">
              <VLMSettings />
            </TabsContent>
            <TabsContent value="browser" className="m-0">
              <BrowserSettings />
            </TabsContent>
            <TabsContent value="general" className="m-0">
              <GeneralSettings />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
