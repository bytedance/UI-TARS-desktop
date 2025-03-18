import { ArtifactType } from './index';

export function getFileExtension(filePath: string): ArtifactType {
  const extension = filePath.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'md':
    case 'markdown':
      return ArtifactType.Markdown;
    case 'html':
    case 'htm':
      return ArtifactType.HTML;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return ArtifactType.Image;
    case 'pdf':
      return ArtifactType.PDF;
    default:
      return ArtifactType.Markdown;
  }
}
