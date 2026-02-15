# AGENTS: multimodal/omni-tars

## OVERVIEW
Omni-TARS variant stack with `core`, `gui-agent`, `mcp-agent`, `omni-agent`, and `code-agent` packages.

## WHERE TO LOOK
- Core parsing/tool-call logic: `core/src/*`, tests in `core/test/*`
- GUI-facing runtime: `gui-agent/*`
- MCP-based runtime: `mcp-agent/*`
- Top-level orchestration: `omni-agent/*`, `code-agent/*`

## CONVENTIONS
- Keep parser/streaming utilities in core utility folders.
- Add tests for parser and tool-call engine behavior before expanding agent capabilities.
- Reuse shared contracts between agents instead of package-specific variants.

## ANTI-PATTERNS
- Do not split protocol definitions across unrelated files/packages.
- Do not skip regression tests for streaming parser changes.
- Do not hardcode provider assumptions in multi-agent layers.

## COMMANDS
```bash
cd multimodal/omni-tars
pnpm -r test
pnpm -r build
```

## HANDOFF
- For parser protocol updates, document impact across `core`, `mcp-agent`, and `omni-agent`.
- Keep regression tests for streaming/parser behavior aligned with any format change.
