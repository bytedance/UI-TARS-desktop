/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import useSWR from 'swr';

import { useStore } from '@renderer/hooks/useStore';
import { api } from '@renderer/api';

export const usePermissions = () => {
  const ensurePermissions = useStore((store) => store.ensurePermissions);

  const { mutate: getEnsurePermissions } = useSWR(
    'permissions',
    async () => {
      const hasPermissionsData = Object.values(ensurePermissions || {});
      const hasAllPermissions =
        hasPermissionsData.length > 0 &&
        hasPermissionsData.every((permission) => permission === true);

      if (!hasAllPermissions) {
        return await api.getEnsurePermissions();
      }
      return ensurePermissions;
    },
    {
      revalidateOnFocus: true,
      revalidateOnMount: true,
      focusThrottleInterval: 500,
    },
  );

  return { ensurePermissions, getEnsurePermissions };
};
