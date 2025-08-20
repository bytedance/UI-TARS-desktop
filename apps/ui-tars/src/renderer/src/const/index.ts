/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Operator } from '@main/store/types';

export const COMPUTER_OPERATOR = 'Computer Operator';
export const BROWSER_OPERATOR = 'Browser Operator';

export const OPERATOR_URL_MAP = {
  [Operator.RemoteComputer]: {
    text: 'If you need to use it for a long-term and stable period, you can log in to the Volcano Engine FaaS to experience the Online Computer Use Agent.',
    url: 'https://console.volcengine.com/vefaas/region:vefaas+cn-beijing/application/create?templateId=680b0a890e881f000862d9f0&channel=github&source=ui-tars',
  },
  [Operator.RemoteBrowser]: {
    text: 'If you need to use it for a long-term and stable period, you can log in to the Volcano Engine FaaS to experience the Online Browser Use Agent.',
    url: 'https://console.volcengine.com/vefaas/region:vefaas+cn-beijing/application/create?templateId=67f7b4678af5a6000850556c&channel=github&source=ui-tars',
  },
};
