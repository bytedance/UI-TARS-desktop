# Agent TARS SDK Components

## Markdown Rendering

### MarkdownRenderer

Renders Markdown content as React components, supporting syntax highlighting, image previews, and more.

```tsx
import { MarkdownRenderer } from '@/sdk/markdown-renderer';

function MyComponent() {
  const markdownContent = `
# Heading

This is a paragraph with **bold** and *italic* text.

\`\`\`js
console.log('Hello world!');
\`\`\`

![Example image](https://example.com/image.jpg)
  `;

  return (
    <MarkdownRenderer
      content={markdownContent}
      className="prose" // Optional: custom class name
      forceDarkTheme={false} // Optional: force dark theme
    />
  );
}
```

#### Properties

| Property       | Type    | Required | Description                |
| -------------- | ------- | -------- | -------------------------- |
| content        | string  | Yes      | Content in Markdown format |
| className      | string  | No       | Additional CSS class name  |
| publishDate    | string  | No       | Publication date           |
| author         | string  | No       | Author information         |
| forceDarkTheme | boolean | No       | Force dark theme           |

## Dialogs

### ConfirmDialog

Displays a confirmation dialog for important actions.

```tsx
import { useState } from 'react';
import { ConfirmDialog } from '@/sdk/dialog';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirm = () => {
    console.log('User confirmed the action');
    setIsOpen(false);
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Delete Item</button>

      <ConfirmDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleConfirm}
        title="Delete Confirmation"
        message="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
}
```

#### Properties

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| isOpen | boolean | Yes | Controls whether the dialog is displayed |
| onClose | () => void | Yes | Callback function when the dialog is closed |
| onConfirm | () => void | Yes | Callback function when the confirm button is clicked |
| title | string | Yes | Dialog title |
| message | string | Yes | Dialog content |
| confirmText | string | No | Confirm button text, default is "Confirm" |
| cancelText | string | No | Cancel button text, default is "Cancel" |
| type | 'danger' \| 'warning' \| 'info' | No | Dialog type, affects color theme, default is 'danger' |
