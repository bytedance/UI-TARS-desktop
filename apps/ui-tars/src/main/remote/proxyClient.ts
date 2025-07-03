/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { app } from 'electron';
import { getAuthHeader, registerDevice } from './auth';
import { logger } from '../logger';
import {
  BaseRemoteComputer,
  Browser,
  BrowserInternal,
  SandboxInternal,
  PROXY_URL,
  BROWSER_URL,
  TIME_URL,
  FREE_MODEL_BASE_URL,
} from './shared';
import { UITarsModelVersion } from '@ui-tars/shared/constants';

const FREE_TRIAL_DURATION_MS = 30 * 60 * 1000;

class FetchError extends Error {
  xRequestId?: string | null;
  status?: number;
  constructor(message: string, xRequestId?: string | null, status?: number) {
    super(message);
    this.name = 'FetchError';
    this.xRequestId = xRequestId;
    this.status = status;
  }
}

async function fetchWithAuth(
  url: string,
  options: RequestInit,
  retries = 1,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  let xRequestId: string | null = 'undefined';
  try {
    if (!options.headers) {
      options.headers = {};
    }
    const authHeader = await getAuthHeader();
    Object.assign(options.headers, {
      ...authHeader,
    });
    const response = await fetch(url, options);
    xRequestId = response.headers.get('x-request-id');

    if (!response.ok) {
      throw new FetchError(
        `HTTP error! status: ${response.status}, xRequestId: ${xRequestId}`,
        xRequestId,
        response.status,
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (retries <= 0) throw error;
    logger.error(
      `[proxyClient] Retrying request..., xRequestId: ${xRequestId}`,
    );
    return fetchWithAuth(url, options, retries - 1);
  }
}

export class RemoteComputer extends BaseRemoteComputer {
  private instanceId = '';

  constructor(instanceId: string) {
    super();
    this.instanceId = instanceId;
  }

  async moveMouse(x: number, y: number): Promise<void> {
    try {
      const data = await fetchWithAuth(`${PROXY_URL}/MoveMouse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          InstanceId: this.instanceId,
          PositionX: x,
          PositionY: y,
        }),
      });
      logger.log('[RemoteComputer] Move Mouse Response:', data);
    } catch (error) {
      logger.error(
        '[RemoteComputer] Move Mouse Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  async clickMouse(
    x: number,
    y: number,
    button: 'Left' | 'Right' | 'Middle' | 'DoubleLeft',
    press: boolean,
    release: boolean,
  ): Promise<void> {
    try {
      const data = await fetchWithAuth(`${PROXY_URL}/ClickMouse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          InstanceId: this.instanceId,
          PositionX: x,
          PositionY: y,
          Button: button,
          Press: press,
          Release: release,
        }),
      });
      logger.log('[RemoteComputer] Click Mouse Response:', data);
    } catch (error) {
      logger.error(
        '[RemoteComputer] Click Mouse Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  async dragMouse(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
  ): Promise<void> {
    try {
      const data = await fetchWithAuth(`${PROXY_URL}/DragMouse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          InstanceId: this.instanceId,
          SourceX: sourceX,
          SourceY: sourceY,
          TargetX: targetX,
          TargetY: targetY,
        }),
      });
      logger.log('[RemoteComputer] Drag Mouse Response:', data);
    } catch (error) {
      logger.error(
        '[RemoteComputer] Drag Mouse Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  async pressKey(key: string): Promise<void> {
    try {
      const data = await fetchWithAuth(`${PROXY_URL}/PressKey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          InstanceId: this.instanceId,
          Key: key,
        }),
      });
      logger.log('[RemoteComputer] Press Key Response:', data);
    } catch (error) {
      logger.error(
        '[RemoteComputer] Press Key Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  async typeText(text: string): Promise<void> {
    try {
      const data = await fetchWithAuth(`${PROXY_URL}/TypeText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          InstanceId: this.instanceId,
          Text: text,
        }),
      });
      logger.log('[RemoteComputer] Type Text Response:', data);
    } catch (error) {
      logger.error(
        '[RemoteComputer] Type Text Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  async scroll(
    x: number,
    y: number,
    direction: 'Up' | 'Down' | 'Left' | 'Right',
    amount = 1,
  ): Promise<void> {
    try {
      const data = await fetchWithAuth(`${PROXY_URL}/Scroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          InstanceId: this.instanceId,
          PositionX: x,
          PositionY: y,
          Direction: direction,
          Amount: Math.min(amount, 10),
        }),
      });
      logger.log('[RemoteComputer] Scroll Response:', data);
    } catch (error) {
      logger.error('[RemoteComputer] Scroll Error:', (error as Error).message);
      throw error;
    }
  }

  async getScreenSize(): Promise<{ width: number; height: number }> {
    try {
      const data = await fetchWithAuth(`${PROXY_URL}/GetScreenSize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          InstanceId: this.instanceId,
        }),
      });

      const { Result } = data;
      if (Result) {
        const { Width, Height } = Result;
        logger.log('[RemoteComputer] Screen size:', Result);
        return { width: Width, height: Height };
      }
      throw new Error('Failed to get screen size');
    } catch (error) {
      logger.error(
        '[RemoteComputer] Get Screen Size Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  async takeScreenshot(): Promise<string> {
    const startTime = Date.now();
    try {
      const data = await fetchWithAuth(`${PROXY_URL}/TakeScreenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          InstanceId: this.instanceId,
        }),
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      const { ResponseMetadata, Result } = data;
      logger.log('[RemoteComputer] TakeScreenshot Response:', ResponseMetadata);
      logger.log('[RemoteComputer] The time consumed:', duration, 'ms');

      if (Result?.Screenshot) {
        const base64Data = Result.Screenshot.replace(
          /^data:image\/jpeg;base64,/,
          '',
        );
        return base64Data;
      }
      throw new Error('Screenshot data not found in response');
    } catch (error) {
      logger.error(
        '[RemoteComputer] TakeScreenshot Error:',
        (error as Error).message,
      );
      throw error;
    }
  }
}

export type Sandbox = Omit<SandboxInternal, 'PrimaryIp' | 'InstanceTypeId'>;

export interface SandboxInfo {
  sandBoxId: string;
  osType: string;
  rdpUrl: string;
}

export interface BrowserInfo {
  browserId: string;
  podName: string;
  wsUrl: string;
}

export interface TimeBalanceInteral {
  computerBalance: number;
  browserBalance: number;
  unit: string;
}

export type TimeBalance = Omit<TimeBalanceInteral, 'unit'>;

export interface QueuedResponse {
  state: 'queued';
  data: {
    queueNum: number;
  };
}

export interface WaitingResponse {
  state: 'waiting';
  data: {
    queueNum: number;
  };
}

export interface GrantedResponseSandbox {
  state: 'granted';
  data: {
    sandBoxId: string;
    osType: string;
    rdpUrl: string;
  };
}

export interface GrantedResponseBrowser {
  state: 'granted';
  data: {
    browserId: string;
    podName: string;
    wsUrl: string;
  };
}

export type AvailableResponse =
  | QueuedResponse
  | WaitingResponse
  | GrantedResponseSandbox
  | GrantedResponseBrowser;

export type SandboxResponse =
  | QueuedResponse
  | WaitingResponse
  | GrantedResponseSandbox;

export type BrowserResponse =
  | QueuedResponse
  | WaitingResponse
  | GrantedResponseBrowser;

export class ProxyClient {
  private static instance: ProxyClient;

  public static async getInstance(): Promise<ProxyClient> {
    if (!ProxyClient.instance) {
      // Register device before get instance
      const registerResult = await registerDevice();
      if (!registerResult) {
        throw new Error('Register device failed');
      }
      ProxyClient.instance = new ProxyClient();
    }
    return ProxyClient.instance;
  }

  public static async allocResource(
    resourceType: 'computer' | 'browser',
  ): Promise<AvailableResponse | null> {
    const instance = await ProxyClient.getInstance();

    const currentTimeStamp = Date.now();
    if (resourceType === 'computer') {
      const needAllocate =
        currentTimeStamp - instance.lastSandboxAllocTs > FREE_TRIAL_DURATION_MS;
      if (!needAllocate && instance.sandboxInfo != null) {
        logger.log(
          '[ProxyClient] allocResource: sandboxInfo has been allocated',
        );
        return null;
      }
      const res = await instance.getAvalialeSandbox();
      if (res?.state === 'granted') {
        instance.sandboxInfo = res.data;
        instance.lastSandboxAllocTs = Date.now();
      }
      return res;
    } else if (resourceType === 'browser') {
      const needAllocate =
        currentTimeStamp - instance.lastBrowserAllocTs > FREE_TRIAL_DURATION_MS;
      if (!needAllocate && instance.browserInfo != null) {
        logger.log(
          '[ProxyClient] allocResource: browserInfo has been allocated',
        );
        return null;
      }
      const res = await instance.getAvalialeBrowser();
      if (res?.state === 'granted') {
        instance.browserInfo = res.data;
        instance.lastBrowserAllocTs = Date.now();
      }
      return res;
    }
    return null;
  }

  public static async releaseResource(
    resourceType: 'computer' | 'browser',
  ): Promise<boolean> {
    if (!ProxyClient.instance) {
      logger.log(
        '[ProxyClient] releaseResource: instance is null, return true',
      );
      return true;
    }

    const instance = await ProxyClient.getInstance();

    // const currentTimeStamp = Date.now();
    if (resourceType === 'computer') {
      // const hasReleased =
      //   currentTimeStamp - instance.lastSandboxAllocTs > FREE_TRIAL_DURATION_MS;
      if (!instance.sandboxInfo) {
        logger.log('[ProxyClient] releaseResource: sandboxInfo has been null');
        return true;
      }
      // const sandboxId = instance.sandboxInfo.sandBoxId;
      // await instance.deleteSandbox(sandboxId);
      const result = await instance.releaseSandbox();
      instance.sandboxInfo = null;
      logger.log('[ProxyClient] release sandboxInfo:', result);
      return result;
    }

    if (resourceType === 'browser') {
      // const hasReleased =
      //   currentTimeStamp - instance.lastBrowserAllocTs > FREE_TRIAL_DURATION_MS;
      if (!instance.browserInfo) {
        logger.log('[ProxyClient] releaseResource: browserInfo has been null');
        return true;
      }
      // const browserId = instance.browserInfo.browserId;
      const result = await instance.releaseBrowser();
      instance.browserInfo = null;
      logger.log('[ProxyClient] release browser:', result);
      return result;
    }
    logger.log('[ProxyClient] releaseResource: resourceType is not valid');
    return false;
  }

  public static async getSandboxInfo(): Promise<SandboxInfo | null> {
    const currentTimeStamp = Date.now();
    if (
      currentTimeStamp - this.instance.lastSandboxAllocTs >
      FREE_TRIAL_DURATION_MS
    ) {
      // throw new Error('Resource is expired');
      return null;
    }
    return this.instance.sandboxInfo;
  }

  public static async getBrowserInfo(): Promise<BrowserInfo | null> {
    const currentTimeStamp = Date.now();
    if (
      currentTimeStamp - this.instance.lastBrowserAllocTs >
      FREE_TRIAL_DURATION_MS
    ) {
      // throw new Error('Resource is expired');
      return null;
    }
    return this.instance.browserInfo;
  }

  public static async getSandboxRDPUrl(): Promise<string | null> {
    if (!this.instance.sandboxInfo) {
      return null;
    }
    const sandboxId = this.instance.sandboxInfo.sandBoxId;
    const rdpUrl = this.instance.describeSandboxTerminalUrl(sandboxId);
    logger.log('[ProxyClient] getSandboxRDPUrl successful');
    return rdpUrl;
  }

  public static async getBrowserCDPUrl(): Promise<string | null> {
    if (!this.instance.browserInfo) {
      return null;
    }

    const browserId = this.instance.browserInfo.browserId;
    const cdpUrl = this.instance.browserInfo.wsUrl;
    if (cdpUrl != null && cdpUrl.length > 0) {
      return cdpUrl;
    }

    const cdpUrlNew = await this.instance.getAvaliableWsCDPUrl(browserId);
    logger.log('[ProxyClient] getBrowserCDPUrl refresh: ', cdpUrlNew);
    if (cdpUrlNew != null) {
      this.instance.browserInfo.wsUrl = cdpUrlNew;
      return cdpUrlNew;
    }
    return null;
  }

  public static async getTimeBalance(): Promise<TimeBalance> {
    try {
      const timeBalance = await this.instance.timeBalance('GET');
      return timeBalance;
    } catch (error) {
      logger.error(
        '[ProxyClient] Get Time Balance Error:',
        (error as Error).message,
      );
      return {
        computerBalance: -1,
        browserBalance: -1,
      };
    }
  }

  public static async getRemoteVLMProvider(): Promise<UITarsModelVersion> {
    try {
      const res = await this.instance.getRemoteVLMProvider();
      let modelVer = UITarsModelVersion.DOUBAO_1_5_20B;
      switch (res) {
        case 'UI-TARS-1.5':
          modelVer = UITarsModelVersion.V1_5;
          break;
        case 'UI-TARS-1.0':
          modelVer = UITarsModelVersion.V1_0;
          break;
        case 'Doubao-1.5-UI-TARS':
          modelVer = UITarsModelVersion.DOUBAO_1_5_15B;
          break;
        case 'Doubao-1.5-thinking-vision-pro':
          modelVer = UITarsModelVersion.DOUBAO_1_5_20B;
          break;
        default:
          modelVer = UITarsModelVersion.DOUBAO_1_5_20B;
      }
      return modelVer;
    } catch (error) {
      logger.error(
        '[ProxyClient] Get Remote VLM Provider Error:',
        (error as Error).message,
      );
      return UITarsModelVersion.DOUBAO_1_5_20B;
    }
  }

  public static async getRemoteVLMResponseApiSupport(): Promise<boolean> {
    try {
      const res = await this.instance.getRemoteVLMResponseApiSupport();
      return res;
    } catch (error) {
      logger.error(
        '[ProxyClient] Get Remote VLM Response API Support Error:',
        (error as Error).message,
      );
      return false;
    }
  }

  private sandboxInfo: SandboxInfo | null = null;
  private browserInfo: BrowserInfo | null = null;
  private lastSandboxAllocTs = 0;
  private lastBrowserAllocTs = 0;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  private async getAvaliableWsCDPUrl(browserId: string) {
    const browsers = await this.describeBrowsers();
    return (
      browsers.find(
        (browser) => browser.status === 'ready' && browser.id === browserId,
      )?.ws_url ?? null
    );
  }

  private async getAvalialeSandbox(): Promise<SandboxResponse | null> {
    try {
      const res = await fetchWithAuth(`${PROXY_URL}/avaliable`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      logger.log('[ProxyClient] avaliable Sandbox api Response:', res);

      return {
        state: res.message,
        data: res.data,
      };
    } catch (error) {
      logger.error(
        '[ProxyClient] avaliable Sandbox api Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  private async getAvalialeBrowser(): Promise<BrowserResponse | null> {
    try {
      const res = await fetchWithAuth(`${BROWSER_URL}/avaliable`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      logger.log('[ProxyClient] avaliable Browser api Response:', res);
      return {
        state: res.message,
        data: res.data,
      };
    } catch (error) {
      logger.error(
        '[ProxyClient] avaliable Browser api Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  private async releaseSandbox(): Promise<boolean> {
    const sandboxId = this.sandboxInfo?.sandBoxId;
    if (!sandboxId) {
      logger.warn('[ProxyClient] releaseSandbox: sandboxId is null');
      return true;
    }

    try {
      const data = await fetchWithAuth(`${PROXY_URL}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          SandboxId: sandboxId,
        }),
      });
      logger.log('[ProxyClient] Release Sandbox Response:', data);
      return true;
    } catch (error) {
      logger.error(
        '[ProxyClient] Release Sandbox Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  private async releaseBrowser(): Promise<boolean> {
    const browserId = this.browserInfo?.browserId;
    if (!browserId) {
      return true;
    }
    try {
      const data = await fetchWithAuth(`${BROWSER_URL}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          BrowserId: browserId,
        }),
      });
      logger.log('[ProxyClient] Release Browser Response:', data);
      return true;
    } catch (error) {
      logger.error(
        '[ProxyClient] Release Browser Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  private async timeBalance(
    method: 'GET' | 'PATCH',
  ): Promise<TimeBalanceInteral> {
    try {
      const data: TimeBalanceInteral = await fetchWithAuth(`${TIME_URL}`, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
      });
      logger.log('[ProxyClient] timeBalance Response:', data);
      return data;
    } catch (error) {
      logger.error(
        '[ProxyClient] timeBalance Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  private async describeSandboxTerminalUrl(sandboxId: string) {
    try {
      const data = await fetchWithAuth(`${PROXY_URL}/rdp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          SandboxId: sandboxId,
        }),
      });
      logger.log('[ProxyClient] Describe Sandbox Terminal URL Response:', data);

      const { rdpUrl } = data;

      return rdpUrl;
    } catch (error) {
      logger.error(
        '[ProxyClient] Describe Sandbox Terminal URL Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  private async describeBrowsers(): Promise<Browser[]> {
    try {
      const data = await fetchWithAuth(`${BROWSER_URL}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      logger.log('[ProxyClient] Describe Browsers Response:', data);

      const browsersRet: Browser[] = [];
      for (const [podName, browsers] of Object.entries(data)) {
        logger.log('[ProxyClient] Pod:', podName);
        (browsers as BrowserInternal[]).forEach((browser) => {
          if (browser.status === 'ready') {
            browsersRet.push({
              id: browser.id,
              status: browser.status,
              cdp_url: browser.cdp_url,
              ws_url: browser.ws_url,
              pod_name: browser.pod_name,
            });
          }
        });
      }
      return browsersRet;
    } catch (error) {
      logger.error(
        '[ProxyClient] Describe Browsers Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  private async getRemoteVLMProvider(): Promise<string> {
    try {
      const data = await fetchWithAuth(`${FREE_MODEL_BASE_URL}/chat/provider`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      logger.log('[ProxyClient] Get Remote VLM Provider Response:', data);
      return data.data;
    } catch (error) {
      logger.error(
        '[ProxyClient] Get Remote VLM Provider Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  private async getRemoteVLMResponseApiSupport(): Promise<boolean> {
    try {
      const data = await fetchWithAuth(
        `${FREE_MODEL_BASE_URL}/responses/support`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
      );
      logger.log(
        '[ProxyClient] Get Remote VLM Response API Support Response:',
        data,
      );
      return data.data;
    } catch (error) {
      logger.error(
        '[ProxyClient] Get Remote VLM Provider Error:',
        (error as Error).message,
      );
      throw error;
    }
  }
}

// release remote resources before-quit
app.on('before-quit', async () => {
  await ProxyClient.releaseResource('computer');
  await ProxyClient.releaseResource('browser');
});
