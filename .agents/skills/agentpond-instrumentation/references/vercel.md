# Vercel instrumentation and Blob storage

Use this reference for every Vercel instrumentation task.

## Trusted runtime boundary

`createVercelSpanExporter()` must run in trusted Node.js server code such as a Vercel Function or a Next.js Node.js route or server action. Never add it to browser or client bundles, Routing Middleware, Edge Runtime code, or static builds. Do not create an AgentPond ingestion route; the exporter writes directly to Vercel Blob.

## Link and provision

During read-only analysis, inspect `.vercel/project.json` and existing Blob connections without changing them. After explicit confirmation:

1. Confirm Vercel CLI version 50.20 or newer with `vercel --version`.
2. Run `vercel link` only when the intended app is not linked.
3. Inspect the project's Storage tab in the Vercel dashboard and identify connected Vercel Blob stores. Reuse the sole connected private store; it may also hold application data because AgentPond stays below `agentpond/`. Do not use `vercel integration list` for this check because it omits native Blob stores.
4. If no store is connected, create one with `vercel blob create-store agentpond --access private`. If multiple private stores are connected, ask which to use. Never use a public store for traces.
5. Ensure the store is connected to every Vercel target that should export or be queried. If a target lacks the connection, direct the user to connect it in the Vercel dashboard before continuing.

Do not save the provider choice in `.agentpond/`. The linked Vercel project is
authoritative, and `npx agentpond env use <target>` stores the selected target in
`.vercel/agentpond.json`.

## Direct span exporter

Install `@agentpond/vercel` in the trusted server package. Confirm that the Vercel project setting for access to System Environment Variables is enabled so `VERCEL_PROJECT_ID` and `VERCEL_TARGET_ENV` are available at runtime. The connected Blob integration supplies a read-write token or store ID plus OIDC credentials:

```ts
import { createVercelSpanExporter } from "@agentpond/vercel";
import { NodeSDK } from "@opentelemetry/sdk-node";

const sdk = new NodeSDK({
  traceExporter: createVercelSpanExporter(),
  instrumentations: [
    // Add the integration selected for the detected AI SDK or framework.
  ],
});

sdk.start();
```

The exporter resolves `VERCEL_PROJECT_ID` and `VERCEL_TARGET_ENV`, falling back to `VERCEL_ENV` for the target. It writes to:

```text
agentpond/otel/<vercel-project-id>-<target>/...
```

Targets are exact Vercel target names: `production`, `preview`, `development`, or a custom target such as `staging`. All preview branches share the `preview` partition.

NodeSDK batches spans. If the request lifecycle requires an explicit flush, construct and retain an explicit `BatchSpanProcessor`, then call its `forceFlush()` from Next.js `after()` or Vercel `waitUntil()`. Attach the promise without blocking the response, handle rejection through the application's logging conventions, and do not shut down the module-level provider after each request.

## Verification

Run one real request on each target in scope, then query that exact target:

```bash
npx agentpond sync
npx agentpond traces list --limit 10

npx agentpond env use staging
npx agentpond sync
npx agentpond traces list --limit 10
```

No selection means `production`; `--env` overrides the selected target for one
command. Use `vercel target list --format json` to discover built-in and custom
Vercel targets. AgentPond manual environment initialization and its local
testing server are unavailable in Vercel projects. Confirm that the trace
appears only under the linked project and selected target.
