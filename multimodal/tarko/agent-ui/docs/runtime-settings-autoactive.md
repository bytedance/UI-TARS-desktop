# Runtime Settings-based AutoActive Feature

## Overview

The `autoActive` property in `workspace.navItems` supports dynamic evaluation based on `api/v1/runtime-settings` values, enabling conditional auto-activation of embedded frames.

## How It Works

### autoActive Design Logic

1. **Backward Compatibility**: `autoActive?: boolean` works as before
2. **String Expressions**: `autoActive?: string` accepts JavaScript expressions
3. **Dynamic Evaluation**: Navbar fetches runtime settings and evaluates expressions in real-time
4. **Safe Execution**: Uses `new Function()` with limited scope for security

### Runtime Settings Consumption

1. **API Endpoint**: `apiService.getSessionRuntimeSettings(sessionId)` returns current settings
2. **Data Structure**: `{ currentValues: Record<string, any> }` contains user settings
3. **Real-time Updates**: Refetched when session changes
4. **Expression Context**: Runtime settings passed as `runtimeSettings` parameter

## Usage Examples

### Basic Boolean (Backward Compatible)
```json
{
  "workspace": {
    "navItems": [
      {
        "title": "Code Server",
        "link": "{prefix}/code-server/",
        "icon": "code",
        "behavior": "embed-frame",
        "autoActive": true
      }
    ]
  }
}
```

### Dynamic Expression
```json
{
  "workspace": {
    "navItems": [
      {
        "title": "VNC",
        "link": "{prefix}/vnc/index.html?autoconnect=true",
        "icon": "monitor",
        "behavior": "embed-frame",
        "autoActive": "runtimeSettings.agentMode === 'game'"
      }
    ]
  }
}
```

## Real-world Example

From `examples/webui-config.json`:
```json
{
  "workspace": {
    "navItems": [
      {
        "title": "Code Server",
        "link": "{prefix}/code-server/",
        "icon": "code",
        "behavior": "embed-frame"
      },
      {
        "title": "VNC",
        "link": "{prefix}/vnc/index.html?autoconnect=true",
        "icon": "monitor",
        "behavior": "embed-frame",
        "autoActive": "debug(runtimeSettings) && runtimeSettings.agentMode === 'game'"
      }
    ]
  }
}
```
