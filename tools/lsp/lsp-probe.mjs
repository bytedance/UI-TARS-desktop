import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const separatorIndex = argv.indexOf('--');

if (separatorIndex === -1) {
  console.error(
    'Usage: node tools/lsp/lsp-probe.mjs [--root <path>] [--timeoutMs <n>] -- <server> [args...]',
  );
  process.exit(2);
}

const optArgs = argv.slice(0, separatorIndex);
const cmd = argv.slice(separatorIndex + 1);

const options = {};
for (let i = 0; i < optArgs.length; i += 1) {
  const key = optArgs[i];
  const value = optArgs[i + 1];
  if (key.startsWith('--') && value && !value.startsWith('--')) {
    options[key.slice(2)] = value;
    i += 1;
  }
}

const root = options.root || process.cwd();
const timeoutMs = Number(options.timeoutMs || '15000');

function encodeLspMessage(message) {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`;
}

function waitForMessage(state) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tick = () => {
      const headerEnd = state.buffer.indexOf('\r\n\r\n');

      if (headerEnd !== -1) {
        const header = state.buffer.slice(0, headerEnd).toString('utf8');
        const match = header.match(/Content-Length:\s*(\d+)/i);

        if (!match) {
          reject(new Error('Missing Content-Length header'));
          return;
        }

        const bodyLength = Number(match[1]);
        const totalLength = headerEnd + 4 + bodyLength;

        if (state.buffer.length >= totalLength) {
          const body = state.buffer
            .slice(headerEnd + 4, totalLength)
            .toString('utf8');
          state.buffer = state.buffer.slice(totalLength);
          resolve(JSON.parse(body));
          return;
        }
      }

      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error('Timed out waiting for LSP message'));
        return;
      }

      setTimeout(tick, 10);
    };

    tick();
  });
}

async function waitForResponse(state, requestId) {
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const message = await waitForMessage(state);
    if (message.id === requestId) {
      return message;
    }
  }

  throw new Error(`Timed out waiting for response id=${requestId}`);
}

async function runProbe() {
  if (cmd.length === 0) {
    throw new Error('Missing LSP server command after -- separator');
  }

  const isWindowsPnpm =
    process.platform === 'win32' && cmd[0].toLowerCase() === 'pnpm';

  const child = isWindowsPnpm
    ? spawn('cmd.exe', ['/d', '/s', '/c', cmd.join(' ')], {
        cwd: root,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      })
    : spawn(cmd[0], cmd.slice(1), {
        cwd: root,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

  const state = { buffer: Buffer.alloc(0) };

  child.stdout.on('data', chunk => {
    state.buffer = Buffer.concat([state.buffer, chunk]);
  });

  const initId = 1;
  child.stdin.write(
    encodeLspMessage({
      jsonrpc: '2.0',
      id: initId,
      method: 'initialize',
      params: {
        processId: process.pid,
        rootUri: pathToFileURL(root).href,
        capabilities: {},
      },
    }),
  );

  await waitForResponse(state, initId);

  child.stdin.write(
    encodeLspMessage({ jsonrpc: '2.0', method: 'initialized', params: {} }),
  );

  const shutdownId = 2;
  child.stdin.write(
    encodeLspMessage({
      jsonrpc: '2.0',
      id: shutdownId,
      method: 'shutdown',
      params: null,
    }),
  );

  await waitForResponse(state, shutdownId);

  child.stdin.write(
    encodeLspMessage({ jsonrpc: '2.0', method: 'exit', params: null }),
  );

  await new Promise(resolve => setTimeout(resolve, 100));
  child.kill();
  process.stdout.write('OK\n');
}

runProbe().catch(error => {
  console.error(error.stack || String(error));
  process.exit(1);
});
