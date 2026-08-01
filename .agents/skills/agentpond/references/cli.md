# AgentPond data-access CLI

Run AgentPond through `npx` unless it is installed globally.

## Select data

Use the provider-specific reference for Firebase, Supabase, or Vercel. Environment
selection uses the same commands for every provider:

```bash
npx agentpond env current
npx agentpond env use <environment>
npx agentpond --env staging sync
```

`env use` persists through the detected provider. `--env` overrides that
selection for one command. The provider-specific meaning and persistence are
documented in the Firebase, Supabase, and Vercel references. Sync before querying when
recent data matters.

When multiple provider markers are present, use `--platform firebase`,
`--platform supabase`, or `--platform vercel` on each AgentPond command. This
override is stateless and does not create provider-choice state:

```bash
npx agentpond env current --platform supabase
npx agentpond sync --platform supabase
```

For manually configured Files SDK deployments, `env list`, `env init`, and
`env get` manage Files SDK-backed AgentPond environment files. Those manual
operations and the local testing server are unavailable when AgentPond detects
Firebase, Supabase, or Vercel.

Select and sync an existing Files SDK environment:

```bash
npx agentpond env use production
npx agentpond sync
```

The environment file stores `FILES_SDK_PROVIDER` plus the selected adapter's
typed configuration: `AGENTPOND_FILES_BUCKET`,
`AGENTPOND_FILES_CONTAINER`, `AGENTPOND_FILES_NAMESPACE`,
`AGENTPOND_FILES_STORE_NAME`, `FILES_SDK_ENDPOINT`, `FILES_SDK_REGION`, or
`FILES_SDK_ROOT`. `env init` exposes the matching `--bucket`, `--container`,
`--endpoint`, `--namespace`, `--region`, `--root`, and `--store-name` flags. It
does not store credentials. Run AgentPond with the selected provider's
credential variables available in the process environment. Keep
`AGENTPOND_PROJECT_ID` and `AGENTPOND_PREFIX` identical to the application
runtime; `default-project` and an empty prefix are the defaults. Memory,
Bun-only, unknown, malformed, and unsupported adapter configurations are
rejected. The CLI also rejects adapters whose peer SDKs it cannot resolve.

Azure Blob uses Files SDK's `AZURE_STORAGE_*` variables. Netlify runtimes detect
their site and token automatically; external runtimes use `NETLIFY_SITE_ID` and
`NETLIFY_API_TOKEN`. Oracle Cloud uses `OCI_ACCESS_KEY_ID` and
`OCI_SECRET_ACCESS_KEY` HMAC Customer Secret Keys.

`env init` refuses to replace an existing environment file; edit that file
deliberately or initialize a different name.

`npx agentpond init` installs both AgentPond skills and prints either a
platform-specific or Files SDK coding-agent prompt. It does not initialize an
environment itself. Cancelling skill installation stops setup without printing
a success message or prompt.

## Query commands

```bash
npx agentpond sync
npx agentpond sync --json

npx agentpond traces list --limit 25
npx agentpond traces get <trace-id>
npx agentpond observations list --traceId <trace-id>

npx agentpond sessions list
npx agentpond sessions get <session-id>

npx agentpond scores list --traceId <trace-id>
npx agentpond scores list --observationId <observation-id>

npx agentpond sql "select * from traces limit 10"
npx agentpond sql "select * from scores where trace_id = '<trace-id>'" --json
```

Use JSON output when another tool needs to consume the result. Use focused commands for individual resources and SQL for aggregation, joins, time filtering, raw events, and cost analysis.
