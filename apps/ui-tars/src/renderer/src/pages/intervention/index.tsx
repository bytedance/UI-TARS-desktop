/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useCallback, useState, useEffect } from 'react';
import { Button } from '@renderer/components/ui/button';
import { Loader, Play, Pause } from 'lucide-react';
import { api } from '@renderer/api';
import { useStore } from '@renderer/hooks/useStore';
import { StatusEnum } from '@ui-tars/sdk';

import './intervention.css';

const HumanIntervention = () => {
  const { status } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (status === StatusEnum.PAUSE && isLoading) {
      setIsLoading(false);
      setIsPaused(true);
    }
    if (status === StatusEnum.RUNNING && isPaused) {
      setIsPaused(false);
    }
  }, [status, isLoading, isPaused]);

  const handleIntervention = useCallback(async () => {
    if (isLoading) return;

    if (isPaused) {
      await api.resumeRun();
      setIsPaused(false);
    } else {
      await api.pauseRun();
      setIsLoading(true);
    }
  }, [isPaused, isLoading]);

  return (
    <div className="intervention-container">
      <Button
        onClick={handleIntervention}
        disabled={isLoading}
        className="intervention-button"
        variant={isPaused ? 'default' : 'outline'}
      >
        {isLoading ? (
          <>
            <Loader className="h-4 w-4 mr-2 loader-icon" />
            <span>暂停中...</span>
          </>
        ) : isPaused ? (
          <>
            <Play className="h-4 w-4 mr-2" />
            <span>继续执行</span>
          </>
        ) : (
          <>
            <Pause className="h-4 w-4 mr-2" />
            <span>人工介入</span>
          </>
        )}
      </Button>
    </div>
  );
};

export default HumanIntervention;
