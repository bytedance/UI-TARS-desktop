import { AioClient } from '../src/tools/AioFetch';

async function main() {
  const client = new AioClient({
    baseUrl: process.env.AIO_SANDBOX_URL!,
  });

  const c = await client.shellExecWithPolling({
    command: 'ls -al',
  });

  console.log(c);
}

main();
