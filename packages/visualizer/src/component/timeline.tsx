/**
 * Copyright (c) 2024-present Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: MIT
 */
import type { ExecutionRecorderItem, ExecutionTask } from '@midscene/core';
import * as PIXI from 'pixi.js-legacy';
/* eslint-disable max-lines */
import { useEffect, useMemo, useRef } from 'react';

import { useAllCurrentTasks, useExecutionDump } from './store';
import './timeline.less';

interface TimelineItem {
  id: string;
  img: string;
  timeOffset: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface HighlightParam {
  mouseX: number;
  mouseY: number;
  item: TimelineItem;
}

interface HighlightMask {
  startMs: number;
  endMs: number;
}

// Function to clone a sprite
function cloneSprite(sprite: PIXI.Sprite) {
  const clonedSprite = new PIXI.Sprite(sprite.texture);

  // Copy properties
  clonedSprite.position.copyFrom(sprite.position);
  clonedSprite.scale.copyFrom(sprite.scale);
  clonedSprite.rotation = sprite.rotation;
  clonedSprite.alpha = sprite.alpha;
  clonedSprite.visible = sprite.visible;

  return clonedSprite;
}

const TimelineWidget = (props: {
  screenshots: TimelineItem[];
  onHighlight?: (param: HighlightParam) => any;
  onUnhighlight?: () => any;
  onTap?: (param: TimelineItem) => any;
  highlightMask?: HighlightMask;
  hoverMask?: HighlightMask;
}): JSX.Element => {
  const titleBg = 0xf8f8f8; // @title-bg
  const sideBg = 0xffffff;
  const gridTextColor = 0;
  const shotBorderColor = 0x777777;
  const gridLineColor = 0xe5e5e5; // @border-color
  const gridHighlightColor = 0xbfc4da; // @selected-bg
  const highlightMaskAlpha = 0.6;
  const timeContentFontSize = 20;
  const commonPadding = 12;

  const domRef = useRef<HTMLDivElement>(null); // Should be HTMLDivElement not HTMLInputElement
  const app = useMemo<PIXI.Application>(
    () =>
      new PIXI.Application({
        backgroundColor: sideBg,
      }),
    [],
  );

  const gridsContainer = useMemo(() => new PIXI.Container(), []);
  const screenshotsContainer = useMemo(() => new PIXI.Container(), []);
  const highlightMaskContainer = useMemo(() => new PIXI.Container(), []);
  const containerUpdaterRef = useRef(
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    (
      _s: number | undefined,
      _e: number | undefined,
      _hs: number | undefined,
      _he: number | undefined,
    ) => {},
  );
  const indicatorContainer = useMemo(() => new PIXI.Container(), []);

  const allScreenshots = props.screenshots || [];
  const maxTime =
    allScreenshots.length > 0
      ? allScreenshots[allScreenshots.length - 1].timeOffset
      : 0;

  const sizeRatio = 2;

  const timeTextTop = commonPadding;
  const timeTitleBottom = timeTextTop * 2 + timeContentFontSize;
  const hoverMaskColor = 0xdcdcdc; // @hover-bg
  const hoverMaskAlpha = 0.3;

  const closestScreenshotItemOnXY = (x: number, _y: number) => {
    // find out the screenshot that is closest to the mouse on the left
    let closestScreenshot: TimelineItem | undefined; // already sorted
    let closestIndex = -1;
    for (let i = 0; i < allScreenshots.length; i++) {
      const shot = allScreenshots[i];
      if (shot.x! <= x) {
        closestScreenshot = allScreenshots[i];
        closestIndex = i;
      } else {
        break;
      }
    }
    return {
      closestScreenshot,
      closestIndex,
    };
  };

  useMemo(() => {
    const { startMs, endMs } = props.highlightMask || {};
    const { startMs: hoverStartMs, endMs: hoverEndMs } = props.hoverMask || {};
    const fn = containerUpdaterRef.current;
    fn(startMs, endMs, hoverStartMs, hoverEndMs);
  }, [
    props.highlightMask?.startMs,
    props.highlightMask?.endMs,
    props.hoverMask?.startMs,
    props.hoverMask?.endMs,
  ]);

  useEffect(() => {
    Promise.resolve(
      (async () => {
        if (!domRef.current) {
          return;
        }

        // width of domRef
        const { clientWidth, clientHeight } = domRef.current;
        const canvasWidth = clientWidth * sizeRatio;
        const canvasHeight = clientHeight * sizeRatio;

        let singleGridWidth = 100 * sizeRatio;
        let gridCount = Math.floor(canvasWidth / singleGridWidth);
        const stepCandidate = [
          50, 100, 200, 300, 500, 1000, 2000, 3000, 5000, 6000, 8000, 9000,
          10000, 20000, 30000, 40000, 60000, 90000, 12000, 300000,
        ];
        let timeStep = stepCandidate[0];
        for (let i = stepCandidate.length - 1; i >= 0; i--) {
          if (gridCount * stepCandidate[i] >= maxTime) {
            timeStep = stepCandidate[i];
          }
        }
        const gridRatio = maxTime / (gridCount * timeStep);
        if (gridRatio <= 0.8) {
          singleGridWidth = Math.floor(singleGridWidth * (1 / gridRatio) * 0.9);
          gridCount = Math.floor(canvasWidth / singleGridWidth);
        }

        const leftForTimeOffset = (timeOffset: number) => {
          return Math.floor((singleGridWidth * timeOffset) / timeStep);
        };
        const timeOffsetForLeft = (left: number) => {
          return Math.floor((left * timeStep) / singleGridWidth);
        };

        app.renderer.resize(canvasWidth, canvasHeight);

        if (!domRef.current) {
          app.destroy();
          return;
        }
        domRef.current.replaceChildren(
          app.view as unknown as HTMLCanvasElement,
        );

        const pixiTextForNumber = (num: number) => {
          const textContent = `${num}ms`;
          const text = new PIXI.Text(`${textContent}`, {
            fontSize: timeContentFontSize,
            fill: gridTextColor,
          });
          return text;
        };

        // drawing vertical grids, texts, title bg
        gridsContainer.removeChildren();
        const titleBgSection = new PIXI.Graphics();
        titleBgSection.beginFill(titleBg);
        titleBgSection.drawRect(0, 0, canvasWidth, timeTitleBottom);
        titleBgSection.endFill();
        gridsContainer.addChild(titleBgSection as any);
        const titleBottomBorder = new PIXI.Graphics();
        titleBottomBorder.beginFill(gridLineColor);
        titleBottomBorder.drawRect(0, timeTitleBottom, canvasWidth, sizeRatio);
        titleBottomBorder.endFill();
        gridsContainer.addChild(titleBottomBorder as any);

        const gridHeight = canvasHeight;
        for (let i = 1; i <= gridCount; i++) {
          const gridLine = new PIXI.Graphics();
          const gridLineLeft = leftForTimeOffset(i * timeStep);
          gridLine.beginFill(gridLineColor);
          gridLine.drawRect(gridLineLeft, 0, sizeRatio, gridHeight);
          gridLine.endFill();
          gridsContainer.addChild(gridLine as any);

          // mark text at the left of each line
          const text = pixiTextForNumber(i * timeStep); // `${i * timeStep}ms`;
          // measure text width
          const textLeft = gridLineLeft - text.width - commonPadding;

          text.x = textLeft;
          text.y = timeTextTop;

          gridsContainer.addChild(text as any);
        }
        app.stage.addChild(gridsContainer as any);

        if (!allScreenshots.length) {
          console.warn('No screenshots found');
          return;
        }

        const shotContainers: PIXI.Container[] = [];

        // draw all screenshots
        screenshotsContainer.removeChildren();
        const screenshotTop = timeTitleBottom + commonPadding * 1.5;
        const screenshotMaxHeight =
          canvasHeight - screenshotTop - commonPadding * 1.5;
        allScreenshots.forEach((screenshot, index) => {
          const container = new PIXI.Container();
          shotContainers.push(container);
          app.stage.addChild(container as any);
          const img = new Image();
          img.src = screenshot.img;
          img.onload = () => {
            const screenshotTexture = PIXI.Texture.from(img);
            const screenshotSprite = new PIXI.Sprite(screenshotTexture);

            // get width / height of img
            const originalWidth = img.width;
            const originalHeight = img.height;

            const screenshotHeight = screenshotMaxHeight;
            const screenshotWidth = Math.floor(
              (screenshotHeight / originalHeight) * originalWidth,
            );

            const screenshotX = leftForTimeOffset(screenshot.timeOffset);
            allScreenshots[index].x = screenshotX;
            allScreenshots[index].y = screenshotTop;
            allScreenshots[index].width = screenshotWidth;
            allScreenshots[index].height = screenshotMaxHeight;

            const border = new PIXI.Graphics();
            border.lineStyle(sizeRatio, shotBorderColor, 1);
            border.drawRect(
              screenshotX,
              screenshotTop,
              screenshotWidth,
              screenshotMaxHeight,
            );
            border.endFill();
            container.addChild(border as any);

            screenshotSprite.x = screenshotX;
            screenshotSprite.y = screenshotTop;
            screenshotSprite.width = screenshotWidth;
            screenshotSprite.height = screenshotMaxHeight;
            container.addChild(screenshotSprite as any);
          };
        });

        const highlightMaskUpdater = (
          start: number | undefined,
          end: number | undefined,
          hoverStart: number | undefined,
          hoverEnd: number | undefined,
        ) => {
          highlightMaskContainer.removeChildren();

          const mask = (
            start: number | undefined,
            end: number | undefined,
            color: number,
            alpha: number,
          ) => {
            if (
              typeof start === 'undefined' ||
              typeof end === 'undefined' ||
              end === 0
            ) {
              return;
            }
            const leftBorder = new PIXI.Graphics();
            leftBorder.beginFill(gridHighlightColor, 1);
            leftBorder.drawRect(
              leftForTimeOffset(start),
              0,
              sizeRatio,
              canvasHeight,
            );
            leftBorder.endFill();
            highlightMaskContainer.addChild(leftBorder as any);

            const rightBorder = new PIXI.Graphics();
            rightBorder.beginFill(gridHighlightColor, 1);
            rightBorder.drawRect(
              leftForTimeOffset(end),
              0,
              sizeRatio,
              canvasHeight,
            );
            rightBorder.endFill();
            highlightMaskContainer.addChild(rightBorder as any);

            const mask = new PIXI.Graphics();
            mask.beginFill(gridHighlightColor, alpha);
            mask.drawRect(
              leftForTimeOffset(start),
              0,
              leftForTimeOffset(end) - leftForTimeOffset(start),
              canvasHeight,
            );
            mask.endFill();
            highlightMaskContainer.addChild(mask as any);
          };

          mask(start, end, gridHighlightColor, highlightMaskAlpha);
          mask(hoverStart, hoverEnd, hoverMaskColor, hoverMaskAlpha);
        };
        highlightMaskUpdater(
          props.highlightMask?.startMs,
          props.highlightMask?.endMs,
          0,
          0,
        );
        containerUpdaterRef.current = highlightMaskUpdater;

        // keep tracking the position of the mouse moving above the canvas
        app.stage.interactive = true;
        const onPointerMove = (event: PointerEvent) => {
          const x = event.offsetX * sizeRatio;
          const y = event.offsetY * sizeRatio;
          indicatorContainer.removeChildren();

          // find out the screenshot that is closest to the mouse on the left
          const { closestScreenshot, closestIndex } = closestScreenshotItemOnXY(
            x,
            y,
          );
          if (closestIndex < 0) {
            props.onUnhighlight?.();
            return;
          }
          const closestContainer = shotContainers[closestIndex];

          // highlight the items in closestContainer
          closestContainer.children.forEach((child) => {
            if (child instanceof PIXI.Sprite) {
              // border
              const newSpirit = new PIXI.Graphics();
              newSpirit.lineStyle(2, gridHighlightColor, 1);
              newSpirit.drawRect(
                x, // follow mouse
                closestScreenshot?.y!,
                closestScreenshot?.width!,
                closestScreenshot?.height!,
              );
              newSpirit.endFill();
              indicatorContainer.addChild(newSpirit as any);

              const screenshotSpirit = cloneSprite(child);
              screenshotSpirit.x = x;
              indicatorContainer.addChild(screenshotSpirit as any);
            }
          });

          // cursor line
          const indicator = new PIXI.Graphics();
          indicator.beginFill(gridHighlightColor, 1);
          indicator.drawRect(x - 1, 0, 3, canvasHeight);
          indicator.endFill();
          indicatorContainer.addChild(indicator as any);

          // time string
          const text = pixiTextForNumber(timeOffsetForLeft(x));
          text.x = x + 5;
          text.y = timeTextTop;
          const textBg = new PIXI.Graphics();
          textBg.beginFill(titleBg, 1);
          textBg.drawRect(text.x, text.y, text.width + 10, text.height);
          textBg.endFill();

          indicatorContainer.addChild(textBg as any);
          indicatorContainer.addChild(text as any);

          props.onHighlight?.({
            mouseX: x / sizeRatio,
            mouseY: y / sizeRatio,
            item: closestScreenshot!,
          });
        };
        // app.stage.on('pointermove', onPointerMove);
        // on pointer move out
        const onPointerOut = () => {
          indicatorContainer.removeChildren();
          props.onUnhighlight?.();
        };

        const onPointerTap = (event: PointerEvent) => {
          const x = event.offsetX * sizeRatio;
          const y = event.offsetY * sizeRatio;
          const { closestScreenshot } = closestScreenshotItemOnXY(x, y);
          if (closestScreenshot) {
            props.onTap?.(closestScreenshot);
          }
        };

        app.stage.addChild(screenshotsContainer as any);
        app.stage.addChild(highlightMaskContainer as any);
        app.stage.addChild(indicatorContainer as any);

        const canvas = app.view as unknown as HTMLCanvasElement;
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerout', onPointerOut);
        canvas.addEventListener('pointerdown', onPointerTap);
      })(),
    );
  }, []);

  return <div className="timeline-canvas-wrapper" ref={domRef} />;
};

const Timeline = () => {
  const allTasks = useAllCurrentTasks();
  const wrapper = useRef<HTMLDivElement>(null);
  const setActiveTask = useExecutionDump((store) => store.setActiveTask);
  const activeTask = useExecutionDump((store) => store.activeTask);
  const hoverTask = useExecutionDump((store) => store.hoverTask);
  const setHoverTask = useExecutionDump((store) => store.setHoverTask);
  const setHoverPreviewConfig = useExecutionDump(
    (store) => store.setHoverPreviewConfig,
  );

  // should be first task time ?
  let startingTime = -1;
  let idCount = 1;
  const idTaskMap: Record<string, ExecutionTask> = {};
  const allScreenshots: TimelineItem[] = allTasks
    .reduce<(ExecutionRecorderItem & { id: string })[]>((acc, current) => {
      const recorders = current.recorder || [];
      recorders.forEach((item) => {
        if (startingTime === -1 || startingTime > item.ts) {
          startingTime = item.ts;
        }
      });
      if (
        current.timing?.start &&
        (startingTime === -1 || startingTime > current.timing.start)
      ) {
        startingTime = current.timing.start;
      }
      const recorderItemWithId = recorders.map((item) => {
        const idStr = `id_${idCount++}`;
        idTaskMap[idStr] = current;
        return {
          ...item,
          id: idStr,
        };
      });
      return acc.concat(recorderItemWithId || []);
    }, [])
    .filter((item) => {
      return item.screenshot;
    })
    .map((recorderItem) => {
      return {
        id: recorderItem.id,
        img: recorderItem.screenshot!,
        timeOffset: recorderItem.ts - startingTime,
      };
    })
    .sort((a, b) => a.timeOffset - b.timeOffset);

  const itemOnTap = (item: TimelineItem) => {
    const task = idTaskMap[item.id];
    if (task) {
      setActiveTask(task);
    }
  };

  const onHighlightItem = (param: HighlightParam) => {
    const { mouseX, item } = param;
    const refBounding = wrapper.current?.getBoundingClientRect();
    const task = idTaskMap[item.id];
    if (task) {
      setHoverTask(task, item.timeOffset + startingTime);
      setHoverPreviewConfig({
        x: mouseX + (refBounding?.left || 0),
        y: (refBounding?.bottom || 1) - 1,
      });
    } else {
      setHoverTask(null);
      setHoverPreviewConfig(null);
    }
  };

  const unhighlight = () => {
    setHoverTask(null);
    setHoverPreviewConfig(null);
  };

  const maskConfigForTask = (
    task?: ExecutionTask | null,
  ): HighlightMask | undefined => {
    if (!task) {
      return undefined;
    }
    return task.timing?.start && task.timing?.end
      ? {
          startMs: task.timing.start - startingTime || 0,
          endMs: task.timing.end - startingTime || 0,
        }
      : undefined;
  };

  const highlightMaskConfig = maskConfigForTask(activeTask);
  const hoverMaskConfig = maskConfigForTask(hoverTask);

  const itemIdList = allScreenshots.map((item) => item.id).join(',');
  return (
    <div className="timeline-wrapper" ref={wrapper}>
      <TimelineWidget
        key={itemIdList}
        screenshots={allScreenshots}
        onTap={itemOnTap}
        onHighlight={onHighlightItem}
        onUnhighlight={unhighlight}
        highlightMask={highlightMaskConfig}
        hoverMask={hoverMaskConfig}
      />
    </div>
  );
};
export default Timeline;
