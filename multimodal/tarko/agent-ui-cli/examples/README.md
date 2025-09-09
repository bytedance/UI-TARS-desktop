# AGUI CLI Examples

This directory contains comprehensive examples demonstrating different ways to use the AGUI CLI tool.

## Available Examples

### 1. Basic JSON Format (`basic-json/`)

**What it demonstrates:**
- Standard JSON format processing
- Calculator agent with Jupyter tool calls
- Basic HTML generation

**Quick start:**
```bash
cd basic-json/
./run.sh
```

**Use case:** When you have trace data in the standard `{"events": [...]}` JSON format.

---

### 2. JSONL Format (`jsonl-format/`)

**What it demonstrates:**
- JSONL (JSON Lines) format auto-detection
- Streaming-friendly format processing
- Same agent behavior, different input format

**Quick start:**
```bash
cd jsonl-format/
./run.sh
```

**Use case:** When you have streaming logs or line-based JSON event files.

---

### 3. Custom Transformer (`custom-transformer/`)

**What it demonstrates:**
- Custom log format transformation
- TypeScript transformer with `defineTransformer`
- Custom UI configuration with `defineConfig`
- Debug output with `--dump-transformed`
- Multi-tool agent (calculator + weather)

**Quick start:**
```bash
cd custom-transformer/
./run.sh
```

**Use case:** When you have custom log formats that need transformation to AgentEventStream events.

## Example Comparison

| Feature | Basic JSON | JSONL Format | Custom Transformer |
|---------|------------|--------------|--------------------|
| **Input Format** | Standard JSON | JSONL | Custom format |
| **Transformer** | ❌ Not needed | ❌ Not needed | ✅ Required |
| **Configuration** | ❌ Optional | ❌ Optional | ✅ Included |
| **Debug Output** | ❌ Not shown | ❌ Not shown | ✅ `--dump-transformed` |
| **Complexity** | 🟢 Simple | 🟢 Simple | 🟡 Advanced |
| **Agent Type** | Calculator | Calculator | Calculator + Weather |
| **Use Case** | Standard traces | Streaming logs | Custom formats |

## Getting Started

### Prerequisites

Make sure you have the AGUI CLI installed:

```bash
npm install @tarko/agent-ui-cli
```

### Running Examples

Each example directory contains:
- **`run.sh`** - One-click startup script
- **`README.md`** - Detailed documentation
- **Trace files** - Sample data
- **Config files** - (where applicable)

### One-Click Execution

```bash
# Run all examples
for dir in basic-json jsonl-format custom-transformer; do
  echo "Running $dir example..."
  cd $dir && ./run.sh && cd ..
  echo "---"
done
```

## Learning Path

### 1. Start with Basic JSON
Understand the fundamental concepts:
- How AGUI CLI processes standard trace files
- What the generated HTML looks like
- Basic command-line usage

### 2. Try JSONL Format
Learn about format flexibility:
- How file extension detection works
- When to use JSONL vs JSON
- Format conversion concepts

### 3. Explore Custom Transformer
Master advanced features:
- Writing custom transformers
- Configuring UI appearance
- Debugging transformation issues
- Handling complex tool call scenarios

## Common Commands

```bash
# Basic usage
agui trace.json

# With custom output
agui trace.json --out my-demo.html

# With transformer
agui custom-format.json --transformer transformer.ts

# With configuration
agui trace.json --config agui.config.ts

# Debug transformer
agui custom-format.json --transformer transformer.ts --dump-transformed

# Full options
agui custom-format.json \
  --transformer transformer.ts \
  --config agui.config.ts \
  --out demo.html \
  --dump-transformed
```

## File Structure

```
examples/
├── README.md                    # This file
├── basic-json/
│   ├── README.md               # Basic JSON documentation
│   ├── run.sh                  # Startup script
│   └── trace.json              # Standard JSON trace
├── jsonl-format/
│   ├── README.md               # JSONL documentation
│   ├── run.sh                  # Startup script
│   └── trace.jsonl             # JSONL trace
└── custom-transformer/
    ├── README.md               # Transformer documentation
    ├── run.sh                  # Startup script
    ├── custom-format.json      # Custom log format
    ├── transformer.ts          # TypeScript transformer
    └── agui.config.ts          # UI configuration
```

## Output Files

After running examples, you'll see:

```
# Generated HTML files
basic-json/basic-json-demo.html
jsonl-format/jsonl-demo.html
custom-transformer/custom-transformer-demo.html

# Debug output (custom-transformer only)
custom-transformer/custom-format-transformed.json
```

## Troubleshooting

### Permission Issues
```bash
# Make scripts executable
chmod +x */run.sh
```

### CLI Not Found
```bash
# Install AGUI CLI
npm install -g @tarko/agent-ui-cli

# Or use npx
npx @tarko/agent-ui-cli trace.json
```

### Transformer Errors
- Check the debug output with `--dump-transformed`
- Verify TypeScript syntax in transformer files
- Ensure tool call IDs match between calls and results

## Next Steps

1. **Explore the generated HTML files** - Open them in your browser
2. **Modify the examples** - Try changing configurations or trace data
3. **Create your own transformer** - Use the custom-transformer as a template
4. **Read the main README** - See the full CLI documentation

For more details, see the main [AGUI CLI README](../README.md).
