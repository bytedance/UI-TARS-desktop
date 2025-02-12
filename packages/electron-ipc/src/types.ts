/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { WebContents } from 'electron';

export type ZodSchema<TInput> = { parse: (input: any) => TInput };

export type HandleFunction<TInput = any, TResult = any> = (args: {
  context: HandleContext;
  input: TInput;
}) => Promise<TResult>;

export type HandleContext = { sender: WebContents | null };

export type RouterType = Record<string, { handle: HandleFunction }>;

export type ClientFromRouter<Router extends RouterType> = {
  [K in keyof Router]: Router[K]['handle'] extends (options: {
    context: any;
    input: infer P;
  }) => Promise<infer R>
    ? (input: P) => Promise<R>
    : never;
};

export type ServerFromRouter<Router extends RouterType> = {
  [K in keyof Router]: Router[K]['handle'] extends (options: {
    context: any;
    input: infer P;
  }) => Promise<infer R>
    ? (input: P) => Promise<R>
    : never;
};
