# @tarko/ui

Reusable UI components and utilities for Tarko Agent UI.

## Installation

```bash
pnpm add @tarko/ui
```

## Components

### Basic Components

#### `Dialog`

Modal dialog component with backdrop and animations.

```tsx
import { Dialog, DialogPanel, DialogTitle } from '@tarko/ui';

<Dialog open={isOpen} onClose={() => setIsOpen(false)}>
  <DialogPanel>
    <DialogTitle>Confirm Action</DialogTitle>
    <p>Are you sure you want to proceed?</p>
  </DialogPanel>
</Dialog>
```

**Props:**
- `open: boolean` - Controls dialog visibility
- `onClose: () => void` - Close callback
- `maxWidth?: string | false` - Maximum width constraint
- `fullWidth?: boolean` - Full width mode
- `children: React.ReactNode` - Dialog content

#### `ConfirmDialog`

Pre-built confirmation dialog with action buttons.

```tsx
import { ConfirmDialog } from '@tarko/ui';

<ConfirmDialog
  open={showConfirm}
  title="Delete File"
  message="This action cannot be undone."
  confirmText="Delete"
  onConfirm={handleDelete}
  onCancel={() => setShowConfirm(false)}
  variant="danger"
/>
```

**Props:**
- `open: boolean` - Controls dialog visibility
- `title: string` - Dialog title
- `message: string` - Confirmation message
- `confirmText?: string` - Confirm button text (default: 'Confirm')
- `cancelText?: string` - Cancel button text (default: 'Cancel')
- `onConfirm: () => void` - Confirm action callback
- `onCancel: () => void` - Cancel action callback
- `variant?: 'default' | 'danger'` - Visual style variant

#### `LoadingSpinner`

Animated loading spinner component.

```tsx
import { LoadingSpinner } from '@tarko/ui';

<LoadingSpinner size={8} className="border-blue-500 border-t-transparent" />
```

**Props:**
- `size?: number` - Spinner size (default: 8)
- `className?: string` - Additional CSS classes for styling

#### `Tooltip`

Tooltip component for displaying contextual information.

```tsx
import { Tooltip } from '@tarko/ui';

<Tooltip content="This is a helpful tip">
  <button>Hover me</button>
</Tooltip>
```

### AI Components

#### `ActionBlock`

Displays AI action blocks with status indicators and animations.

```tsx
import { ActionBlock } from '@tarko/ui';

<ActionBlock
  title="Processing Request"
  status="running"
  description="Analyzing user input..."
/>
```

#### `BrowserShell`

Browser-like interface shell for displaying web content.

```tsx
import { BrowserShell } from '@tarko/ui';

<BrowserShell
  url="https://example.com"
  title="Example Site"
  onNavigate={(url) => console.log('Navigate to:', url)}
/>
```

#### `ThinkingAnimation`

Animated thinking indicator for AI processing states.

```tsx
import { ThinkingAnimation } from '@tarko/ui';

<ThinkingAnimation message="Thinking..." />
```

### Code Editors

#### `CodeEditor`

Lightweight code viewer with syntax highlighting using highlight.js.

```tsx
import { CodeEditor } from '@tarko/ui';

<CodeEditor
  code="console.log('Hello World');"
  fileName="example.js"
  readOnly={true}
  showLineNumbers={true}
  maxHeight="400px"
  onCopy={() => console.log('Copied!')}
/>
```

**Props:**
- `code: string` - Source code to display
- `fileName?: string` - File name for language detection
- `filePath?: string` - Full file path for display
- `fileSize?: string` - File size for display
- `readOnly?: boolean` - Read-only mode (default: true)
- `showLineNumbers?: boolean` - Show line numbers (default: true)
- `maxHeight?: string` - Maximum height (default: 'none')
- `className?: string` - Additional CSS classes
- `onCopy?: () => void` - Copy button callback

#### `MonacoCodeEditor`

Full-featured code editor powered by Monaco Editor with IntelliSense and editing capabilities.

```tsx
import { MonacoCodeEditor } from '@tarko/ui';

<MonacoCodeEditor
  code="const x = 42;"
  fileName="script.ts"
  readOnly={false}
  onChange={(value) => console.log(value)}
/>
```

**Props:**
- `code: string` - Source code to display/edit
- `fileName?: string` - File name for language detection
- `filePath?: string` - Full file path for display
- `fileSize?: string` - File size for display
- `readOnly?: boolean` - Read-only mode (default: true)
- `showLineNumbers?: boolean` - Show line numbers (default: true)
- `maxHeight?: string` - Maximum height (default: 'none')
- `className?: string` - Additional CSS classes
- `onCopy?: () => void` - Copy button callback
- `onChange?: (value: string | undefined) => void` - Content change callback

#### `DiffViewer`

Side-by-side diff viewer for comparing code changes.

```tsx
import { DiffViewer } from '@tarko/ui';

const diffContent = `
--- a/file.js
+++ b/file.js
@@ -1,3 +1,3 @@
-const x = 1;
+const x = 2;
`;

<DiffViewer
  diffContent={diffContent}
  fileName="file.js"
  maxHeight="500px"
/>
```

**Props:**
- `diffContent: string` - Git-style diff content
- `fileName?: string` - File name for display
- `maxHeight?: string` - Maximum height (default: '400px')
- `className?: string` - Additional CSS classes



## Utilities

### File Utilities

#### `getMonacoLanguage(extension: string): string`

Maps file extensions to Monaco Editor language identifiers.

```tsx
import { getMonacoLanguage } from '@tarko/ui';

getMonacoLanguage('ts'); // 'typescript'
getMonacoLanguage('py'); // 'python'
getMonacoLanguage('unknown'); // 'plaintext'
```

#### `getDisplayFileName(fileName?: string, filePath?: string): string`

Extracts display name from file name or path.

```tsx
import { getDisplayFileName } from '@tarko/ui';

getDisplayFileName('script.js'); // 'script.js'
getDisplayFileName(undefined, '/path/to/file.ts'); // 'file.ts'
getDisplayFileName(); // 'Untitled'
```

#### `getFileExtension(fileName?: string): string`

Extracts file extension from file name.

```tsx
import { getFileExtension } from '@tarko/ui';

getFileExtension('script.js'); // 'js'
getFileExtension('README.md'); // 'md'
getFileExtension('noext'); // ''
```

### Path Utilities

#### `normalizeFilePath(absolutePath: string): string`

Normalizes file paths by replacing user directories with `~` for privacy.

```tsx
import { normalizeFilePath } from '@tarko/ui';

// macOS/Linux
normalizeFilePath('/Users/john/project/file.js'); // '~/project/file.js'
normalizeFilePath('/home/jane/code/app.py'); // '~/code/app.py'

// Windows
normalizeFilePath('C:\\Users\\john\\project\\file.js'); // '~\\project\\file.js'
```

#### `normalizeFilePathsBatch(paths: string[]): string[]`

Batch normalize multiple file paths for better performance.

#### `isAbsolutePath(path: string): boolean`

Checks if a path is absolute (starts with `/` on Unix or drive letter on Windows).

#### Cache Management

- `clearPathNormalizationCache(): void` - Clear normalization cache
- `getPathNormalizationCacheSize(): number` - Get cache size

### Markdown Renderer

#### `MarkdownRenderer`

Full-featured markdown renderer with syntax highlighting, math support, and interactive elements.

```tsx
import { MarkdownRenderer } from '@tarko/ui';

const markdownContent = `
# Hello World

This is **bold** text with \`code\` and [links](https://example.com).

\`\`\`javascript
console.log('Hello!');
\`\`\`
`;

<MarkdownRenderer
  content={markdownContent}
  className="prose"
  forceDarkTheme={false}
/>
```

**Props:**
- `content: string` - Markdown content to render
- `publishDate?: string` - Publication date for display
- `author?: string` - Author information
- `className?: string` - Additional CSS classes
- `forceDarkTheme?: boolean` - Force dark theme (default: false)
- `codeBlockStyle?: React.CSSProperties` - Custom code block styles

**Features:**
- GitHub Flavored Markdown (GFM) support
- Syntax highlighting for code blocks
- Math equations with KaTeX
- GitHub-style alerts and blockquotes
- Interactive images with modal preview
- Smart link handling (internal/external/hash links)
- Responsive tables
- Dark/light theme support

### Data Viewers

#### `JSONViewer`

Interactive JSON tree viewer with expand/collapse, copy functionality, and syntax highlighting.

```tsx
import { JSONViewer, JSONViewerRef } from '@tarko/ui';

const data = {
  name: "John Doe",
  age: 30,
  skills: ["JavaScript", "React", "Node.js"],
  address: {
    city: "New York",
    country: "USA"
  }
};

const viewerRef = useRef<JSONViewerRef>(null);

<JSONViewer
  data={data}
  emptyMessage="No data available"
  className="max-h-96 overflow-auto"
  ref={viewerRef}
/>

// Copy all data as JSON
const copyAll = () => {
  const jsonString = viewerRef.current?.copyAll();
  if (jsonString) {
    navigator.clipboard.writeText(jsonString);
  }
};
```

**Props:**
- `data: any` - JSON data to display
- `className?: string` - Additional CSS classes
- `emptyMessage?: string` - Message for empty data (default: 'No data available')
- `ref?: JSONViewerRef` - Reference for programmatic access

**Features:**
- Hierarchical tree structure with expand/collapse
- Type-aware syntax highlighting (strings, numbers, booleans, null)
- Copy individual values or entire JSON
- Long string truncation with expand option
- Smooth animations and hover effects
- Dark/light theme support
- Empty state handling

## Hooks

### `useDarkMode`

Hook for detecting and managing dark mode state.

```tsx
import { useDarkMode } from '@tarko/ui';

function MyComponent() {
  const isDarkMode = useDarkMode();
  
  return (
    <div className={isDarkMode ? 'dark-theme' : 'light-theme'}>
      Current theme: {isDarkMode ? 'Dark' : 'Light'}
    </div>
  );
}
```

### `useCopyToClipboard`

Hook for copying text to clipboard with feedback state.

```tsx
import { useCopyToClipboard } from '@tarko/ui';

function CopyButton({ text }: { text: string }) {
  const { copied, copyToClipboard } = useCopyToClipboard();
  
  return (
    <button onClick={() => copyToClipboard(text)}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}
```

## Utilities

### Duration Utilities

#### `formatDuration(ms: number): string`

Formats milliseconds into human-readable duration.

```tsx
import { formatDuration } from '@tarko/ui';

formatDuration(1500); // '1.5s'
formatDuration(65000); // '1m 5s'
formatDuration(3661000); // '1h 1m 1s'
```

### MUI Theme

#### `createMuiTheme(isDarkMode: boolean): Theme`

Creates Material-UI theme based on dark mode preference.

```tsx
import { createMuiTheme } from '@tarko/ui';
import { ThemeProvider } from '@mui/material/styles';

function App() {
  const isDarkMode = useDarkMode();
  const theme = createMuiTheme(isDarkMode);
  
  return (
    <ThemeProvider theme={theme}>
      {/* Your app content */}
    </ThemeProvider>
  );
}
```
