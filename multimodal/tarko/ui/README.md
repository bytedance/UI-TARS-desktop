# @tarko/ui

Reusable UI components and utilities for Tarko Agent UI.

## Installation

```bash
pnpm add @tarko/ui
```

## Components

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
