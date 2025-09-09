# AGUI CLI Examples - Dump

This directory contains examples for testing the `agui` CLI dump functionality.

## Files

### Trace Files
- `trace.json` - Standard JSON format with calculator demo events
- `trace.jsonl` - JSONL format with weather demo events
- `custom-format.json` - Custom log format for transformer demo

### Configuration
- `agui.config.ts` - Example configuration with custom session info and UI settings
- `transformer.ts` - Example transformer for converting custom log format (TypeScript)
- `transformer.js` - Example transformer for converting custom log format (JavaScript)

## Usage Examples

### Basic Usage
```bash
# Generate HTML from JSON trace
agui trace.json

# Generate HTML from JSONL trace
agui trace.jsonl

# Specify output path
agui trace.json --out calculator-demo.html
```

### With Configuration
```bash
# Use custom config (agui.config.ts will be auto-detected)
agui trace.json

# Specify config explicitly
agui trace.json --config agui.config.ts
```

### With Transformer
```bash
# Convert custom format using transformer (TypeScript - recommended)
agui custom-format.json --transformer transformer.ts

# Convert custom format using transformer (JavaScript)
agui custom-format.json --transformer transformer.js

# With both transformer and config
agui custom-format.json --transformer transformer.ts --config agui.config.ts
```

### Combined Examples
```bash
# Full example with all options
agui custom-format.json \
  --transformer transformer.ts \
  --config agui.config.ts \
  --out currency-converter-demo.html
```

## Expected Output

All commands will generate HTML files that can be opened in a browser to view the agent execution replay with:
- Interactive event timeline
- Tool call details
- Agent thinking process
- Custom UI configuration (title, logo, etc.)

## Testing the Examples

From the `examples/dump` directory:

```bash
# Test basic JSON format
agui trace.json --out test-json.html

# Test JSONL format
agui trace.jsonl --out test-jsonl.html

# Test TypeScript transformer
agui custom-format.json --transformer transformer.ts --out test-ts-transformer.html

# Test JavaScript transformer
agui custom-format.json --transformer transformer.js --out test-js-transformer.html

# Test with full configuration
agui trace.json --config agui.config.ts --out test-config.html
```
