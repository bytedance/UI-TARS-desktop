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

interface NavSettingsProps {
  onSettingsClick: () => void;
}

export function NavSettings({ onSettingsClick }: NavSettingsProps) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            className="h-12 font-medium"
            onClick={onSettingsClick}
          >
            <Settings strokeWidth={2} />
            <span>Settings</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
