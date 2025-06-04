/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Settings } from 'lucide-react';

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
} from '@renderer/components/ui/sidebar';

interface NavSettingsProps {
  onClick: () => void;
}

export function NavSettings({ onClick }: NavSettingsProps) {
  return (
    <SidebarGroup>
      <SidebarMenu className="items-center">
        <SidebarMenuButton className="font-medium" onClick={onClick}>
          <Settings />
          <span>Settings</span>
        </SidebarMenuButton>
      </SidebarMenu>
    </SidebarGroup>
  );
}
