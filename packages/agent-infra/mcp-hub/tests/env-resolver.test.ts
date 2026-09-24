import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnvResolver, envResolver } from '../src/utils/env-resolver.js';
import { exec } from 'child_process';
import { promisify } from 'util';

// Mock child_process and util together
let mockExecPromise;

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: vi.fn().mockImplementation(() => {
    return (...args) => mockExecPromise(...args);
  }),
}));

// Mock logger
vi.mock('../src/utils/logger.js', () => ({
  default: {
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('EnvResolver', () => {
  let resolver;
  let originalProcessEnv;

  beforeEach(() => {
    vi.clearAllMocks();

    // Store original process.env
    originalProcessEnv = process.env;

    // Setup fresh process.env for each test
    process.env = {
      NODE_ENV: 'test',
      TEST_VAR: 'test_value',
      API_KEY: 'secret_key',
      DATABASE_URL: 'postgres://localhost:5432/test',
    };

    // Setup exec mock
    mockExecPromise = vi.fn();

    // Create new resolver instance
    resolver = new EnvResolver();
  });

  afterEach(() => {
    // Restore original process.env
    process.env = originalProcessEnv;
  });

  describe('Constructor and Basic Setup', () => {
    it('should initialize with default options', () => {
      const newResolver = new EnvResolver();
      expect(newResolver.maxPasses).toBe(10);
      expect(newResolver.commandTimeout).toBe(30000);
      expect(newResolver.strict).toBe(true); // Default to strict mode
    });

    it('should allow disabling strict mode', () => {
      const newResolver = new EnvResolver({ strict: false });
      expect(newResolver.strict).toBe(false);
    });

    it('should export singleton instance with strict mode enabled', () => {
      expect(envResolver).toBeInstanceOf(EnvResolver);
      expect(envResolver.strict).toBe(true);
    });
  });

  describe('Global Environment Support', () => {
    it('should parse global environment from MCP_HUB_ENV', () => {
      process.env.MCP_HUB_ENV = JSON.stringify({
        GLOBAL_VAR1: 'global_value1',
        GLOBAL_VAR2: 'global_value2',
      });

      const globalEnv = resolver._parseGlobalEnv();

      expect(globalEnv).toEqual({
        GLOBAL_VAR1: 'global_value1',
        GLOBAL_VAR2: 'global_value2',
      });
    });

    it('should return empty object when MCP_HUB_ENV is not set', () => {
      delete process.env.MCP_HUB_ENV;

      const globalEnv = resolver._parseGlobalEnv();

      expect(globalEnv).toEqual({});
    });

    it('should handle invalid JSON in MCP_HUB_ENV gracefully', () => {
      process.env.MCP_HUB_ENV = 'invalid json';

      const globalEnv = resolver._parseGlobalEnv();

      expect(globalEnv).toEqual({});
    });

    it('should include global env in context with correct priority', async () => {
      process.env.MCP_HUB_ENV = JSON.stringify({
        GLOBAL_VAR: 'global_value',
        SHARED_VAR: 'from_global',
      });

      const config = {
        env: {
          SERVER_VAR: 'server_value',
          SHARED_VAR: 'from_server', // Should override global
        },
      };

      const result = await resolver.resolveConfig(config, ['env']);

      // Check final merged env has correct priority
      expect(result.env.GLOBAL_VAR).toBe('global_value'); // From global
      expect(result.env.SERVER_VAR).toBe('server_value'); // From server
      expect(result.env.SHARED_VAR).toBe('from_server'); // Server overrides global
    });

    it('should make global env available for placeholder resolution', async () => {
      process.env.MCP_HUB_ENV = JSON.stringify({
        BASE_URL: 'https://api.example.com',
        // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
        TOKEN: 'global_token',
      });

      const config = {
        url: '${BASE_URL}/v1',
        headers: {
          Authorization: 'Bearer ${TOKEN}',
        },
      };

      const result = await resolver.resolveConfig(config, ['url', 'headers']);

      expect(result.url).toBe('https://api.example.com/v1');
      expect(result.headers.Authorization).toBe('Bearer global_token');
    });

    it('should work when no server env is specified', async () => {
      process.env.MCP_HUB_ENV = JSON.stringify({
        GLOBAL_VAR1: 'value1',
        GLOBAL_VAR2: 'value2',
      });

      const config = {
        url: '${GLOBAL_VAR1}',
        command: 'server-${GLOBAL_VAR2}',
      };

      const result = await resolver.resolveConfig(config, ['url', 'command']);

      expect(result.env).toEqual({
        GLOBAL_VAR1: 'value1',
        GLOBAL_VAR2: 'value2',
      });
      expect(result.url).toBe('value1');
      expect(result.command).toBe('server-value2');
    });
  });

  describe('String Placeholder Resolution', () => {
    it('should resolve simple environment variables', async () => {
      const context = { TEST_VAR: 'resolved_value', API_KEY: 'secret' };

      const result = await resolver._resolveStringWithPlaceholders(
        '${TEST_VAR}',
        context,
      );
      expect(result).toBe('resolved_value');

      const result2 = await resolver._resolveStringWithPlaceholders(
        'Bearer ${API_KEY}',
        context,
      );
      expect(result2).toBe('Bearer secret');
    });

    it('should handle multiple placeholders in one string', async () => {
      const context = { HOST: 'localhost', PORT: '3000', DB: 'myapp' };

      const result = await resolver._resolveStringWithPlaceholders(
        'postgresql://${HOST}:${PORT}/${DB}',
        context,
      );
      expect(result).toBe('postgresql://localhost:3000/myapp');
    });

    it('should keep unresolved placeholders intact in non-strict mode', async () => {
      const nonStrictResolver = new EnvResolver({ strict: false });
      const context = { KNOWN_VAR: 'known' };

      const result = await nonStrictResolver._resolveStringWithPlaceholders(
        '${KNOWN_VAR} and ${UNKNOWN_VAR}',
        context,
      );
      expect(result).toBe('known and ${UNKNOWN_VAR}');
    });

    it('should throw error on unresolved placeholders in strict mode', async () => {
      const context = { KNOWN_VAR: 'known' };

      await expect(
        resolver._resolveStringWithPlaceholders(
          '${KNOWN_VAR} and ${UNKNOWN_VAR}',
          context,
        ),
      ).rejects.toThrow("Variable 'UNKNOWN_VAR' not found");
    });

    it('should execute commands in placeholders', async () => {
      mockExecPromise.mockResolvedValueOnce({ stdout: 'secret_value\n' });
      const context = {};

      const result = await resolver._resolveStringWithPlaceholders(
        'Bearer ${cmd: op read secret}',
        context,
      );

      expect(mockExecPromise).toHaveBeenCalledWith(
        'op read secret',
        expect.objectContaining({ timeout: 30000 }),
      );
      expect(result).toBe('Bearer secret_value');
    });

    it('should handle mixed environment variables and commands', async () => {
      mockExecPromise.mockResolvedValueOnce({ stdout: 'cmd_result\n' });
      const context = { ENV_VAR: 'env_value' };

      const result = await resolver._resolveStringWithPlaceholders(
        '${ENV_VAR}-${cmd: echo test}',
        context,
      );

      expect(result).toBe('env_value-cmd_result');
    });
  });

  describe('Nested Placeholder Resolution', () => {
    it('should resolve nested environment variables inside command placeholders', async () => {
      mockExecPromise.mockResolvedValueOnce({ stdout: 'nested_cmd_result\n' });
      const context = {
        COMMAND: 'echo',
        ARGUMENT: 'nested_cmd_result',
      };

      const result = await resolver._resolveStringWithPlaceholders(
        'Data: ${cmd: ${COMMAND} ${ARGUMENT}}',
        context,
      );

      expect(mockExecPromise).toHaveBeenCalledWith(
        'echo nested_cmd_result',
        expect.any(Object),
      );
      expect(result).toBe('Data: nested_cmd_result');
    });

    it('should handle complex nested command and variable placeholders', async () => {
      mockExecPromise.mockResolvedValueOnce({ stdout: 'obsidian-token' });
      const context = {
        TEST: 'hello',
        XDG_RUNTIME_DIR: '/run/user/1000',
      };

      const result = await resolver._resolveStringWithPlaceholders(
        'TOKEN ${TEST} ${cmd: cat ${XDG_RUNTIME_DIR}/agenix/mcp-obsidian-token} ${TEST}',
        context,
      );

      expect(mockExecPromise).toHaveBeenCalledWith(
        'cat /run/user/1000/agenix/mcp-obsidian-token',
        expect.any(Object),
      );
      expect(result).toBe('TOKEN hello obsidian-token hello');
    });

    it('should throw error on unresolved nested placeholders in strict mode', async () => {
      const context = {
        KNOWN_VAR: 'known',
      };

      await expect(
        resolver._resolveStringWithPlaceholders(
          'Data: ${cmd: echo ${UNKNOWN_VAR}}',
          context,
        ),
      ).rejects.toThrow("Variable 'UNKNOWN_VAR' not found");
    });

    it('should keep unresolved nested placeholders in non-strict mode by executing command with literal', async () => {
      const nonStrictResolver = new EnvResolver({ strict: false });
      const context = { KNOWN_VAR: 'known' };
      mockExecPromise.mockResolvedValueOnce({ stdout: '${UNKNOWN_VAR}\n' });

      const result = await nonStrictResolver._resolveStringWithPlaceholders(
        'Data: ${cmd: echo ${UNKNOWN_VAR}} and ${KNOWN_VAR}',
        context,
      );

      expect(mockExecPromise).toHaveBeenCalledWith(
        'echo ${UNKNOWN_VAR}',
        expect.any(Object),
      );
      expect(result).toBe('Data: ${UNKNOWN_VAR} and known');
    });
  });

  describe('Command Execution', () => {
    describe('Command Execution', () => {
      it('should execute ${cmd: ...} commands via _executeCommand', async () => {
        mockExecPromise.mockResolvedValueOnce({ stdout: 'secret_value\n' });

        const result = await resolver._executeCommand('${cmd: op read secret}');

        expect(mockExecPromise).toHaveBeenCalledWith(
          'op read secret',
          expect.objectContaining({ timeout: 30000, encoding: 'utf8' }),
        );
        expect(result).toBe('secret_value');
      });

      it('should execute command content directly via _executeCommandContent', async () => {
        mockExecPromise.mockResolvedValueOnce({ stdout: 'direct_result\n' });

        const result =
          await resolver._executeCommandContent('cmd: echo direct');

        expect(mockExecPromise).toHaveBeenCalledWith(
          'echo direct',
          expect.objectContaining({ timeout: 30000, encoding: 'utf8' }),
        );
        expect(result).toBe('direct_result');
      });

      it('should handle command execution errors', async () => {
        const error = new Error('Command failed');
        mockExecPromise.mockRejectedValueOnce(error);

        await expect(
          resolver._executeCommand('${cmd: failing-command}'),
        ).rejects.toThrow('Command failed');
      });

      it('should handle empty commands', async () => {
        await expect(resolver._executeCommand('${cmd: }')).rejects.toThrow(
          'Empty command in cmd:',
        );

        await expect(resolver._executeCommandContent('cmd: ')).rejects.toThrow(
          'Empty command in cmd:',
        );
      });

      it('should support legacy $: syntax with deprecation warning', async () => {
        mockExecPromise.mockResolvedValueOnce({ stdout: 'legacy_output\n' });

        const result = await resolver._executeCommand('$: echo legacy');

        expect(mockExecPromise).toHaveBeenCalledWith(
          'echo legacy',
          expect.objectContaining({ timeout: 30000, encoding: 'utf8' }),
        );
        expect(result).toBe('legacy_output');
      });

      it('should throw error for invalid command syntax', async () => {
        await expect(
          resolver._executeCommand('invalid: command'),
        ).rejects.toThrow('Invalid command syntax: invalid: command');
      });
    });

    describe('Configuration Resolution', () => {
      it('should resolve env field with null fallbacks', async () => {
        // Set a variable in process.env that can be used as fallback
        process.env.FALLBACK_VAR = 'fallback_value';

        const config = {
          env: {
            SIMPLE_VAR: '${TEST_VAR}',
            FALLBACK_VAR: null,
            STATIC_VAR: 'static_value',
          },
        };

        const result = await resolver.resolveConfig(config, ['env']);

        expect(result.env.SIMPLE_VAR).toBe('test_value');
        expect(result.env.FALLBACK_VAR).toBe('fallback_value'); // null falls back to process.env
        expect(result.env.STATIC_VAR).toBe('static_value');

        // Cleanup
        delete process.env.FALLBACK_VAR;
      });

      it('should resolve args field with legacy syntax', async () => {
        const config = {
          // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
          env: { TOKEN: 'secret123' },
          args: [
            '--token',
            '${TOKEN}',
            '--legacy',
            '$API_KEY', // Legacy syntax
            '--static',
            'value',
          ],
        };

        const result = await resolver.resolveConfig(config, ['env', 'args']);

        expect(result.args).toEqual([
          '--token',
          'secret123',
          '--legacy',
          'secret_key', // From process.env.API_KEY
          '--static',
          'value',
        ]);
      });

      it('should resolve headers field', async () => {
        mockExecPromise.mockResolvedValueOnce({ stdout: 'auth_token\n' });

        const config = {
          headers: {
            Authorization: 'Bearer ${cmd: get-token}',
            'X-Custom': '${API_KEY}',
            Static: 'value',
          },
        };

        const result = await resolver.resolveConfig(config, ['headers']);

        expect(result.headers).toEqual({
          Authorization: 'Bearer auth_token',
          'X-Custom': 'secret_key',
          Static: 'value',
        });
      });

      it('should resolve url and command fields', async () => {
        const config = {
          url: 'https://${API_KEY}.example.com',
          command: '${TEST_VAR}/bin/server',
        };

        const result = await resolver.resolveConfig(config, ['url', 'command']);

        expect(result.url).toBe('https://secret_key.example.com');
        expect(result.command).toBe('test_value/bin/server');
      });

      it('should resolve env field with placeholders', async () => {
        // Set up context variables
        process.env.FIRST = 'value1';

        const config = {
          env: {
            FIRST: 'value1',
            SECOND: '${FIRST}_extended',
          },
        };

        const result = await resolver.resolveConfig(config, ['env']);

        expect(result.env.FIRST).toBe('value1');
        expect(result.env.SECOND).toBe('value1_extended'); // Uses process.env.FIRST

        // Cleanup
        delete process.env.FIRST;
      });

      it('should handle commands in env providing context for other fields', async () => {
        mockExecPromise.mockResolvedValueOnce({ stdout: 'secret_from_cmd\n' });

        const config = {
          env: {
            // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
            SECRET: '${cmd: get-secret}',
          },
          headers: {
            Authorization: 'Bearer ${SECRET}',
          },
        };

        const result = await resolver.resolveConfig(config, ['env', 'headers']);

        expect(result.env.SECRET).toBe('secret_from_cmd');
        expect(result.headers.Authorization).toBe('Bearer secret_from_cmd');
      });

      it('should work without env field for remote servers', async () => {
        mockExecPromise.mockResolvedValueOnce({ stdout: 'remote_token\n' });

        const config = {
          url: 'https://api.example.com',
          headers: {
            Authorization: 'Bearer ${cmd: get-remote-token}',
          },
        };

        const result = await resolver.resolveConfig(config, ['url', 'headers']);

        expect(result.url).toBe('https://api.example.com');
        expect(result.headers.Authorization).toBe('Bearer remote_token');
      });

      it('should handle circular dependencies gracefully in non-strict mode', async () => {
        const nonStrictResolver = new EnvResolver({ strict: false });
        const config = {
          env: {
            VAR_A: '${VAR_B}',
            VAR_B: '${VAR_A}',
          },
        };

        const result = await nonStrictResolver.resolveConfig(config, ['env']);

        // Should fallback to original values when circular dependency detected
        expect(result.env.VAR_A).toBe('${VAR_B}');
        expect(result.env.VAR_B).toBe('${VAR_A}');
      });

      describe('Error Handling', () => {
        describe('Strict Mode (Default)', () => {
          it('should throw error on command execution failures', async () => {
            mockExecPromise.mockRejectedValueOnce(new Error('Command failed'));

            const config = {
              headers: {
                Authorization: 'Bearer ${cmd: failing-command}',
              },
            };

            await expect(
              resolver.resolveConfig(config, ['headers']),
            ).rejects.toThrow('cmd execution failed: Command failed');
          });

          it('should throw error on unresolved environment variables', async () => {
            const config = {
              env: {
                SIMPLE_VAR: '${UNKNOWN_VAR}',
              },
            };

            await expect(
              resolver.resolveConfig(config, ['env']),
            ).rejects.toThrow("Variable 'UNKNOWN_VAR' not found");
          });

          it('should throw error on legacy syntax with missing variables', async () => {
            const config = {
              args: ['--token', '$UNKNOWN_LEGACY_VAR'],
            };

            await expect(
              resolver.resolveConfig(config, ['args']),
            ).rejects.toThrow("Legacy variable 'UNKNOWN_LEGACY_VAR' not found");
          });

          it('should detect circular dependencies eventually', async () => {
            // Create a scenario where circular deps are detected before individual var failures
            // Use a non-strict resolver to test the circular dependency detection logic
            const nonStrictResolver = new EnvResolver({ strict: false });
            const config = {
              env: {
                VAR_A: '${VAR_B}',
                VAR_B: '${VAR_C}',
                VAR_C: '${VAR_A}',
              },
            };

            const result = await nonStrictResolver.resolveConfig(config, [
              'env',
            ]);

            // In non-strict mode, circular dependencies should be detected and values left as-is
            expect(result.env.VAR_A).toBe('${VAR_B}');
            expect(result.env.VAR_B).toBe('${VAR_C}');
            expect(result.env.VAR_C).toBe('${VAR_A}');
          });

          it('should throw error on mixed placeholders with failures', async () => {
            const config = {
              url: 'https://${KNOWN_VAR}.${UNKNOWN_VAR}.com',
            };

            const context = { KNOWN_VAR: 'api' };
            process.env.KNOWN_VAR = 'api';

            await expect(
              resolver.resolveConfig(config, ['url']),
            ).rejects.toThrow("Variable 'UNKNOWN_VAR' not found");
          });
        });
      });

      describe('Non-Strict Mode', () => {
        beforeEach(() => {
          resolver = new EnvResolver({ strict: false });
        });

        it('should handle command execution failures gracefully', async () => {
          mockExecPromise.mockRejectedValueOnce(new Error('Command failed'));

          const config = {
            headers: {
              Authorization: 'Bearer ${cmd: failing-command}',
            },
          };

          const result = await resolver.resolveConfig(config, ['headers']);

          // Should keep original placeholder on command failure
          expect(result.headers.Authorization).toBe(
            'Bearer ${cmd: failing-command}',
          );
        });

        it('should handle unresolved variables gracefully', async () => {
          const config = {
            env: {
              SIMPLE_VAR: '${UNKNOWN_VAR}',
              KNOWN_VAR: '${TEST_VAR}',
            },
          };

          const result = await resolver.resolveConfig(config, ['env']);

          expect(result.env.SIMPLE_VAR).toBe('${UNKNOWN_VAR}'); // Keep original
          expect(result.env.KNOWN_VAR).toBe('test_value'); // Resolved
        });

        it('should handle circular dependencies gracefully', async () => {
          const config = {
            env: {
              VAR_A: '${VAR_B}',
              VAR_B: '${VAR_A}',
            },
          };

          const result = await resolver.resolveConfig(config, ['env']);

          // Should fallback to original values when circular dependency detected
          expect(result.env.VAR_A).toBe('${VAR_B}');
          expect(result.env.VAR_B).toBe('${VAR_A}');
        });
      });

      describe('General Error Handling', () => {
        it('should handle non-string values gracefully', async () => {
          // Use non-strict resolver for this test
          const nonStrictResolver = new EnvResolver({ strict: false });

          const config = {
            env: {
              NUMBER: 123,
              BOOLEAN: true,
              NULL_VAL: null,
            },
            args: ['string', 456, true],
          };

          const result = await nonStrictResolver.resolveConfig(config, [
            'env',
            'args',
          ]);

          expect(result.env.NUMBER).toBe(123);
          expect(result.env.BOOLEAN).toBe(true);
          expect(result.env.NULL_VAL).toBe(''); // null with no fallback in non-strict mode
          expect(result.args).toEqual(['string', 456, true]);
        });

        it('should provide clear error messages with context', async () => {
          const config = {
            headers: {
              Authorization: 'Bearer ${MISSING_TOKEN}',
            },
          };

          await expect(
            resolver.resolveConfig(config, ['headers']),
          ).rejects.toThrow(/Variable.*MISSING_TOKEN.*not found/);
        });
      });
    });

    describe('VS Code Compatibility', () => {
      beforeEach(() => {
        // Clear any existing global env
        delete process.env.MCP_HUB_ENV;
      });

      describe('Predefined Variables', () => {
        it('should resolve VS Code predefined variables', async () => {
          const config = {
            url: '${workspaceFolder}/api',
            command: '${userHome}/bin/server',
            cwd: '${workspaceFolder}',
            args: ['--config', '${workspaceFolder}/config.json'],
          };

          const result = await resolver.resolveConfig(config, [
            'url',
            'command',
            'cwd',
            'args',
          ]);

          const expectedCwd = process.cwd();
          const expectedHome = require('os').homedir();

          expect(result.url).toBe(`${expectedCwd}/api`);
          expect(result.command).toBe(`${expectedHome}/bin/server`);
          expect(result.cwd).toBe(expectedCwd);
          expect(result.args).toEqual([
            '--config',
            `${expectedCwd}/config.json`,
          ]);
        });

        it('should support workspaceFolderBasename variable', async () => {
          const config = {
            env: {
              PROJECT_NAME: '${workspaceFolderBasename}',
            },
          };

          const result = await resolver.resolveConfig(config, ['env']);
          const expectedBasename = require('path').basename(process.cwd());

          expect(result.env.PROJECT_NAME).toBe(expectedBasename);
        });

        it('should support pathSeparator variable', async () => {
          const config = {
            env: {
              PATH_SEP: '${pathSeparator}',
              PATH_SEP_SHORT: '${/}', // VS Code shorthand
            },
          };

          const result = await resolver.resolveConfig(config, ['env']);
          const expectedSep = require('path').sep;

          expect(result.env.PATH_SEP).toBe(expectedSep);
          expect(result.env.PATH_SEP_SHORT).toBe(expectedSep);
        });

        it('should have correct priority - predefined vars should not override process.env', async () => {
          // Set a process.env variable that might conflict with predefined vars
          process.env.workspaceFolder = '/custom/workspace';

          const config = {
            env: {
              WORKSPACE: '${workspaceFolder}',
            },
          };

          const result = await resolver.resolveConfig(config, ['env']);

          // process.env should win over predefined vars
          expect(result.env.WORKSPACE).toBe('/custom/workspace');

          // Cleanup
          delete process.env.workspaceFolder;
        });
      });

      describe('VS Code env: syntax', () => {
        it('should resolve ${env:VARIABLE} syntax', async () => {
          process.env.VS_CODE_VAR = 'vscode_value';

          const config = {
            env: {
              STANDARD: '${API_KEY}', // Standard syntax
              VS_CODE: '${env:VS_CODE_VAR}', // VS Code syntax
            },
            headers: {
              Authorization: 'Bearer ${env:API_KEY}',
            },
          };

          const result = await resolver.resolveConfig(config, [
            'env',
            'headers',
          ]);

          expect(result.env.STANDARD).toBe('secret_key');
          expect(result.env.VS_CODE).toBe('vscode_value');
          expect(result.headers.Authorization).toBe('Bearer secret_key');

          // Cleanup
          delete process.env.VS_CODE_VAR;
        });

        it('should handle unresolved ${env:} variables in strict mode', async () => {
          const config = {
            env: {
              MISSING: '${env:UNKNOWN_VAR}',
            },
          };

          await expect(resolver.resolveConfig(config, ['env'])).rejects.toThrow(
            "Variable 'UNKNOWN_VAR' not found",
          );
        });

        it('should handle unresolved ${env:} variables in non-strict mode', async () => {
          const nonStrictResolver = new EnvResolver({ strict: false });

          const config = {
            env: {
              MISSING: '${env:UNKNOWN_VAR}',
              KNOWN: '${env:API_KEY}',
            },
          };

          const result = await nonStrictResolver.resolveConfig(config, ['env']);

          expect(result.env.MISSING).toBe('${env:UNKNOWN_VAR}');
          expect(result.env.KNOWN).toBe('secret_key');
        });
      });

      describe('VS Code input: variables via MCP_HUB_ENV', () => {
        it('should resolve ${input:} variables from MCP_HUB_ENV', async () => {
          process.env.MCP_HUB_ENV = JSON.stringify({
            'input:api-key': 'secret-from-input',
            'input:database-url': 'postgresql://localhost/test',
          });

          const config = {
            env: {
              API_KEY: '${input:api-key}',
              DB_URL: '${input:database-url}',
            },
            headers: {
              Authorization: 'Bearer ${input:api-key}',
            },
          };

          const result = await resolver.resolveConfig(config, [
            'env',
            'headers',
          ]);

          expect(result.env.API_KEY).toBe('secret-from-input');
          expect(result.env.DB_URL).toBe('postgresql://localhost/test');
          expect(result.headers.Authorization).toBe('Bearer secret-from-input');
        });

        it('should handle missing ${input:} variables gracefully', async () => {
          process.env.MCP_HUB_ENV = JSON.stringify({
            'input:known-key': 'known-value',
          });

          const nonStrictResolver = new EnvResolver({ strict: false });

          const config = {
            env: {
              KNOWN: '${input:known-key}',
              MISSING: '${input:missing-key}',
            },
          };

          const result = await nonStrictResolver.resolveConfig(config, ['env']);

          expect(result.env.KNOWN).toBe('known-value');
          expect(result.env.MISSING).toBe('${input:missing-key}'); // Kept as-is
        });

        it('should throw error for missing ${input:} variables in strict mode', async () => {
          process.env.MCP_HUB_ENV = JSON.stringify({
            'input:known-key': 'known-value',
          });

          const config = {
            env: {
              MISSING: '${input:missing-key}',
            },
          };

          await expect(resolver.resolveConfig(config, ['env'])).rejects.toThrow(
            "Variable 'input:missing-key' not found",
          );
        });
      });

      describe('Complete VS Code scenario', () => {
        it('should handle a complete VS Code-style configuration', async () => {
          // Setup VS Code-style input variables in MCP_HUB_ENV
          process.env.MCP_HUB_ENV = JSON.stringify({
            'input:perplexity-key': 'pplx-secret-key',
            'input:github-token': 'ghp_github_token',
          });

          // Setup some environment variables
          process.env.NODE_ENV = 'production';

          const config = {
            env: {
              // VS Code input variables
              PERPLEXITY_API_KEY: '${input:perplexity-key}',
              GITHUB_TOKEN: '${input:github-token}',

              // VS Code env syntax
              NODE_ENVIRONMENT: '${env:NODE_ENV}',

              // VS Code predefined variables
              WORKSPACE_PATH: '${workspaceFolder}',
              USER_HOME: '${userHome}',

              // Mixed syntax
              CONFIG_PATH: '${workspaceFolder}/config/${env:NODE_ENV}.json',
            },
            args: [
              '--workspace',
              '${workspaceFolder}',
              '--token',
              '${input:perplexity-key}',
              '--env',
              '${env:NODE_ENV}',
            ],
            headers: {
              Authorization: 'Bearer ${input:github-token}',
              'X-Workspace': '${workspaceFolderBasename}',
            },
          };

          const result = await resolver.resolveConfig(config, [
            'env',
            'args',
            'headers',
          ]);

          // Check input variables
          expect(result.env.PERPLEXITY_API_KEY).toBe('pplx-secret-key');
          expect(result.env.GITHUB_TOKEN).toBe('ghp_github_token');

          // Check env: syntax
          expect(result.env.NODE_ENVIRONMENT).toBe('production');

          // Check predefined variables
          expect(result.env.WORKSPACE_PATH).toBe(process.cwd());
          expect(result.env.USER_HOME).toBe(require('os').homedir());

          // Check mixed syntax
          expect(result.env.CONFIG_PATH).toBe(
            `${process.cwd()}/config/production.json`,
          );

          // Check args resolution
          expect(result.args).toEqual([
            '--workspace',
            process.cwd(),
            '--token',
            'pplx-secret-key',
            '--env',
            'production',
          ]);

          // Check headers resolution
          expect(result.headers.Authorization).toBe('Bearer ghp_github_token');
          expect(result.headers['X-Workspace']).toBe(
            require('path').basename(process.cwd()),
          );

          // Cleanup
          delete process.env.NODE_ENV;
        });

        it('should not pass predefined variables to server env', async () => {
          process.env.MCP_HUB_ENV = JSON.stringify({
            GLOBAL_VAR: 'global_value',
          });

          const config = {
            env: {
              SERVER_VAR: 'server_value',
              WORKSPACE_REF: '${workspaceFolder}',
            },
          };

          const result = await resolver.resolveConfig(config, ['env']);

          // Server env should only contain global env + server env, not predefined vars
          expect(result.env).toEqual({
            GLOBAL_VAR: 'global_value', // From MCP_HUB_ENV
            SERVER_VAR: 'server_value', // From server config
            WORKSPACE_REF: process.cwd(), // Resolved predefined var
          });

          // Predefined variables themselves should NOT be in server env
          expect(result.env.workspaceFolder).toBeUndefined();
          expect(result.env.userHome).toBeUndefined();
          expect(result.env.pathSeparator).toBeUndefined();
        });
      });
    });
  });
});
