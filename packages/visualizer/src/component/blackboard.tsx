/**
 * Copyright (c) 2024-present Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: MIT
 */
'use client';

import type { BaseElement, Rect, UIContext } from '@midscene/core';
import { Checkbox } from 'antd';
import type { CheckboxProps } from 'antd';
import { DropShadowFilter } from 'pixi-filters';
import * as PIXI from 'pixi.js';
import 'pixi.js/unsafe-eval';
import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';

import './blackboard.less';
import { colorForName, highlightColorForType } from './color';
import { useBlackboardPreference } from './store';

/**
 * Copyright (c) 2024-present Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: MIT
 */

const itemFillAlpha = 0.4;
const highlightAlpha = 0.4;
const noop = () => {
  // noop
};

export const rectMarkForItem = (
  rect: Rect,
  name: string,
  ifHighlight: boolean,
  onPointOver?: () => void,
  onPointerOut?: () => void,
) => {
  const { left, top, width, height } = rect;
  const themeColor = ifHighlight
    ? highlightColorForType('element')
    : colorForName(name);
  const alpha = ifHighlight ? highlightAlpha : itemFillAlpha;
  const graphics = new PIXI.Graphics();
  graphics.beginFill(themeColor, alpha);
  graphics.lineStyle(1, themeColor, 1);
  graphics.drawRect(left, top, width, height);
  graphics.endFill();
  if (onPointOver && onPointerOut) {
    graphics.interactive = true;
    graphics.on('pointerover', onPointOver);
    graphics.on('pointerout', onPointerOut);
  }

  const dropShadowFilter = new DropShadowFilter({
    blur: 2,
    quality: 3,
    alpha: 0.4,
    offset: { x: 4, y: 4 },
    color: 0x333333,
  });

  graphics.filters = [dropShadowFilter];

  const nameFontSize = 18;
  const texts = new PIXI.Text(name, {
    fontSize: nameFontSize,
    fill: 0x0,
  });
  texts.x = left;
  texts.y = Math.max(top - (nameFontSize + 4), 0);
  return [graphics, texts];
};

const Blackboard = (props: {
  uiContext: UIContext;
  highlightElements?: BaseElement[];
  hideController?: boolean;
  disableInteraction?: boolean;
}): JSX.Element => {
  const highlightElements: BaseElement[] = props.highlightElements || [];
  const highlightIds = highlightElements.map((e) => e.id);

  const context = props.uiContext!;
  const { size, screenshotBase64, screenshotBase64WithElementMarker } = context;

  const screenWidth = size.width;
  const screenHeight = size.height;

  const domRef = useRef<HTMLDivElement>(null); // Should be HTMLDivElement not HTMLInputElement
  const app = useMemo<PIXI.Application>(() => new PIXI.Application(), []);
  const [appInitialed, setAppInitialed] = useState(false);

  const highlightContainer = useMemo(() => new PIXI.Container(), []);
  const elementMarkContainer = useMemo(() => new PIXI.Container(), []);

  const [hoverElement, setHoverElement] = useState<BaseElement | null>(null);

  // key overlays
  const pixiBgRef = useRef<PIXI.Sprite>();
  const { markerVisible, setMarkerVisible, elementsVisible, setTextsVisible } =
    useBlackboardPreference();

  const ifMarkerAvailable = !!screenshotBase64WithElementMarker;

  useEffect(() => {
    Promise.resolve(
      (async () => {
        if (!domRef.current || !screenWidth) {
          return;
        }
        await app.init({
          width: screenWidth,
          height: screenHeight,
          background: 0xffffff,
        });
        const canvasEl = domRef.current;
        domRef.current.appendChild(app.canvas); // Ensure app.view is appended
        const { clientWidth } = domRef.current.parentElement!;
        const targetHeight = window.innerHeight * 0.5;
        const viewportRatio = clientWidth / targetHeight;
        if (screenWidth / screenHeight <= viewportRatio) {
          const ratio = targetHeight / screenHeight;
          canvasEl.style.width = `${Math.floor(screenWidth * ratio)}px`;
          canvasEl.style.height = `${Math.floor(screenHeight * ratio)}px`;
        }

        app.stage.addChild(highlightContainer);
        app.stage.addChild(elementMarkContainer);

        setAppInitialed(true);
      })(),
    );

    // Clean up the PIXI application when the component unmounts
    return () => {
      console.log('will destroy');
      try {
        app.destroy(true, { children: true, texture: true });
      } catch (e) {
        console.warn('destroy failed', e);
      }
    };
  }, [app, screenWidth, screenHeight]);

  // draw all texts on PIXI app
  useEffect(() => {
    if (!appInitialed) {
      return;
    }

    // draw the screenshot base64
    const img = new Image();
    img.onload = () => {
      if (!app.stage) return;
      const screenshotTexture = PIXI.Texture.from(img);
      const backgroundSprite = new PIXI.Sprite(screenshotTexture);
      backgroundSprite.x = 0;
      backgroundSprite.y = 0;
      backgroundSprite.width = screenWidth;
      backgroundSprite.height = screenHeight;
      app.stage.addChildAt(backgroundSprite, 0);

      if (ifMarkerAvailable) {
        const markerImg = new Image();
        markerImg.onload = () => {
          const markerTexture = PIXI.Texture.from(markerImg);
          const markerSprite = new PIXI.Sprite(markerTexture);
          markerSprite.x = 0;
          markerSprite.y = 0;
          markerSprite.width = screenWidth;
          markerSprite.height = screenHeight;
          app.stage.addChildAt(markerSprite, 1);
          pixiBgRef.current = markerSprite;
          markerSprite.visible = markerVisible;
        };
        markerImg.onerror = (e) => {
          console.error('load marker failed', e);
        };
        markerImg.src = screenshotBase64WithElementMarker;
      }
    };
    img.onerror = (e) => {
      console.error('load screenshot failed', e);
    };
    img.src = screenshotBase64;
  }, [app.stage, appInitialed]);

  const { highlightElementRects } = useMemo(() => {
    const highlightElementRects: Rect[] = [];

    highlightContainer.removeChildren();
    elementMarkContainer.removeChildren();

    // element rects
    context.content.forEach((element) => {
      const { rect, content, id } = element;
      const ifHighlight = highlightIds.includes(id) || hoverElement?.id === id;
      if (ifHighlight) {
        const [graphics] = rectMarkForItem(
          rect,
          content,
          ifHighlight,
          noop,
          noop,
        );
        highlightContainer.addChild(graphics);
      }

      const removeHover = () => {
        setHoverElement(null);
      };
      const [graphics] = rectMarkForItem(
        rect,
        content,
        ifHighlight,
        props?.disableInteraction
          ? undefined
          : () => {
              setHoverElement(element);
            },
        props?.disableInteraction ? undefined : removeHover,
      );
      elementMarkContainer.addChild(graphics);
    });

    elementMarkContainer.visible = elementsVisible;
    return {
      highlightElementRects,
    };
  }, [
    app,
    appInitialed,
    highlightElements,
    context.content,
    hoverElement,
    // bgVisible,
    // elementsVisible,
  ]);

  const onSetMarkerVisible: CheckboxProps['onChange'] = (e) => {
    setMarkerVisible(e.target.checked);
    if (pixiBgRef.current) {
      pixiBgRef.current.visible = e.target.checked;
    }
  };

  const onSetElementsVisible: CheckboxProps['onChange'] = (e) => {
    setTextsVisible(e.target.checked);
    elementMarkContainer.visible = e.target.checked;
  };

  let bottomTipA: ReactElement | null = null;
  if (highlightElementRects.length === 1) {
    bottomTipA = (
      <div className="bottom-tip">
        <div className="bottom-tip-item">
          Element: {JSON.stringify(highlightElementRects[0])}
        </div>
      </div>
    );
  } else if (highlightElementRects.length > 1) {
    bottomTipA = (
      <div className="bottom-tip">
        <div className="bottom-tip-item">
          Element: {JSON.stringify(highlightElementRects)}
        </div>
      </div>
    );
  }

  return (
    <div className="blackboard">
      <div
        className="blackboard-main-content"
        style={{ width: '100%' }}
        ref={domRef}
      />
      <div
        className="blackboard-filter"
        style={{ display: props.hideController ? 'none' : 'block' }}
      >
        <div className="overlay-control">
          <Checkbox
            checked={markerVisible}
            onChange={onSetMarkerVisible}
            disabled={!ifMarkerAvailable}
          >
            Marker
          </Checkbox>
          <Checkbox checked={elementsVisible} onChange={onSetElementsVisible}>
            Elements
          </Checkbox>
        </div>
      </div>
      <div
        className="bottom-tip"
        style={{ display: props.hideController ? 'none' : 'block' }}
      >
        {bottomTipA}
      </div>

      {/* {footer} */}
    </div>
  );
};

export default Blackboard;
