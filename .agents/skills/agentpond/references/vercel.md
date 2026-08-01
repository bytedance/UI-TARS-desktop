# Vercel data access

Use this reference only for AgentPond data in Vercel Blob.

Run commands inside a project linked by `.vercel/project.json`. AgentPond uses the linked Vercel project ID plus the exact deployment target to isolate data in a shared private Blob store:

```text
agentpond/otel/<vercel-project-id>-<target>/...
```

The default target is `production`. Persist another exact target with `env use`:

```bash
npx agentpond env use staging
npx agentpond env current
npx agentpond sync
npx agentpond traces list --limit 10
```

Override the selected target for one command with `--env`:

```bash
npx agentpond --env preview sync
npx agentpond --env staging traces list --limit 10
```

Targets include `production`, `preview`, `development`, and project-defined custom targets such as `staging`. Preview deployments share one `preview` partition; AgentPond does not partition by branch. List available targets with:

```bash
vercel target list --format json
```

AgentPond manual environment operations (`get`, `list`, and `init`) and the
local testing server are unavailable in Vercel projects. Run the application on
Vercel and select the target with `env use` before sync and query commands.

AgentPond stores the linked project ID and selected target in the ignored
`.vercel/agentpond.json` file. `--env` does not change that file. AgentPond
temporarily pulls the effective target's Vercel environment, reads the connected
private Blob credentials, then removes the temporary file. A private Blob store
may be shared by multiple projects and application data because AgentPond writes
only below `agentpond/` and includes the project ID and target in its keys.

If access fails, confirm that the directory is linked with `vercel link`, the Blob store is private and connected to the selected target, and `vercel env pull --environment <target>` receives either a Blob read-write token or the store ID plus Vercel OIDC credentials.
