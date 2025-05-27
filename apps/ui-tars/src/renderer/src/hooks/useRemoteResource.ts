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

export const useRemoteResource = (operator: Operator) => {
  const [rdpUrl, setRdpUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getResource = useCallback(async () => {
    const resourceType = map[operator];
    try {
      setLoading(true);
      setError(null);
      await api.allocRemoteResource({ resourceType });
      const remoteUrl = await api.getRemoteResourceRDPUrl({
        resourceType,
      });
      console.log('remoteUrl', remoteUrl);
      setRdpUrl(remoteUrl || '');
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to get remote resource'),
      );
    } finally {
      setLoading(false);
    }
  }, [operator]);

  useEffect(() => {
    getResource();
  }, [getResource]);

  return {
    rdpUrl,
    loading,
    error,
    getResource,
  };
};
