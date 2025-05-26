import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Page } from 'puppeteer-core';
import { connect } from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js';

export const VNCPreview = ({ url }: { url: string }) => {
  return <iframe className="w-full aspect-4/3" src={url}></iframe>;
};

interface CDPBrowserProps {
  url: string;
  onError?: (error: string) => void;
}

export const CDPBrowser: React.FC<CDPBrowserProps> = ({ url, onError }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<Page | null>(null);
  const clientRef = useRef<any>(null);
  const browserRef = useRef<any>(null);
  const [viewportSize, setViewportSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const getModifiersForEvent = (event: any) =>
    (event.altKey ? 1 : 0) |
    (event.ctrlKey ? 2 : 0) |
    (event.metaKey ? 4 : 0) |
    (event.shiftKey ? 8 : 0);

  const handleInteraction = (event: MouseEvent | WheelEvent) => {
    if (!clientRef.current || !canvasRef.current) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    if (event instanceof WheelEvent) {
      clientRef.current
        .send('Input.dispatchMouseEvent', {
          type: 'mouseWheel',
          x,
          y,
          deltaX: event.deltaX,
          deltaY: event.deltaY,
          modifiers: getModifiersForEvent(event),
        })
        .catch(console.error);
    } else if (event instanceof MouseEvent) {
      const buttons = { 0: 'none', 1: 'left', 2: 'middle', 3: 'right' };
      const eventType = event.type;
      const mouseEventMap = {
        mousedown: 'mousePressed',
        mouseup: 'mouseReleased',
        mousemove: 'mouseMoved',
      };
      const type = mouseEventMap[eventType as keyof typeof mouseEventMap];
      if (!type) {
        return;
      }
      clientRef.current
        .send('Input.dispatchMouseEvent', {
          type,
          x,
          y,
          button: (buttons as any)[event.which],
          modifiers: getModifiersForEvent(event),
          clickCount: 1,
        })
        .catch(console.error);
    }
  };

  const handleKeyEvent = useCallback(
    (event: KeyboardEvent) => {
      if (!clientRef.current || !isFocused) {
        return;
      }
      if (event.keyCode === 8) {
        event.preventDefault();
      }
      const eventTypeMap = {
        keydown: 'keyDown',
        keyup: 'keyUp',
        keypress: 'char',
      };
      const type = eventTypeMap[event.type as keyof typeof eventTypeMap];
      const text =
        type === 'char' ? String.fromCharCode(event.charCode) : undefined;
      clientRef.current
        .send('Input.dispatchKeyEvent', {
          type,
          text,
          unmodifiedText: text ? text.toLowerCase() : undefined,
          keyIdentifier: (event as any).keyIdentifier,
          code: event.code,
          key: event.key,
          windowsVirtualKeyCode: event.keyCode,
          nativeVirtualKeyCode: event.keyCode,
          autoRepeat: false,
          isKeypad: false,
          isSystemKey: false,
        })
        .catch(console.error);
    },
    [isFocused],
  );

  const updateCanvasSize = (
    containerWidth: number,
    containerHeight: number,
    viewportWidth: number,
    viewportHeight: number,
  ) => {
    if (!canvasRef.current) {
      return;
    }
    const canvas = canvasRef.current;
    canvas.width = viewportWidth;
    canvas.height = viewportHeight;
    const scale = Math.min(
      containerWidth / viewportWidth,
      containerHeight / viewportHeight,
    );
    const styleWidth = viewportWidth * scale;
    const styleHeight = viewportHeight * scale;
    canvas.style.width = `${styleWidth}px`;
    canvas.style.height = `${styleHeight}px`;
    canvas.style.position = 'absolute';
    const left = (containerWidth - styleWidth) / 2;
    const top = (containerHeight - styleHeight) / 2;
    canvas.style.left = `${left}px`;
    canvas.style.top = `${top}px`;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !canvasRef.current) {
      return;
    }
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (viewportSize) {
          updateCanvasSize(
            width,
            height,
            viewportSize.width,
            viewportSize.height,
          );
        }
      }
    });
    resizeObserver.observe(container);
    return () => {
      resizeObserver.unobserve(container);
    };
  }, [viewportSize]);

  const initPuppeteer = async (endpoint: string) => {
    let browser: any;
    let client: any;
    try {
      browser = await connect({
        browserWSEndpoint: endpoint,
        defaultViewport: {
          width: 1280,
          height: 800,
          deviceScaleFactor: 1,
          hasTouch: false,
          isLandscape: true,
          isMobile: false,
        },
      });
      browserRef.current = browser;
      const setupPageScreencast = async (page: Page) => {
        if (!page || !containerRef.current) {
          return;
        }
        pageRef.current = page;
        await page.setViewport({
          width: 1280,
          height: 800,
          deviceScaleFactor: 1,
          hasTouch: false,
          isLandscape: true,
          isMobile: false,
        });
        const viewport = await page.viewport();
        if (!viewport) {
          return;
        }
        setViewportSize({ width: viewport.width, height: viewport.height });
        requestAnimationFrame(async () => {
          if (!containerRef.current) {
            return;
          }
          const containerRect = containerRef.current.getBoundingClientRect();
          if (containerRect.width <= 0 || containerRect.height <= 0) {
            setViewportSize({ width: viewport.width, height: viewport.height });
            return;
          }
          clientRef.current?.off('Page.screencastFrame');
          await clientRef.current?.send('Page.stopScreencast').catch(() => {});
          try {
            client = await page.createCDPSession();
          } catch (cdpError) {
            return;
          }
          clientRef.current = client;
          updateCanvasSize(
            containerRect.width,
            containerRect.height,
            viewport.width,
            viewport.height,
          );
          try {
            await client.send('Page.startScreencast', {
              format: 'jpeg',
              quality: 80,
            });
          } catch (screencastError) {
            return;
          }
          client.on(
            'Page.screencastFrame',
            ({ data, sessionId }: { data: string; sessionId: number }) => {
              if (canvasRef.current) {
                const img = new Image();
                img.onload = () => {
                  const ctx = canvasRef.current?.getContext('2d');
                  if (ctx && canvasRef.current) {
                    ctx.clearRect(
                      0,
                      0,
                      canvasRef.current.width,
                      canvasRef.current.height,
                    );
                    ctx.drawImage(
                      img,
                      0,
                      0,
                      canvasRef.current.width,
                      canvasRef.current.height,
                    );
                  }
                };
                img.onerror = () => {};
                img.src = `data:image/jpeg;base64,${data}`;
                client
                  .send('Page.screencastFrameAck', { sessionId })
                  .catch(console.error);
              } else {
                client
                  .send('Page.screencastFrameAck', { sessionId })
                  .catch(console.error);
              }
            },
          );
          client.on('error', (err: any) => {});
          client.on('disconnect', () => {});
        });
      };

      browser.on('targetchanged', async (target: any) => {
        if (target.type() === 'page') {
          try {
            const newPage = await target.page();
            if (newPage && newPage !== pageRef.current) {
              await setupPageScreencast(newPage);
            }
          } catch (error) {}
        }
      });
      const pages = await browser.pages();
      const page =
        pages.length > 0 ? pages[pages.length - 1] : await browser.newPage();
      await setupPageScreencast(page);
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error.message : String(error));
      }
    }
  };

  const initCDPConnection = async (endpoint: string) => {
    try {
      await initPuppeteer(endpoint);
      if (pageRef.current) {
        await pageRef.current.setViewport({
          width: 1280,
          height: 800,
          deviceScaleFactor: 1,
          hasTouch: false,
          isLandscape: true,
          isMobile: false,
        });
      }
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error.message : String(error));
      }
    }
  };

  // init cdp
  useEffect(() => {
    if (!url) {
      return;
    }
    // ws endpoint
    const init = async () => {
      await initCDPConnection(url);
    };
    init();

    return () => {
      clientRef.current?.off('Page.screencastFrame');
      pageRef.current?.close().catch(() => {});
      browserRef.current?.disconnect();
    };
  }, [url]);

  // event listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const handleMouseEventWrapper = (e: MouseEvent) => handleInteraction(e);
    const handleWheelEventWrapper = (e: WheelEvent) => handleInteraction(e);

    canvas.addEventListener('mousedown', handleMouseEventWrapper);
    canvas.addEventListener('mouseup', handleMouseEventWrapper);
    canvas.addEventListener('mousemove', handleMouseEventWrapper);

    canvas.addEventListener('wheel', handleWheelEventWrapper);

    canvas.addEventListener('keydown', handleKeyEvent);
    canvas.addEventListener('keyup', handleKeyEvent);
    canvas.addEventListener('keypress', handleKeyEvent);
    return () => {
      canvas.removeEventListener('mousedown', handleMouseEventWrapper);
      canvas.removeEventListener('mouseup', handleMouseEventWrapper);
      canvas.removeEventListener('mousemove', handleMouseEventWrapper);

      canvas.removeEventListener('wheel', handleWheelEventWrapper);

      canvas.removeEventListener('keydown', handleKeyEvent);
      canvas.removeEventListener('keyup', handleKeyEvent);
      canvas.removeEventListener('keypress', handleKeyEvent);
    };
  }, [handleKeyEvent]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[80vh] overflow-hidden`}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full bg-white focus:outline-none"
        width={viewportSize?.width || 1280}
        height={viewportSize?.height || 800}
        tabIndex={99}
        onClick={(e) => {
          e.preventDefault();
          if (canvasRef.current) {
            canvasRef.current.focus();
          }
          handleInteraction(e.nativeEvent as MouseEvent);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </div>
  );
};
