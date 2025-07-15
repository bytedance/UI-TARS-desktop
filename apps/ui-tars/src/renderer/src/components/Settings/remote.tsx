import { useEffect, useRef, useState } from 'react';
import { SquareArrowOutUpRight } from 'lucide-react';

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
import { Operator } from '@main/store/types';
import { cn } from '@renderer/utils';

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

const Steps = ({
  step,
  classname,
  children,
}: {
  step: number;
  classname?: string;
  children: string;
}) => {
  return (
    <div
      className={cn('flex items-center gap-2 font-semibold mb-3', classname)}
    >
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
  const vlmSettingsRef = useRef<VLMSettingsRef>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollStatus, setScrollStatus] = useState({
    isAtTop: true,
    isAtBottom: false,
  });

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtTop = scrollTop <= 0;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 1;

    setScrollStatus({ isAtTop, isAtBottom });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const container = scrollContainerRef.current;
      if (container) {
        container.addEventListener('scroll', handleScroll);
        // 初始检查
        handleScroll();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      const container = scrollContainerRef.current;
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isOpen]);

  const handleGetStart = async () => {
    try {
      if (operator === Operator.RemoteComputer) {
        await remoteComputerRef.current?.submit();
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
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-scroll px-1 relative"
        >
          <div
            className={`sticky top-0 left-0 right-0 h-10 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none transition-opacity duration-200 ${
              scrollStatus.isAtTop ? 'opacity-0' : 'opacity-100'
            }`}
          />
          <Steps step={1} classname="mt-[-40px]">
            Read Remote Document
          </Steps>
          <div className="ml-4 mb-6 bg-[#f6f9ffff] p-5 rounded-md">
            <Button className="w-full" variant={'outline'}>
              View document guide
              <SquareArrowOutUpRight />
            </Button>
          </div>
          <Steps step={2}>Remote Settings</Steps>
          {operator === Operator.RemoteComputer && (
            <RemoteComputerSettings
              ref={remoteComputerRef}
              className="ml-4 mb-6 bg-[#f6f9ffff] p-5 rounded-md"
            />
          )}
          <Steps step={3}>VLM Settings</Steps>
          <VLMSettings
            ref={vlmSettingsRef}
            className="ml-4 bg-[#f6f9ffff] p-5 rounded-md"
          />
          <div
            className={`sticky bottom-[-1px] left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none transition-opacity duration-200 ${
              scrollStatus.isAtBottom ? 'opacity-0' : 'opacity-100'
            }`}
          />
        </div>
        <Button className="mt-8 mx-8" onClick={handleGetStart}>
          Get Start
        </Button>
      </DialogContent>
    </Dialog>
  );
};
