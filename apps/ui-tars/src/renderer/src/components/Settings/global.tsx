import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@renderer/components/ui/tabs';
import { Settings, User, Bell } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { Separator } from '@renderer/components/ui/separator';
import { ReportSettings } from './category/report';
import { VLMSettings } from './category/vlm';
import { LocalOperatorSettings } from './category/localOperator';

interface GlobalSettingsProps {
  open: boolean;
  onClick: (status: boolean) => void;
}

export const GlobalSettings = ({ open, onClick }: GlobalSettingsProps) => {
  return (
    <Dialog open={open} onOpenChange={(status) => onClick(status)}>
      <DialogContent className="min-w-4/5 xl:min-w-3/5 min-h-4/5">
        <DialogHeader className="hidden">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="vlm" className="w-full gap-6 flex-row">
          <div className="w-60 border-r border-border pr-6">
            <TabsList className="flex flex-col h-fit w-full bg-transparent p-0">
              <TabsTrigger
                value="vlm"
                className="w-full justify-start gap-2 px-2 py-1.5 mb-2 !shadow-none font-normal data-[state=active]:bg-accent data-[state=active]:text-accent-foreground hover:bg-accent/50"
              >
                <User className="text-muted-foreground" />
                VLM Settings
              </TabsTrigger>
              <TabsTrigger
                value="operator"
                className="w-full justify-start gap-2 px-2 py-1.5 mb-2 !shadow-none font-normal data-[state=active]:bg-accent data-[state=active]:text-accent-foreground hover:bg-accent/50"
              >
                <Settings className="text-muted-foreground" />
                Operator Settings
              </TabsTrigger>
              <TabsTrigger
                value="report"
                className="w-full justify-start gap-2 px-2 py-1.5 mb-2 !shadow-none font-normal data-[state=active]:bg-accent data-[state=active]:text-accent-foreground hover:bg-accent/50"
              >
                <Bell className="text-muted-foreground" />
                Report Settings
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1">
            <TabsContent value="vlm" className="mt-0">
              <h2 className="text-xl font-semibold mb-3">VLM Settings</h2>
              <Separator className="mb-4" />
              <VLMSettings autoSave={true} />
            </TabsContent>

            <TabsContent value="operator" className="mt-0">
              <h2 className="text-xl font-semibold mb-3">
                Local Operator Settings
              </h2>
              <Separator className="mb-4" />
              <LocalOperatorSettings />
            </TabsContent>
            <TabsContent value="report" className="mt-0">
              <h2 className="text-xl font-semibold mb-3">Report Settings</h2>
              <Separator className="mb-4" />
              <ReportSettings />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
