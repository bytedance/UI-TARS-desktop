export enum CanvasType {
  EventPlayer = 'event-player',
  ArtifactPreview = 'artifact-preview',
}

export enum ArtifactType {
  Image = 'image',
  Excel = 'excel',
  PDF = 'pdf',
  Component = 'component',
}

export interface CanvasDataSourceDescriptor {
  [CanvasType.EventPlayer]: {};
  [CanvasType.ArtifactPreview]: {
    artifactType: ArtifactType;
    content: string;
  };
}

export interface CanvasDataSource {
  type: CanvasType;
  data: CanvasDataSourceDescriptor[CanvasType];
}
