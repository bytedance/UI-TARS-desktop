/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { app } from 'electron';
import { getAuthHeader, registerDevice } from '../auth';
import { PROXY_URL, BROWSER_URL, TIME_URL } from '../constant';
import { logger } from '../logger';

const FREE_TRIAL_DURATION_MS = 30 * 60 * 1000;

async function fetchWithAuth(
  url: string,
  options: RequestInit,
  retries = 1,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  try {
    if (!options.headers) {
      options.headers = {};
    }
    const authHeader = await getAuthHeader();
    Object.assign(options.headers, {
      ...authHeader,
    });
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  } catch (error) {
    if (retries <= 0) throw error;
    logger.error(`[proxyClient] Retrying request...`);
    return fetchWithAuth(url, options, retries - 1);
  }
}

export class RemoteComputer {
  private instanceId = '';

  constructor(sandboxInfo: SandboxInfo) {
    this.instanceId = sandboxInfo.sandBoxId;
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

interface SandboxInternal {
  SandboxId: string;
  PrimaryIp: string;
  Status: string;
  OsType: string;
  InstanceTypeId: string;
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

interface BrowserInternal {
  id: string;
  port: number;
  status: string;
  created_at: string;
  pod_name: string;
  cdp_url: string;
  ws_url: string;
}

export type Browser = Omit<BrowserInternal, 'port' | 'created_at'>;

export interface TimeBalanceInteral {
  computerBalance: number;
  browserBalance: number;
  unit: string;
}

export type TimeBalance = Omit<TimeBalanceInteral, 'unit'>;

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
  ): Promise<boolean> {
    const instance = await ProxyClient.getInstance();

    const currentTimeStamp = Date.now();
    if (resourceType === 'computer') {
      const needAllocate =
        currentTimeStamp - instance.lastSandboxAllocTs > FREE_TRIAL_DURATION_MS;
      if (!needAllocate && instance.sandboxInfo != null) {
        logger.log(
          '[ProxyClient] allocResource: sandboxInfo has been allocated',
        );
        return true;
      }
      instance.sandboxInfo = await instance.getAvalialeSandbox();
      if (instance.sandboxInfo) {
        instance.lastSandboxAllocTs = Date.now();
        return true;
      }
    } else if (resourceType === 'browser') {
      const needAllocate =
        currentTimeStamp - instance.lastBrowserAllocTs > FREE_TRIAL_DURATION_MS;
      if (!needAllocate && instance.browserInfo != null) {
        logger.log(
          '[ProxyClient] allocResource: browserInfo has been allocated',
        );
        return true;
      }
      instance.browserInfo = await instance.getAvalialeBrowser();
      if (instance.browserInfo) {
        instance.lastBrowserAllocTs = Date.now();
        return true;
      }
    }
    return false;
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

  /*
  public static async patchTimeBalance(): Promise<number> {
    try {
      const timeBalance = await this.instance.timeBalance('PATCH');
      return timeBalance;
    } catch (error) {
      logger.error(
        '[ProxyClient] Get Time Balance Error:',
        (error as Error).message,
      );
      return -1;
    }
  }
  */

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

  private async getAvalialeSandbox(): Promise<SandboxInfo | null> {
    try {
      const data: SandboxInfo = await fetchWithAuth(`${PROXY_URL}/avaliable`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      logger.log('[ProxyClient] avaliable Sandbox api Response:', data);

      return data;
    } catch (error) {
      logger.error(
        '[ProxyClient] avaliable Sandbox api Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  private async getAvalialeBrowser(): Promise<BrowserInfo | null> {
    try {
      const data: BrowserInfo = await fetchWithAuth(
        `${BROWSER_URL}/avaliable`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
      );
      logger.log('[ProxyClient] avaliable Browser api Response:', data);
      return data;
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

  /*
  private async createSandbox(
    osType: 'Windows' | 'Linux' = 'Windows',
  ): Promise<string> {
    try {
      const data = await fetchWithAuth(`${PROXY_URL}/CreateSandbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          OsType: osType,
        }),
      });

      console.log('Create Sandbox Response:', data);

      const { Result } = data;
      if (Result) {
        return Result.SandboxId;
      } else {
        throw new Error('Failed to create sandbox');
      }
    } catch (error) {
      console.error('Create Sandbox Error:', (error as Error).message);
      throw error;
    }
  }
  */

  /*
  private async deleteSandbox(sandboxId: string) {
    try {
      const data = await fetchWithAuth(`${PROXY_URL}/DeleteSandbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          SandboxId: sandboxId,
        }),
      });

      console.log('Delete Sandbox Response:', data);

      const { ResponseMetadata } = data;
      console.log('\nRequestId:', ResponseMetadata.RequestId);
      console.log('Region:', ResponseMetadata.Region);
    } catch (error) {
      console.error('Delete Sandbox Error:', (error as Error).message);
      throw error;
    }
  }
  */

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

  /*
  private async createBrowser(): Promise<string> {
    try {
      const data = await fetchWithAuth(`${BROWSER_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('Create Browser Response:', data);

      if (data.status === 'success') {
        return data.browser_id;
      } else {
        throw new Error('Failed to create browser');
      }
    } catch (error) {
      console.error('Create Browser Error:', (error as Error).message);
      throw error;
    }
  }
  */

  /*
  private async deleteBrowser(browserId: string) {
    try {
      const data = await fetchWithAuth(`${BROWSER_URL}/${browserId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('Delete Browser Response:', data);
    } catch (error) {
      console.error('Delete Browser Error:', (error as Error).message);
      throw error;
    }
  }
  */
}

// release remote resources before-quit
app.on('before-quit', async () => {
  await ProxyClient.releaseResource('computer');
  await ProxyClient.releaseResource('browser');
});
