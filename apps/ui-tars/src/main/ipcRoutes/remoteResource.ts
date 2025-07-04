/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { initIpc } from '@ui-tars/electron-ipc/main';
import { ProxyClient } from '../remote/proxyClient';

const t = initIpc.create();

type ResourceType = 'computer' | 'browser' | 'hdfBrowser';

export const remoteResourceRouter = t.router({
  allocRemoteResource: t.procedure
    .input<{
      resourceType: ResourceType;
    }>()
    .handle(async ({ input }) => {
      return ProxyClient.allocResource(input.resourceType);
    }),
  getRemoteResourceRDPUrl: t.procedure
    .input<{
      resourceType: ResourceType;
    }>()
    .handle(async ({ input }) => {
      switch (input.resourceType) {
        case 'computer':
          return ProxyClient.getSandboxRDPUrl();
        case 'browser':
        case 'hdfBrowser':
          return ProxyClient.getBrowserCDPUrl();
        default:
          return null;
      }
    }),
  releaseRemoteResource: t.procedure
    .input<{
      resourceType: ResourceType;
    }>()
    .handle(async ({ input }) => {
      return ProxyClient.releaseResource(input.resourceType);
    }),
  getTimeBalance: t.procedure
    .input<{
      resourceType: ResourceType;
    }>()
    .handle(async ({ input }) => {
      const balance = await ProxyClient.getTimeBalance();

      switch (input.resourceType) {
        case 'computer':
          return balance.computerBalance;
        case 'browser':
        case 'hdfBrowser':
          return balance.browserBalance;
        default:
          return -1;
      }
    }),
});
