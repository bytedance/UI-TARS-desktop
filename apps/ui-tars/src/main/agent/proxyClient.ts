/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { getAuthHeader, registerDevice } from '../auth';

const UI_TARS_PROXY_HOST =
  'https://sd0ksn32cirbt02vttjf0.apigateway-cn-beijing.volceapi.com';

const VNC_PROXY_HOST =
  'https://sd0i6blt81nuff368i6lg.apigateway-cn-beijing.volceapi.com';

const COMPUTER_USE = 'https://computer-use.console.volcengine.com';

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
    console.error(`[proxyClient] Retrying request...`);
    return fetchWithAuth(url, options, retries - 1);
  }
}

export class RemoteComputer {
  private instanceId = '';

  constructor(instanceId: string) {
    this.instanceId = instanceId;
  }

  async moveMouse(x: number, y: number): Promise<void> {
    try {
      const data = await fetchWithAuth(`${BASE_URL}/proxy/MoveMouse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          InstanceId: this.instanceId,
          PositionX: x,
          PositionY: y,
        }),
      });
      console.log('Move Mouse Response:', data);
    } catch (error) {
      console.error('Move Mouse Error:', (error as Error).message);
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
      const data = await fetchWithAuth(`${BASE_URL}/proxy/ClickMouse`, {
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
      console.log('Click Mouse Response:', data);
    } catch (error) {
      console.error('Click Mouse Error:', (error as Error).message);
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
      const data = await fetchWithAuth(`${BASE_URL}/proxy/DragMouse`, {
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
      console.log('Drag Mouse Response:', data);
    } catch (error) {
      console.error('Drag Mouse Error:', (error as Error).message);
      throw error;
    }
  }

  async pressKey(key: string): Promise<void> {
    try {
      const data = await fetchWithAuth(`${BASE_URL}/proxy/PressKey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          InstanceId: this.instanceId,
          Key: key,
        }),
      });
      console.log('Press Key Response:', data);
    } catch (error) {
      console.error('Press Key Error:', (error as Error).message);
      throw error;
    }
  }

  async typeText(text: string): Promise<void> {
    try {
      const data = await fetchWithAuth(`${BASE_URL}/proxy/TypeText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          InstanceId: this.instanceId,
          Text: text,
        }),
      });
      console.log('Type Text Response:', data);
    } catch (error) {
      console.error('Type Text Error:', (error as Error).message);
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
      const data = await fetchWithAuth(`${BASE_URL}/proxy/Scroll`, {
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
      console.log('Scroll Response:', data);
    } catch (error) {
      console.error('Scroll Error:', (error as Error).message);
      throw error;
    }
  }

  async getScreenSize(): Promise<{ width: number; height: number }> {
    try {
      const data = await fetchWithAuth(`${BASE_URL}/proxy/GetScreenSize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          InstanceId: this.instanceId,
        }),
      });

      const { Result } = data;
      if (Result) {
        const { Width, Height } = Result;
        console.log('Screen size:', Result);
        return { width: Width, height: Height };
      }
      throw new Error('Failed to get screen size');
    } catch (error) {
      console.error('Get Screen Size Error:', (error as Error).message);
      throw error;
    }
  }

  async takeScreenshot(): Promise<string> {
    const startTime = Date.now();
    try {
      const data = await fetchWithAuth(`${BASE_URL}/proxy/TakeScreenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          InstanceId: this.instanceId,
        }),
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      const { ResponseMetadata, Result } = data;
      console.log('Take Screenshot Response:', ResponseMetadata);
      console.log('The time consumed:', duration, 'ms');

      if (Result?.Screenshot) {
        const base64Data = Result.Screenshot.replace(
          /^data:image\/jpeg;base64,/,
          '',
        );
        return base64Data;
      }
      throw new Error('Screenshot data not found in response');
    } catch (error) {
      console.error('Take Screenshot Error:', (error as Error).message);
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

const BASE_URL = `${UI_TARS_PROXY_HOST}/api/v1`;

export class ProxyClient {
  private static instance: ProxyClient;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

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

  // TODO: support more reliable way to get the sandbox
  async getAvaliableSandbox(): Promise<Sandbox | null> {
    const sandboxInfos = await this.describeSandboxes();
    return sandboxInfos.find((sandbox) => sandbox.Status === 'RUNNING') ?? null;
  }

  async getAvaliableSandboxList(): Promise<Sandbox[] | null> {
    const sandboxInfos = await this.describeSandboxes();
    return (
      sandboxInfos.filter((sandbox) => sandbox.Status === 'RUNNING') ?? null
    );
  }

  async getSandboxRDPUrl(sandboxId: string) {
    return await this.DescribeSandboxTerminalUrl(sandboxId);
  }

  async getAvaliableWsCDPUrl() {
    const browsers = await this.describeBrowsers();
    return (
      browsers.find((browser) => browser.status === 'ready')?.ws_url ?? null
    );
  }

  async getAvaliableWsCDPUrlList(): Promise<
    { podName: string; wsUrl: string; browserId: string }[] | null
  > {
    const browsers = await this.describeBrowsers();
    return browsers
      .filter((browser) => browser.status === 'ready')
      .map((browser) => ({
        podName: browser.pod_name,
        wsUrl: browser.ws_url,
        browserId: browser.id,
      }));
  }

  private async describeSandboxes(): Promise<Sandbox[]> {
    let sandboxInfos: Sandbox[] = [];
    try {
      const data = await fetchWithAuth(`${BASE_URL}/proxy/DescribeSandboxes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('Describe Sandboxes Response:', data);

      const { Result } = data;
      if (Result && Result.length > 0) {
        sandboxInfos = Result.map((sandbox: SandboxInternal) => ({
          SandboxId: sandbox.SandboxId,
          OsType: sandbox.OsType,
          Status: sandbox.Status,
        }));
        return sandboxInfos;
      }
    } catch (error) {
      console.error('Describe Sandboxes Error:', (error as Error).message);
      throw error;
    }
    return sandboxInfos;
  }

  async createSandbox(
    osType: 'Windows' | 'Linux' = 'Windows',
  ): Promise<string> {
    try {
      const data = await fetchWithAuth(`${BASE_URL}/proxy/CreateSandbox`, {
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

  async deleteSandbox(sandboxId: string) {
    try {
      const data = await fetchWithAuth(`${BASE_URL}/proxy/DeleteSandbox`, {
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

  private async DescribeSandboxTerminalUrl(sandboxId: string) {
    try {
      const sandboxInfoInternal = await this.describeSandbox(sandboxId);
      if (sandboxInfoInternal === null) return null;

      const data = await fetchWithAuth(
        `${BASE_URL}/proxy/DescribeSandboxTerminalUrl`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            SandboxId: sandboxId,
          }),
        },
      );
      console.log('Describe Sandbox Terminal URL Response:', data);

      const { Result } = data;

      if (Result.OsType === 'Linux') {
        if (Result.Token === null) return null;
        const token = Result.Token;
        const host = VNC_PROXY_HOST.replace(/https?:\/\//, '');
        return `${COMPUTER_USE}/novnc/vnc.html?host=${host}&autoconnect=true&resize=on&show_dot=true&resize=remote&path=${encodeURIComponent(
          `/?token=${token}`,
        )}`;
      } else if (Result.OsType === 'Windows') {
        if (Result.Url === null) return null;
        const wsUrl = Result.Url;
        if (Result.WindowsKey === null) return null;
        const password = Result.WindowsKey;
        return `${COMPUTER_USE}/guac/index.html?url=${wsUrl}&instanceId=${sandboxId}&ip=${sandboxInfoInternal.PrimaryIp}&password=${encodeURIComponent(password)}`;
      } else {
        return null;
      }
    } catch (error) {
      console.error(
        'Describe Sandbox Terminal URL Error:',
        (error as Error).message,
      );
      throw error;
    }
  }

  private async describeSandbox(
    sandboxId: string,
  ): Promise<SandboxInternal | null> {
    try {
      const data = await fetchWithAuth(`${BASE_URL}/proxy/DescribeSandboxes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          SandboxId: sandboxId,
        }),
      });
      console.log('Describe Sandbox Response:', data);

      const { Result } = data;
      if (Result && Result.length == 1) {
        return Result[0];
      }
    } catch (error) {
      console.error('Describe Sandboxes Error:', (error as Error).message);
      throw error;
    }
    return null;
  }

  private async describeBrowsers(): Promise<Browser[]> {
    try {
      const data = await fetchWithAuth(`${BASE_URL}/browsers`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('Describe Browsers Response:', data);

      const browsersRet: Browser[] = [];
      for (const [podName, browsers] of Object.entries(data)) {
        console.log('Pod:', podName);
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
      console.error('Describe Browsers Error:', (error as Error).message);
      throw error;
    }
  }

  async createBrowser(): Promise<string> {
    try {
      const data = await fetchWithAuth(`${BASE_URL}/browsers`, {
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

  async deleteBrowser(browserId: string) {
    try {
      const data = await fetchWithAuth(`${BASE_URL}/browsers/${browserId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('Delete Browser Response:', data);
    } catch (error) {
      console.error('Delete Browser Error:', (error as Error).message);
      throw error;
    }
  }
}
