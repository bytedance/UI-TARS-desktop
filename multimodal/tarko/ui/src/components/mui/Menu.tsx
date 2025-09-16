import React from 'react';
import { 
  Menu as MuiMenu, 
  MenuProps as MuiMenuProps,
  IconButton as MuiIconButton,
  IconButtonProps as MuiIconButtonProps,
  Divider as MuiDivider,
  DividerProps as MuiDividerProps
} from '@mui/material';

export interface MenuProps extends MuiMenuProps {
  children?: React.ReactNode;
}
export interface IconButtonProps extends MuiIconButtonProps {
  children?: React.ReactNode;
}
export interface DividerProps extends MuiDividerProps {}

/**
 * Menu component wrapper for MUI Menu
 */
export const Menu: React.FC<MenuProps> = ({ children, ...props }) => {
  return <MuiMenu {...props}>{children}</MuiMenu>;
};

/**
 * IconButton component wrapper for MUI IconButton
 */
export const IconButton: React.FC<IconButtonProps> = ({ children, ...props }) => {
  return <MuiIconButton {...props}>{children}</MuiIconButton>;
};

/**
 * Divider component wrapper for MUI Divider
 */
export const Divider: React.FC<DividerProps> = (props) => {
  return <MuiDivider {...props} />;
};
