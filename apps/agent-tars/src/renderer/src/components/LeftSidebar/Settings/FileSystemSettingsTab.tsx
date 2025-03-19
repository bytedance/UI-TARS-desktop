import { useState } from 'react';
import { Button, Chip, Input } from '@nextui-org/react';
import { IoMdAdd } from 'react-icons/io';
import { FileSystemSettings } from '@agent-infra/shared';

interface FileSystemSettingsTabProps {
  settings: FileSystemSettings;
  setSettings: (settings: FileSystemSettings) => void;
}

export function FileSystemSettingsTab({
  settings,
  setSettings,
}: FileSystemSettingsTabProps) {
  const [newDirectory, setNewDirectory] = useState('');

  const addDirectory = () => {
    if (!newDirectory || settings.availableDirectories.includes(newDirectory)) {
      return;
    }

    setSettings({
      ...settings,
      availableDirectories: [...settings.availableDirectories, newDirectory],
    });
    setNewDirectory('');
  };

  const removeDirectory = (dir: string) => {
    setSettings({
      ...settings,
      availableDirectories: settings.availableDirectories.filter(
        (d) => d !== dir,
      ),
    });
  };

  return (
    <div className="space-y-4 py-2">
      <div className="text-sm text-default-500 mb-2">
        Configure directories that the application can access. The default is
        your home directory's .omega folder.
      </div>

      <div className="flex gap-2">
        <Input
          label="Add Directory"
          placeholder="/path/to/directory"
          value={newDirectory}
          onChange={(e) => setNewDirectory(e.target.value)}
          className="flex-1"
        />
        <Button
          isIconOnly
          color="primary"
          aria-label="Add directory"
          className="self-end"
          onPress={addDirectory}
        >
          <IoMdAdd />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {settings.availableDirectories.map((dir) => (
          <Chip
            key={dir}
            onClose={() => removeDirectory(dir)}
            variant="flat"
            className="text-xs"
          >
            {dir}
          </Chip>
        ))}
        {settings.availableDirectories.length === 0 && (
          <div className="text-sm text-default-400 italic">
            No custom directories added. Using default directory.
          </div>
        )}
      </div>
    </div>
  );
}
