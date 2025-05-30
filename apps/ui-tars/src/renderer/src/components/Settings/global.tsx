import React from 'react';
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
  DialogTrigger,
} from '@renderer/components/ui/dialog';

export const GlobalSettings: React.FC = () => {
  return (
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent className="max-w-6xl p-0">
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
                <h2 className="text-2xl font-semibold mb-2">VLM 设置</h2>
              </TabsContent>

              <TabsContent value="operator" className="mt-0">
                <h2 className="text-2xl font-semibold mb-2">操作员设置</h2>
              </TabsContent>

              <TabsContent value="report" className="mt-0">
                <h2 className="text-2xl font-semibold mb-2">报告设置</h2>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
