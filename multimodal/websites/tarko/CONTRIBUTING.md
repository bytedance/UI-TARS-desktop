# Contributing to Tarko Documentation

This guide helps contributors understand how Tarko documentation maps to source code and how to maintain accurate documentation.

## Documentation Structure

The Tarko documentation follows this structure:

```
multimodal/websites/tarko/docs/
├── en/                          # English documentation
│   ├── guide/
│   │   ├── get-started/         # Getting started guides
│   │   ├── basic/              # Basic concepts
│   │   ├── advanced/           # Advanced features
│   │   ├── ui-integration/     # UI integration guides
│   │   └── deployment/         # Deployment guides
│   ├── api/                    # API reference
│   └── examples/               # Code examples
└── zh/                         # Chinese documentation (mirrors en/)
```

## Source Code Mapping

This section maps each documentation page to its corresponding source code:

### Core Package: `@tarko/agent`

**Source:** `multimodal/tarko/agent/`

| Documentation | Source Code | Description |
|---------------|-------------|-------------|
| `/guide/get-started/sdk.mdx` | `src/agent/agent.ts` | Main Agent class API |
| `/guide/basic/tool-call-engine.mdx` | `src/tool-call-engine/` | Tool call engines |
| `/guide/basic/event-stream.mdx` | `src/agent/event-stream.ts` | Event stream processor |
| `/guide/advanced/agent-hooks.mdx` | `src/agent/base-agent.ts` | Agent hooks implementation |
| `/guide/advanced/context-engineering.mdx` | `src/agent/message-history.ts` | Context management |
| `/api/agent.mdx` | `src/index.ts` | Main exports and interfaces |

**Key Files:**
- `src/agent/agent.ts` - Main Agent class (constructor, run(), methods)
- `src/agent/base-agent.ts` - Base class with hooks
- `src/agent/tool-manager.ts` - Tool registration and management
- `src/agent/agent-runner.ts` - Execution logic
- `src/tool-call-engine/` - Tool call engines
- `examples/` - Real usage examples

### Agent Interface: `@tarko/agent-interface`

**Source:** `multimodal/tarko/agent-interface/`

| Documentation | Source Code | Description |
|---------------|-------------|-------------|
| `/api/agent.mdx` | `src/agent.ts` | IAgent interface |
| `/api/tool-call-engine.mdx` | `src/tool-call-engine.ts` | Tool call engine interfaces |
| `/guide/basic/event-stream.mdx` | `src/agent-event-stream.ts` | Event stream types |

### Model Provider: `@tarko/model-provider`

**Source:** `multimodal/tarko/model-provider/`

| Documentation | Source Code | Description |
|---------------|-------------|-------------|
| `/guide/basic/model-provider.mdx` | `src/` | Model provider implementations |

### Agent Server: `@tarko/agent-server`

**Source:** `multimodal/tarko/agent-server/`

| Documentation | Source Code | Description |
|---------------|-------------|-------------|
| `/guide/deployment/server.mdx` | `src/` | Server implementation |
| `/guide/advanced/agent-protocol.mdx` | `src/` | Protocol definitions |

### Agent CLI: `@tarko/agent-cli`

**Source:** `multimodal/tarko/agent-cli/`

| Documentation | Source Code | Description |
|---------------|-------------|-------------|
| `/guide/deployment/cli.mdx` | `src/` | CLI implementation |

## Documentation Guidelines

### 1. Code Examples Must Be Real

❌ **Don't** write fictional examples:
```typescript
// This doesn't exist in the codebase
const agent = new Agent({
  provider: 'fictional-provider',
  model: 'fake-model'
});
```

✅ **Do** use examples from the actual codebase:
```typescript
// From multimodal/tarko/agent/examples/tool-calls/basic.ts
const agent = new Agent({
  model: {
    provider: 'volcengine',
    id: 'ep-20250510145437-5sxhs',
    apiKey: process.env.ARK_API_KEY,
  },
  tools: [locationTool, weatherTool],
  logLevel: LogLevel.DEBUG,
});
```

### 2. API Documentation Must Match Interfaces

Always check the actual TypeScript interfaces:

```typescript
// Check multimodal/tarko/agent-interface/src/agent-options.ts
interface AgentOptions {
  instructions?: string;
  name?: string;
  // ... actual properties
}
```

### 3. Keep Examples Updated

When source code changes, update documentation:

1. Check if examples in `multimodal/tarko/agent/examples/` still work
2. Update documentation to match new API
3. Test examples before committing

### 4. Link to Source Code

When documenting features, link to the actual implementation:

```markdown
## Agent Hooks

Agent hooks are implemented in [`base-agent.ts`](https://github.com/bytedance/UI-TARS-desktop/blob/main/multimodal/tarko/agent/src/agent/base-agent.ts).
```

## Validation Process

### Before Writing Documentation

1. **Read the source code** in the corresponding package
2. **Run the examples** to ensure they work
3. **Check TypeScript interfaces** for accurate API documentation
4. **Look at tests** for usage patterns

### Documentation Checklist

- [ ] Code examples are from actual source code
- [ ] API documentation matches TypeScript interfaces
- [ ] Links to source code are correct
- [ ] Examples can be copy-pasted and run
- [ ] All imports are correct
- [ ] Environment variables are documented

### Testing Documentation

```bash
# Test that examples work
cd multimodal/tarko/agent/examples/tool-calls
npx tsx basic.ts

# Test streaming example
cd ../streaming
npx tsx tool-calls.ts

# Build documentation
cd ../../../websites/tarko
npm run build
```

## Common Patterns

### Code Example Template

```markdown
## Feature Name

### Basic Usage

```typescript
// From multimodal/tarko/agent/examples/[example-file].ts
import { Agent, Tool, z } from '@tarko/agent';

// Real example code here
```

### Advanced Usage

```typescript
// More complex example
```

**Source:** [`multimodal/tarko/agent/examples/[example-file].ts`](link-to-github)
```

### API Reference Template

```markdown
## Method Name

### Signature

```typescript
// Copy from actual TypeScript interface
method(param: Type): ReturnType
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| param | Type | Description from source |

### Example

```typescript
// Real example from codebase
```

**Implementation:** [`src/path/to/file.ts`](link-to-github)
```

## Updating Documentation

### When Source Code Changes

1. **Identify affected documentation** using the mapping table above
2. **Update examples** to match new API
3. **Update type definitions** if interfaces changed
4. **Test all examples** to ensure they still work
5. **Update version numbers** if needed

### Adding New Features

1. **Add source code mapping** to this guide
2. **Create documentation** following the templates above
3. **Add examples** based on actual usage
4. **Update navigation** in `_meta.json` files

## Review Process

### For Documentation PRs

1. **Verify code examples work** by running them
2. **Check source code links** are correct
3. **Ensure API documentation matches** TypeScript interfaces
4. **Test documentation build** succeeds
5. **Review for accuracy** against actual implementation

### For Code PRs Affecting Documentation

1. **Update corresponding documentation** pages
2. **Fix broken examples** if API changed
3. **Update type definitions** if interfaces changed
4. **Test documentation build** after changes

## Tools and Scripts

### Useful Commands

```bash
# Find all references to a class/method in documentation
grep -r "Agent" docs/

# Check if examples compile
cd multimodal/tarko/agent
npm run build

# Test specific example
npx tsx examples/tool-calls/basic.ts

# Build and test documentation
cd ../../websites/tarko
npm run build
npm run dev
```

### Validation Script

Create a script to validate documentation:

```bash
#!/bin/bash
# validate-docs.sh

echo "Testing Tarko agent examples..."
cd multimodal/tarko/agent

# Test each example
for example in examples/*/; do
  echo "Testing $example"
  cd "$example"
  if [ -f "*.ts" ]; then
    # Run TypeScript check
    npx tsc --noEmit *.ts
  fi
  cd ..
done

echo "Building documentation..."
cd ../../websites/tarko
npm run build

echo "Validation complete!"
```

## Contact

For questions about documentation:

- Create an issue in the repository
- Check existing documentation for patterns
- Refer to source code for ground truth

---

**Remember:** Documentation should always reflect the actual implementation, not aspirational features.
