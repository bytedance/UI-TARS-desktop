import { create } from 'zustand';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@renderer/components/ui/tabs';
import {
  Cpu,
  MessagesSquare,
  Sparkles,
  FileText,
  Settings,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { Separator } from '@renderer/components/ui/separator';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { useTranslation } from '@renderer/hooks/useTranslation';

import { VLMSettings } from './category/vlm';
import { ChatSettings } from './category/chat';
import { LocalBrowserSettings } from './category/localBrowser';
import { ReportSettings } from './category/report';
import { GeneralSettings } from './category/general';

interface GlobalSettingsStore {
  isOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
}

export const useGlobalSettings = create<GlobalSettingsStore>((set) => ({
  isOpen: false,
  openSettings: () => set({ isOpen: true }),
  closeSettings: () => set({ isOpen: false }),
  toggleSettings: () => set((state) => ({ isOpen: !state.isOpen })),
}));

export const GlobalSettings = () => {
  const { isOpen, toggleSettings } = useGlobalSettings();
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={toggleSettings}>
      <DialogContent className="min-w-4/5 xl:min-w-3/5 h-4/5 [&>button:last-child]:hidden">
        <DialogHeader className="hidden">
          <DialogTitle>{t('settings.title')}</DialogTitle>
          <DialogDescription className="hidden" />
        </DialogHeader>
        <Tabs defaultValue="vlm" className="w-full gap-6 flex-row">
          <div className="w-60 border-r border-border pr-6">
            <TabsList className="flex flex-col h-fit w-full bg-transparent p-0">
              <TabsTrigger
                value="vlm"
                className="w-full justify-start gap-2 px-2 py-1.5 mb-2 !shadow-none font-normal data-[state=active]:font-medium data-[state=active]:bg-accent data-[state=active]:text-accent-foreground hover:bg-accent/50"
              >
                <Sparkles strokeWidth={2} />
                {t('settings.vlm')}
              </TabsTrigger>
              <TabsTrigger
                value="chat"
                className="w-full justify-start gap-2 px-2 py-1.5 mb-2 !shadow-none font-normal data-[state=active]:font-medium data-[state=active]:bg-accent data-[state=active]:text-accent-foreground hover:bg-accent/50"
              >
                <MessagesSquare strokeWidth={2} />
                {t('settings.chat')}
              </TabsTrigger>
              <TabsTrigger
                value="operator"
                className="w-full justify-start gap-2 px-2 py-1.5 mb-2 !shadow-none font-normal data-[state=active]:font-medium data-[state=active]:bg-accent data-[state=active]:text-accent-foreground hover:bg-accent/50"
              >
                <Cpu strokeWidth={2} />
                {t('settings.operator')}
              </TabsTrigger>
              <TabsTrigger
                value="report"
                className="w-full justify-start gap-2 px-2 py-1.5 mb-2 !shadow-none font-normal data-[state=active]:font-medium data-[state=active]:bg-accent data-[state=active]:text-accent-foreground hover:bg-accent/50"
              >
                <FileText strokeWidth={2} />
                {t('settings.report')}
              </TabsTrigger>
              <TabsTrigger
                value="general"
                className="w-full justify-start gap-2 px-2 py-1.5 mb-2 !shadow-none font-normal data-[state=active]:font-medium data-[state=active]:bg-accent data-[state=active]:text-accent-foreground hover:bg-accent/50"
              >
                <Settings strokeWidth={2} />
                {t('settings.general')}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1">
            <TabsContent value="vlm" className="mt-0">
              <ScrollArea className="h-[calc(80vh-48px)]">
                <h2 className="text-xl font-semibold mb-3">
                  {t('settings.vlm')}
                </h2>
                <Separator className="mb-4" />
                <VLMSettings autoSave={true} />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="chat" className="mt-0">
              <h2 className="text-xl font-semibold mb-3">
                {t('settings.chat')}
              </h2>
              <Separator className="mb-4" />
              <ChatSettings />
            </TabsContent>

            <TabsContent value="operator" className="mt-0 flex-1">
              <ScrollArea className="h-[calc(80vh-48px)]">
                <h2 className="text-xl font-semibold mb-3">
                  {t('settings.operator')}
                </h2>
                <Separator className="mb-4" />
                <h3 className="text-lg font-semibold mt-5 mb-3">
                  {t('settings.local_browser')}
                </h3>
                <LocalBrowserSettings />
              </ScrollArea>
            </TabsContent>
            <TabsContent value="report" className="mt-0">
              <h2 className="text-xl font-semibold mb-3">
                {t('settings.report')}
              </h2>
              <Separator className="mb-4" />
              <ReportSettings />
            </TabsContent>
            <TabsContent value="general" className="mt-0">
              <h2 className="text-xl font-semibold mb-3">
                {t('settings.general')}
              </h2>
              <Separator className="mb-4" />
              <GeneralSettings />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
