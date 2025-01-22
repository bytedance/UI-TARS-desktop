/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useToast } from '@chakra-ui/react';
import { useDispatch } from 'zutron';

import { Conversation } from '@ui-tars/shared/types/data';

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
