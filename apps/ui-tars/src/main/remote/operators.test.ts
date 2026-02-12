import { describe, expect, it, vi } from 'vitest';

import { RemoteComputerOperator } from './operators';

vi.mock('./proxyClient', () => ({
  ProxyClient: {
    getSandboxInfo: vi.fn(),
    getBrowserCDPUrl: vi.fn(),
  },
  RemoteComputer: vi.fn(),
  SandboxInfo: vi.fn(),
}));

vi.mock('./subscriptionClient', () => ({
  SubsRemoteComputer: vi.fn(),
}));

vi.mock('@main/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('RemoteComputerOperator coordinate validation', () => {
  const createOperator = () => {
    const operator = Object.create(
      RemoteComputerOperator.prototype,
    ) as RemoteComputerOperator;

    (
      operator as never as {
        remoteComputer: Record<string, ReturnType<typeof vi.fn>>;
      }
    ).remoteComputer = {
      moveMouse: vi.fn(),
      clickMouse: vi.fn(),
      dragMouse: vi.fn(),
      typeText: vi.fn(),
      pressKey: vi.fn(),
      scroll: vi.fn(),
    };

    return operator;
  };

  it('fails fast with explicit code on invalid click coordinates', async () => {
    const operator = createOperator();

    await expect(
      operator.execute({
        parsedPrediction: {
          action_type: 'click',
          action_inputs: {
            start_box: '',
          },
        },
        screenWidth: 1920,
        screenHeight: 1080,
        scaleFactor: 1,
      } as never),
    ).rejects.toThrow('[REMOTE_COORDINATES_INVALID]');

    expect(
      (
        operator as never as {
          remoteComputer: { clickMouse: ReturnType<typeof vi.fn> };
        }
      ).remoteComputer.clickMouse,
    ).not.toHaveBeenCalled();
  });

  it('fails fast with explicit code on invalid drag end coordinates', async () => {
    const operator = createOperator();

    await expect(
      operator.execute({
        parsedPrediction: {
          action_type: 'drag',
          action_inputs: {
            start_box: '[10,10,10,10]',
            end_box: '',
          },
        },
        screenWidth: 1920,
        screenHeight: 1080,
        scaleFactor: 1,
      } as never),
    ).rejects.toThrow('[REMOTE_COORDINATES_INVALID]');

    expect(
      (
        operator as never as {
          remoteComputer: { dragMouse: ReturnType<typeof vi.fn> };
        }
      ).remoteComputer.dragMouse,
    ).not.toHaveBeenCalled();
  });

  it('fails fast on non-finite drag coordinates from malformed boxes', async () => {
    const operator = createOperator();

    await expect(
      operator.execute({
        parsedPrediction: {
          action_type: 'drag',
          action_inputs: {
            start_box: '[10,10,10,10]',
            end_box: '[a,b,c,d]',
          },
        },
        screenWidth: 1920,
        screenHeight: 1080,
        scaleFactor: 1,
      } as never),
    ).rejects.toThrow('[REMOTE_COORDINATES_INVALID]');

    expect(
      (
        operator as never as {
          remoteComputer: { dragMouse: ReturnType<typeof vi.fn> };
        }
      ).remoteComputer.dragMouse,
    ).not.toHaveBeenCalled();
  });
});
