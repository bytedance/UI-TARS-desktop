import { useRef } from 'react';

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
import {
  RemoteComputerSettings,
  RemoteComputerSettingsRef,
} from './category/remoteComputer';
import {
  RemoteBrowserSettings,
  RemoteBrowserSettingsRef,
} from './category/remoteBrowser';
import { Operator } from '@main/store/types';

interface RemoteSettingsDialogProps {
  isOpen: boolean;
  operator: Operator;
  onSubmit: () => void;
  onClose: () => void;
}

export const checkRemoteComputer = async () => {
  const settingRpc = window.electron.setting;

  const currentSetting = ((await settingRpc.getSetting()) ||
    {}) as Partial<LocalStore>;
  const { vlmApiKey, vlmBaseUrl, vlmModelName, vlmProvider } = currentSetting;

  if (vlmApiKey && vlmBaseUrl && vlmModelName && vlmProvider) {
    return true;
  }

  return false;
};

export const checkRemoteBrowser = async () => {
  const settingRpc = window.electron.setting;

  const currentSetting = ((await settingRpc.getSetting()) ||
    {}) as Partial<LocalStore>;
  const { vlmApiKey, vlmBaseUrl, vlmModelName, vlmProvider } = currentSetting;

  if (vlmApiKey && vlmBaseUrl && vlmModelName && vlmProvider) {
    return true;
  }

  return false;
};

const Steps = ({ step, children }: { step: number; children: string }) => {
  return (
    <div className="flex items-center gap-2 font-semibold mb-3">
      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
      <span className="mr-1">{`Step ${step}`}</span>
      <span className="whitespace-nowrap">{children}</span>
    </div>
  );
};

export const RemoteSettingsDialog = ({
  isOpen,
  operator,
  onSubmit,
  onClose,
}: RemoteSettingsDialogProps) => {
  const remoteComputerRef = useRef<RemoteComputerSettingsRef>(null);
  const remoteBrowserRef = useRef<RemoteBrowserSettingsRef>(null);
  const vlmSettingsRef = useRef<VLMSettingsRef>(null);

  const handleGetStart = async () => {
    try {
      if (operator === Operator.RemoteComputer) {
        await remoteComputerRef.current?.submit();
      } else {
        await remoteBrowserRef.current?.submit();
      }
      await vlmSettingsRef.current?.submit();
      onSubmit();
    } catch (error) {
      console.error('Failed to submit settings:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[480px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{operator} Settings</DialogTitle>
          <DialogDescription>
            If you need to use for a long - term and stable period, You can log
            in to the Volcengine FaaS console to upgrade.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-1">
          <Steps step={1}>Read Remote Document</Steps>
          <Button className="w-full ml-4 mb-6" variant={'outline'}>
            View document guide
          </Button>
          <Steps step={2}>Remote Settings</Steps>
          {operator === Operator.RemoteComputer ? (
            <RemoteComputerSettings
              ref={remoteComputerRef}
              className="ml-4 mb-6"
            />
          ) : (
            <RemoteBrowserSettings
              ref={remoteBrowserRef}
              className="ml-4 mb-6"
            />
          )}
          <Steps step={3}>VLM Settings</Steps>
          <VLMSettings ref={vlmSettingsRef} className="ml-4" />
        </div>
        <Button className="mt-8 mx-8" onClick={handleGetStart}>
          Get Start
        </Button>
      </DialogContent>
    </Dialog>
  );
};
