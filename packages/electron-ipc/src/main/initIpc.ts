/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { HandleFunction, RouterType, ZodSchema } from '../types';

const createChainProdure = <TInput>() => {
  const chain = {
    input<TInput>(_schema?: ZodSchema<TInput>) {
      return createChainProdure<TInput>();
    },

    handle: <TResult>(handle: HandleFunction<TInput, TResult>) => {
      return { handle };
    },
  };

  return chain;
};

export const initIpc = {
  create() {
    return {
      procedure: createChainProdure<void>(),
      router: <T extends RouterType>(router: T & RouterType): T => {
        return router;
      },
    };
  },
};
