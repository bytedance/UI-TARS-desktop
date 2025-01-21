/**
 * Copyright (c) 2024-present Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: MIT
 */
'use client';

import { mousePointer } from '@/utils';
import type {
  ExecutionDump,
  ExecutionTask,
  ExecutionTaskInsightLocate,
  ExecutionTaskPlanning,
  GroupedActionDump,
  InsightDump,
  Rect,
} from '@midscene/core';
import { paramStr, typeStr } from '@midscene/web/ui-utils';

import './player.less';

/**
 * Copyright (c) 2024-present Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: MIT
 */

export interface CameraState {
  left: number;
  top: number;
  width: number;
  pointerLeft: number;
  pointerTop: number;
}

export type TargetCameraState = Omit<
  CameraState,
  'pointerLeft' | 'pointerTop'
> &
  Partial<Pick<CameraState, 'pointerLeft' | 'pointerTop'>>;

export interface AnimationScript {
  type:
    | 'img'
    | 'insight'
    | 'clear-insight'
    | 'pointer'
    | 'spinning-pointer'
    | 'sleep';
  img?: string;
  camera?: TargetCameraState;
  insightDump?: InsightDump;
  duration: number;
  insightCameraDuration?: number;
  title?: string;
  subTitle?: string;
}

const stillDuration = 900;
const actionSpinningPointerDuration = 300;
const stillAfterInsightDuration = 300;
const locateDuration = 800;
const actionDuration = 1000;
const clearInsightDuration = 200;

// fit rect to camera
export const cameraStateForRect = (
  rect: Rect,
  imageWidth: number,
  imageHeight: number,
): TargetCameraState => {
  const canvasRatio = imageWidth / imageHeight;
  const rectRatio = rect.width / rect.height;

  let rectWidthOnPage: number;

  if (rectRatio >= canvasRatio) {
    rectWidthOnPage = rect.width;
  } else {
    rectWidthOnPage = (rect.height / imageHeight) * imageWidth;
  }

  const cameraPaddingRatio =
    rectWidthOnPage > 400 ? 0.1 : rectWidthOnPage > 50 ? 0.2 : 0.3;
  const cameraWidth = Math.min(
    imageWidth,
    rectWidthOnPage + imageWidth * cameraPaddingRatio * 2,
  );
  const cameraHeight = cameraWidth * (imageHeight / imageWidth);

  let left = Math.min(
    rect.left - imageWidth * cameraPaddingRatio,
    imageWidth - cameraWidth,
  );
  left = Math.max(left, 0);

  let top = Math.min(
    rect.top - imageHeight * cameraPaddingRatio,
    imageHeight - cameraHeight,
  );
  top = Math.max(top, 0);

  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(cameraWidth),
  };
};

export const mergeTwoCameraState = (
  cameraState1: TargetCameraState,
  cameraState2: TargetCameraState,
): TargetCameraState => {
  const newLeft = Math.min(cameraState1.left, cameraState2.left);
  const newTop = Math.min(cameraState1.top, cameraState2.top);
  const newRight = Math.max(
    cameraState1.left + cameraState1.width,
    cameraState2.left + cameraState2.width,
  );
  const newWidth = newRight - newLeft;
  return {
    left: newLeft,
    top: newTop,
    width: newWidth,
  };
};

export interface ReplayScriptsInfo {
  scripts: AnimationScript[];
  width: number;
  height: number;
  sdkVersion?: string;
  modelName?: string;
}

export const allScriptsFromDump = (
  dump: GroupedActionDump,
): ReplayScriptsInfo | null => {
  // find out the width and height of the screenshot
  let width = 0;
  let height = 0;
  let sdkVersion = '';
  let modelName = '';

  dump.executions.forEach((execution) => {
    execution.tasks.forEach((task) => {
      const insightTask = task as ExecutionTaskInsightLocate;
      if (insightTask.log?.dump?.context?.size?.width) {
        width = insightTask.log?.dump?.context?.size?.width;
        height = insightTask.log?.dump?.context?.size?.height;
      }

      if (insightTask.log?.dump?.sdkVersion) {
        sdkVersion = insightTask.log.dump.sdkVersion;
      }

      if (insightTask.log?.dump?.model_name) {
        modelName = insightTask.log.dump.model_name;
      }
    });
  });

  if (!width || !height) {
    console.error('width or height is missing in dump file');
    return null;
  }

  const allScripts: AnimationScript[] = [];
  dump.executions.forEach((execution) => {
    const scripts = generateAnimationScripts(execution, -1, width, height);
    if (scripts) {
      allScripts.push(...scripts);
    }
  });

  const allScriptsWithoutIntermediateDoneFrame = allScripts.filter(
    (script, index) => {
      if (index !== allScripts.length - 1 && script.title === 'Done') {
        return false;
      }
      return true;
    },
  );

  return {
    scripts: allScriptsWithoutIntermediateDoneFrame,
    width,
    height,
    sdkVersion,
    modelName,
  };
};

export const generateAnimationScripts = (
  execution: ExecutionDump | null,
  task: ExecutionTask | number,
  imageWidth: number,
  imageHeight: number,
): AnimationScript[] | null => {
  if (!execution || !execution.tasks.length) return null;
  if (imageWidth === 0 || imageHeight === 0) {
    return null;
  }

  let tasksIncluded: ExecutionTask[] = [];
  if (task === -1) {
    tasksIncluded = execution.tasks;
  } else {
    // find all tasks before next planning task
    const startIndex = execution.tasks.findIndex((t) => t === task);

    if (startIndex === -1) {
      console.error('task not found, cannot generate animation scripts');
      return null;
    }

    if (startIndex === execution.tasks.length - 1) {
      return null;
    }

    for (let i = startIndex; i < execution.tasks.length; i++) {
      if (i > startIndex && execution.tasks[i].type === 'Planning') {
        break;
      }

      tasksIncluded.push(execution.tasks[i]);
    }
  }

  // remove assertion and query tasks
  tasksIncluded = tasksIncluded.filter(
    (task) => task.type !== 'Assertion' && task.type !== 'Query',
  );

  if (tasksIncluded.length === 0) {
    return null;
  }

  const fullPageCameraState = cameraStateForRect(
    {
      left: 0,
      top: 0,
      width: imageWidth,
      height: imageHeight,
    },
    imageWidth,
    imageHeight,
  );

  const pointerScript = (
    img: string,
    title: string,
    subTitle: string,
  ): AnimationScript => {
    return {
      type: 'pointer',
      img,
      duration: 0,
      title,
      subTitle,
    };
  };

  const scripts: AnimationScript[] = [];
  let insightCameraState: TargetCameraState | undefined = undefined;
  let currentCameraState: TargetCameraState = fullPageCameraState;
  let insightOnTop = false;
  const taskCount = tasksIncluded.length;
  let initSubTitle = '';
  let errorStateFlag = false;
  tasksIncluded.forEach((task, index) => {
    if (errorStateFlag) return;

    if (task.type === 'Planning') {
      const planningTask = task as ExecutionTaskPlanning;
      if (planningTask.recorder && planningTask.recorder.length > 0) {
        scripts.push({
          type: 'img',
          img: planningTask.recorder?.[0]?.screenshot,
          camera: fullPageCameraState,
          duration: stillDuration,
          title: typeStr(task),
          subTitle: paramStr(task),
        });
        initSubTitle = paramStr(task);
      }
    } else if (task.type === 'Insight') {
      const insightTask = task as ExecutionTaskInsightLocate;
      const resultElement = insightTask.output?.element;
      const title = typeStr(task);
      const subTitle = paramStr(task);
      if (resultElement?.rect) {
        insightCameraState = {
          ...cameraStateForRect(resultElement.rect, imageWidth, imageHeight),
          pointerLeft: resultElement.center[0],
          pointerTop: resultElement.center[1],
        };
      }
      if (insightTask.log?.dump) {
        const insightDump = insightTask.log.dump;
        if (!insightDump?.context?.screenshotBase64) {
          throw new Error('insight dump is required');
        }
        const insightContentLength = insightDump.context.content.length;

        if (insightDump.context.screenshotBase64WithElementMarker) {
          // show the original screenshot first
          scripts.push({
            type: 'img',
            img: insightDump.context.screenshotBase64,
            duration: stillAfterInsightDuration,
            title,
            subTitle,
          });
        }

        let cameraState: TargetCameraState | undefined = undefined;
        if (currentCameraState === fullPageCameraState) {
          cameraState = undefined;
        } else if (!insightCameraState) {
          cameraState = undefined;
        } else {
          cameraState = mergeTwoCameraState(
            currentCameraState,
            insightCameraState,
          );
        }

        scripts.push({
          type: 'insight',
          img:
            insightDump.context.screenshotBase64WithElementMarker ||
            insightDump.context.screenshotBase64,
          insightDump: insightDump,
          camera: cameraState,
          duration:
            insightContentLength > 20 ? locateDuration : locateDuration * 0.5,
          insightCameraDuration: locateDuration,
          title,
          subTitle,
        });

        scripts.push({
          type: 'sleep',
          duration: stillAfterInsightDuration,
          title,
          subTitle,
        });
        insightOnTop = true;
      }
    } else if (
      task.type === 'Action' &&
      task.subType !== 'FalsyConditionStatement'
    ) {
      const title = typeStr(task);
      const subTitle = paramStr(task);
      scripts.push(pointerScript(mousePointer, title, subTitle));

      currentCameraState = insightCameraState ?? fullPageCameraState;
      scripts.push({
        type: 'img',
        img: task.recorder?.[0]?.screenshot,
        duration: actionDuration,
        camera:
          task.subType === 'Sleep' ? fullPageCameraState : insightCameraState,
        title,
        subTitle,
      });

      if (insightOnTop) {
        scripts.push({
          type: 'clear-insight',
          duration: clearInsightDuration,
          title,
          subTitle,
        });
        insightOnTop = false;
      }

      // if this is the last task, we don't need to wait
      const imgStillDuration = index < taskCount - 1 ? stillDuration : 0;

      if (task.recorder?.[1]?.screenshot) {
        scripts.push({
          type: 'spinning-pointer',
          duration: actionSpinningPointerDuration,
          title,
          subTitle,
        });

        scripts.push(pointerScript(mousePointer, title, subTitle));
        scripts.push({
          type: 'img',
          img: task.recorder?.[1]?.screenshot,
          duration: imgStillDuration,
          title,
          subTitle,
        });
      } else {
        scripts.push({
          type: 'sleep',
          duration: imgStillDuration,
          title,
          subTitle,
        });
      }
    }
    if (task.status !== 'finished') {
      errorStateFlag = true;
      const errorTitle = typeStr(task);
      const errorMsg = task.error || 'unknown error';
      const errorSubTitle =
        errorMsg.indexOf('NOT_IMPLEMENTED_AS_DESIGNED') > 0
          ? 'Further actions cannot be performed in the current environment'
          : errorMsg;
      scripts.push({
        type: 'img',
        img:
          task.recorder && task.recorder.length > 0
            ? task.recorder[task.recorder.length - 1].screenshot
            : '',
        camera: fullPageCameraState,
        duration: stillDuration,
        title: errorTitle,
        subTitle: errorSubTitle,
      });
      return;
    }
  });

  // end, back to full page
  if (!errorStateFlag) {
    scripts.push({
      title: 'Done',
      subTitle: initSubTitle,
      type: 'img',
      duration: stillDuration,
      camera: fullPageCameraState,
    });
  }

  // console.log('replayscripts');
  // console.log(scripts, tasksIncluded);

  return scripts;
};
