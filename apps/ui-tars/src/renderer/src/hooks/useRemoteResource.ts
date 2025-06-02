/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useCallback, useEffect } from 'react';
import { api } from '@renderer/api';
import { Operator } from '@main/store/types';

const map = {
  [Operator.RemoteComputer]: 'computer',
  [Operator.RemoteBrowser]: 'browser',
};

interface Settings {
  operator: Operator;
  isFree: boolean;
  from: 'home' | 'new' | 'history';
}

export type RemoteResourceStatus =
  | 'unavailable' // from history
  | 'queuing'
  | 'connecting'
  | 'connected'
  | 'expired'
  | 'error';

export const useRemoteResource = (settings: Settings) => {
  const [status, setStatus] = useState<RemoteResourceStatus>('connecting');
  const [rdpUrl, setRdpUrl] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);

  const getResource = useCallback(async () => {
    console.log('getResource init');

    const resourceType = map[settings.operator];
    try {
      setStatus('connecting');
      const result = await api.allocRemoteResource({ resourceType });
      if (result) {
        const remoteUrl = await api.getRemoteResourceRDPUrl({
          resourceType,
        });
        if (remoteUrl) {
          setStatus('connected');
          setRdpUrl(remoteUrl);
        }
      }
    } catch (err) {
      console.error('getResource', err);

      setStatus('error');
      setError(
        err instanceof Error ? err : new Error('Failed to get remote resource'),
      );
    }
  }, [settings.operator]);

  const releaseResource = useCallback(async () => {
    const resourceType = map[settings.operator];
    try {
      await api.releaseRemoteResource({ resourceType });
      setStatus('expired');
      setRdpUrl('');
    } catch (err) {
      console.error('releaseResource', err);

      setStatus('error');
      setError(
        err instanceof Error
          ? err
          : new Error('Failed to release remote resource'),
      );
    }
  }, [settings.operator]);

  useEffect(() => {
    if (settings.isFree && settings.from === 'history') {
      setStatus('unavailable');

      return;
    }

    getResource();
  }, [settings.isFree, settings.from]);

  return {
    status,
    rdpUrl,
    error,
    getResource,
    releaseResource,
  };
};
