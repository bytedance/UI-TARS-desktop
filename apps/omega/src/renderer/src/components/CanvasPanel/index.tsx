import { useAtom } from 'jotai';
import { EventPlayer } from './EventPlayer';
import { canvasDataSourceAtom } from '@renderer/state/canvas';
import { CanvasType } from '@renderer/type/canvas';
import { Artifact } from './Artifact';

export function CanvasPanel() {
  const [dataSource] = useAtom(canvasDataSourceAtom);

  if (!dataSource) return <EventPlayer />;

  switch (dataSource.type) {
    case CanvasType.EventPlayer:
      return <EventPlayer />;
    case CanvasType.ArtifactPreview:
      return <Artifact />;
    default:
      return null;
  }
}
