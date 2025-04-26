/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import RunMessages from '@renderer/components/RunMessages';

import { AppSidebar } from '@/renderer/src/components/SideBar/app-sidebar';
import { SidebarInset, SidebarProvider } from '@renderer/components/ui/sidebar';
import { DragArea } from '@renderer/components/Common/drag';

export default function Page() {
  return (
    <SidebarProvider className="flex h-screen w-full bg-white">
      <AppSidebar />
      <SidebarInset className="flex-1">
        <DragArea />
        <RunMessages />
      </SidebarInset>
    </SidebarProvider>
  );
}
