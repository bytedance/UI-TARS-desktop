/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useCallback, type ComponentProps } from 'react';
import { Plus } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@renderer/components/ui/sidebar';
import { DragArea } from '@renderer/components/Common/drag';
import { Button } from '@renderer/components/ui/button';
import { useSession } from '@renderer//hooks/useSession';

// import { NavMain } from './nav-main';
import { NavHistory } from './nav-history';
import { NavSettings } from './nav-footer';
import { UITarsHeader } from './nav-header';

import { api } from '@renderer/api';

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const {
    currentSessionId,
    sessions,
    setCurrentSessionId,
    deleteSession,
    setActiveSession,
  } = useSession();

  const onSettingsClick = useCallback(async () => {
    await api.openSettingsWindow();
  }, []);

  const onNewChat = useCallback(async () => {
    await setCurrentSessionId('');
  }, []);

  const onSessionDelete = useCallback(async (sessionId: string) => {
    await deleteSession(sessionId);
  }, []);

  const onSessionClick = useCallback(async (sessionId: string) => {
    // console.log('onSessionClick', sessionId);
    await setActiveSession(sessionId);
  }, []);

  return (
    <Sidebar collapsible="icon" className="select-none" {...props}>
      <DragArea></DragArea>
      <SidebarHeader>
        <UITarsHeader />
        <Button
          variant={'outline'}
          className="mx-2 my-1 group-data-[state=collapsed]:mx-0"
          onClick={onNewChat}
        >
          <Plus />
          <span className="group-data-[state=collapsed]:hidden transition-opacity duration-200 ease-in-out group-data-[state=expanded]:opacity-100">
            New Chat
          </span>
        </Button>
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
