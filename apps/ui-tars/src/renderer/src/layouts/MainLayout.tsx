import { Outlet } from 'react-router';
import { AppSidebar } from '@/renderer/src/components/SideBar/app-sidebar';
import { SidebarInset, SidebarProvider } from '@renderer/components/ui/sidebar';

export function MainLayout() {
  return (
    <SidebarProvider
      style={{ '--sidebar-width-icon': '72px' }}
      className="flex h-screen w-full bg-white"
    >
      <AppSidebar />
      <SidebarInset className="flex-1">
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
