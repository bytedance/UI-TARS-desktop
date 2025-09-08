import React from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { DiffViewer } from '@/sdk/code-editor';
import { FileDisplayMode } from '../types';

interface DiffRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

// Check if content is diff format
function isDiffContent(content: string): boolean {
  return /^@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@/m.test(content) && /^[+-]/m.test(content);
}

// Extract diff from markdown code blocks
function extractDiffContent(content: string): string {
  const codeBlockMatch = content.match(/^```(?:diff)?\n([\s\S]*?)\n```/m);
  return codeBlockMatch ? codeBlockMatch[1] : content;
}

// Convert old/new content to unified diff format
function convertToUnifiedDiff(oldContent: string, newContent: string, fileName: string): string {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  // Simple unified diff header
  const header = `--- a/${fileName}\n+++ b/${fileName}\n@@ -1,${oldLines.length} +1,${newLines.length} @@`;
  
  // Generate diff lines
  const diffLines = [];
  const maxLines = Math.max(oldLines.length, newLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    
    if (oldLine === newLine) {
      if (oldLine !== undefined) {
        diffLines.push(` ${oldLine}`);
      }
    } else {
      if (oldLine !== undefined) {
        diffLines.push(`-${oldLine}`);
      }
      if (newLine !== undefined) {
        diffLines.push(`+${newLine}`);
      }
    }
  }
  
  return `${header}\n${diffLines.join('\n')}`;
}



export const DiffRenderer: React.FC<DiffRendererProps> = ({ panelContent }) => {
  // First try to extract str_replace_editor diff data (for edit_file type)
  const strReplaceData = extractStrReplaceEditorDiffData(panelContent);
  
  if (strReplaceData) {
    const { oldContent, newContent, path } = strReplaceData;
    const fileName = path || 'Edited File';
    const diffContent = convertToUnifiedDiff(oldContent, newContent, fileName);

    return (
      <div className="space-y-4">
        <DiffViewer
          diffContent={diffContent}
          fileName={fileName}
          maxHeight="calc(100vh - 215px)"
          className="rounded-none border-0"
        />
      </div>
    );
  }

  // Fallback to standard diff format
  const diffData = extractDiffData(panelContent);

  if (!diffData) {
    return (
      <div className="p-4 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/30">
        <div className="font-medium mb-1">No Diff Data Available</div>
        <div className="text-sm">Unable to extract diff information from the content.</div>
      </div>
    );
  }

  const { content, path, name } = diffData;
  const diffContent = extractDiffContent(content);

  if (!isDiffContent(diffContent)) {
    return (
      <div className="p-4 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/30">
        <div className="font-medium mb-1">Invalid Diff Format</div>
        <div className="text-sm">The content does not appear to be in a valid diff format.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DiffViewer
        diffContent={diffContent}
        fileName={path || name}
        maxHeight="calc(100vh - 215px)"
        className="rounded-none border-0"
      />
    </div>
  );
};

function extractStrReplaceEditorDiffData(panelContent: StandardPanelContent): {
  oldContent: string;
  newContent: string;
  path?: string;
} | null {
  try {
    // For str_replace_editor, the content structure should be:
    // {
    //   "prev_exist": true,
    //   "old_content": "...",
    //   "new_content": "...",
    //   "path": "/path/to/file"
    // }
    const source = panelContent.source;

    if (typeof source === 'object' && source !== null) {
      const { old_content, new_content, path } = source as any;

      if (typeof old_content === 'string' && typeof new_content === 'string') {
        return {
          oldContent: old_content,
          newContent: new_content,
          path: typeof path === 'string' ? path : undefined,
        };
      }
    }

    // Fallback: try to extract from arguments
    const args = panelContent.arguments;
    if (args && typeof args === 'object') {
      const { old_str, new_str, path } = args as any;

      if (typeof old_str === 'string' && typeof new_str === 'string') {
        return {
          oldContent: old_str,
          newContent: new_str,
          path: typeof path === 'string' ? path : undefined,
        };
      }
    }

    return null;
  } catch (error) {
    console.warn('Failed to extract str_replace_editor diff data:', error);
    return null;
  }
}

function extractDiffData(panelContent: StandardPanelContent): {
  content: string;
  path?: string;
  name?: string;
} | null {
  try {
    // Extract diff content from source array
    const sourceArray = panelContent.source;
    if (!Array.isArray(sourceArray) || sourceArray.length === 0) {
      return null;
    }

    const textSource = sourceArray.find(
      (item) => typeof item === 'object' && item !== null && 'text' in item,
    );

    if (!textSource || typeof textSource.text !== 'string') {
      return null;
    }

    // Extract path from arguments
    const path = panelContent.arguments?.path ? String(panelContent.arguments.path) : undefined;

    return {
      content: textSource.text,
      path,
      name: path ? path.split('/').pop() : undefined,
    };
  } catch (error) {
    console.warn('Failed to extract diff data:', error);
    return null;
  }
}


