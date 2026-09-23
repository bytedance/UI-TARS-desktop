/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi } from 'vitest';
import { Jimp } from 'jimp';
import { GUIAgent } from '../src/GUIAgent';
import { Operator } from '../src/types';
import { GUIAgentData, StatusEnum } from '../src';
import { UITarsModel } from '../src/Model';

vi.mock('openai', () => ({
  default: vi.fn(),
}));

const image = new Jimp({
  width: 32,
  height: 32,
  color: 0xffffffff,
});

class MockOperator extends Operator {
  screenshot = vi.fn().mockImplementation(async () => {
    const buffer = await image.getBuffer('image/png');

    return {
      base64: buffer.toString('base64'),
      width: 32,
      height: 32,
      scaleFactor: 1,
    };
  });

  execute = vi.fn().mockImplementation(async () => undefined);
}

const CLICK =
  "Thought: Click on the search bar\nAction: click(start_box='(72,646)')";
const FINISHED = 'Thought: finished.\nAction: finished()';

/**
 * Resolves once the agent loop has reported PAUSE and had a chance to park on
 * `resumePromise`, so the calls below always land inside the paused window.
 */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function createHarness(signal?: AbortSignal) {
  const predictions = [CLICK, FINISHED];
  let predictionIndex = 0;

  class ScriptedModel extends UITarsModel {
    protected override async invokeModelProvider() {
      return {
        prediction:
          predictions[Math.min(predictionIndex++, predictions.length - 1)],
      };
    }
  }

  const operator = new MockOperator();
  const statuses: StatusEnum[] = [];
  const dataEvents: GUIAgentData[] = [];
  let resolvePaused: () => void = () => undefined;
  let reportedPause = false;
  const paused = new Promise<void>((resolve) => {
    resolvePaused = resolve;
  });

  const onData = vi
    .fn()
    .mockImplementation(({ data }: { data: GUIAgentData }) => {
      statuses.push(data.status);
      dataEvents.push(data);
      if (data.status === StatusEnum.PAUSE && !reportedPause) {
        reportedPause = true;
        resolvePaused();
      }
    });
  const onError = vi.fn();

  const agent = new GUIAgent({
    model: new ScriptedModel({ model: 'ui-tars-sft' }),
    operator,
    signal,
    onData,
    onError,
  });

  return { agent, operator, statuses, dataEvents, onError, paused };
}

/**
 * `run()` is expected to settle; a parked loop that nothing can release leaves
 * this racing against the timeout instead.
 */
async function settleState(promise: Promise<unknown>, withinMs = 3000) {
  let timer: ReturnType<typeof setTimeout>;
  const pending = new Promise<'pending'>((resolve) => {
    timer = setTimeout(() => resolve('pending'), withinMs);
  });
  const state = await Promise.race([
    promise.then(() => 'settled' as const),
    pending,
  ]);
  clearTimeout(timer!);

  return state;
}

describe('GUIAgent pause / resume / stop', () => {
  it('releases the parked loop when resume() is called', async () => {
    const { agent, statuses, paused } = createHarness();
    const runPromise = agent.run('click the button');

    agent.pause();
    await paused;
    await tick();

    agent.resume();
    expect(await settleState(runPromise)).toBe('settled');

    expect(statuses).toContain(StatusEnum.PAUSE);
    expect(statuses[statuses.length - 1]).toBe(StatusEnum.END);
  }, 30000);

  it('releases the parked loop when pause() is called while already paused', async () => {
    const { agent, operator, paused } = createHarness();
    const runPromise = agent.run('click the button');

    agent.pause();
    await paused;
    await tick();

    // a redundant pause, then the resume the caller expects to end it
    agent.pause();
    agent.resume();
    expect(await settleState(runPromise)).toBe('settled');

    expect(operator.screenshot).toBeCalledTimes(2);
  }, 30000);

  it('releases the parked loop when stop() is called', async () => {
    const { agent, statuses, paused } = createHarness();
    const runPromise = agent.run('click the button');

    agent.pause();
    await paused;
    await tick();

    agent.stop();
    expect(await settleState(runPromise)).toBe('settled');

    expect(statuses[statuses.length - 1]).toBe(StatusEnum.USER_STOPPED);
  }, 30000);

  it('releases the parked loop when the abort signal fires', async () => {
    const abortController = new AbortController();
    const { agent, operator, statuses, onError, paused } = createHarness(
      abortController.signal,
    );
    const runPromise = agent.run('click the button');

    agent.pause();
    await paused;
    await tick();

    abortController.abort();
    expect(await settleState(runPromise)).toBe('settled');

    expect(statuses[statuses.length - 1]).toBe(StatusEnum.USER_STOPPED);
    expect(onError).not.toHaveBeenCalled();
    // the user_stop cleanup the abort path performs for a running loop
    expect(operator.execute).toHaveBeenLastCalledWith(
      expect.objectContaining({
        parsedPrediction: expect.objectContaining({ action_type: 'user_stop' }),
      }),
    );
  }, 30000);
});
