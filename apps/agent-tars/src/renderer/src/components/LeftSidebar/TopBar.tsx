import { BiSidebar, BiEdit, BiMoon, BiSun } from 'react-icons/bi';
import { Tooltip } from '@nextui-org/react';
import styles from './index.module.scss';

interface TopBarProps {
  isCollapsed: boolean;
  isDarkMode: boolean;
  onToggleCollapse: () => void;
  onToggleTheme: () => void;
  onAddSession: () => void;
}

export function TopBar({
  isCollapsed,
  isDarkMode,
  onToggleCollapse,
  onToggleTheme,
  onAddSession,
}: TopBarProps) {
  return (
    <div className={`${styles.topbar} ${isCollapsed ? styles.collapsed : ''}`}>
      {!isCollapsed && <span className={styles.title}>Agent TARS</span>}
      <div
        className={`${styles.controls} ${isCollapsed ? styles.controlsCollapsed : ''}`}
      >
        <Tooltip
          content={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          placement={isCollapsed ? 'right' : 'bottom'}
        >
          <button className={styles.toggleButton} onClick={onToggleCollapse}>
            <BiSidebar size={20} />
          </button>
        </Tooltip>
        <Tooltip
          content={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          placement={isCollapsed ? 'right' : 'bottom'}
        >
          <button className={styles.toggleButton} onClick={onToggleTheme}>
            {isDarkMode ? <BiMoon size={18} /> : <BiSun size={18} />}
          </button>
        </Tooltip>
        <Tooltip
          content="New Session"
          placement={isCollapsed ? 'right' : 'bottom'}
        >
          <button className={styles.toggleButton} onClick={onAddSession}>
            <BiEdit size={20} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
