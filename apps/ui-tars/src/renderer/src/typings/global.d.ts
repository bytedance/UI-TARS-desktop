/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ElectronHandler } from '../../preload/index';
import { ZustandBridge } from '../../preload/index';

interface Window {
  electron: ElectronHandler;
  platform: NodeJS.Platform;
  zustandBridge: ZustandBridge;
}

declare module 'react' {
  interface CSSProperties {
    '-webkit-app-region'?: 'drag' | 'no-drag';
    '--sidebar-width-icon'?: string;
  }
}
