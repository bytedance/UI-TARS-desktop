/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useCallback, type ComponentProps } from 'react';
import { useNavigate } from 'react-router';
import { Home } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
} from '@renderer/components/ui/sidebar';
import { DragArea } from '@renderer/components/Common/drag';
import { useSession } from '@renderer//hooks/useSession';

import { NavHistory } from './nav-history';
import { NavSettings } from './nav-footer';
import { UITarsHeader } from './nav-header';

import { Operator } from '@main/store/types';

import { api } from '@renderer/api';

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const {
    currentSessionId,
    sessions,
    getSession,
    deleteSession,
    setActiveSession,
  } = useSession();
  const navigate = useNavigate();

  const onSettingsClick = useCallback(async () => {
    await api.openSettingsWindow();
  }, []);

  const goHome = useCallback(async () => {
    await setActiveSession('');
    navigate('/');
  }, []);

  const onSessionDelete = useCallback(
    async (sessionId: string) => {
      await deleteSession(sessionId);

      if (currentSessionId === sessionId) {
        goHome();
      }
    },
    [currentSessionId],
  );

  const onSessionClick = useCallback(async (sessionId: string) => {
    const session = await getSession(sessionId);

    console.log('onSessionClick', session);

    if (!session) {
      return;
    }

    const operator = session.meta.operator || Operator.LocalComputer;
    let router = '/local';
    if (
      operator === Operator.RemoteBrowser ||
      operator === Operator.RemoteComputer
    ) {
      router = '/remote';
    }

    navigate(router, {
      state: {
        operator: operator,
        sessionId: sessionId,
      },
    });
  }, []);

  return (
    <Sidebar collapsible="icon" className="select-none" {...props}>
      <DragArea></DragArea>
      <SidebarHeader>
        <UITarsHeader />
        <SidebarMenuButton
          className="h-12 font-medium py-1 px-3"
          onClick={goHome}
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
