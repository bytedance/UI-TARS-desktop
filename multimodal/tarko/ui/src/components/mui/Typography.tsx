import React from 'react';
import { Typography as MuiTypography, TypographyProps as MuiTypographyProps } from '@mui/material';

export interface TypographyProps extends MuiTypographyProps {
  children?: React.ReactNode;
}

/**
 * Typography component wrapper for MUI Typography
 */
export const Typography: React.FC<TypographyProps> = ({ children, ...props }) => {
  return <MuiTypography {...props}>{children}</MuiTypography>;
};
