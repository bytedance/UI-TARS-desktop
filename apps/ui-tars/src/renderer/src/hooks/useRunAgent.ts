/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useToast } from '@chakra-ui/react';

import { Conversation } from '@ui-tars/shared/types';

import { getState } from '@renderer/hooks/useStore';

import { usePermissions } from './usePermissions';
import { useSetting } from './useSetting';
import { api } from '@renderer/api';

export const useRunAgent = () => {
  // const dispatch = useDispatch();
  const toast = useToast();
  const { settings } = useSetting();
  const { ensurePermissions } = usePermissions();

  const run = async (value: string, callback: () => void = () => {}) => {
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
        onCloseComplete: async () => {
          await api.openSettingsWindow();
        },
      });
      return;
    }

    const initialMessages: Conversation[] = [
      {
        from: 'human',
        value,
        timing: { start: Date.now(), end: Date.now(), cost: 0 },
      },
    ];
    const currentMessages = getState().messages;
    console.log('initialMessages', initialMessages, currentMessages.length);

    await Promise.all([
      api.setInstructions({ instructions: value }),
      api.setMessages({ messages: [...currentMessages, ...initialMessages] }),
    ]);

    await api.runAgent();

    callback();
  };

  return { run };
};
