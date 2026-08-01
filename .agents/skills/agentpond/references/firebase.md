# Firebase data access

Use this reference only for Firebase-backed AgentPond data.

AgentPond detects the Firebase root from `.firebaserc` or `firebase.json`.
Select a Firebase alias or project ID through AgentPond:

```bash
npx agentpond env use <alias-or-project-id>
npx agentpond env current
npx agentpond sync
npx agentpond traces list --limit 10
```

`env use` delegates to the Firebase CLI, so Firebase and AgentPond share the
same active project. The selected project ID identifies both the remote Storage
data and the local cache. To inspect another alias or project ID without
changing that selection, override it for one command:

```bash
npx agentpond --env staging sync
npx agentpond --env staging traces list --limit 10
```

Do not initialize AgentPond environment files for Firebase projects.

AgentPond manual environment operations (`get`, `list`, and `init`) and the
local testing server are unavailable in Firebase projects. Run the application
with Firebase and export spans directly to Firebase Storage.

If AgentPond cannot resolve the default project, run
`npx agentpond env use <alias-or-project-id>` from inside the Firebase project.
