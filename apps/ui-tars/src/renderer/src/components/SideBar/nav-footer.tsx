/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Settings } from 'lucide-react';

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@renderer/components/ui/sidebar';

import { GlobalSettings } from '@renderer/components/Settings/global';

interface NavSettingsProps {
  open: boolean;
  onClick: (status: boolean) => void;
}

export function NavSettings({ open, onClick }: NavSettingsProps) {
  return (
    <>
      <SidebarGroup>
        <SidebarMenu className="items-center">
          <SidebarMenuButton
            className="h-12 font-medium"
            onClick={() => onClick(true)}
          >
            <Settings />
            <span>Settings</span>
          </SidebarMenuButton>
        </SidebarMenu>
      </SidebarGroup>
      <GlobalSettings open={open} onClick={onClick}></GlobalSettings>
    </>
  );
}
