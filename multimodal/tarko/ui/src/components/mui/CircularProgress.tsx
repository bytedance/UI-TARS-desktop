import React from 'react';
import { CircularProgress as MuiCircularProgress, CircularProgressProps as MuiCircularProgressProps } from '@mui/material';

export interface CircularProgressProps extends MuiCircularProgressProps {}

/**
 * CircularProgress component wrapper for MUI CircularProgress
 */
export const CircularProgress: React.FC<CircularProgressProps> = (props) => {
  return <MuiCircularProgress {...props} />;
};
