/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { HonoContext } from '../types';
import { type UserConfig } from '../services/user';
import { requireAuth } from '../middlewares/auth';

/**
 * Get user config service from server context
 */
function getUserConfigService(c: HonoContext) {
  const server = c.get('server');
  if (!server.userConfigService) {
    throw new Error('UserConfigService not available - multi-tenant mode required');
  }
  return server.userConfigService;
}

/**
 * Get current user's configuration
 */
export async function getUserConfig(c: HonoContext) {
  try {
    const user = requireAuth(c);
    const userConfigService = getUserConfigService(c);
    const config = await userConfigService.getUserConfig(user.userId);

    if (!config) {
      return c.json({ error: 'User configuration not found' }, 404);
    }

    return c.json({ config }, 200);
  } catch (error) {
    console.error('Failed to get user config:', error);
    return c.json({ error: 'Failed to get user configuration' }, 500);
  }
}

/**
 * Create user configuration
 */
export async function createUserConfig(c: HonoContext) {
  try {
    const user = requireAuth(c);
    const body = await c.req.json();
    const { config } = body as { config?: Partial<UserConfig> };
    const userConfigService = getUserConfigService(c);

    const userConfig = await userConfigService.createUserConfig(user.userId, config);

    return c.json({ config: userConfig }, 201);
  } catch (error) {
    console.error('Failed to create user config:', error);
    const message = (error as Error).message;

    if (message.includes('already exists')) {
      return c.json({ error: 'User configuration already exists' }, 409);
    }

    return c.json({ error: 'Failed to create user configuration' }, 500);
  }
}

/**
 * Update user configuration
 */
export async function updateUserConfig(c: HonoContext) {
  try {
    const user = requireAuth(c);
    const body = await c.req.json();
    const { config } = body as { config: Partial<UserConfig> };
    const userConfigService = getUserConfigService(c);

    if (!config || Object.keys(config).length === 0) {
      return c.json({ error: 'Configuration updates are required' }, 400);
    }

    const updatedConfig = await userConfigService.updateUserConfig(user.userId, config);

    if (!updatedConfig) {
      return c.json({ error: 'User configuration not found' }, 404);
    }

    return c.json({ config: updatedConfig }, 200);
  } catch (error) {
    console.error('Failed to update user config:', error);
    return c.json({ error: 'Failed to update user configuration' }, 500);
  }
}

/**
 * Get or create user configuration
 */
export async function getOrCreateUserConfig(c: HonoContext) {
  try {
    const user = requireAuth(c);
    const userConfigService = getUserConfigService(c);
    const config = await userConfigService.getOrCreateUserConfig(user.userId);

    return c.json({ config }, 200);
  } catch (error) {
    console.error('Failed to get or create user config:', error);
    return c.json({ error: 'Failed to get or create user configuration' }, 500);
  }
}

/**
 * Delete user configuration
 */
export async function deleteUserConfig(c: HonoContext) {
  try {
    const user = requireAuth(c);
    const userConfigService = getUserConfigService(c);
    const deleted = await userConfigService.deleteUserConfig(user.userId);

    if (!deleted) {
      return c.json({ error: 'User configuration not found' }, 404);
    }

    return c.json({ success: true, message: 'User configuration deleted successfully' }, 200);
  } catch (error) {
    console.error('Failed to delete user config:', error);
    return c.json({ error: 'Failed to delete user configuration' }, 500);
  }
}

/**
 * Add shared link
 */
export async function addSharedLink(c: HonoContext) {
  try {
    const user = requireAuth(c);
    const body = await c.req.json();
    const { sharedLink } = body as { sharedLink: string };
    const userConfigService = getUserConfigService(c);

    if (!sharedLink) {
      return c.json({ error: 'Shared link is required' }, 400);
    }

    const updatedConfig = await userConfigService.addSharedLink(user.userId, sharedLink);

    if (!updatedConfig) {
      return c.json({ error: 'User configuration not found' }, 404);
    }

    return c.json({ config: updatedConfig }, 200);
  } catch (error) {
    console.error('Failed to add shared link:', error);
    return c.json({ error: 'Failed to add shared link' }, 500);
  }
}

/**
 * Remove shared link
 */
export async function removeSharedLink(c: HonoContext) {
  try {
    const user = requireAuth(c);
    const body = await c.req.json();
    const { sharedLink } = body as { sharedLink: string };
    const userConfigService = getUserConfigService(c);

    if (!sharedLink) {
      return c.json({ error: 'Shared link is required' }, 400);
    }

    const updatedConfig = await userConfigService.removeSharedLink(user.userId, sharedLink);

    if (!updatedConfig) {
      return c.json({ error: 'User configuration not found' }, 404);
    }

    return c.json({ config: updatedConfig }, 200);
  } catch (error) {
    console.error('Failed to remove shared link:', error);
    return c.json({ error: 'Failed to remove shared link' }, 500);
  }
}

/**
 * Add custom SP fragment
 */
export async function addCustomSpFragment(c: HonoContext) {
  try {
    const user = requireAuth(c);
    const body = await c.req.json();
    const { fragment } = body as { fragment: string };
    const userConfigService = getUserConfigService(c);

    if (!fragment) {
      return c.json({ error: 'Fragment is required' }, 400);
    }

    const updatedConfig = await userConfigService.addCustomSpFragment(user.userId, fragment);

    if (!updatedConfig) {
      return c.json({ error: 'User configuration not found' }, 404);
    }

    return c.json({ config: updatedConfig }, 200);
  } catch (error) {
    console.error('Failed to add custom SP fragment:', error);
    return c.json({ error: 'Failed to add custom SP fragment' }, 500);
  }
}

/**
 * Remove custom SP fragment
 */
export async function removeCustomSpFragment(c: HonoContext) {
  try {
    const user = requireAuth(c);
    const body = await c.req.json();
    const { fragment } = body as { fragment: string };
    const userConfigService = getUserConfigService(c);

    if (!fragment) {
      return c.json({ error: 'Fragment is required' }, 400);
    }

    const updatedConfig = await userConfigService.removeCustomSpFragment(user.userId, fragment);

    if (!updatedConfig) {
      return c.json({ error: 'User configuration not found' }, 404);
    }

    return c.json({ config: updatedConfig }, 200);
  } catch (error) {
    console.error('Failed to remove custom SP fragment:', error);
    return c.json({ error: 'Failed to remove custom SP fragment' }, 500);
  }
}

/**
 * Update model providers
 */
export async function updateModelProviders(c: HonoContext) {
  try {
    const user = requireAuth(c);
    const body = await c.req.json();
    const { providers } = body as { providers: UserConfig['modelProviders'] };
    const userConfigService = getUserConfigService(c);

    if (!Array.isArray(providers)) {
      return c.json({ error: 'Providers must be an array' }, 400);
    }

    const updatedConfig = await userConfigService.updateModelProviders(user.userId, providers);

    if (!updatedConfig) {
      return c.json({ error: 'User configuration not found' }, 404);
    }

    return c.json({ config: updatedConfig }, 200);
  } catch (error) {
    console.error('Failed to update model providers:', error);
    return c.json({ error: 'Failed to update model providers' }, 500);
  }
}
