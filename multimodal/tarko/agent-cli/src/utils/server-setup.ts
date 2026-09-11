import { AgentAppConfig } from '@tarko/interface';
import { resolveServerHost } from '@tarko/shared-utils';
import chalk from 'chalk';
import { findAvailablePort } from './port';

export async function ensureServerConfig(appConfig: AgentAppConfig): Promise<void> {
  if (!appConfig.server) {
    appConfig.server = {
      port: 8888,
    };
  }

  appConfig.server.host = resolveServerHost(appConfig.server.host);

  const availablePort = await findAvailablePort(appConfig.server.port!);
  if (availablePort !== appConfig.server.port) {
    console.log(
      `🔄 Port ${chalk.yellow(appConfig.server.port)} unavailable, switching to ${chalk.green(availablePort)}`,
    );
    appConfig.server.port = availablePort;
  }
}
