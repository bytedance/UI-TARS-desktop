# Showcase Build-Time Optimization

## Overview

This optimization improves the performance of the Showcase page by fetching data at build time instead of runtime, eliminating the need for API calls when users visit the showcase.

## Implementation

### 1. Build-Time Plugin (`plugins/showcase-data-plugin.ts`)

- Uses `addRuntimeModules` hook to fetch showcase data during build process
- Creates virtual module `showcase-data` with API data
- Includes fallback handling for network failures

### 2. Optimized Hook (`src/hooks/useShowcaseDataOptimized.ts`)

- Imports build-time data from virtual module `showcase-data`
- Falls back to runtime API calls for specific sessionId/slug requests
- Maintains backward compatibility with existing components

### 3. Virtual Module (`showcase-data`)

- Auto-generated during build process via `addRuntimeModules`
- Contains all public showcase items as JavaScript module
- Includes last updated timestamp

## Performance Benefits

### Before Optimization
- **Runtime API Call**: Every showcase page visit required fetching data from `https://agent-tars.toxichl1994.workers.dev/shares/public`
- **Loading State**: Users saw spinner while data loaded
- **Network Dependency**: Page functionality dependent on API availability

### After Optimization
- **Build-Time Fetch**: Data fetched once during build, included in bundle
- **Instant Loading**: Showcase items appear immediately
- **Resilient**: Works even if API is temporarily unavailable

## Usage

The optimization is automatically applied when building the documentation:

```bash
pnpm build
```

During build, you'll see:
```
🚀 Fetching showcase data at build time...
✅ Successfully fetched 17 showcase items
```

## Fallback Strategy

- **Public Showcase**: Uses build-time data from virtual module
- **Specific Items**: Uses runtime API for sessionId/slug requests
- **Build Failures**: Falls back to empty data, runtime API takes over

## Configuration

The plugin can be configured in `rspress.config.ts`:

```typescript
showcaseDataPlugin({
  apiUrl: 'https://custom-api.example.com/shares/public'
})
```

## Technical Details

### Virtual Module System

Rspress uses the `addRuntimeModules` hook to create virtual modules:

```typescript
// Plugin implementation
async addRuntimeModules() {
  const data = await fetchShowcaseData();
  return {
    'showcase-data': `export const showcaseData = ${JSON.stringify(data)};`
  };
}
```

### Module Import

```typescript
// Hook implementation
import { showcaseData } from 'showcase-data';
```

## File Structure

```
multimodal/websites/docs/
├── plugins/
│   └── showcase-data-plugin.ts     # Build-time data fetching
├── src/
│   ├── hooks/
│   │   ├── useShowcaseData.ts          # Original runtime hook
│   │   └── useShowcaseDataOptimized.ts # Optimized build-time hook
│   └── components/
│       └── Showcase/
│           └── index.tsx               # Updated to use optimized hook
├── env.d.ts                            # Virtual module type declarations
└── rspress.config.ts                   # Plugin configuration
```

## Migration Notes

- Original `useShowcaseData` hook preserved for compatibility
- Components automatically use optimized version
- No breaking changes to existing functionality
- Build process now includes data fetching step
- Virtual module created at build time, not as physical file

## Monitoring

Build logs will show:
- ✅ Successful data fetch with item count
- ⚠️ Network failures with fallback activation
- No file generation messages (uses virtual modules)