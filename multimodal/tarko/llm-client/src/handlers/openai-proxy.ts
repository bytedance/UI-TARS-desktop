/* SPDX-License-Identifier: Apache-2.0 */

import { ProxyAgent } from 'proxy-agent';

const proxyEnvironmentVariables = [
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'ALL_PROXY',
  'http_proxy',
  'https_proxy',
  'all_proxy',
];

let proxyAgent: ProxyAgent | undefined;

/** Use the SDK's default connection pool unless a proxy is configured. */
export function getOpenAIHttpAgent(): ProxyAgent | undefined {
  if (!proxyEnvironmentVariables.some((name) => process.env[name])) {
    return undefined;
  }

  // ProxyAgent applies HTTP(S)_PROXY and NO_PROXY for each request URL.
  return (proxyAgent ??= new ProxyAgent());
}
