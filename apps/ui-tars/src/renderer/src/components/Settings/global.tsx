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
      <DialogContent className="min-w-4/5 min-h-4/5">
        <DialogHeader className="hidden">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="vlm" className="w-full">
          <div className="flex gap-6">
            <TabsList className="flex flex-col h-fit w-48 space-y-1">
              <TabsTrigger
                value="vlm"
                className="flex items-center gap-2 w-full justify-start"
              >
                <User className="w-4 h-4" />
                VLM Settings
              </TabsTrigger>
              <TabsTrigger
                value="operator"
                className="flex items-center gap-2 w-full justify-start"
              >
                <Settings className="w-4 h-4" />
                Operator Settings
              </TabsTrigger>
              <TabsTrigger
                value="report"
                className="flex items-center gap-2 w-full justify-start"
              >
                <Bell className="w-4 h-4" />
                Report Settings
              </TabsTrigger>
            </TabsList>

            <div className="flex-1">
              <TabsContent value="vlm" className="mt-0">
                <h2 className="text-2xl font-semibold mb-2">VLM Settings</h2>
                <VLMSettings autoSave={true} />
              </TabsContent>

              <TabsContent value="operator" className="mt-0">
                <h2 className="text-2xl font-semibold mb-2">
                  Operator Settings
                </h2>
                <LocalOperatorSettings />
              </TabsContent>
              <TabsContent value="report" className="mt-0">
                <h2 className="text-2xl font-semibold mb-2">Report Settings</h2>
                <ReportSettings />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
