# OpenAI Codex OAuth and Teach Mode

## Overview

This guide describes two desktop features:

- OpenAI Codex OAuth provider for model access with ChatGPT account auth.
- Teach Mode for recording reusable local skills with screenshots and optional replay actions.


## OpenAI Codex OAuth

### Supported Models

Current model list for the Codex OAuth provider:

- `gpt-5.1-codex`
- `gpt-5.1-codex-max`
- `gpt-5.1-codex-mini`
- `gpt-5.2`
- `gpt-5.2-codex`
- `gpt-5.3`
- `gpt-5.3-codex`

### Setup

1. Open `Settings` in the desktop app.
2. In `VLM Provider`, select `OpenAI Codex OAuth`.
3. Click `Connect` and complete browser login.
4. Confirm the provider status changes to connected.
5. Select a supported model and save settings.

### Transport Behavior

For Codex OAuth requests, desktop runtime applies:

- `Authorization: Bearer <oauth-access-token>`
- `chatgpt-account-id: <account-id-from-token>`
- `OpenAI-Beta: responses=experimental`
- `originator: codex_cli_rs`
- Responses API enabled with `store=false`
- `include: ["reasoning.encrypted_content"]`

### Security Notes

- OAuth tokens are stored in main process only.
- Tokens are encrypted using Electron safe storage when available.
- Renderer receives only auth status/identity metadata.
- Sensitive values are redacted in app logging.


## Teach Mode

### Workflow

Teach Mode is available from sidebar entry `Teach`:

1. Define skill name, goal, and optional plan.
2. Start training and capture each step screenshot.
3. Optionally add explanation, expected outcome, and replay action metadata.
4. Save skill to local skill library.

### Storage Format

Saved skills use versioned JSON and external assets:

- Skill file: `<userData>/skills/teach/<skill-id>.skill.json`
- Assets dir: `<userData>/skills/teach/assets/<skill-id>/`

Skill JSON schema (high level):

```json
{
  "version": 1,
  "id": "string",
  "name": "string",
  "goal": "string",
  "model": "string",
  "assetsDir": "assets/<skill-id>",
  "createdAt": "ISO date",
  "updatedAt": "ISO date",
  "steps": [
    {
      "id": "string",
      "title": "string",
      "capturedAt": "ISO date",
      "assetPath": "assets/<skill-id>/step-001.jpg",
      "actionType": "optional string",
      "actionInputs": {}
    }
  ]
}
```

### Library Actions

Skill library supports:

- list skills
- inspect skill details
- replay on local computer operator (action metadata required)
- export portable JSON
- import portable JSON
- delete skill and related assets


## Validation and Safety Scripts

Use these scripts from repository root:

```bash
node scripts/assert-no-secrets.js
node scripts/validate-skill-file.js scripts/fixtures/teach-skill/teach-demo.skill.json
```

- `assert-no-secrets.js`: scans source/docs for likely hardcoded secrets.
- `validate-skill-file.js`: validates skill schema and referenced asset files.
