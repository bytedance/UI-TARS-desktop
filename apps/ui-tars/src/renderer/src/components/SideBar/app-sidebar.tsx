/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useCallback, useState, type ComponentProps } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Home } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
} from '@renderer/components/ui/sidebar';
import { DragArea } from '@renderer/components/Common/drag';
import { useSession } from '@renderer//hooks/useSession';

import { NavHistory } from './nav-history';
import { NavSettings } from './nav-footer';
import { UITarsHeader } from './nav-header';

import { Operator } from '@main/store/types';
import { useGlobalSettings, GlobalSettings } from '../Settings/global';
import { useStore } from '../../hooks/useStore';
import { StatusEnum } from '@ui-tars/sdk';
import { NavDialog } from '../AlertDialog/navDialog';
import { api } from '../../api';

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const {
    currentSessionId,
    sessions,
    getSession,
    deleteSession,
    setActiveSession,
  } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const { openSettings } = useGlobalSettings();
  const { status } = useStore();
  const [isNavDialogOpen, setNavDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    'home' | { type: 'session'; id: string } | null
  >(null);

  const needsConfirm =
    status === StatusEnum.RUNNING ||
    status === StatusEnum.CALL_USER ||
    status === StatusEnum.PAUSE;

  const goHome = useCallback(async () => {
    await navigate('/');
    await setActiveSession('');
  }, [navigate, setActiveSession]);

  const onSessionClick = useCallback(
    async (sessionId: string) => {
      const session = await getSession(sessionId);
      if (!session) return;

      const operator = session.meta.operator || Operator.LocalComputer;
      const isFree = session.meta.isFree ?? true;

      const getRouter = () => {
        if (
          operator === Operator.RemoteBrowser ||
          operator === Operator.RemoteComputer
        ) {
          if (isFree) {
            return '/free-remote';
          }
          return '/paid-remote';
        }

        return '/local';
      };

      navigate(getRouter(), {
        state: {
          operator,
          sessionId,
          isFree,
          from: 'history',
        },
      });
    },
    [getSession, navigate],
  );

  const handleHomeClick = useCallback(() => {
    if (needsConfirm) {
      setPendingAction('home');
      setNavDialogOpen(true);
    } else {
      goHome();
    }
  }, [needsConfirm]);

  const handleSessionClick = useCallback(
    (sessionId: string) => {
      if (needsConfirm) {
        setPendingAction({ type: 'session', id: sessionId });
        setNavDialogOpen(true);
      } else {
        onSessionClick(sessionId);
      }
    },
    [needsConfirm],
  );

  const onConfirm = useCallback(async () => {
    await api.stopRun();
    await api.clearHistory();

    if (pendingAction === 'home') {
      await goHome();
    } else if (pendingAction?.type === 'session') {
      await onSessionClick(pendingAction.id);
    }
    setPendingAction(null);
    setNavDialogOpen(false);
  }, [pendingAction, goHome, onSessionClick]);

  const onCancel = useCallback(() => {
    setPendingAction(null);
    setNavDialogOpen(false);
  }, []);

  const onSessionDelete = useCallback(
    async (sessionId: string) => {
      await deleteSession(sessionId);
      if (currentSessionId === sessionId) {
        goHome();
      }
    },
    [currentSessionId, deleteSession, goHome],
  );

  return (
    <>
      <Sidebar collapsible="icon" className="select-none" {...props}>
        <DragArea></DragArea>
        <SidebarHeader>
          <UITarsHeader showTrigger={location.pathname === '/'} />
          <SidebarMenu className="items-center">
            <SidebarMenuButton
              className="font-medium"
              onClick={handleHomeClick}
            >
              <Home />
              Home
            </SidebarMenuButton>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <NavHistory
            currentSessionId={currentSessionId}
            history={sessions}
            onSessionClick={handleSessionClick}
            onSessionDelete={onSessionDelete}
          />
        </SidebarContent>
        <SidebarFooter className="p-0">
          <NavSettings onClick={openSettings} />
        </SidebarFooter>
      </Sidebar>
      <GlobalSettings />
      <NavDialog
        open={isNavDialogOpen}
        onOpenChange={onCancel}
        onConfirm={onConfirm}
      />
    </>
  );
}
