/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { logger } from '../logger';
import {
  BaseRemoteComputer,
  SandboxInternal,
  BrowserInternal,
  Browser,
  COMPUTER_USE_HOST,
} from './shared';

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  authToken = '',
  retries = 3,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  try {
    if (!options.headers) {
      options.headers = {};
    }
    Object.assign(options.headers, {
      Authorization: `${authToken}`,
    });
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  } catch (error) {
    if (retries <= 0) throw error;
    logger.error(`[subscriptionClient] Retrying request...`);
    return fetchWithRetry(url, options, authToken, retries - 1);
  }
}

export interface SubsSandboxInfo {
  sandboxId: string;
  sandboxEip: string;
}

export interface SubscriptionConfig {
  sandboxMgrUrl: string;
  userToken: string;
  vncProxyUrl: string;
  browserSessionMgrUrl: string;
  subsSandboxes: SubsSandboxInfo[];
}

export interface TerminalUrlResult {
  Url: string;
  OsType: string;
  Token: string | null;
  WindowsKey: string | null;
}

export class SubscriptionClient {
  private static sandboxMgrUrl: string;
  private static userToken: string;
  private static vncProxyUrl: string;
  private static browserSessionMgrUrl: string;
  //@ts-ignore: will use it later
  private static subsSandboxes: SubsSandboxInfo[];

  public static update(config: SubscriptionConfig) {
    SubscriptionClient.sandboxMgrUrl = config.sandboxMgrUrl;
    SubscriptionClient.userToken = config.userToken;
    SubscriptionClient.vncProxyUrl = config.vncProxyUrl;
    SubscriptionClient.browserSessionMgrUrl = config.browserSessionMgrUrl;
    SubscriptionClient.subsSandboxes = config.subsSandboxes;
  }

  public static async getSandboxRDPUrl(
    sandboxInfo: SubsSandboxInfo,
  ): Promise<string | null> {
    const sandboxId = sandboxInfo.sandboxId;
    const sandbox = await SubscriptionClient.describeSandboxes(sandboxId);
    if (!sandbox || !sandbox.SandboxId) {
      logger.error(
        '[SubscriptionClient] getSandboxRDPUrl, describeSandboxes failed, the sandboxId is not exist',
      );
      throw new Error('describeSandboxes failed');
    }
    if (sandbox.Status !== 'RUNNING') {
      logger.error(
        '[SubscriptionClient] getSandboxRDPUrl, the sandbox is not running',
      );
      throw new Error('the sandbox is not running');
    }
    const rdpUrl = SubscriptionClient.describeTerminalUrl(sandbox);
    logger.log('[SubscriptionClient] getSandboxRDPUrl:', rdpUrl);
    return rdpUrl;
  }

  public static async getBrowserCDPUrl(
    browserId: string,
  ): Promise<string | null> {
    const cdpUrlNew = await SubscriptionClient.getAvaliableWsCDPUrl(browserId);
    logger.log('[SubscriptionClient] getBrowserCDPUrl refresh: ', cdpUrlNew);
    return cdpUrlNew;
  }

  private static async describeSandboxes(
    sandboxId: string,
  ): Promise<SandboxInternal | null> {
    try {
      const data = await fetchWithRetry(`${SubscriptionClient.sandboxMgrUrl}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${SubscriptionClient.userToken}`,
        },
        body: JSON.stringify({
          Action: 'DescribeSandboxes',
          Version: '2020-04-01',
          SandboxId: sandboxId,
        }),
      });

      return data.Result?.Sandboxes?.[0];
    } catch (error) {
      logger.error(
        '[SubscriptionClient] Describe Sandbox Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  private static async describeTerminalUrl(sandbox: SandboxInternal) {
    try {
      const data = await fetchWithRetry(`${SubscriptionClient.sandboxMgrUrl}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${SubscriptionClient.userToken}`,
        },
        body: JSON.stringify({
          Action: 'DescribeSandboxTerminalUrl',
          Version: '2020-04-01',
          SandboxId: sandbox.SandboxId,
        }),
      });

      logger.log(
        '[SubscriptionClient] Describe Sandbox Terminal URL Response:',
        data,
      );

      const urlRes: TerminalUrlResult = data.Result;

      if (urlRes.OsType === 'Linux') {
        if (urlRes.Token === null) return null;
        const token = urlRes.Token;
        const host = SubscriptionClient.vncProxyUrl.replace(/https?:\/\//, '');
        // return `${COMPUTER_USE}/novnc/vnc.html?host=${host}&autoconnect=true&resize=on&show_dot=true&resize=remote&path=${encodeURIComponent(
        //   `/?token=${token}`,
        return `${COMPUTER_USE_HOST}/novnc/vnc.html?host=${host}&autoconnect=true&show_dot=true&path=${encodeURIComponent(
          `/?token=${token}`,
        )}`;
      } else if (urlRes.OsType === 'Windows') {
        if (urlRes.Url === null) return null;
        const wsUrl = urlRes.Url;
        if (urlRes.WindowsKey === null) return null;
        const password = urlRes.WindowsKey;
        return `${COMPUTER_USE_HOST}/guac/index.html?url=${wsUrl}&instanceId=${sandbox.SandboxId}&ip=${sandbox.PrimaryIp}&password=${encodeURIComponent(password)}`;
      } else {
        return null;
      }
    } catch (error) {
      logger.error(
        '[ProxyClient] Describe Sandbox Terminal URL Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  private static async describeBrowsers(): Promise<Browser[]> {
    try {
      const data = await fetchWithRetry(
        `${SubscriptionClient.browserSessionMgrUrl}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
      );
      logger.log('[SubscriptionClient] Describe Browsers Response:', data);

      const browsersRet: Browser[] = [];
      for (const [podName, browsers] of Object.entries(data)) {
        logger.log('[SubscriptionClient] Pod:', podName);
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
        '[SubscriptionClient] Describe Browsers Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  private static async getAvaliableWsCDPUrl(browserId: string) {
    const browsers = await SubscriptionClient.describeBrowsers();
    return (
      browsers.find(
        (browser) => browser.status === 'ready' && browser.id === browserId,
      )?.ws_url ?? null
    );
  }
}

export class SubsRemoteComputer extends BaseRemoteComputer {
  private instanceEip = '';

  constructor(instanceEip: string) {
    super();
    this.instanceEip = instanceEip;
  }

  async moveMouse(x: number, y: number): Promise<void> {
    try {
      const data = await fetchWithRetry(`${this.instanceEip}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Action: 'MoveMouse',
          Version: '2020-04-01',
          PositionX: x,
          PositionY: y,
        }),
      });
      logger.log('[SubsRemoteComputer] Move Mouse Response:', data);
    } catch (error) {
      logger.error(
        '[SubsRemoteComputer] Move Mouse Error:',
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
      const data = await fetchWithRetry(`${this.instanceEip}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Action: 'ClickMouse',
          Version: '2020-04-01',
          PositionX: x,
          PositionY: y,
          Button: button,
          Press: press,
          Release: release,
        }),
      });
      logger.log('[SubsRemoteComputer] Click Mouse Response:', data);
    } catch (error) {
      logger.error(
        '[SubsRemoteComputer] Click Mouse Error:',
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
      const data = await fetchWithRetry(`${this.instanceEip}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Action: 'DragMouse',
          Version: '2020-04-01',
          SourceX: sourceX,
          SourceY: sourceY,
          TargetX: targetX,
          TargetY: targetY,
        }),
      });
      logger.log('[SubsRemoteComputer] Drag Mouse Response:', data);
    } catch (error) {
      logger.error(
        '[SubsRemoteComputer] Drag Mouse Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  async pressKey(key: string): Promise<void> {
    try {
      const data = await fetchWithRetry(`${this.instanceEip}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Action: 'PressKey',
          Version: '2020-04-01',
          Key: key,
        }),
      });
      logger.log('[SubsRemoteComputer] Press Key Response:', data);
    } catch (error) {
      logger.error(
        '[SubsRemoteComputer] Press Key Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  async typeText(text: string): Promise<void> {
    try {
      const data = await fetchWithRetry(`${this.instanceEip}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Action: 'TypeText',
          Version: '2020-04-01',
          Text: text,
        }),
      });
      logger.log('[SubsRemoteComputer] Type Text Response:', data);
    } catch (error) {
      logger.error(
        '[SubsRemoteComputer] Type Text Error:',
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
      const data = await fetchWithRetry(`${this.instanceEip}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Action: 'Scroll',
          Version: '2020-04-01',
          PositionX: x,
          PositionY: y,
          Direction: direction,
          Amount: Math.min(amount, 10),
        }),
      });
      logger.log('[SubsRemoteComputer] Scroll Response:', data);
    } catch (error) {
      logger.error(
        '[SubsRemoteComputer] Scroll Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  async getScreenSize(): Promise<{ width: number; height: number }> {
    try {
      const data = await fetchWithRetry(`${this.instanceEip}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Action: 'GetScreenSize',
          Version: '2020-04-01',
        }),
      });

      const { Result } = data;
      if (Result) {
        const { Width, Height } = Result;
        logger.log('[SubsRemoteComputer] Screen size:', Result);
        return { width: Width, height: Height };
      }
      throw new Error('Failed to get screen size');
    } catch (error) {
      logger.error(
        '[SubsRemoteComputer] Get Screen Size Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  async takeScreenshot(): Promise<string> {
    const startTime = Date.now();
    try {
      const data = await fetchWithRetry(`${this.instanceEip}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Action: 'TakeScreenshot',
          Version: '2020-04-01',
        }),
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      const { ResponseMetadata, Result } = data;
      logger.log(
        '[SubsRemoteComputer] TakeScreenshot Response:',
        ResponseMetadata,
      );
      logger.log('[SubsRemoteComputer] The time consumed:', duration, 'ms');

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
        '[SubsRemoteComputer] TakeScreenshot Error:',
        (error as Error).message,
      );
      throw error;
    }
  }
}
