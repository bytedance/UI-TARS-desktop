import { atom } from 'jotai';
import { apiService } from '../../services/apiService';
import { modelInfoAtom } from '../atoms/ui';

/**
 * Action to fetch and update model information
 */
export const fetchModelInfoAction = atom(
  null,
  async (get, set) => {
    try {
      const info = await apiService.getModelInfo();
      set(modelInfoAtom, info);
      return info;
    } catch (error) {
      console.error('Failed to fetch model info:', error);
      return { provider: 'Unknown', model: 'Unknown' };
    }
  }
);

/**
 * Action to directly set model information (used in replay mode)
 */
export const setModelInfoAction = atom(
  null,
  (get, set, modelInfo: { provider: string; model: string }) => {
    set(modelInfoAtom, modelInfo);
  }
);
