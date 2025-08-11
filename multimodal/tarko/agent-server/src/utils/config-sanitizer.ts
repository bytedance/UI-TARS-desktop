import path from 'path';
import { AgentAppConfig } from '../types';

export interface SanitizedAgentOptions {
  workspace?: string;
  workspaceName?: string;
  agent?: {
    name?: string;
    id?: string;
  };
  server?: {
    port?: number;
  };
  model?: {
    provider?: string;
    model?: string;
    auth?: string; // Sanitized authentication token
  };
}

/**
 * Sanitize agent configuration, hiding sensitive information
 */
export function sanitizeAgentOptions(options: AgentAppConfig): SanitizedAgentOptions {
  const sanitized: SanitizedAgentOptions = {};

  // Workspace information
  if (options.workspace) {
    sanitized.workspace = options.workspace;
    sanitized.workspaceName = path.basename(options.workspace);
  }

  // Agent configuration
  if (options.name || options.id) {
    sanitized.agent = {
      name: options.name,
      id: options.id,
    };
  }

  // Server configuration
  if (options.server) {
    sanitized.server = {
      port: options.server.port,
    };
  }

  // Model configuration (with authentication token sanitization)
  if (options.model) {
    const modelConfig: any = {
      provider: options.model.provider,
      model: options.model.id, // Use 'id' instead of 'model'
    };
    // Add sanitized authentication token if present
    const authToken = options.model.apiKey;
    if (authToken) {
      modelConfig.auth = sanitizeApiKey(authToken);
    }
    sanitized.model = modelConfig;
  }

  return sanitized;
}

/**
 * Sanitize API key by showing only first and last few characters
 */
function sanitizeApiKey(apiKey?: string): string | undefined {
  if (!apiKey) return undefined;

  if (apiKey.length <= 8) {
    return '*'.repeat(apiKey.length);
  }

  // Show first 4 and last 4 characters, mask the middle
  const start = apiKey.substring(0, 4);
  const end = apiKey.substring(apiKey.length - 4);
  const middle = '*'.repeat(Math.max(apiKey.length - 8, 3));

  return `${start}${middle}${end}`;
}
