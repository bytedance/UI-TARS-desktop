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
import { useToast } from '@chakra-ui/react';
import { useDispatch } from 'zutron';

import { Conversation } from '@ui-tars/desktop-shared/types/data';

import { useStore } from '@renderer/hooks/useStore';

import { usePermissions } from './usePermissions';

export const useRunAgent = () => {
  const dispatch = useDispatch(window.zutron);
  const toast = useToast();
  const { messages, settings } = useStore();
  const { ensurePermissions, getEnsurePermissions } = usePermissions();

  const run = (value: string, clearInput: () => void = () => {}) => {
    if (
      !ensurePermissions?.accessibility ||
      !ensurePermissions?.screenCapture
    ) {
      const permissionsText = [
        !ensurePermissions?.screenCapture ? 'screenCapture' : '',
        !ensurePermissions?.accessibility ? 'Accessibility' : '',
      ]
        .filter(Boolean)
        .join(' and ');
      toast({
        title: `Please grant the required permissions(${permissionsText})`,
        position: 'top',
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      getEnsurePermissions();
      return;
    }

    // check settings whether empty
    const settingReady = settings?.vlmBaseUrl && settings?.vlmModelName;

    if (!settingReady) {
      toast({
        title: 'Please set up the model configuration first',
        position: 'top',
        status: 'warning',
        duration: 2000,
        isClosable: true,
        onCloseComplete: () => {
          dispatch({
            type: 'OPEN_SETTINGS_WINDOW',
            payload: null,
          });
        },
      });
      return;
    }

    const initialMessages: Conversation[] = [
      {
        from: 'human',
        value,
        timing: {
          start: Date.now(),
          end: Date.now(),
          cost: 0,
        },
      },
    ];

    dispatch({ type: 'SET_INSTRUCTIONS', payload: value });

    dispatch({
      type: 'SET_MESSAGES',
      payload: [...messages, ...initialMessages],
    });

    dispatch({ type: 'RUN_AGENT', payload: null });

    clearInput();
  };

  return {
    run,
  };
};
