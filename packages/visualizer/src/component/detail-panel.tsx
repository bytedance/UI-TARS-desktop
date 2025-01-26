/**
 * Copyright (c) 2024-present Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: MIT
 */
'use client';

import { useAllCurrentTasks, useExecutionDump } from '@/component/store';
import { filterBase64Value, timeStr } from '@/utils';
import {
  CameraOutlined,
  CaretRightOutlined,
  FileTextOutlined,
  PauseOutlined,
  ScheduleOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Button, ConfigProvider, Segmented } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import Blackboard from './blackboard';
import './detail-panel.less';
import Player from './player';

const ScreenshotItem = (props: { time: string; img: string }) => {
  return (
    <div className="screenshot-item">
      <div className="screenshot-item-title">{props.time}</div>
      <div>
        <img src={props.img} alt="screenshot" />
      </div>
    </div>
  );
};

const VIEW_TYPE_REPLAY = 'replay';
const VIEW_TYPE_BLACKBOARD = 'blackboard';
const VIEW_TYPE_SCREENSHOT = 'screenshot';
const VIEW_TYPE_JSON = 'json';

const DetailPanel = (): JSX.Element => {
  const startReplay = useExecutionDump((store) => store.startReplay);
  const setStartReplay = useExecutionDump((store) => store.setStartReplay);
  const insightDump = useExecutionDump((store) => store.insightDump);
  const dumpId = useExecutionDump((store) => store._insightDumpLoadId);
  const blackboardViewAvailable = Boolean(insightDump);
  const activeExecution = useExecutionDump((store) => store.activeExecution);
  const activeExecutionId = useExecutionDump(
    (store) => store._executionDumpLoadId,
  );
  const activeTask = useExecutionDump((store) => store.activeTask);
  const setActiveTask = useExecutionDump((store) => store.setActiveTask);
  const [preferredViewType, setViewType] = useState(VIEW_TYPE_REPLAY);
  const animationScripts = useExecutionDump(
    (store) => store.activeExecutionAnimation,
  );
  const allTasks = useAllCurrentTasks();

  let availableViewTypes = [VIEW_TYPE_SCREENSHOT, VIEW_TYPE_JSON];
  if (blackboardViewAvailable) {
    availableViewTypes = [
      VIEW_TYPE_BLACKBOARD,
      VIEW_TYPE_SCREENSHOT,
      VIEW_TYPE_JSON,
    ];
  }
  if (
    activeTask?.type === 'Planning' &&
    animationScripts &&
    animationScripts.length > 0
  ) {
    availableViewTypes.unshift(VIEW_TYPE_REPLAY);
  }

  const viewType =
    availableViewTypes.indexOf(preferredViewType) >= 0
      ? preferredViewType
      : availableViewTypes[0];

  let content;
  if (activeExecution && viewType === VIEW_TYPE_REPLAY) {
    content = <Player key={`${activeExecutionId}`} />;
  } else if (!activeTask) {
    content = <div>please select a task</div>;
  } else if (viewType === VIEW_TYPE_JSON) {
    content = (
      <div className="json-content scrollable">
        {filterBase64Value(JSON.stringify(activeTask, undefined, 2))}
      </div>
    );
  } else if (viewType === VIEW_TYPE_BLACKBOARD) {
    if (blackboardViewAvailable) {
      content = (
        <Blackboard
          uiContext={insightDump!.context}
          highlightElements={insightDump!.matchedElement}
          key={`${dumpId}`}
        />
      );
    } else {
      content = <div>invalid view</div>;
    }
  } else if (viewType === VIEW_TYPE_SCREENSHOT) {
    if (activeTask.recorder?.length) {
      content = (
        <div className="screenshot-item-wrapper scrollable">
          {activeTask.recorder
            .filter((item) => item.screenshot)
            .map((item, index) => {
              const fullTime = timeStr(item.ts);
              const str = item.timing
                ? `${fullTime} / ${item.timing}`
                : fullTime;
              return (
                <ScreenshotItem key={index} time={str} img={item.screenshot!} />
              );
            })}
        </div>
      );
    } else {
      content = <div>no screenshot</div>; // TODO: pretty error message
    }
  }

  useEffect(() => {
    // hit `Tab` to toggle viewType
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const ifShift = e.shiftKey;
        const index = availableViewTypes.indexOf(viewType);
        const nextIndex = ifShift
          ? (index - 1 + availableViewTypes.length) % availableViewTypes.length
          : (index + 1) % availableViewTypes.length;
        setViewType(availableViewTypes[nextIndex]);
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  });

  const validTasks = useMemo(() => {
    return allTasks.filter((task) => Boolean(task?.recorder?.length));
  }, [allTasks]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const playbackSpeed = 2;

    const playNext = () => {
      if (!startReplay) {
        return;
      }

      const currentIndex = activeTask ? validTasks.indexOf(activeTask) : -1;
      const nextIndex = currentIndex + 1;

      if (nextIndex >= validTasks.length) {
        setStartReplay(false);
        return;
      }

      const nextTask = validTasks[nextIndex];
      let delay = 0;

      if (activeTask?.timing?.start && nextTask?.timing?.start) {
        delay =
          (nextTask.timing.start - activeTask.timing.start) / playbackSpeed;
      }

      console.log('nextIndex', nextIndex, nextTask);

      timeoutId = setTimeout(() => {
        setActiveTask(nextTask);
      }, delay);
    };

    if (startReplay && validTasks.length > 0) {
      if (!activeTask) {
        setActiveTask(validTasks[0]);
      } else {
        playNext();
      }
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [startReplay, validTasks, activeTask]);

  const options = availableViewTypes.map((type) => {
    if (type === VIEW_TYPE_REPLAY) {
      return {
        label: 'Replay',
        value: type,
        icon: <VideoCameraOutlined />,
      };
    }
    if (type === VIEW_TYPE_BLACKBOARD) {
      return {
        label: 'Insight',
        value: type,
        icon: <ScheduleOutlined />,
      };
    }
    if (type === VIEW_TYPE_SCREENSHOT) {
      return {
        label: 'Screenshots',
        value: type,
        icon: <CameraOutlined />,
      };
    }
    if (type === VIEW_TYPE_JSON) {
      return {
        label: 'JSON View',
        value: type,
        icon: <FileTextOutlined />,
      };
    }

    return {
      label: 'unknown',
      value: type,
    };
  });

  console.log('startReplay', startReplay);

  return (
    <div className="detail-panel">
      <div className="view-switcher">
        <ConfigProvider
          theme={{
            components: {
              Segmented: {
                itemSelectedBg: '#bfc4da50',
                itemSelectedColor: '#000000',
              },
            },
          }}
        >
          <Button
            type="text"
            icon={startReplay ? <PauseOutlined /> : <CaretRightOutlined />}
            color="default"
            variant="filled"
            style={{
              background: startReplay ? '#bfc4da80' : undefined,
            }}
            onClick={() => {
              setStartReplay(!startReplay);
            }}
          >
            {startReplay ? 'Pause' : 'Start Replay'}
          </Button>
          <Segmented
            options={options}
            value={viewType}
            onChange={(value: any) => {
              setViewType(value);
            }}
          />
        </ConfigProvider>
      </div>
      <div className="detail-content">{content}</div>
    </div>
  );
};

export default DetailPanel;
