/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useCallback, type ComponentProps } from 'react';
import { Home } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@renderer/components/ui/sidebar';
import { DragArea } from '@renderer/components/Common/drag';
import { useSession } from '@renderer//hooks/useSession';

// import { NavMain } from './nav-main';
import { NavHistory } from './nav-history';
import { NavSettings } from './nav-footer';
import { UITarsHeader } from './nav-header';

import { api } from '@renderer/api';
import { useNavigate } from 'react-router';

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const {
    currentSessionId,
    sessions,
    setCurrentSessionId,
    getSession,
    deleteSession,
    setActiveSession,
  } = useSession();
  const navigate = useNavigate();

  const onSettingsClick = useCallback(async () => {
    await api.openSettingsWindow();
  }, []);

  const onNewChat = useCallback(async () => {
    await setCurrentSessionId('');
    navigate('/');
  }, []);

  const onSessionDelete = useCallback(async (sessionId: string) => {
    await deleteSession(sessionId);
  }, []);

  const onSessionClick = useCallback(async (sessionId: string) => {
    const session = await getSession(sessionId);
    console.log('onSessionClick', session);

    if (!session) {
      return;
    }

    await setActiveSession(sessionId);
  }, []);

  return (
    <Sidebar collapsible="icon" className="select-none" {...props}>
      <DragArea></DragArea>
      <SidebarHeader>
        <UITarsHeader />
        <SidebarMenuButton
          className="h-12 font-medium py-1 px-3"
          onClick={onNewChat}
        >
          <Home />
          Home
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        <NavHistory
          currentSessionId={currentSessionId}
          history={sessions}
          onSessionClick={onSessionClick}
          onSessionDelete={onSessionDelete}
        />
      </SidebarContent>
      <SidebarFooter className="p-0">
        <NavSettings onSettingsClick={onSettingsClick} />
      </SidebarFooter>
    </Sidebar>
  );
}
