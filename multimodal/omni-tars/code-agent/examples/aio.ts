import { AioClient } from '../src/tools/AioFetch';

async function main() {
  const client = new AioClient({
    baseUrl: process.env.AIO_SANDBOX_URL!,
  });

  const c = await client.shellExecWithPolling({
    command: 'ls -al',
  });

  console.log(c);

  const p = await client.fileEditor({
    command: 'create',
    path: '/home/gem/tmp/hello_world.py',
    file_text: 'print("Hello, World!")\n',
  });

  console.log(p);
}

main();
