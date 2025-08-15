/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
export interface SandboxInternal {
  SandboxId: string;
  PrimaryIp: string;
  Status: string;
  OsType: string;
  InstanceTypeId: string;
}

export interface BrowserInternal {
  id: string;
  port: number;
  status: string;
  created_at: string;
  pod_name: string;
  cdp_url: string;
  ws_url: string;
}

export type Browser = Omit<BrowserInternal, 'port' | 'created_at'>;

export abstract class BaseRemoteComputer {
  abstract moveMouse(x: number, y: number): Promise<void>;
  abstract clickMouse(
    x: number,
    y: number,
    button: 'Left' | 'Right' | 'Middle' | 'DoubleLeft',
    press: boolean,
    release: boolean,
  ): Promise<void>;
  abstract dragMouse(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
  ): Promise<void>;
  // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
  abstract pressKey(key: string): Promise<void>;
  abstract typeText(text: string): Promise<void>;
  abstract scroll(
    x: number,
    y: number,
    direction: 'Up' | 'Down' | 'Left' | 'Right',
    amount: number,
  ): Promise<void>;
  abstract getScreenSize(): Promise<{ width: number; height: number }>;
  abstract takeScreenshot(): Promise<string>;
}

const UI_TARS_PROXY_HOST = '';

const VER = '/api/v1';
const REGISTER_URL = `${UI_TARS_PROXY_HOST}${VER}/register`;
const PROXY_URL = `${UI_TARS_PROXY_HOST}${VER}/proxy`;
const BROWSER_URL = `${UI_TARS_PROXY_HOST}${VER}/browsers`;
const TIME_URL = `${UI_TARS_PROXY_HOST}${VER}/time-balance`;
const FREE_MODEL_BASE_URL = `${UI_TARS_PROXY_HOST}${VER}`;

const COMPUTER_USE_HOST = '';

export {
  UI_TARS_PROXY_HOST,
  REGISTER_URL,
  PROXY_URL,
  BROWSER_URL,
  TIME_URL,
  FREE_MODEL_BASE_URL,
  COMPUTER_USE_HOST,
};
