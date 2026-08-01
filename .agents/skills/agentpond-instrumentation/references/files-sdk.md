# Files SDK direct export

Use this workflow when the project is not managed by Firebase, Supabase, or
Vercel. It applies only to trusted Node.js services; never load object-storage
credentials or the exporter in browser, client, middleware, or static code.

## Analyze before setup

Inspect the service, existing OpenTelemetry provider, package manager, AI SDKs,
start command, and current AgentPond environments. Run `npx agentpond env list`
before proposing storage changes. Do not replace an existing environment file.

For a new setup, propose a dependency-free local verification environment. Add
`.agentpond/` to the repository's ignore file if it is not already ignored.
After the user confirms implementation, resolve the absolute project root and
run:

```bash
npx agentpond env init local \
  --provider fs \
  --root <absolute-project-root>/.agentpond/envs/local/objects
npx agentpond env use local
```

If `local` already exists, inspect it with `npx agentpond env get local`. Reuse
it only when it is a valid `fs` environment for this project; otherwise report
the conflict and ask before choosing another name or editing it.

## Instrument the trusted runtime

Install `@agentpond/files-sdk`, `@agentpond/otel`, `files-sdk`, the existing
OpenTelemetry runtime packages, and the appropriate OpenInference
instrumentation. Use one centralized server-only instrumentation module:

```ts
import { createFilesSpanExporterFromRuntimeEnv } from "@agentpond/files-sdk/otel";
import { NodeSDK } from "@opentelemetry/sdk-node";

const sdk = new NodeSDK({
  traceExporter: createFilesSpanExporterFromRuntimeEnv(),
  instrumentations: [/* matching OpenInference instrumentations */],
});

sdk.start();
```

Load the selected environment into the application process rather than copying
the filesystem root into source code:

```bash
eval "$(npx agentpond env get local)"
```

Start the application from that shell, exercise one real AI request, and flush
at the application's real lifecycle boundary.

## Verify and hand off to production

```bash
npx agentpond env use local
npx agentpond sync
npx agentpond traces list --limit 10
npx agentpond traces get <trace-id>
```

Confirm model or LLM spans, important CHAIN and TOOL spans, parent-child
relationships, inputs and outputs allowed by the privacy policy, and
`session.id` where applicable.

The `fs` adapter is persistent across local processes but is for development
and verification only. After the trace is verified, tell the user to choose a
production adapter from the [Files SDK provider catalog](https://files-sdk.dev/docs/providers).
Install its peer SDK. If the current CLI does not offer that compatible
adapter, install `agentpond` locally alongside the peer SDK so `npx` uses the
project-local CLI. Initialize a separate environment with
`npx agentpond env init production --provider <provider>` and its typed flags,
and supply credentials through the runtime environment. Keep
`createFilesSpanExporterFromRuntimeEnv()` in application code so changing
storage requires environment configuration rather than another code change.

For Azure Blob Storage, install `@azure/storage-blob`, initialize with
`npx agentpond env init production --provider azure --container <container>`,
and provide `AZURE_STORAGE_CONNECTION_STRING` or the matching
`AZURE_STORAGE_ACCOUNT_NAME` and `AZURE_STORAGE_ACCOUNT_KEY` variables to both
the trusted application runtime and AgentPond CLI shell.
