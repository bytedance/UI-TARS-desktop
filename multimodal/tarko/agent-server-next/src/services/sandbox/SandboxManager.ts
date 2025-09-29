/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type {
  SandboxInstance,
  CreateSandboxOptions,
  SandboxDeleteResult,
  SandboxImageInfo,
} from './types';
import { SandboxConfig } from '@tarko/interface';
import { getLogger } from '../../utils/logger';
import { ILogger } from '../../types';

/**
 * SandboxManager - Manages sandbox instances with configurable JWT and base URL
 * Based on the FaasApiService but with better encapsulation and configuration
 */
export class SandboxManager {
  private config: SandboxConfig;
  private logger: ILogger;

  constructor(config: SandboxConfig) {
    this.config = {
      defaultTtlMinutes: 24 * 60, // 24h
      ...config,
    };
    this.logger = getLogger('SandboxManager');
  }

  /**
   * Get JWT token for authentication
   */
  private async getJwtToken(): Promise<string> {
    if (this.config.getJwtToken) {
      return await this.config.getJwtToken();
    }

    if (this.config.jwtToken) {
      return this.config.jwtToken;
    }

    throw new Error('No JWT token or token provider configured');
  }

  /**
   * Build sandbox instance URL
   */
  private getInstanceUrl(instanceId: string): string {
    return `https://${instanceId}.${this.config.baseUrl}`;
  }

  /**
   * Perform HTTP request with proper error handling
   */
  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getJwtToken();

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-jwt-token': token,
        ...options.headers,
      },
    });

    return response;
  }

  /**
   * Create a new sandbox instance
   */
  async createInstance(options: CreateSandboxOptions = {}): Promise<SandboxInstance> {
    const ttlMinutes = options.ttlMinutes || this.config.defaultTtlMinutes || 60;

    this.logger.info('Creating sandbox instance', {
      ttlMinutes,
      userId: options.userId,
      sessionId: options.sessionId,
      allocationStrategy: options.allocationStrategy,
    });

    if (process.env.SANDBOX_CREATE_MOCK) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 15);
      const uniqueId = `ondemand-${timestamp}-${random}`;
      return {
        id: uniqueId,
        url: process.env.SANDBOX_CREATE_MOCK,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        ttlMinutes,
        isActive: true,
      };
    }

    try {
      //FIXME: Irregular url splicing method, temporary solution
      const response = await fetch(`https://tars.${this.config.baseUrl}/v1/ping`, {
        method: 'POST',
        headers: {
          'X-Faas-Create-Sandbox': 'true',
          'X-Faas-Sandbox-TTL-Minutes': String(ttlMinutes),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to create sandbox: ${response.status} ${response.statusText}`);
      }

      const instanceName = response.headers.get('x-faas-instance-name');
      if (!instanceName) {
        throw new Error('Failed to get instance name from response headers');
      }

      const instance: SandboxInstance = {
        id: instanceName,
        url: this.getInstanceUrl(instanceName),
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        ttlMinutes,
        isActive: true,
      };

      this.logger.info('Sandbox instance created successfully: ', instance);

      return {
        id: instance.id,
        url: instance.url,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        ttlMinutes,
        isActive: true,
      };
    } catch (error) {
      this.logger.error('Failed to create sandbox instance:', error);
      throw error;
    }
  }

  /**
   * Delete a sandbox instance
   */
  async deleteInstance(instanceId: string): Promise<SandboxDeleteResult> {
    const url = `${this.getInstanceUrl(instanceId)}/v1/ping`;

    this.logger.info('Deleting sandbox instance', {
      instanceId,
      url,
    });

    try {
      const response = await this.fetchWithAuth(url, {
        method: 'DELETE',
        headers: {
          'X-Faas-Delete-Sandbox': 'true',
          'X-Faas-Instance-Name': instanceId,
        },
      });

      if (!response.ok) {
        const data = await response.json();

        // Instance not found - should continue with cleanup
        if (
          response.status === 404 ||
          (data as any).error_message === 'delete sandbox pod ttl failed'
        ) {
          return {
            success: false,
            shouldContinue: true,
            error: `Instance not found (${response.status}), will clean up database records`,
          };
        }

        throw new Error(`Delete API failed: ${response.status} ${response.statusText}`);
      }

      this.logger.info('Sandbox instance deleted successfully', { instanceId });
      return { success: true, shouldContinue: true };
    } catch (error) {
      // Check if instance actually doesn't exist
      const notExist = await this.checkInstanceNotExist(instanceId);

      if (notExist) {
        return {
          success: false,
          shouldContinue: true,
          error: 'Instance does not exist, will clean up database records',
        };
      }

      this.logger.error('Failed to delete sandbox instance:', error);
      throw error;
    }
  }

  /**
   * Refresh instance TTL
   */
  async refreshInstanceTtl(instanceId: string, ttlMinutes: number): Promise<void> {
    const url = `${this.getInstanceUrl(instanceId)}/v1/ping`;

    this.logger.info('Refreshing instance TTL', { instanceId, ttlMinutes });

    try {
      const response = await this.fetchWithAuth(url, {
        method: 'PATCH',
        headers: {
          'X-Faas-Sandbox-TTL-Minutes': String(ttlMinutes),
          'X-Faas-Instance-Name': instanceId,
        },
      });

      if (!response.ok) {
        throw new Error(`TTL refresh failed: ${response.status} ${response.statusText}`);
      }

      this.logger.info('Instance TTL refreshed successfully', { instanceId, ttlMinutes });
    } catch (error) {
      this.logger.error('Failed to refresh instance TTL:', error);
      throw error;
    }
  }

  /**
   * Check if instance exists by testing domain response
   */
  async checkInstanceNotExist(sandboxURL: string): Promise<boolean> {
    // const domainUrl = this.getInstanceUrl(instanceId);

    try {
      const response = await fetch(sandboxURL, {
        method: 'GET',
      });

      if (response.status === 500) {
        const data = await response.json();
        if ((data as any).error_code === 'instance_not_found') {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error(`Error checking instance existence for ${sandboxURL}:`, error);
      return false;
    }
  }

  /**
   * Get image version for an instance
   */
  async getImageVersion(instanceId: string): Promise<string> {
    try {
      const url = `${this.getInstanceUrl(instanceId)}/v1/openapi.json`;
      const response = await fetch(url, { method: 'GET' });

      if (!response.ok) {
        throw new Error(`Failed to get image version: ${response.status}`);
      }

      const data = (await response.json()) as SandboxImageInfo;
      return data.info?.version || '';
    } catch (error) {
      this.logger.error('Failed to get image version:', error);
      return '';
    }
  }

  /**
   * Test if an instance is responsive
   */
  async testInstance(instanceId: string): Promise<boolean> {
    try {
      const url = `${this.getInstanceUrl(instanceId)}/v1/ping`;
      const response = await fetch(url, {
        method: 'GET',
        timeout: 5000, // 5 second timeout
      } as any);

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SandboxConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): SandboxConfig {
    return { ...this.config };
  }
}
