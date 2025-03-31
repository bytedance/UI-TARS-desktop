import { MCPServersSettings } from '@agent-infra/shared';
import { useCallback, useState } from 'react';
import {
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  User,
  Chip,
  Tooltip,
  Switch,
} from '@nextui-org/react';
import { EditIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { AddServerModal, ServerData } from './AddServerModal';

interface FileSystemSettingsTabProps {
  settings: MCPServersSettings;
  setSettings: (settings: MCPServersSettings) => void;
}

export function MCPServersSettingsTab({
  settings,
  setSettings,
}: FileSystemSettingsTabProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAddServer = (serverData: ServerData) => {
    // 处理添加服务器的逻辑
    console.log('New server data:', serverData);
    setIsAddModalOpen(false);
  };

  const columns = [
    { name: 'Name', uid: 'name' },
    { name: 'Type', uid: 'type' },
    { name: 'Description', uid: 'description' },
    { name: 'Status', uid: 'status' }, // error -> msg
    { name: 'Actions', uid: 'actions' },
  ];

  // user config
  const mcpSettings: MCPServersSettings = {
    servers: [
      {
        id: 'longBridge',
        name: 'longBridge',
        description:
          "LongPort OpenAPI provides programmatic quote trading interfaces for investors with research and development capabilities and assists them to build trading or quote strategy analysis tools based on their own investment strategies. The functions fall into the following categories:\n\nTrading - Create, amend, cancel orders, query today's/past orders and transaction details, etc.\nQuotes - Real-time quotes, acquisition of historical quotes, etc.\nPortfolio - Real-time query of the account assets, positions, funds\nReal-time subscription - Provides real-time quotes and push notifications for order status changes",
        command: 'longport-mcp',
        type: 'stdio',
        args: [],
        env: {
          LONGPORT_APP_KEY: 'aaaa',
        },
      },
      {
        id: 'fetch',
        name: 'Fetch',
        type: 'stdio',
        command: 'uvx',
        args: ['mcp-server-fetch'],
      },
      {
        id: 'google-maps',
        type: 'stdio',
        name: 'google-maps',
        status: 'activate',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-google-maps'],
        env: {
          GOOGLE_MAPS_API_KEY: 'aaaa',
        },
      },
    ],
  };

  const renderCell = useCallback((item, columnKey) => {
    const cellValue = item[columnKey];

    switch (columnKey) {
      case 'name':
        return <p>{item.name}</p>;
      case 'type':
        return (
          <Chip size="sm" color="primary">
            {item.type}
          </Chip>
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
            isSelected={item.status === 'activate'}
            color="success"
            aria-label={item.status}
            size="sm"
          />
        );
      case 'actions':
        return (
          <div className="relative flex items-center gap-2">
            <Tooltip content="Edit MCP Server">
              <span className="text-lg text-default-400 cursor-pointer active:opacity-50">
                <EditIcon size={16} />
              </span>
            </Tooltip>
            <Tooltip color="danger" content="Delete MCP Server">
              <span className="text-lg text-danger cursor-pointer active:opacity-50">
                <Trash2Icon size={16} />
              </span>
            </Tooltip>
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
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddServer}
      />
      <Table removeWrapper aria-label="Example table with custom cells">
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn
              key={column.uid}
              align={column.uid === 'actions' ? 'center' : 'start'}
            >
              {column.name}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody items={mcpSettings.servers}>
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
