import { PlusCircle } from 'lucide-react';
import { useLocation } from 'react-router';

import { Card } from '@renderer/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@renderer/components/ui/tabs';
import { Button } from '@renderer/components/ui/button';
import { SidebarTrigger } from '@renderer/components/ui/sidebar';

import { NavHeader } from '@renderer/components/Detail/NavHeader';

const RemoteComputer = () => {
  const location = useLocation();

  console.log('location.state', location.state);

  return (
    <div className="flex flex-col w-full h-full">
      <NavHeader title="Remote Computer Operator" docUrl="https://github.com">
        <Button
          size={'sm'}
          variant={'outline'}
          style={{ '-webkit-app-region': 'no-drag' }}
        >
          System information
        </Button>
        <Button
          size={'sm'}
          variant={'outline'}
          style={{ '-webkit-app-region': 'no-drag' }}
        >
          Terminate
        </Button>
      </NavHeader>
      <div className="px-5 pb-5 flex flex-1 gap-5">
        <Card className="flex-1 basis-1/3 p-3">
          <div className="flex items-center justify-between w-full">
            <SidebarTrigger className="size-8"></SidebarTrigger>
            <Button variant="outline" size="sm">
              <PlusCircle />
              New Chat
            </Button>
          </div>
        </Card>
        <Card className="flex-1 basis-2/3 p-3">
          <Tabs defaultValue="vnc" className="flex-1">
            <TabsList>
              <TabsTrigger value="vnc">My Computer</TabsTrigger>
              <TabsTrigger value="screenshot">ScreenShot</TabsTrigger>
            </TabsList>
            <TabsContent value="vnc" className="bg-amber-50"></TabsContent>
            <TabsContent
              value="screenshot"
              className="bg-amber-100"
            ></TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default RemoteComputer;
