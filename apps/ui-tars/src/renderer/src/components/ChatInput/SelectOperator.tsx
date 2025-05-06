/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect } from 'react';
import { Button } from '@renderer/components/ui/button';
import {
  ChevronDown,
  Globe,
  Monitor,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@renderer/components/ui/dropdown-menu';
import { useSetting } from '@renderer/hooks/useSetting';
import { useState } from 'react';
import { BROWSER_OPERATOR, COMPUTER_OPERATOR } from '@renderer/const';
import { useStore } from '@renderer/hooks/useStore';
import { api } from '@renderer/api';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@renderer/components/ui/tooltip';

type Operator = 'nutjs' | 'browser';

const getOperatorIcon = (type: string) => {
  switch (type) {
    case 'nutjs':
      return <Monitor className="h-4 w-4 mr-2" />;
    case 'browser':
      return <Globe className="h-4 w-4 mr-2" />;
    default:
      return <Monitor className="h-4 w-4 mr-2" />;
  }
};

const getOperatorLabel = (type: string) => {
  switch (type) {
    case 'nutjs':
      return COMPUTER_OPERATOR;
    case 'browser':
      return BROWSER_OPERATOR;
    default:
      return COMPUTER_OPERATOR;
  }
};

export const SelectOperator = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const { settings, updateSetting } = useSetting();
  const { browserAvailable } = useStore();
  const [isRetrying, setIsRetrying] = useState(false);

  // Get the current operating mode and automatically
  // switch to computer mode if browser mode is not available
  const currentOperator = browserAvailable
    ? settings.operator || 'nutjs'
    : 'nutjs';

  // If the current setting is browser but the browser
  // is not available, automatically switched to COMPUTER OPERATOR mode.
  useEffect(() => {
    if (settings.operator === 'browser' && !browserAvailable) {
      updateSetting({
        ...settings,
        operator: 'nutjs',
      });
      toast.info(`Automatically switched to ${COMPUTER_OPERATOR} mode`, {
        description: 'Browser mode is not available',
      });
    }
  }, [browserAvailable, settings, updateSetting]);

  const handleSelect = (type: Operator) => {
    if (type === 'browser' && !browserAvailable) {
      return;
    }

    updateSetting({
      ...settings,
      operator: type,
    });
  };

  const handleRetryBrowserCheck = async () => {
    try {
      setIsRetrying(true);
      const available = await api.checkBrowserAvailability();
      if (available) {
        toast.success('Browser detected successfully!', {
          description: 'You can now use Browser mode.',
        });
        setTooltipOpen(false);
      } else {
        toast.error('No browser detected', {
          description: 'Please install Chrome and try again.',
        });
      }
    } catch (error) {
      toast.error('Failed to check browser availability');
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="absolute left-4 bottom-4">
      <DropdownMenu onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            {getOperatorIcon(currentOperator)}
            {getOperatorLabel(currentOperator)}
            <ChevronDown
              className={`h-4 w-4 ml-2 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => handleSelect('nutjs')}>
            <Monitor className="h-4 w-4 mr-2" />
            {COMPUTER_OPERATOR}
            {currentOperator === 'nutjs' && <Check className="h-4 w-4 ml-2" />}
          </DropdownMenuItem>

          <div className="relative">
            <DropdownMenuItem
              onClick={() => browserAvailable && handleSelect('browser')}
              disabled={!browserAvailable}
              className="flex items-center justify-start"
            >
              <Globe className="h-4 w-4 mr-2" />
              {BROWSER_OPERATOR}
              {currentOperator === 'browser' && (
                <Check className="h-4 w-4 ml-2" />
              )}
            </DropdownMenuItem>

            {!browserAvailable && (
              <div
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={(e) => e.stopPropagation()}
              >
                <TooltipProvider>
                  <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
                    <TooltipTrigger asChild>
                      <AlertCircle
                        className="h-4 w-4 text-yellow-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTooltipOpen(true);
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      align="center"
                      className="p-3 bg-white border border-gray-200 shadow-md w-64 z-50"
                    >
                      <div className="flex flex-col gap-3">
                        <p className="text-sm text-gray-700 font-medium text-center">
                          Chrome browser not detected.
                        </p>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRetryBrowserCheck();
                          }}
                          disabled={isRetrying}
                        >
                          {isRetrying ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          {isRetrying ? 'Checking...' : 'Retry Detection'}
                        </Button>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
