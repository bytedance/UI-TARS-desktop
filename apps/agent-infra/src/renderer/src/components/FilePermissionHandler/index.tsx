import { useAtom } from 'jotai';
import { pendingPermissionRequestAtom } from '@renderer/services/filePermissionService';
import { FilePermissionModal } from '../FilePermissionModal';

export function FilePermissionHandler() {
  const [pendingRequest] = useAtom(pendingPermissionRequestAtom);

  return (
    <FilePermissionModal
      isOpen={!!pendingRequest}
      filePath={pendingRequest?.path || ''}
    />
  );
}
