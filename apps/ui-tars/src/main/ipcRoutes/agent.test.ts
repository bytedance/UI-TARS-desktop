import { describe, expect, it, beforeEach } from 'vitest';
import { GUIAgent } from '@ui-tars/sdk';
import { Operator } from '@ui-tars/sdk/core';
import { StatusEnum } from '@ui-tars/shared/types';
import { store } from '@main/store/create';
import { agentRoute, GUIAgentManager } from './agent';

class TestOperator extends Operator {
  screenshot = async () => ({
    base64: '',
    width: 1,
    height: 1,
    scaleFactor: 1,
  });

  execute = async () => ({ status: StatusEnum.RUNNING });
}

describe('agentRoute pause and resume', () => {
  beforeEach(() => {
    store.setState({ thinking: true });
    GUIAgentManager.getInstance().setAgent(
      new GUIAgent({
        model: { model: 'test' },
        operator: new TestOperator(),
      }),
    );
  });

  it('keeps the active run marked as thinking while paused', async () => {
    await agentRoute.pauseRun.handle({
      input: undefined,
      context: {} as never,
    });

    expect(store.getState().thinking).toBe(true);
  });

  it('keeps the active run marked as thinking while resuming', async () => {
    await agentRoute.resumeRun.handle({
      input: undefined,
      context: {} as never,
    });

    expect(store.getState().thinking).toBe(true);
  });
});
