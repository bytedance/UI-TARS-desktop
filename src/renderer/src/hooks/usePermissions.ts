/*
 * Copyright (C) 2025 Bytedance Ltd. and/or its affiliates
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
