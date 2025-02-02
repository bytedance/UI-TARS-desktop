/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import useSWR from 'swr';
import { useDispatch } from './useDispatch';

import { useStore } from '@renderer/hooks/useStore';

export const usePermissions = () => {
  const ensurePermissions = useStore((store) => store.ensurePermissions);
  const dispatch = useDispatch();

  const { mutate: getEnsurePermissions } = useSWR(
    'permissions',
    () => {
      const hasPermissionsData = Object.values(ensurePermissions || {});
      const hasAllPermissions =
        hasPermissionsData.length > 0 &&
        hasPermissionsData.every((permission) => permission === true);

      if (!hasAllPermissions) {
        dispatch({ type: 'GET_ENSURE_PERMISSIONS', payload: null });
      }
      return ensurePermissions;
    },
    {
      revalidateOnFocus: true,
      revalidateOnMount: true,
      focusThrottleInterval: 500,
    },
  );

  return {
    ensurePermissions,
    getEnsurePermissions,
  };
};
