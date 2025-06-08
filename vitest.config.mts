import { defineConfig } from 'vitest/config';

function cwdPlugin(name) {
  return {
    name: `vitest:test:workspace-${name}`,
    configResolved() {
      process.env[`${name}_CWD_CONFIG`] = process.cwd();
    },
    configureServer() {
      process.env[`${name}_CWD_SERVER`] = process.cwd();
    },
  };
}

export default defineConfig({
  envPrefix: ['VITE_', 'CUSTOM_', 'ROOT_'],
  plugins: [cwdPlugin('ROOT')],
  test: {
    coverage: {
      include: [
        'apps/**/*.ts',
        'packages/**/*.ts',
        '!packages/visualizer',
        '!packages/agent-infra/create-new-mcp',
      ],
      provider: 'istanbul',
      all: true,
      reporter: ['text', 'json', 'html', 'lcov'],
    },
    reporters: ['default'],
    env: {
      CONFIG_VAR: 'root',
      CONFIG_OVERRIDE: 'root',
    },
    provide: {
      globalConfigValue: true,
    },
  },
});
