import { type ForgeHookMap } from '@electron-forge/shared-types';
import { postMake } from './postMake';

export const hooks: ForgeHookMap = {
  postMake,
};
