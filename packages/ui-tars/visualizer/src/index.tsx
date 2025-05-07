/**
 * Copyright (c) 2024-present Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: MIT
 */
import DetailSide from '@/component/detail-side';
import { EnhancedGroupedActionDump, useExecutionDump } from '@/component/store';
import type { ExecutionTask, GroupedActionDump } from '@midscene/core';
import { Alert, ConfigProvider, Empty, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

import { globalThemeConfig } from './component/color';
import DetailPanel from './component/detail-panel';
import GlobalHoverPreview from './component/global-hover-preview';
import Player from './component/player';
import Sidebar from './component/sidebar';
import Timeline from './component/timeline';
import './index.less';
import { transformComputerUseDataToDump } from './transform';

const { Dragger } = Upload;
let globalRenderCount = 1;

interface ExecutionDumpWithPlaywrightAttributes
  extends EnhancedGroupedActionDump {
  attributes: Record<string, any>;
}

export function Visualizer(props: {
  logoAction?: () => void;
  dumps?: ExecutionDumpWithPlaywrightAttributes[];
  onActiveTaskChange?: (taskIndex: number, task: ExecutionTask) => void;
}): JSX.Element {
  const { onActiveTaskChange, dumps } = props;

  const executionDump = useExecutionDump((store) => store.dump);
  const executionDumpLoadId = useExecutionDump(
    (store) => store._executionDumpLoadId,
  );
  const replayAllMode = useExecutionDump((store) => store.replayAllMode);
  const setReplayAllMode = useExecutionDump((store) => store.setReplayAllMode);
  const replayAllScripts = useExecutionDump(
    (store) => store.allExecutionAnimation,
  );
  const insightWidth = useExecutionDump((store) => store.insightWidth);
  const insightHeight = useExecutionDump((store) => store.insightHeight);
  const setGroupedDump = useExecutionDump((store) => store.setGroupedDump);
  const reset = useExecutionDump((store) => store.reset);
  const [mainLayoutChangeFlag, setMainLayoutChangeFlag] = useState(0);
  const mainLayoutChangedRef = useRef(false);
  const dump = useExecutionDump((store) => store.dump);
  const setOnActiveTaskChange = useExecutionDump(
    (store) => store.setOnActiveTaskChange,
  );

  useEffect(() => {
    if (dumps) {
      setGroupedDump(dumps[0]);
    }
    return () => {
      reset();
    };
  }, []);

  useEffect(() => {
    if (onActiveTaskChange) {
      setOnActiveTaskChange(onActiveTaskChange);
    }
    return () => {
      setOnActiveTaskChange(undefined);
    };
  }, [onActiveTaskChange]);

  useEffect(() => {
    let resizeThrottler = false;
    const onResize = () => {
      // throttle this call
      if (resizeThrottler) {
        return;
      }
      resizeThrottler = true;
      setTimeout(() => {
        resizeThrottler = false;
        setMainLayoutChangeFlag((prev) => prev + 1);
      }, 300);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    capture: false,
    customRequest: () => {
      // noop
    },
    beforeUpload(file) {
      const ifValidFile = file.name.endsWith('web-dump.json'); // || file.name.endsWith('.insight.json');
      if (!ifValidFile) {
        message.error('invalid file extension');
        return false;
      }
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          try {
            const data = JSON.parse(result);
            setGroupedDump(data[0]);
          } catch (e: any) {
            console.error(e);
            message.error('failed to parse dump data', e.message);
          }
        } else {
          message.error('Invalid dump file');
        }
      };
      return false;
    },
  };

  let mainContent: JSX.Element;
  if (dump && dump.executions.length === 0) {
    mainContent = (
      <div className="main-right">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="There is no task info in this dump file."
        />
      </div>
    );
  } else if (!executionDump) {
    mainContent = (
      <div className="main-right uploader-wrapper">
        <Dragger className="uploader" {...uploadProps}>
          <p className="ant-upload-text">
            Click or drag the{' '}
            <b>
              <i>.web-dump.json</i>
            </b>{' '}
            {/* or{' '}
            <b>
              <i>.actions.json</i>
            </b>{' '} */}
            file into this area.
          </p>
          <p className="ant-upload-text">
            The latest dump file is usually placed in{' '}
            <b>
              <i>./midscene_run/report</i>
            </b>
          </p>
          <p className="ant-upload-text">
            All data will be processed locally by the browser. No data will be
            sent to the server.
          </p>
        </Dragger>
      </div>
    );

    // dump
  } else {
    const content = replayAllMode ? (
      <div className="replay-all-mode-wrapper">
        <Player
          key={`${executionDumpLoadId}`}
          replayScripts={replayAllScripts!}
          imageWidth={insightWidth!}
          imageHeight={insightHeight!}
        />
      </div>
    ) : (
      <PanelGroup autoSaveId="page-detail-layout-v2" direction="horizontal">
        <Panel defaultSize={75} maxSize={95}>
          <div className="main-content-container">
            <DetailPanel />
          </div>
        </Panel>
        <PanelResizeHandle />
        <Panel maxSize={95}>
          <div className="main-side">
            <DetailSide />
          </div>
        </Panel>
      </PanelGroup>
    );

    mainContent = (
      <PanelGroup
        autoSaveId="main-page-layout"
        direction="horizontal"
        onLayout={() => {
          if (!mainLayoutChangedRef.current) {
            setMainLayoutChangeFlag((prev) => prev + 1);
          }
        }}
      >
        <Panel maxSize={95} defaultSize={20}>
          <div className="page-side">
            <Sidebar />
          </div>
        </Panel>
        <PanelResizeHandle
          onDragging={(isChanging) => {
            if (mainLayoutChangedRef.current && !isChanging) {
              // not changing anymore
              setMainLayoutChangeFlag((prev) => prev + 1);
            }
            mainLayoutChangedRef.current = isChanging;
          }}
        />
        <Panel defaultSize={80} maxSize={95}>
          <div className="main-right">
            <Timeline key={mainLayoutChangeFlag} />
            <div className="main-content">{content}</div>
          </div>
        </Panel>
      </PanelGroup>
    );
  }

  const [containerHeight, setContainerHeight] = useState('100%');
  useEffect(() => {
    const ifInRspressPage = document.querySelector('.rspress-nav');

    // modify rspress theme
    const navHeightKey = '--rp-nav-height';
    const originalNavHeight = getComputedStyle(
      document.documentElement,
    ).getPropertyValue(navHeightKey);

    if (ifInRspressPage) {
      const newNavHeight = '42px';
      setContainerHeight(`calc(100vh - ${newNavHeight})`);
      document.documentElement.style.setProperty(navHeightKey, newNavHeight);
    }

    // Cleanup function to revert the change
    return () => {
      if (ifInRspressPage) {
        document.documentElement.style.setProperty(
          navHeightKey,
          originalNavHeight,
        );
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      globalRenderCount += 1;
    };
  }, []);

  return (
    <ConfigProvider theme={globalThemeConfig()}>
      <div
        className="page-container"
        key={`render-${globalRenderCount}`}
        style={{ height: containerHeight }}
      >
        {mainContent}
      </div>
      <GlobalHoverPreview />
    </ConfigProvider>
  );
}

function mount(id: string) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`failed to get element for id: ${id}`);
  }
  const root = ReactDOM.createRoot(element);

  const dumpElements = document.querySelectorAll(
    'script[type="ui_tars_web_dump"]',
  );
  if (dumpElements.length === 1 && dumpElements[0].textContent?.trim() === '') {
    const errorPanel = (
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: '100px',
          boxSizing: 'border-box',
        }}
      >
        <Alert
          message="Midscene.js - Error"
          description="There is no dump data to display."
          type="error"
          showIcon
        />
      </div>
    );
    return root.render(errorPanel);
  }

  const reportDump: ExecutionDumpWithPlaywrightAttributes[] = [];

  Array.from(dumpElements)
    .filter((el) => {
      const textContent = el.textContent;
      if (!textContent) {
        console.warn('empty content in script tag', el);
      }
      return !!textContent;
    })
    .forEach((el) => {
      const attributes: Record<string, any> = {};
      Array.from(el.attributes).forEach((attr) => {
        const { name, value } = attr;
        const valueDecoded = decodeURIComponent(value);
        if (name.startsWith('playwright_')) {
          attributes[attr.name] = valueDecoded;
        }
      });

      const content = el.textContent;
      let jsonContent: ExecutionDumpWithPlaywrightAttributes;
      try {
        const contentObj = JSON.parse(content!);
        console.log('contentObj', contentObj);
        console.log('Array.isArray(contentObj)', Array.isArray(contentObj));
        if (Array.isArray(contentObj)) {
          contentObj.forEach((c) => {
            jsonContent = transformComputerUseDataToDump(c);
            jsonContent.attributes = attributes;
            reportDump.push(jsonContent);
          });
        } else {
          jsonContent = transformComputerUseDataToDump(contentObj);
          jsonContent.attributes = attributes;
          reportDump.push(jsonContent);
        }
      } catch (e) {
        console.error(el);
        console.error('failed to parse json content', e);
      }
    });

  root.render(<Visualizer dumps={reportDump} />);
}

export default {
  mount,
  Visualizer,
};
