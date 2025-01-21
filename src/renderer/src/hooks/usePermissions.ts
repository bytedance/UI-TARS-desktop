/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect } from 'react';
import { useDispatch } from 'zutron';

import { useStore } from '@renderer/hooks/useStore';

export const usePermissions = () => {
  const { ensurePermissions } = useStore();
  const dispatch = useDispatch(window.zutron);

  const getEnsurePermissions = () => {
    dispatch({ type: 'GET_ENSURE_PERMISSIONS', payload: null });
  };

  useEffect(() => {
    getEnsurePermissions();
  }, []);

  return {
    ensurePermissions,
    getEnsurePermissions,
  };
};
