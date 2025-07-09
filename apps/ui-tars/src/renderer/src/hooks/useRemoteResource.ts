/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { api } from '@renderer/api';
import { Operator } from '@main/store/types';
import {
  GrantedResponseHdfBrowser,
  GrantedResponseSandbox,
} from '@/main/remote/proxyClient';

interface Settings {
  sessionId: string;
  operator: Operator;
  isFree: boolean;
  from: 'home' | 'new' | 'history';
}

export type RemoteResourceStatus =
  | 'init'
  | 'unavailable' // from history
  | 'queuing'
  | 'connecting'
  | 'connected'
  | 'expired'
  | 'error';

export const useRemoteResource = (settings: Settings) => {
  const [status, setStatus] = useState<RemoteResourceStatus>('init');
  const [rdpUrl, setRdpUrl] = useState<string>('');
  const [queueNum, setQueueNum] = useState<number | null>(null);
  const [error, setError] = useState<Error>();

  const resourceType = getResourceType(settings.operator);
  const shouldStartPolling = status === 'queuing' || status === 'connecting';

  const { data: result, error: swrError } = useSWR(
    shouldStartPolling
      ? ['allocRemoteResource', resourceType, settings.sessionId]
      : null,
    () => api.allocRemoteResource({ resourceType }),
    {
      refreshInterval: 10 * 1000,
      revalidateOnReconnect: false,
      dedupingInterval: 0,
      revalidateOnFocus: false,
      revalidateIfStale: false,
    },
  );

  useEffect(() => {
    if (result) {
      console.log('SWR polling result', result);

      switch (result.state) {
        case 'queued':
        case 'waiting':
          setStatus('queuing');
          setQueueNum(result.data.queueNum);
          break;

        case 'granted':
          setQueueNum(null);
          setStatus('connected');
          if (resourceType === 'hdfBrowser') {
            setRdpUrl(
              (result.data as GrantedResponseHdfBrowser['data']).vncUrl,
            );
          } else if (resourceType === 'computer') {
            setRdpUrl((result.data as GrantedResponseSandbox['data']).rdpUrl);
          }
          break;
      }
    }
  }, [result]);

  useEffect(() => {
    if (swrError) {
      console.error('SWR polling error', swrError);
      setStatus('error');
      setError(
        swrError instanceof Error
          ? swrError
          : new Error('Failed to get remote resource'),
      );
    }
  }, [swrError]);

  const releaseResource = useCallback(
    async (isSetExpired = true) => {
      try {
        if (isSetExpired) {
          setStatus('expired');
          setRdpUrl('');
          setQueueNum(null);
        }

        await api.releaseRemoteResource({ resourceType });
      } catch (err) {
        console.error('releaseResource', err);
        setStatus('error');
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to release remote resource'),
        );
      }
    },
    [resourceType],
  );

  const getTimeBalance = useCallback(async () => {
    const result = await api.getTimeBalance({ resourceType });
    return result;
  }, [resourceType]);

  useEffect(() => {
    if (settings.isFree && settings.from === 'history') {
      setStatus('unavailable');
    } else {
      setStatus('connecting');
    }
  }, [settings.sessionId, settings.isFree, settings.from]);

  return {
    status,
    rdpUrl,
    queueNum,
    error,
    releaseResource,
    getTimeBalance,
  };
};

function getResourceType(operator: Operator) {
  if (operator === Operator.RemoteComputer) {
    return 'computer';
  }

  return 'hdfBrowser';
}
