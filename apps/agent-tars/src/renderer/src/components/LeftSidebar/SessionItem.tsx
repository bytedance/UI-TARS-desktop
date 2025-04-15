import { BiCheck, BiEdit } from 'react-icons/bi';
import { BsThreeDotsVertical, BsTrash } from 'react-icons/bs';
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from '@nextui-org/react';
import styles from './index.module.scss';

interface SessionItemProps {
  session: {
    id: string;
    name: string;
  };
  isActive: boolean;
  isEditing: boolean;
  removable: boolean;
  editingName: string;
  onEditingNameChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent, sessionId: string) => void;
  onSaveEdit: (sessionId: string, e: React.MouseEvent) => void;
  onEditSession: (sessionId: string, name: string, e: React.MouseEvent) => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  onClick: () => void;
}

export function SessionItem({
  session,
  isActive,
  isEditing,
  removable,
  editingName,
  onEditingNameChange,
  onKeyDown,
  onSaveEdit,
  onEditSession,
  onDeleteSession,
  onClick,
}: SessionItemProps) {
  return (
    <div
      className={`${styles.messageItem} ${isActive ? styles.active : ''} rounded-md`}
      onClick={onClick}
    >
      {isEditing ? (
        <div
          className={styles.editContainer}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            className={styles.editInput}
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            onKeyDown={(e) => onKeyDown(e, session.id)}
            autoFocus
          />
          <button
            className={styles.editButton}
            onClick={(e) => onSaveEdit(session.id, e)}
          >
            <BiCheck size={18} />
          </button>
        </div>
      ) : (
        <div className={styles.itemContent}>
          <span className={styles.messageTitle}>{session.name}</span>
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <button
                className={styles.moreButton}
                onClick={(e) => e.stopPropagation()}
                aria-label="More options"
              >
                <BsThreeDotsVertical size={16} />
              </button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Session actions"
              disabledKeys={removable ? [] : ['delete']}
              onAction={(key) => {
                if (key === 'edit') {
                  onEditSession(
                    session.id,
                    session.name,
                    new MouseEvent('click') as unknown as React.MouseEvent,
                  );
                } else if (key === 'delete') {
                  onDeleteSession(
                    session.id,
                    new MouseEvent('click') as unknown as React.MouseEvent,
                  );
                }
              }}
            >
              <DropdownItem key="edit" startContent={<BiEdit size={16} />}>
                Edit
              </DropdownItem>
              <DropdownItem
                key="delete"
                className="text-danger"
                color="danger"
                startContent={<BsTrash size={16} />}
              >
                Delete
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      )}
    </div>
  );
}
