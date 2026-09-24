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
import { useTranslation } from '@renderer/hooks/useTranslation';

interface NavSettingsProps {
  onClick: () => void;
}

export function NavSettings({ onClick }: NavSettingsProps) {
  const { t } = useTranslation();
  return (
    <SidebarGroup>
      <SidebarMenu className="items-center">
        <SidebarMenuButton className="font-medium" onClick={onClick}>
          <Settings />
          <span>{t('sidebar.settings')}</span>
        </SidebarMenuButton>
      </SidebarMenu>
    </SidebarGroup>
  );
}
