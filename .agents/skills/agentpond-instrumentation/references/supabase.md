# Supabase instrumentation and Storage

Use this reference for every Supabase instrumentation task. Version 1 supports
hosted Supabase projects and their branch project refs; do not document local
Docker or self-hosted Supabase as verified paths.

## Trusted runtime boundary

`createSupabaseSpanExporter()` requires a modern Supabase secret key or a
legacy `service_role` key. It may run in Supabase Edge Functions or in a
trusted Node.js backend. Never add it to browser, mobile, or other client code,
and never expose its key through public environment variables or responses.

Supabase Edge Functions provide `SUPABASE_URL` and `SUPABASE_SECRET_KEYS` as
built-in secrets. The exporter reads `SUPABASE_SECRET_KEYS.default`; it also
accepts `SUPABASE_SECRET_KEY` and temporarily supports
`SUPABASE_SERVICE_ROLE_KEY`. Node backends must receive the same values through
server-only secret configuration.

## Dedicated private bucket

During read-only analysis, inspect `supabase/config.toml`, migrations, and the
Storage bucket list without changing them. After explicit confirmation, create
or reuse a dedicated private bucket named `agentpond`. A migration can make the
requirement reproducible:

```sql
insert into storage.buckets (id, name, public)
values ('agentpond', 'agentpond', false)
on conflict (id) do update set public = false;
```

Do not share an application bucket. AgentPond writes directly below:

```text
otel/<project-ref>/...
```

Private buckets are not an unconditional deny. Supabase Storage still applies
RLS policies on `storage.objects` to authenticated Storage API requests. Review
every migration and dashboard-created policy whose `using` or `with check`
condition can match `bucket_id = 'agentpond'`, including broad policies that
do not constrain `bucket_id`. Narrow or remove policies that grant application
roles access to this bucket, and add database tests when the project already
tests Storage policies. The exporter and CLI use secret/service-role access;
do not weaken RLS to make them work.

## Supabase Edge Functions

Install `@agentpond/supabase`, `@opentelemetry/api`, and
`@opentelemetry/sdk-trace-base` plus the matching OpenInference integration.
Reuse an existing provider when present. Otherwise, the explicit Edge shape is:

```ts
import { createSupabaseSpanExporter } from "npm:@agentpond/supabase";
import { trace } from "npm:@opentelemetry/api";
import {
  BasicTracerProvider,
  BatchSpanProcessor,
} from "npm:@opentelemetry/sdk-trace-base";

const exporter = createSupabaseSpanExporter();
const processor = new BatchSpanProcessor(exporter);
const provider = new BasicTracerProvider({
  spanProcessors: [processor],
});
trace.setGlobalTracerProvider(provider);

Deno.serve(async (request) => {
  const response = await handleRequest(request);
  EdgeRuntime.waitUntil(processor.forceFlush());
  return response;
});
```

Register OpenInference instrumentation before constructing AI clients. Attach
the flush promise with `EdgeRuntime.waitUntil()` so the response can return
while the runtime keeps the batch alive. Handle rejections through the
function's logging conventions. Do not shut down the module-level provider
after every request.

## Trusted Node.js backends

Keep Supabase secrets in server-only environment configuration. NodeSDK uses a
batch processor for `traceExporter`:

```ts
import { createSupabaseSpanExporter } from "@agentpond/supabase";
import { NodeSDK } from "@opentelemetry/sdk-node";

const sdk = new NodeSDK({
  traceExporter: createSupabaseSpanExporter(),
  instrumentations: [
    // Add the integration selected for the detected AI SDK or framework.
  ],
});

sdk.start();
```

For short-lived jobs, force-flush at the real lifecycle boundary. Do not send a
Supabase secret key to a browser even if the `agentpond` bucket is private.

## Linking, verification, and troubleshooting

Link the hosted project and verify a real request:

```bash
supabase login
npx agentpond env use <project-ref>
npx agentpond env current
npx agentpond sync
npx agentpond traces list --limit 10
```

AgentPond asks the Supabase CLI for a default modern secret or legacy
`service_role` key while resolving storage. It captures the CLI output only in
memory and never prints or persists it. Use a stateless override for another
hosted project or branch:

```bash
npx agentpond --env <branch-project-ref> sync
npx agentpond --env <branch-project-ref> traces list --limit 10
```

If setup fails, confirm `supabase/.temp/project-ref` contains the expected
20-letter ref, the CLI account can access that project, the `agentpond` bucket
exists and is private, no application RLS policy exposes it, the trusted code
has a secret/service-role key, the batch was flushed, and the query used the
same project ref.
