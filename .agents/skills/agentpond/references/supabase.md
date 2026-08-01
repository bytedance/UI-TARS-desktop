# Supabase data access

Use this reference only for AgentPond data in Supabase Storage.

Run commands inside a Supabase project containing `supabase/config.toml`.
AgentPond reads the linked hosted project ref from
`supabase/.temp/project-ref`. Link or persist another hosted project through
AgentPond:

```bash
npx agentpond env use <project-ref>
npx agentpond env current
npx agentpond sync
npx agentpond traces list --limit 10
```

`env use` delegates to `supabase link --project-ref <project-ref>`, so Supabase
and AgentPond share the same link. A branch is selected through its distinct
Supabase project ref. To inspect another hosted project or branch without
changing the persisted link, override it for one command:

```bash
npx agentpond --env <project-ref> sync
npx agentpond --env <project-ref> traces list --limit 10
```

AgentPond reads the dedicated private `agentpond` bucket. Objects for each
hosted project are isolated below:

```text
otel/<project-ref>/...
```

AgentPond manual environment operations (`get`, `list`, and `init`) and the
local testing server are unavailable in Supabase projects. If access fails,
confirm the project is hosted, `supabase login` has access to it, the project is
linked, and the `agentpond` bucket exists and is private.
