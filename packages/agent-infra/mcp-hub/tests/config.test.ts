import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigManager } from '../src/utils/config.js';
import fs from 'fs/promises';
import chokidar from 'chokidar';
import { EventEmitter } from 'events';

// Mock chokidar
vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(() => {
      const watcher = new EventEmitter();
      watcher.close = vi.fn();
      return watcher;
    }),
  },
}));

// Mock logger
vi.mock('../src/utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('ConfigManager', () => {
  let configManager;
  const validConfig = {
    mcpServers: {
      test: {
        command: 'node',
        args: ['server.js'],
        env: { PORT: '3000' },
      },
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    if (configManager) {
      configManager.stopWatching();
    }
  });

  describe('constructor', () => {
    it('should initialize with config object', () => {
      configManager = new ConfigManager(validConfig);
      expect(configManager.getConfig()).toEqual(validConfig);
    });

    it('should initialize with config path', () => {
      configManager = new ConfigManager('/path/to/config.json');
      expect(configManager.configPaths).toEqual(['/path/to/config.json']);
    });
  });

  describe('loadConfig', () => {
    it('should load and validate VS Code format config', async () => {
      const vsCodeConfig = {
        servers: {
          github: {
            url: 'https://api.githubcopilot.com/mcp/',
          },
          perplexity: {
            command: 'npx',
            args: ['-y', 'server-perplexity-ask'],
            env: {
              PERPLEXITY_API_KEY: 'test-key',
            },
          },
        },
      };
      vi.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(vsCodeConfig));

      configManager = new ConfigManager('/path/to/config.json');
      const result = await configManager.loadConfig();

      expect(result.config.mcpServers).toEqual({
        github: {
          url: 'https://api.githubcopilot.com/mcp/',
          type: 'sse',
          config_source: '/path/to/config.json',
        },
        perplexity: {
          command: 'npx',
          args: ['-y', 'server-perplexity-ask'],
          env: {
            PERPLEXITY_API_KEY: 'test-key',
          },
          type: 'stdio',
          config_source: '/path/to/config.json',
        },
      });
      expect(fs.readFile).toHaveBeenCalledWith('/path/to/config.json', 'utf-8');
    });

    it('should load and validate config from file', async () => {
      vi.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(validConfig));

      configManager = new ConfigManager('/path/to/config.json');
      await configManager.loadConfig();

      expect(configManager.getConfig()).toEqual({
        ...validConfig,
        mcpServers: {
          test: {
            ...validConfig.mcpServers.test,
            type: 'stdio',
            config_source: '/path/to/config.json',
          },
        },
      });
      expect(fs.readFile).toHaveBeenCalledWith('/path/to/config.json', 'utf-8');
    });

    it('should throw error if no config path specified', async () => {
      configManager = new ConfigManager();
      await expect(configManager.loadConfig()).rejects.toThrow(
        'No config paths specified',
      );
    });

    it('should throw error for invalid config structure', async () => {
      vi.spyOn(fs, 'readFile').mockResolvedValue(
        JSON.stringify({ invalid: 'config' }),
      );

      configManager = new ConfigManager('/path/to/config.json');
      await expect(configManager.loadConfig()).rejects.toThrow(
        "Failed to load config from /path/to/config.json: Invalid config format in /path/to/config.json: 'mcpServers' must be an object",
      );
    });

    it('should throw error for server missing command', async () => {
      const invalidConfig = {
        mcpServers: {
          test: {
            args: [],
          },
        },
      };
      vi.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(invalidConfig));

      configManager = new ConfigManager('/path/to/config.json');
      await expect(configManager.loadConfig()).rejects.toThrow(
        "Server 'test' must include either command (for stdio) or url (for sse)",
      );
    });

    it('should set default empty array for missing args', async () => {
      const configWithoutArgs = {
        mcpServers: {
          test: {
            command: 'node',
          },
        },
      };
      vi.spyOn(fs, 'readFile').mockResolvedValue(
        JSON.stringify(configWithoutArgs),
      );

      configManager = new ConfigManager('/path/to/config.json');
      await configManager.loadConfig();

      expect(configManager.getServerConfig('test').args).toEqual([]);
    });

    it('should throw error for invalid env', async () => {
      const invalidConfig = {
        mcpServers: {
          test: {
            command: 'node',
            env: 'invalid',
          },
        },
      };
      vi.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(invalidConfig));

      configManager = new ConfigManager('/path/to/config.json');
      await expect(configManager.loadConfig()).rejects.toThrow(
        "Server 'test' has invalid environment config",
      );
    });

    describe('dev field validation', () => {
      it('should accept valid dev config for stdio servers', async () => {
        const validDevConfig = {
          mcpServers: {
            test: {
              command: 'node',
              args: ['server.js'],
              dev: {
                enabled: true,
                watch: ['src/**/*.js'],
                cwd: '/absolute/path/to/server',
              },
            },
          },
        };
        vi.spyOn(fs, 'readFile').mockResolvedValue(
          JSON.stringify(validDevConfig),
        );

        configManager = new ConfigManager('/path/to/config.json');
        await configManager.loadConfig();

        expect(configManager.getServerConfig('test').dev).toEqual(
          validDevConfig.mcpServers.test.dev,
        );
      });

      it('should throw error for dev config on remote servers', async () => {
        const invalidDevConfig = {
          mcpServers: {
            test: {
              url: 'https://example.com/mcp',
              dev: {
                enabled: true,
                cwd: '/some/path',
              },
            },
          },
        };
        vi.spyOn(fs, 'readFile').mockResolvedValue(
          JSON.stringify(invalidDevConfig),
        );

        configManager = new ConfigManager('/path/to/config.json');
        await expect(configManager.loadConfig()).rejects.toThrow(
          "Server 'test' dev field is only supported for stdio servers",
        );
      });

      it('should throw error for non-object dev config', async () => {
        const invalidDevConfig = {
          mcpServers: {
            test: {
              command: 'node',
              dev: 'invalid-dev-config',
            },
          },
        };
        vi.spyOn(fs, 'readFile').mockResolvedValue(
          JSON.stringify(invalidDevConfig),
        );

        configManager = new ConfigManager('/path/to/config.json');
        await expect(configManager.loadConfig()).rejects.toThrow(
          "Server 'test' dev.cwd must be an absolute path",
        );
      });

      it('should throw error for missing cwd in dev config', async () => {
        const invalidDevConfig = {
          mcpServers: {
            test: {
              command: 'node',
              dev: {
                enabled: true,
                watch: ['src/**/*.js'],
                // missing cwd
              },
            },
          },
        };
        vi.spyOn(fs, 'readFile').mockResolvedValue(
          JSON.stringify(invalidDevConfig),
        );

        configManager = new ConfigManager('/path/to/config.json');
        await expect(configManager.loadConfig()).rejects.toThrow(
          "Server 'test' dev.cwd must be an absolute path",
        );
      });

      it('should throw error for relative cwd path', async () => {
        const invalidDevConfig = {
          mcpServers: {
            test: {
              command: 'node',
              dev: {
                enabled: true,
                cwd: 'relative/path',
              },
            },
          },
        };
        vi.spyOn(fs, 'readFile').mockResolvedValue(
          JSON.stringify(invalidDevConfig),
        );

        configManager = new ConfigManager('/path/to/config.json');
        await expect(configManager.loadConfig()).rejects.toThrow(
          "Server 'test' dev.cwd must be an absolute path",
        );
      });

      it('should throw error for invalid watch patterns', async () => {
        const invalidDevConfig = {
          mcpServers: {
            test: {
              command: 'node',
              dev: {
                enabled: true,
                watch: 'not-an-array',
                cwd: '/absolute/path',
              },
            },
          },
        };
        vi.spyOn(fs, 'readFile').mockResolvedValue(
          JSON.stringify(invalidDevConfig),
        );

        configManager = new ConfigManager('/path/to/config.json');
        await expect(configManager.loadConfig()).rejects.toThrow(
          "Server 'test' dev.watch must be an array of strings",
        );
      });

      it('should accept dev config without debounce (uses internal default)', async () => {
        const validDevConfig = {
          mcpServers: {
            test: {
              command: 'node',
              dev: {
                enabled: true,
                cwd: '/absolute/path',
              },
            },
          },
        };
        vi.spyOn(fs, 'readFile').mockResolvedValue(
          JSON.stringify(validDevConfig),
        );

        configManager = new ConfigManager('/path/to/config.json');
        const result = await configManager.loadConfig();

        expect(result.config.mcpServers.test.dev.enabled).toBe(true);
        expect(result.config.mcpServers.test.dev.cwd).toBe('/absolute/path');
      });
    });
  });

  describe('watchConfig', () => {
    it('should start watching config file', () => {
      configManager = new ConfigManager('/path/to/config.json');
      configManager.watchConfig();

      expect(chokidar.watch).toHaveBeenCalledWith(
        ['/path/to/config.json'],
        expect.objectContaining({
          awaitWriteFinish: expect.any(Object),
          persistent: true,
          usePolling: false,
          ignoreInitial: true,
        }),
      );
    });

    it('should not create multiple watchers', () => {
      configManager = new ConfigManager('/path/to/config.json');
      configManager.watchConfig();
      configManager.watchConfig();

      expect(chokidar.watch).toHaveBeenCalledTimes(1);
    });

    it('should handle watch errors', () => {
      configManager = new ConfigManager('/path/to/config.json');
      configManager.watchConfig();

      const watcher = chokidar.watch.mock.results[0].value;
      const error = new Error('Watch error');

      watcher.emit('error', error);
      // Should not throw, just log the error
    });
  });

  describe('updateConfig', () => {
    it('should update config with new path', async () => {
      vi.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(validConfig));

      configManager = new ConfigManager('/path/to/config.json');
      await configManager.updateConfig('/path/to/new-config.json');

      expect(configManager.configPaths).toEqual(['/path/to/new-config.json']);
      expect(configManager.getConfig()).toEqual({
        ...validConfig,
        mcpServers: {
          test: {
            ...validConfig.mcpServers.test,
            type: 'stdio',
            config_source: '/path/to/new-config.json',
          },
        },
      });
    });
  });

  describe('getServerConfig', () => {
    it('should return specific server config', () => {
      const testConfig = JSON.parse(JSON.stringify(validConfig)); // Deep clone to avoid mutation
      configManager = new ConfigManager(testConfig);
      expect(configManager.getServerConfig('test')).toEqual(
        validConfig.mcpServers.test,
      );
    });

    it('should return undefined for non-existent server', () => {
      const testConfig = JSON.parse(JSON.stringify(validConfig)); // Deep clone to avoid mutation
      configManager = new ConfigManager(testConfig);
      expect(configManager.getServerConfig('non-existent')).toBeUndefined();
    });
  });

  describe('stopWatching', () => {
    it('should close watcher if exists', () => {
      configManager = new ConfigManager('/path/to/config.json');
      configManager.watchConfig();

      const watcher = chokidar.watch.mock.results[0].value;
      configManager.stopWatching();

      expect(watcher.close).toHaveBeenCalled();
    });

    it('should do nothing if no watcher exists', () => {
      configManager = new ConfigManager('/path/to/config.json');
      configManager.stopWatching();
    });
  });
});
