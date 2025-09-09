# Custom Transformer Example

Custom log format processing with transformer and configuration.

## Usage

```bash
./run.sh
# or
node ../../dist/cli.js custom-format.json --transformer transformer.ts --config agui.config.ts --dump-transformed
```

## Files

- `custom-format.json` - Custom log format with `{"logs": [...]}` structure
- `transformer.ts` - Converts custom format to `AgentEventStream.Event[]`
- `agui.config.ts` - UI customization with `defineConfig`

Transformer handles tool call ID matching and proper event conversion. Use `--dump-transformed` to debug transformation output.
