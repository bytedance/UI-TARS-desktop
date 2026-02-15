# AGENTS: multimodal/websites

## OVERVIEW
Website/documentation subtree for multimodal products (`docs`, `main`, `tarko`) with localized content and site-specific build flows.

## WHERE TO LOOK
- Docs site content and navigation: `docs/*`
- Main website rendering and components: `main/*`
- Tarko website docs/content: `tarko/*`
- Shared static assets and public resources: each site `public/*`

## CONVENTIONS
- Keep localized docs synchronized when changing shared guidance.
- Keep site-specific config/build logic inside each website package.
- Prefer updating source markdown/MDX/docs files instead of generated outputs.

## ANTI-PATTERNS
- Do not hardcode product behavior docs that diverge from runtime packages.
- Do not duplicate shared copy across sites without a clear owner.
- Do not edit generated site artifacts directly.

## COMMANDS
```bash
cd multimodal/websites/docs && pnpm install && pnpm build
cd multimodal/websites/main && pnpm install && pnpm build
cd multimodal/websites/tarko && pnpm install && pnpm build
```

## HANDOFF
- If API/behavior docs change, link the source package/PR in doc updates.
- Keep per-site README and navigation metadata aligned with content changes.
