import React from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { FileDisplayMode } from '../types';
import { FileResultRenderer } from './FileResultRenderer';

/**
 * FileRenderer - Dedicated renderer for file content display
 * Handles file_result and file type content with proper decoupling
 */

interface FileRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

export const FileRenderer: React.FC<FileRendererProps> = ({
  panelContent,
  onAction,
  displayMode,
}) => {
  // Validate that this is indeed a file type
  if (panelContent.type !== 'file_result' && panelContent.type !== 'file') {
    console.warn(`FileRenderer received unexpected type: ${panelContent.type}`);
    return null;
  }

  return (
    <FileResultRenderer panelContent={panelContent} onAction={onAction} displayMode={displayMode} />
  );
};
