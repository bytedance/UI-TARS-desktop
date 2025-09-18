# Tarko Documentation Work Guide

This guide provides detailed mapping between documentation files and source code for maintaining accurate and up-to-date documentation.

## Quick Reference

### Core Packages Structure

```
multimodal/tarko/
├── agent/                    # @tarko/agent - Main agent framework
├── agent-interface/          # @tarko/agent-interface - Type definitions
├── agent-server/            # @tarko/agent-server - Server implementation
├── agent-cli/               # @tarko/agent-cli - CLI tools
├── model-provider/          # @tarko/model-provider - LLM providers
├── llm-client/              # @tarko/llm-client - LLM communication
└── context-engineer/        # @tarko/context-engineer - Context management
```

## Documentation to Source Code Mapping

### Get Started Section

#### `/guide/get-started/introduction.mdx`
**Source References:**
- `multimodal/tarko/agent/README.md` - Overview and features
- `multimodal/tarko/agent/package.json` - Package metadata

**Key Points to Maintain:**
- Feature list must match actual capabilities
- Installation instructions must be accurate
- Version numbers should be current

#### `/guide/get-started/quick-start.mdx`
**Source References:**
- `multimodal/tarko/agent/examples/tool-calls/basic.ts` - Basic usage example
- `multimodal/tarko/agent/examples/streaming/tool-calls.ts` - Streaming example
- `multimodal/tarko/agent/src/agent/agent.ts` - Constructor options

**Validation:**
```bash
cd multimodal/tarko/agent/examples/tool-calls
npx tsx basic.ts
```

#### `/guide/get-started/architecture.mdx`
**Source References:**
- `multimodal/tarko/agent/src/agent/agent.ts` - Main Agent class
- `multimodal/tarko/agent/src/agent/agent-runner.ts` - Execution flow
- `multimodal/tarko/agent/src/agent/event-stream.ts` - Event system
- `multimodal/tarko/agent/src/tool-call-engine/` - Tool call engines

#### `/guide/get-started/sdk.mdx`
**Source References:**
- `multimodal/tarko/agent/src/index.ts` - Main exports
- `multimodal/tarko/agent-interface/src/agent.ts` - IAgent interface
- `multimodal/tarko/agent-interface/src/agent-options.ts` - AgentOptions interface
- `multimodal/tarko/agent/examples/` - All example files

**Critical Dependencies:**
- All code examples MUST be from actual example files
- API signatures MUST match TypeScript interfaces
- Import statements MUST be accurate

### Basic Section

#### `/guide/basic/configuration.mdx`
**Source References:**
- `multimodal/tarko/agent-interface/src/agent-options.ts` - AgentOptions interface
- `multimodal/tarko/agent/src/agent/agent.ts` - Constructor implementation
- `multimodal/tarko/model-provider/src/` - Model provider options

**Update Triggers:**
- Changes to AgentOptions interface
- New model providers added
- New configuration options



#### `/guide/basic/model-provider.mdx`
**Source References:**
- `multimodal/tarko/model-provider/src/` - Provider implementations
- `multimodal/tarko/agent/src/agent/llm-client.ts` - LLM client usage
- `multimodal/tarko/agent/examples/model-providers/` - Provider examples

#### `/guide/basic/tools.mdx`
**Source References:**
- `multimodal/tarko/agent-interface/src/tool.ts` - Tool interface
- `multimodal/tarko/agent/src/agent/tool-manager.ts` - Tool management
- `multimodal/tarko/agent/examples/tool-calls/` - Tool examples

**Key Examples:**
```typescript
// From multimodal/tarko/agent/examples/tool-calls/basic.ts
const weatherTool = new Tool({
  id: 'getWeather',
  description: 'Get weather information for a specified location',
  parameters: z.object({
    location: z.string().describe('Location name, such as city name'),
  }),
  function: async (input) => {
    const { location } = input;
    return {
      location,
      temperature: '70°F (21°C)',
      condition: 'Sunny',
      precipitation: '10%',
      humidity: '45%',
      wind: '5 mph',
    };
  },
});
```

#### `/guide/basic/tool-call-engine.mdx`
**Source References:**
- `multimodal/tarko/agent/src/tool-call-engine/` - All engine implementations
- `multimodal/tarko/agent/src/tool-call-engine/engine-selector.ts` - Engine selection
- `multimodal/tarko/agent/examples/custom-tool-call-engine/` - Custom engine examples

**Engine Types:**
- `native` - Native function calling
- `prompt-engineering` - Prompt-based tool calling
- `structured-outputs` - Structured output parsing

#### `/guide/basic/event-stream.mdx`
**Source References:**
- `multimodal/tarko/agent/src/agent/event-stream.ts` - Event stream processor
- `multimodal/tarko/agent-interface/src/agent-event-stream.ts` - Event types
- `multimodal/tarko/agent/examples/streaming/` - Streaming examples

#### `/guide/basic/troubleshooting.mdx`
**Source References:**
- `multimodal/tarko/agent/README.md` - Known issues
- `multimodal/tarko/agent/examples/` - Working examples for reference
- Common error patterns from actual usage

### Advanced Section

#### `/guide/advanced/agent-hooks.mdx`
**Source References:**
- `multimodal/tarko/agent/src/agent/base-agent.ts` - Hook implementations
- `multimodal/tarko/agent-interface/src/agent.ts` - Hook interfaces
- `multimodal/tarko/agent/examples/hooks/` - Hook examples

**Hook Methods:**
- `onLLMRequest()` - Before LLM call
- `onLLMResponse()` - After LLM call
- `onBeforeToolCall()` - Before tool execution
- `onAfterToolCall()` - After tool execution
- `onEachAgentLoopStart()` - Loop iteration start
- `onEachAgentLoopEnd()` - Loop iteration end

#### `/guide/advanced/agent-protocol.mdx`
**Source References:**
- `multimodal/tarko/agent-interface/src/agent-event-stream.ts` - Event definitions
- `multimodal/tarko/agent-server/src/` - Server protocol implementation
- `multimodal/tarko/agent/src/agent/event-stream.ts` - Event processing

#### `/guide/advanced/context-engineering.mdx`
**Source References:**
- `multimodal/tarko/agent/src/agent/message-history.ts` - Message management
- `multimodal/tarko/context-engineer/src/` - Context engineering implementation
- `multimodal/tarko/agent-interface/src/agent-options.ts` - Context options

#### `/guide/advanced/agent-snapshot.mdx`
**Source References:**
- `multimodal/tarko/agent-snapshot/src/` - Snapshot implementation
- `multimodal/tarko/agent/snapshot/` - Snapshot utilities
- `multimodal/tarko/agent/examples/` - Snapshot examples

#### `/guide/advanced/testing.mdx`
**Source References:**
- `multimodal/tarko/agent/tests/` - Test examples
- `multimodal/tarko/agent/vitest.config.mts` - Test configuration
- `multimodal/tarko/agent/snapshot/` - Snapshot testing

### UI Integration Section

#### `/guide/ui-integration/introduction.mdx`
**Source References:**
- `multimodal/tarko/agent-ui/src/` - UI components
- `multimodal/tarko/agent-server/src/` - Server endpoints
- Protocol definitions for UI communication

#### `/guide/ui-integration/web.mdx`
**Source References:**
- `multimodal/tarko/agent-ui/src/` - Web UI implementation
- `multimodal/tarko/agent-web-ui/src/` - Web UI components
- WebSocket and SSE implementations

#### `/guide/ui-integration/native.mdx`
**Source References:**
- `multimodal/tarko/agent-server/src/` - HTTP API endpoints
- Integration patterns from real implementations
- Platform-specific considerations

### Deployment Section

#### `/guide/deployment/cli.mdx`
**Source References:**
- `multimodal/tarko/agent-cli/src/` - CLI implementation
- `multimodal/tarko/agent-cli/package.json` - CLI scripts
- Command definitions and options

#### `/guide/deployment/server.mdx`
**Source References:**
- `multimodal/tarko/agent-server/src/` - Server implementation
- `multimodal/tarko/agent-server-next/src/` - Next.js server
- Deployment configurations and examples

### API Reference Section

#### `/api/agent.mdx`
**Source References:**
- `multimodal/tarko/agent-interface/src/agent.ts` - IAgent interface
- `multimodal/tarko/agent/src/agent/agent.ts` - Agent implementation
- All public methods and properties

#### `/api/hooks.mdx`
**Source References:**
- `multimodal/tarko/agent-interface/src/agent.ts` - Hook method signatures
- `multimodal/tarko/agent/src/agent/base-agent.ts` - Hook implementations
- Hook payload types and interfaces

#### `/api/tool-call-engine.mdx`
**Source References:**
- `multimodal/tarko/agent-interface/src/tool-call-engine.ts` - Engine interfaces
- `multimodal/tarko/agent/src/tool-call-engine/` - Engine implementations
- Engine-specific configurations

#### `/api/context-engineering.mdx`
**Source References:**
- `multimodal/tarko/context-engineer/src/` - Context engineering API
- `multimodal/tarko/agent/src/agent/message-history.ts` - Message history
- Context management methods

#### `/api/agent-server.mdx`
**Source References:**
- `multimodal/tarko/agent-server/src/` - Server API
- `multimodal/tarko/agent-server-interface/src/` - Server interfaces
- HTTP endpoints and WebSocket events

## Maintenance Workflows

### When Source Code Changes

1. **Identify Affected Documentation**
   ```bash
   # Find documentation referencing changed file
   grep -r "agent.ts" docs/
   grep -r "AgentOptions" docs/
   ```

2. **Update Examples**
   ```bash
   # Test examples still work
   cd multimodal/tarko/agent/examples/tool-calls
   npx tsx basic.ts
   ```

3. **Verify API Documentation**
   - Check TypeScript interfaces match documented APIs
   - Update method signatures if changed
   - Verify import statements are correct

4. **Test Documentation Build**
   ```bash
   cd multimodal/websites/tarko
   npm run build
   ```

### Adding New Features

1. **Add Source Mapping**
   - Update this guide with new file mappings
   - Document new interfaces or classes

2. **Create Documentation**
   - Follow existing patterns
   - Use real examples from source code
   - Link to actual implementation files

3. **Update Navigation**
   - Add to appropriate `_meta.json` files
   - Ensure logical ordering

### Regular Maintenance

1. **Weekly Checks**
   ```bash
   # Run example validation
   ./scripts/validate-examples.sh
   
   # Check for broken links
   npm run build
   ```

2. **Release Preparation**
   - Update version numbers
   - Verify all examples work
   - Check API documentation accuracy

## Validation Scripts

### Example Validation

```bash
#!/bin/bash
# scripts/validate-examples.sh

echo "Validating Tarko examples..."
cd multimodal/tarko/agent

# Test basic tool calls
echo "Testing basic tool calls..."
cd examples/tool-calls
npx tsx basic.ts

# Test streaming
echo "Testing streaming..."
cd ../streaming
npx tsx tool-calls.ts

# Test other examples
for dir in ../*/; do
  if [ -f "$dir/index.ts" ]; then
    echo "Testing $dir"
    cd "$dir"
    npx tsx index.ts
    cd ..
  fi
done

echo "Example validation complete!"
```

### API Documentation Validation

```bash
#!/bin/bash
# scripts/validate-api-docs.sh

echo "Validating API documentation..."

# Check TypeScript compilation
cd multimodal/tarko/agent
npx tsc --noEmit

# Check interface exports
node -e "console.log(Object.keys(require('./dist/index.js')))"

echo "API validation complete!"
```

## Common Issues and Solutions

### Issue: Examples Don't Work
**Solution:**
1. Check if source example files have been updated
2. Verify import statements are correct
3. Test examples in isolation
4. Update documentation to match working examples

### Issue: API Documentation Outdated
**Solution:**
1. Compare with actual TypeScript interfaces
2. Check method signatures in implementation
3. Update parameter types and return types
4. Verify all methods are documented

### Issue: Dead Links
**Solution:**
1. Check if referenced files have moved
2. Update GitHub links to current branch/commit
3. Verify internal documentation links
4. Test all external links

### Issue: Build Failures
**Solution:**
1. Check MDX syntax errors
2. Verify all imports in code blocks
3. Check for missing files or images
4. Validate JSON in meta files

## Best Practices

1. **Always Use Real Examples**
   - Copy from actual working example files
   - Test examples before documenting
   - Link to source files on GitHub

2. **Keep API Docs Synchronized**
   - Generate from TypeScript interfaces when possible
   - Verify method signatures regularly
   - Document all public methods

3. **Maintain Consistency**
   - Use consistent terminology
   - Follow established patterns
   - Keep similar sections structured the same way

4. **Provide Context**
   - Explain when to use features
   - Show common patterns
   - Include troubleshooting information

5. **Test Everything**
   - Run all code examples
   - Build documentation regularly
   - Validate links and references

---

**Remember:** This guide should be updated whenever the source code structure changes or new packages are added to the Tarko ecosystem.
