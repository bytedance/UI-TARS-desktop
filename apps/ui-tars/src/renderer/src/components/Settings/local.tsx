import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { LocalStore } from '@main/store/validate';

import { VLMSettings, VLMSettingsRef } from './category/vlm';
import { useRef } from 'react';
import { useI18n } from '../../i18n';

interface LocalSettingsDialogProps {
  isOpen: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

export const checkVLMSettings = async () => {
  const settingRpc = window.electron.setting;

  const currentSetting = ((await settingRpc.getSetting()) ||
    {}) as Partial<LocalStore>;
  const { vlmApiKey, vlmBaseUrl, vlmModelName, vlmProvider } = currentSetting;

  if (vlmApiKey && vlmBaseUrl && vlmModelName && vlmProvider) {
    return true;
  }

  return false;
};

export const LocalSettingsDialog = ({
  isOpen,
  onSubmit,
  onClose,
}: LocalSettingsDialogProps) => {
  const { t } = useI18n();
  const vlmSettingsRef = useRef<VLMSettingsRef>(null);

  const handleGetStart = async () => {
    try {
      await vlmSettingsRef.current?.submit();
      onSubmit();
    } catch (error) {
      console.error('Failed to submit settings:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[480]">
        <DialogHeader>
          <DialogTitle>{t('vlmSettings')}</DialogTitle>
          <DialogDescription>{t('vlmDialogDescription')}</DialogDescription>
        </DialogHeader>
        <VLMSettings ref={vlmSettingsRef} />
        <Button className="mt-8 mx-8" onClick={handleGetStart}>
          {t('getStart')}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
