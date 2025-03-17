import { FiSettings } from 'react-icons/fi';
import { Tooltip } from '@nextui-org/react';
import styles from './index.module.scss';

interface BottomBarProps {
  isCollapsed: boolean;
  onOpenSettings: () => void;
}

export function BottomBar({ isCollapsed, onOpenSettings }: BottomBarProps) {
  return (
    <div
      className={`${styles.bottomBar} ${isCollapsed ? styles.collapsed : ''}`}
    >
      <Tooltip content="Settings" placement={isCollapsed ? 'right' : 'top'}>
        <button className={styles.toggleButton} onClick={onOpenSettings}>
          <FiSettings size={20} />
        </button>
      </Tooltip>
    </div>
  );
}
