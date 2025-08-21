import React from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { FileDisplayMode } from '../types';
import { FileResultRenderer } from './FileResultRenderer';

/**
 * EditFileRenderer - Dedicated renderer for file editing operations
 * Handles edit_file type content with proper decoupling
 */

interface EditFileRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

export const EditFileRenderer: React.FC<EditFileRendererProps> = ({
  panelContent,
  onAction,
  displayMode,
}) => {
  // Validate that this is indeed an edit_file type
  if (panelContent.type !== 'edit_file') {
    console.warn(`EditFileRenderer received unexpected type: ${panelContent.type}`);
    return null;
  }

  return (
    <FileResultRenderer panelContent={panelContent} onAction={onAction} displayMode={displayMode} />
  );
};
