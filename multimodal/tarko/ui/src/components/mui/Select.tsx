import React from 'react';
import { 
  Select as MuiSelect, 
  SelectProps as MuiSelectProps,
  MenuItem as MuiMenuItem,
  MenuItemProps as MuiMenuItemProps,
  FormControl as MuiFormControl,
  FormControlProps as MuiFormControlProps
} from '@mui/material';

export interface SelectProps extends Omit<MuiSelectProps, 'variant'> {
  variant?: MuiSelectProps['variant'];
}
export interface MenuItemProps extends MuiMenuItemProps {
  children?: React.ReactNode;
}
export interface FormControlProps extends MuiFormControlProps {
  children?: React.ReactNode;
}

/**
 * Select component wrapper for MUI Select
 */
export const Select: React.FC<SelectProps> = (props) => {
  return <MuiSelect {...props} />;
};

/**
 * MenuItem component wrapper for MUI MenuItem
 */
export const MenuItem: React.FC<MenuItemProps> = ({ children, ...props }) => {
  return <MuiMenuItem {...props}>{children}</MuiMenuItem>;
};

/**
 * FormControl component wrapper for MUI FormControl
 */
export const FormControl: React.FC<FormControlProps> = ({ children, ...props }) => {
  return <MuiFormControl {...props}>{children}</MuiFormControl>;
};
