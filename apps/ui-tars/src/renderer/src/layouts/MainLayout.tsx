import { Outlet } from 'react-router';
import { AppSidebar } from '@/renderer/src/components/SideBar/app-sidebar';
import { SidebarInset, SidebarProvider } from '@renderer/components/ui/sidebar';
import { DragArea } from '@renderer/components/Common/drag';

export function MainLayout() {
  return (
    <SidebarProvider className="flex h-screen w-full bg-white">
      <AppSidebar />
      <SidebarInset className="flex-1">
        <DragArea />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
