// import { useState } from 'react';
// import { Button, Chip, Input } from '@nextui-org/react';
// import { IoMdAdd } from 'react-icons/io';
import { MCPServersSettings } from '@agent-infra/shared';

interface FileSystemSettingsTabProps {
  settings: MCPServersSettings;
  setSettings: (settings: MCPServersSettings) => void;
}

export function MCPServersSettingsTab({
  settings,
  setSettings,
}: FileSystemSettingsTabProps) {
  // const [newDirectory, setNewDirectory] = useState('');

  // const addDirectory = () => {
  //   if (!newDirectory || settings.availableDirectories.includes(newDirectory)) {
  //     return;
  //   }

  //   setSettings({
  //     ...settings,
  //     availableDirectories: [...settings.availableDirectories, newDirectory],
  //   });
  //   setNewDirectory('');
  // };

  // const removeDirectory = (dir: string) => {
  //   setSettings({
  //     ...settings,
  //     availableDirectories: settings.availableDirectories.filter(
  //       (d) => d !== dir,
  //     ),
  //   });
  // };

  return (
    <div className="space-y-4 py-2">
      <div className="text-sm text-default-500 mb-2">
        Configure directories that the application can access. The default is
        your home directory&apos;s .omega folder.
      </div>
    </div>
  );
}
