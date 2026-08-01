# Firebase instrumentation and storage

Use this reference for every Firebase instrumentation task.

## Trusted runtime boundary

`createFirebaseSpanExporter()` uses Firebase Admin and must run in trusted server code such as Cloud Functions for Firebase or another Node.js server with Firebase Admin credentials. Never add it to web, mobile, or other client bundles.

If the repository has no trusted server runtime, stop and ask whether the user wants to add one. Do not work around the boundary with client credentials.

## Default Firebase app

The exporter derives the project ID and storage bucket from the default Firebase Admin app. Reuse the project's existing initialization whenever possible:

```ts
import { createFirebaseSpanExporter } from "@agentpond/firebase";

const exporter = createFirebaseSpanExporter();
```

Add `initializeApp()` only when the server has no default app initialization. When a shared module genuinely needs defensive initialization, check the default app specifically:

```ts
import { getApp, initializeApp } from "firebase-admin/app";

try {
  getApp();
} catch {
  initializeApp();
}
```

Do not use `getApps().length` for this decision. A named app can exist while the required default app is absent.

## OpenTelemetry provider

Inspect the installed OpenTelemetry version and existing provider before editing. Add the exporter to the existing provider rather than registering another global provider.

When no provider exists, a typical Node SDK shape is:

```ts
import { createFirebaseSpanExporter } from "@agentpond/firebase";
import { NodeSDK } from "@opentelemetry/sdk-node";

const sdk = new NodeSDK({
  traceExporter: createFirebaseSpanExporter(),
  instrumentations: [
    // Add the integration selected for the detected AI SDK or framework.
  ],
});

sdk.start();
```

NodeSDK wraps `traceExporter` in a `BatchSpanProcessor`, so each exporter invocation can contain multiple spans and AgentPond writes one object per exported batch. When constructing a provider manually or tuning queue and batch settings, create a `BatchSpanProcessor` explicitly instead. Do not use `SimpleSpanProcessor` for normal production export because it invokes the exporter separately for every ended span.

Adapt the construction to the installed SDK API and project lifecycle. Initialize the module before instrumented clients. Force-flush at a real lifecycle boundary when required so queued batches finish exporting; do not shut down a reusable Functions instance after every request.

## Storage Rules review

AgentPond writes trace objects below `agentpond/` in the Firebase Storage bucket. Firebase Admin access from the exporter and local CLI is trusted and bypasses Firebase client Storage Rules. Client SDKs must not be able to read, list, create, update, or delete those objects.

1. Read `firebase.json` and locate every configured Storage Rules file.
2. Review every `match` and `allow` expression that can overlap `agentpond/**`, including recursive wildcard rules.
3. Remember that Firebase Rules are allow-only. If any overlapping allow condition evaluates to true, access is granted.
4. A nested block such as this is not a deny override:

```rules
match /agentpond/{allPaths=**} {
  allow read, write: if false;
}
```

5. If no allow matches `agentpond/**`, leave the default-deny rules unchanged.
6. If a broad allow matches the prefix, report a blocker. Narrow the broad match to application-owned prefixes or change its actual condition so AgentPond objects are excluded. Base the edit on the repository's rule structure; do not invent a universal exclusion snippet.
7. When the emulator and Rules tests are configured, add or run tests proving representative authenticated and unauthenticated client requests cannot access `agentpond/**` while intended application paths still work.

Do not declare setup complete while a broad client allow still exposes AgentPond trace data.

## Firebase project selection and verification

Select the Firebase project through AgentPond, which delegates to Firebase's
active-project selection:

```bash
npx agentpond env use <alias-or-project-id>
npx agentpond sync
npx agentpond traces list --limit 10
```

Confirm the active project at any time with `npx agentpond env current`.

AgentPond manual environment operations (`get`, `list`, and `init`) and the
local testing server are unavailable for Firebase projects. Use `env use` and
the Firebase runtime instead.
