/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { initIpc } from '@ui-tars/electron-ipc/main';
import { ProxyClient } from '../remote/proxyClient';

const t = initIpc.create();

export const remoteResourceRouter = t.router({
  allocRemoteResource: t.procedure
    .input<{
      resourceType: 'computer' | 'browser';
    }>()
    .handle(async ({ input }) => {
      return ProxyClient.allocResource(input.resourceType);
    }),
  getRemoteResourceRDPUrl: t.procedure
    .input<{
      resourceType: 'computer' | 'browser';
    }>()
    .handle(async ({ input }) => {
      if (input.resourceType === 'browser') {
        return ProxyClient.getBrowserCDPUrl();
      } else if (input.resourceType === 'computer') {
        return ProxyClient.getSandboxRDPUrl();
      }
      return null;
    }),
  releaseRemoteResource: t.procedure
    .input<{
      resourceType: 'computer' | 'browser';
    }>()
    .handle(async ({ input }) => {
      return ProxyClient.releaseResource(input.resourceType);
    }),
  getTimeBalance: t.procedure
    .input<{
      resourceType: 'computer' | 'browser';
    }>()
    .handle(async ({ input }) => {
      const balance = await ProxyClient.getTimeBalance();
      if (input.resourceType === 'browser') {
        return balance.browserBalance;
      } else if (input.resourceType === 'computer') {
        return balance.computerBalance;
      }
      return -1;
    }),
});
