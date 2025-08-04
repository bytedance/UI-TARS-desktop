import { describe, it, expect, beforeEach } from 'vitest';
import { BrowserGUIAgent } from '../../src/browser/browser-gui-agent';
import { LocalBrowser } from '@agent-infra/browser';
import { ConsoleLogger } from '@tarko/mcp-agent';

describe('BrowserGUIAgent.parseAction', () => {
  let agent: BrowserGUIAgent;
  let mockBrowser: LocalBrowser;
  let mockLogger: ConsoleLogger;

  beforeEach(() => {
    mockBrowser = {
      isBrowserAlive: () => Promise.resolve(true),
      getActivePage: () => Promise.resolve({} as any),
      createPage: () => Promise.resolve({} as any),
    } as LocalBrowser;

    mockLogger = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      spawn: function () {
        return this;
      },
      prefix: '',
      lastPrefixColor: '',
      level: 'info',
      colorPrefix: () => '',
      log: () => {},
      trace: () => {},
      success: () => {},
      fail: () => {},
    } as unknown as ConsoleLogger;

    agent = new BrowserGUIAgent({
      browser: mockBrowser,
      logger: mockLogger,
      factors: [1000, 1000],
    });
  });

  it('should parse click action with complete format', () => {
    const action = "click(point='<point>892 351</point>')";
    const result = (agent as any).parseAction(action);
    expect(result).toEqual({
      action_type: 'click',
      action_inputs: { start_box: '[0.892,0.351]' },
    });
  });

  it('should parse click action with missing quote', () => {
    const action = "click(point='<point>150 315</point>";
    const result = (agent as any).parseAction(action);
    expect(result).toEqual({
      action_type: 'click',
      action_inputs: { start_box: '[0.15,0.315]' },
    });
  });

  it('should parse drag action', () => {
    const action = "drag(start_point='<point>100 200</point>' end_point='<point>300 400</point>')";
    const result = (agent as any).parseAction(action);
    expect(result).toEqual({
      action_type: 'drag',
      action_inputs: {
        start_box: '[0.1,0.2]',
        end_box: '[0.3,0.4]',
      },
    });
  });

  it('should parse type action', () => {
    const action = "type(content='Hello World')";
    const result = (agent as any).parseAction(action);
    expect(result).toEqual({
      action_type: 'type',
      action_inputs: { content: 'Hello World' },
    });
  });

  it('should parse key action', () => {
    const action = "key(key='Enter')";
    const result = (agent as any).parseAction(action);
    expect(result).toEqual({
      action_type: 'key',
      action_inputs: { key: 'Enter' },
    });
  });

  it('should parse key action with missing quote', () => {
    const action = "key(key='Ctrl+C'";
    const result = (agent as any).parseAction(action);
    expect(result).toEqual({
      action_type: 'key',
      action_inputs: { key: 'Ctrl+C' },
    });
  });

  it('should parse scroll action', () => {
    const action = "scroll(direction='down')";
    const result = (agent as any).parseAction(action);
    expect(result).toEqual({
      action_type: 'scroll',
      action_inputs: { direction: 'down' },
    });
  });

  it('should parse scroll action with missing quote', () => {
    const action = "scroll(direction='up";
    const result = (agent as any).parseAction(action);
    expect(result).toEqual({
      action_type: 'scroll',
      action_inputs: { direction: 'up' },
    });
  });

  it('should handle escaped characters in type content', () => {
    const action = "type(content='Test with \\'quotes\\' and \\n newlines')";
    const result = (agent as any).parseAction(action);
    expect(result).toEqual({
      action_type: 'type',
      action_inputs: { content: "Test with 'quotes' and \n newlines" },
    });
  });

  it('should handle simple type content without complex escapes', () => {
    const action = "type(content='Simple text content')";
    const result = (agent as any).parseAction(action);
    expect(result).toEqual({
      action_type: 'type',
      action_inputs: { content: 'Simple text content' },
    });
  });

  it('should handle custom scaling factors', () => {
    const customAgent = new BrowserGUIAgent({
      browser: mockBrowser,
      logger: mockLogger,
      factors: [1920, 1080],
    });

    const action = "click(point='<point>960 540</point>')";
    const result = (customAgent as any).parseAction(action);
    expect(result).toEqual({
      action_type: 'click',
      action_inputs: { start_box: '[0.5,0.5]' },
    });
  });

  it('should handle empty action string', () => {
    const action = '';
    const result = (agent as any).parseAction(action);
    expect(result).toEqual({
      action_type: '',
      action_inputs: {},
    });
  });
});
