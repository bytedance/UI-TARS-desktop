/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { isWindows } from '@renderer/utils/os';

export const DragArea = () => {
  if (isWindows) {
    return null;
  }

  return <div className={'w-full h-7 draggable-area'} />;
};
