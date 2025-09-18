# Agent Options Examples

This directory contains practical examples of how to implement and use Agent Options in your UI-TARS applications.

## Examples Overview

### 1. Basic Example (`basic-example.ts`)

A simple chatbot with fundamental agent options:
- **Boolean option**: Verbose mode toggle
- **Binary enum**: Casual vs formal response style
- **Multi enum**: Language selection (English, Chinese, Japanese)

**Use case**: Perfect for getting started with agent options or building simple customizable chatbots.

### 2. Advanced Example (`advanced-example.ts`)

A comprehensive multi-modal AI assistant with extensive customization:
- **UI Behavior**: Thinking process, progress indicators
- **Personality**: Professional, friendly, technical, creative modes
- **Features**: Web search, code generation, image analysis toggles
- **Output**: Format preferences, code language, source references
- **Performance**: Reasoning steps limits, response speed preferences
- **Safety**: Content filtering levels
- **Experimental**: Beta features toggle

**Use case**: Ideal for complex AI assistants that need fine-grained user control.

## Quick Start

1. **Copy an example** that matches your needs
2. **Modify the options schema** in `agentOptions.properties`
3. **Update your agent logic** to use the options from `session.metadata?.agentOptions`
4. **Test the UI** - options will appear in the chat input area

## Key Concepts

### Option Types

```typescript
// Boolean - Toggle switch
{
  type: 'boolean',
  title: 'Feature Name',
  description: 'What this feature does',
  default: false
}

// Binary Enum - Two buttons
{
  type: 'string',
  enum: ['option1', 'option2'],
  default: 'option1'
}

// Multi Enum - Dropdown
{
  type: 'string',
  enum: ['option1', 'option2', 'option3'],
  default: 'option1'
}
```

### Accessing Options

```typescript
const options = session.metadata?.agentOptions || {};
const isFeatureEnabled = options.featureName || false;
```

### Best Practices

1. **Clear naming**: Use descriptive option names and titles
2. **Helpful descriptions**: Explain what each option does
3. **Sensible defaults**: Choose safe, commonly used defaults
4. **Logical grouping**: Organize related options together
5. **Error handling**: Always provide fallback values

## Testing Your Implementation

1. Start your agent server with the new configuration
2. Open the UI and start a new chat session
3. Look for the "Options" button in the chat input area
4. Toggle different options and verify they affect agent behavior
5. Check that options persist across messages in the same session

## Common Patterns

### Feature Toggles
```typescript
if (options.enableWebSearch) {
  const results = await this.searchWeb(query);
  response += this.formatSearchResults(results);
}
```

### Conditional Formatting
```typescript
const format = options.outputFormat || 'markdown';
return this.formatResponse(response, format);
```

### Personality Switching
```typescript
const personality = options.personality || 'friendly';
const greeting = this.getGreeting(personality);
```

### Performance Tuning
```typescript
const maxSteps = parseInt(options.maxSteps) || 10;
return this.processWithLimit(query, maxSteps);
```

## Troubleshooting

### Options Not Appearing
- Check that `agentOptions` is properly defined in server config
- Verify you're in an active session (not replay mode)
- Ensure no JavaScript errors in browser console

### Options Not Saving
- Check network requests in browser dev tools
- Verify session is not in processing state
- Check server logs for API errors

### Agent Not Using Options
- Verify you're reading from `session.metadata?.agentOptions`
- Check for typos in option names
- Add debug logging to confirm option values

## Next Steps

- Read the [full documentation](../features/agent-options.md)
- Explore the [API reference](../api/README.md)
- Check out [UI customization options](../features/ui-customization.md)
- Learn about [session management](../features/session-management.md)
