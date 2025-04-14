import { MCPServerSetting, MCPSettings } from '@agent-infra/shared';
import { useCallback, useState } from 'react';
import {
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Tooltip,
  Switch,
  Popover,
  PopoverTrigger,
  PopoverContent,
  usePopoverContext,
} from '@nextui-org/react';
import { EditIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { ipcClient } from '@renderer/api';
import useSWRImmutable from 'swr/immutable';
import { AddServerModal } from './AddServerModal';
import { toast } from 'react-hot-toast';
import { VscRemoteExplorer } from 'react-icons/vsc';
import { MdHttp } from 'react-icons/md';
import { RiFolderUnknowLine } from 'react-icons/ri';
import { TbBrandSocketIo } from 'react-icons/tb';

interface FileSystemSettingsTabProps {
  settings: MCPSettings;
  setSettings: (settings: MCPSettings) => void;
}

const fetcher = () => ipcClient.getMcpServers();

// issue: https://github.com/heroui-inc/heroui/issues/2270
const DeletePopoverButtons = ({ onDelete }: { onDelete: () => void }) => {
  const { getBackdropProps } = usePopoverContext();
  return (
    <>
      <Button
        size="sm"
        variant="flat"
        color="default"
        className="min-w-[60px]"
        onPress={(e) => getBackdropProps()?.onClick?.(e as any)}
      >
        Cancel
      </Button>
      <Button
        size="sm"
        color="danger"
        className="min-w-[60px]"
        onClick={async (e) => {
          await onDelete();
          getBackdropProps()?.onClick?.(e as any);
        }}
      >
        Delete
      </Button>
    </>
  );
};

export function MCPServersSettingsTab({
  settings,
}: FileSystemSettingsTabProps) {
  const { data, mutate } = useSWRImmutable('mcp-servers', fetcher);
  const mcpServers = data || settings?.mcpServers || [];

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editServerData, setEditServerData] = useState<MCPServerSetting | null>(
    null,
  );

  const handleAddServer = async (
    mode: 'create' | 'edit',
    serverData: MCPServerSetting,
  ) => {
    console.log('New server data:', serverData);
    if (serverData.status === 'activate') {
      const { error } = await ipcClient.checkServerStatus(serverData);
      if (error) {
        console.error(`MCP Server is not running: ${error}`);
        throw new Error(error);
      }
    }
    if (mode === 'create') {
      await ipcClient.addMcpServer(serverData);
      toast.success('MCP Server added successfully');
    } else {
      await ipcClient.updateMcpServer(serverData);
      toast.success('MCP Server updated successfully');
    }
    mutate();

    setEditServerData(null);
    setIsAddModalOpen(false);
  };

  const handleEditServer = (serverData: MCPServerSetting) => {
    console.log('Edit server data:', serverData);
    setEditServerData(serverData);
    setIsAddModalOpen(true);
    mutate();
  };

  const handleDeleteServer = async (serverData: MCPServerSetting) => {
    console.log('Delete server data:', serverData);
    if (serverData.id) {
      await ipcClient.deleteMcpServer({
        id: serverData.id,
      });
      toast.success(`MCP Server: ${serverData.name} deleted successfully`);
      mutate();
    } else {
      toast.error(`MCP Server: ${serverData.name} not found`);
    }
  };

  const handleActivateServer = async (
    serverData: MCPServerSetting,
    isSelected: boolean,
  ) => {
    console.log('Activate server data:', serverData);
    if (isSelected) {
      const { error } = await ipcClient.checkServerStatus(serverData);
      if (error) {
        console.error(`MCP Server is not running: ${error}`);
        throw new Error(error);
      }
    }

    await ipcClient.updateMcpServer({
      ...serverData,
      status: isSelected ? 'activate' : 'disabled',
    });
    mutate();
  };

  const columns = [
    { name: 'Name', uid: 'name' },
    { name: 'Type', uid: 'type' },
    { name: 'Description', uid: 'description' },
    { name: 'Status', uid: 'status' }, // error -> msg
    { name: 'Actions', uid: 'actions' },
  ];

  const renderCell = useCallback((item, columnKey) => {
    const cellValue = item[columnKey];

    switch (columnKey) {
      case 'name':
        return <p>{item.name}</p>;
      case 'type':
        return (
          <div className="flex items-center gap-2">
            <Chip size="sm" color="default">
              <span className="flex items-center gap-1">
                {item.type === 'stdio' ? (
                  <VscRemoteExplorer size={16} />
                ) : item.type === 'streamable-http' ? (
                  <MdHttp size={16} />
                ) : item.type === 'sse' ? (
                  <TbBrandSocketIo size={16} />
                ) : (
                  <RiFolderUnknowLine size={16} />
                )}
                {item.type}
              </span>
            </Chip>
          </div>
        );
      case 'description':
        return (
          <Tooltip content={item.description}>
            <span className="max-w-[200px] truncate block">
              {item.description}
            </span>
          </Tooltip>
        );
      case 'status':
        return (
          <Switch
            defaultSelected={item.status === 'activate'}
            onValueChange={(isSelected) =>
              handleActivateServer(item, isSelected)
            }
            color="primary"
            aria-label={item.status}
            size="sm"
          />
        );
      case 'actions':
        return (
          <div className="relative flex items-center gap-2">
            <Tooltip content="Edit MCP Server">
              <span className="text-lg text-default-400 cursor-pointer active:opacity-50">
                <EditIcon onClick={() => handleEditServer(item)} size={16} />
              </span>
            </Tooltip>
            <Popover placement="left">
              <PopoverTrigger>
                <span className="text-lg text-danger cursor-pointer active:opacity-50">
                  <Trash2Icon size={16} />
                </span>
              </PopoverTrigger>
              <PopoverContent>
                <div className="px-4 py-3">
                  <div className="text-small font-bold mb-2">
                    Confirm delete
                  </div>
                  <div className="text-tiny mb-2">
                    Are you sure you want to delete the server &quot;{item.name}
                    &quot;?
                  </div>
                  <div className="flex gap-2 justify-end">
                    <DeletePopoverButtons
                      onDelete={() => handleDeleteServer(item)}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        );
      default:
        return cellValue;
    }
  }, []);

  console.log('add modal open', isAddModalOpen);

  return (
    <>
      <div className="flex mb-3">
        <Button
          color="primary"
          startContent={<PlusIcon size={16} />}
          size="sm"
          onPress={() => setIsAddModalOpen(true)}
        >
          Add Server
        </Button>
      </div>
      <AddServerModal
        key={editServerData?.id || 'new'}
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditServerData(null);
        }}
        onSubmit={handleAddServer}
        initialData={editServerData}
        mcpServerNames={mcpServers.map((s) => s.name)}
      />
      <Table removeWrapper aria-label="Example table with custom cells">
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn key={column.uid}>{column.name}</TableColumn>
          )}
        </TableHeader>
        <TableBody items={mcpServers}>
          {(item) => (
            <TableRow key={item.id}>
              {(columnKey) => (
                <TableCell>{renderCell(item, columnKey)}</TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}
