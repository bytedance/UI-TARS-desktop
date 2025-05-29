🔍 Review feedback: # REVIEW_RESULT.md

## Summary of changes
This PR focuses on optimizing error handling in the UI-TARS project, with key changes across multiple files:

1. **Error Handling Architecture**
   - Introduced `guiAgentErrorParser` in `GUIAgent.ts` to unify error parsing logic, converting raw errors into structured `GUIAgentError` objects.
   - Replaced hardcoded error objects with the new `GUIAgentError` class (converted from an interface) in `agent.ts`, adding `status`, `message`, and `stack` properties.

2. **Logging Standardization**
   - Added consistent prefixes (e.g., `[GUIAgent]`, `[onGUIAgentData]`) to log messages for better traceability.

3. **Error Enumeration Expansion**
   - Updated `ErrorStatusEnum` in `agent.ts` with new error codes (e.g., `REACH_MAXLOOP_ERROR`, `SCREENSHOT_RETRY_ERROR`) and deprecated old codes while maintaining backward compatibility.

4. **Frontend Error UI Enhancement**
   - Refactored `ErrorMessage` in `Messages.tsx` to parse error JSON, display human-readable error status (using `ErrorStatusEnum`), and show detailed stack traces.


## Potential issues and bugs
### 1. Null Safety Gaps in Error Parsing
In `Messages.tsx`, the `ErrorMessage` component parses error text as JSON but does not fully guard against `null` values when accessing `parsedError` properties.

```tsx
// apps/ui-tars/src/renderer/src/components/RunMessages/Messages.tsx
let parsedError: GUIAgentError | null = null;
try {
  const parsed = JSON.parse(text);
  if (parsed && typeof parsed === 'object' && 'status' in parsed) {
    parsedError = parsed as GUIAgentError;
  }
} catch { /* ignore */ }

// Risk: parsedError could be null, leading to runtime errors
{parsedError ? ErrorStatusEnum[parsedError.status] || 'UNKNOWN_ERROR' : 'Error'}
```

### 2. Breaking Changes in Enums
Renaming enum values (e.g., `SCREENSHOT_ERROR` → `SCREENSHOT_RETRY_ERROR` in `agent.ts`) without backward compatibility safeguards may break external code relying on old enum names.

```diff
// packages/ui-tars/shared/src/types/agent.ts
- SCREENSHOT_ERROR = -100000,
+ SCREENSHOT_RETRY_ERROR = -100000,
```

### 3. Redundant Logging
The `guiAgentErrorParser` method in `GUIAgent.ts` logs every error with `logger.error`, leading to redundant logs in production and performance overhead.

```ts
// packages/ui-tars/sdk/src/GUIAgent.ts
private guiAgentErrorParser(error: unknown, type: ErrorStatusEnum | null = null): GUIAgentError {
  this.logger.error('[GUIAgent] guiAgentErrorParser:', error); // Redundant in production
  // ...
}
```

### 4. Unhandled Promise Rejections
Asynchronous operations (e.g., `operator.execute` in `runAgent.ts`) catch errors but do not propagate them, potentially silencing failures.

```ts
// apps/ui-tars/src/main/services/runAgent.ts
).catch((e) => {
  logger.error('[onGUIAgentError]', settings, error);
  setState({ /* ... */ });
  // Error is not re-thrown; upstream callers cannot detect failures
});
```


## Code quality considerations
### 1. Repetitive Logic in Error Handling
The `guiAgentErrorParser` method in `GUIAgent.ts` uses repetitive `if`-`else` blocks for different error types. This reduces maintainability.

```ts
// packages/ui-tars/sdk/src/GUIAgent.ts
if (!parseError && type === ErrorStatusEnum.REACH_MAXLOOP_ERROR) {
  parseError = new GUIAgentError(ErrorStatusEnum.REACH_MAXLOOP_ERROR, 'Has reached max loop count');
} else if (!parseError && type === ErrorStatusEnum.SCREENSHOT_RETRY_ERROR) {
  parseError = new GUIAgentError(ErrorStatusEnum.SCREENSHOT_RETRY_ERROR, 'Too many screenshot failures');
}
// ... more similar blocks
```

### 2. Inconsistent Type Construction
The `GUIAgentError` class (now a class, previously an interface) is instantiated in multiple ways, leading to potential type inconsistencies.

### 3. Lack of Documentation
Key methods (e.g., `guiAgentErrorParser`) and enum values (e.g., `ErrorStatusEnum` members) lack comments, making it hard for new developers to understand intent.


## Suggested improvements
### 1. Null Safety Fixes
Add null checks when accessing `parsedError` in `Messages.tsx`:

```diff
- {parsedError ? ErrorStatusEnum[parsedError.status] || 'UNKNOWN_ERROR' : 'Error'}
+ {parsedError?.status ? ErrorStatusEnum[parsedError.status] || 'UNKNOWN_ERROR' : 'Error'}
```

### 2. Enum Backward Compatibility
Preserve old enum names as aliases to avoid breaking changes:

```ts
// packages/ui-tars/shared/src/types/agent.ts
export enum ErrorStatusEnum {
  SCREENSHOT_RETRY_ERROR = -100000,
  // ... other enums
}
export const SCREENSHOT_ERROR = ErrorStatusEnum.SCREENSHOT_RETRY_ERROR; // Alias for backward compatibility
```

### 3. Logging Level Optimization
Use debug-level logging for non-critical errors in `guiAgentErrorParser` and disable debug logs in production:

```diff
- this.logger.error('[GUIAgent] guiAgentErrorParser:', error);
+ this.logger.debug('[GUIAgent] guiAgentErrorParser:', error);
```

### 4. Propagate Promise Errors
Re-throw errors in `catch` blocks to ensure upstream callers detect failures:

```diff
).catch((e) => {
  logger.error('[onGUIAgentError]', settings, error);
  setState({ /* ... */ });
+ throw e; // Propagate error upstream
});
```

### 5. Abstract Repetitive Logic
Use a mapping object to centralize error type handling in `guiAgentErrorParser`:

```ts
// packages/ui-tars/sdk/src/GUIAgent.ts
private errorTypeMap: Record<ErrorStatusEnum, string> = {
  [ErrorStatusEnum.REACH_MAXLOOP_ERROR]: 'Has reached max loop count',
  [ErrorStatusEnum.SCREENSHOT_RETRY_ERROR]: 'Too many screenshot failures',
  // ... map other error types
};

private guiAgentErrorParser(error: unknown, type: ErrorStatusEnum | null = null): GUIAgentError {
  // ... existing logic
  if (!parseError && type && this.errorTypeMap[type]) {
    parseError = new GUIAgentError(type, this.errorTypeMap[type]);
  }
  // ...
}
```

### 6. Add Documentation and Tests
- **JSDoc for `guiAgentErrorParser`**: Explain input parameters, return value, and error-handling logic.
- **Enum Comments**: Document what each `ErrorStatusEnum` value represents.
- **Unit Tests**: Cover edge cases (e.g., invalid JSON in `ErrorMessage`, unknown error types in `guiAgentErrorParser`).


## Overall assessment
The PR makes meaningful progress in structuring error handling, standardizing logs, and enhancing error UIs. However, gaps in null safety, backward compatibility, and code abstraction—along with insufficient testing and documentation—risk introducing runtime issues or maintenance challenges. Addressing the suggested improvements will ensure the changes are robust, maintainable, and production-ready.