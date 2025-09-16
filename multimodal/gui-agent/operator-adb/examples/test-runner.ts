/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

import { Base64ImageParser } from '@agent-infra/media-utils';
import { ConsoleLogger, LogLevel } from '@agent-infra/logger';
import { AdbOperator } from '../src';

const logger = new ConsoleLogger(undefined, LogLevel.DEBUG);
const testLogger = logger.spawn('[test-runner]');
const operator = new AdbOperator(logger);

// Utility function to create dumps directory
function createDumpsDir() {
  const dumpsDir = path.join(__dirname, 'dumps');
  if (!fs.existsSync(dumpsDir)) {
    fs.mkdirSync(dumpsDir, { recursive: true });
  }
  return dumpsDir;
}

// Utility function to save screenshot
function saveScreenshot(base64: string, filename: string, dumpsDir: string): string {
  const filepath = path.join(dumpsDir, filename);
  const base64Data = base64.replace(/^data:image\/jpeg;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(filepath, buffer);
  return filepath;
}

// Utility function to create operator instance
async function createOperator() {
  testLogger.log('📦 Initialize AdbOperator instance...');
  await operator.doInitialize();
  testLogger.log('✅ Instance initialized successfully');
  return operator;
}

// Test screenshot functionality
async function testScreenshot() {
  testLogger.log('🚀 Starting screenshot test...');

  try {
    const operator = await createOperator();
    const dumpsDir = createDumpsDir();

    testLogger.log('\n📸 Testing screenshot functionality...');
    const screenshot = await operator.doScreenshot();

    // Save screenshot
    if (screenshot.base64) {
      const base64Tool = new Base64ImageParser(screenshot.base64);
      const dimensions = base64Tool.getDimensions();
      testLogger.debug('Base64ImageParser dimensions:', JSON.stringify(dimensions));
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}.jpg`;
      const filepath = saveScreenshot(screenshot.base64, filename, dumpsDir);
      testLogger.log('Screenshot saved:', filepath);
    }

    testLogger.log('Screenshot result:', {
      base64Length: screenshot.base64?.length || 0,
      contentType: screenshot.contentType,
      status: screenshot.status,
    });
    testLogger.log('✅ Screenshot functionality working');
    return true;
  } catch (error) {
    testLogger.error('❌ Error during screenshot test:', error);
    const errorStack = error instanceof Error ? error.stack : String(error);
    testLogger.error('Error details:', errorStack);
    return false;
  }
}

// Test getScreenContext functionality
async function testGetScreenContext() {
  testLogger.log('🚀 Starting getScreenContext test...');

  try {
    const operator = await createOperator();
    testLogger.log('\n🔍 Testing getScreenContext functionality...');
    const screenContext = await operator.getScreenContext();

    testLogger.log('Screen context result:', {
      width: screenContext.screenWidth,
      height: screenContext.screenHeight,
      devicePixelRatio: {
        x: screenContext.scaleX,
        y: screenContext.scaleY,
      },
    });
    testLogger.log('✅ getScreenContext functionality working');
    return true;
  } catch (error) {
    testLogger.error('❌ Error during getScreenContext test:', error);
    const errorStack = error instanceof Error ? error.stack : String(error);
    testLogger.error('Error details:', errorStack);
    return false;
  }
}

// Test actions functionality
async function testActions() {
  testLogger.log('🚀 Starting actions test...');

  try {
    const operator = await createOperator();
    const dumpsDir = createDumpsDir();

    // Define test cases for actions
    const testCases = [
      {
        name: 'Move to position',
        params: {
          actions: [
            {
              type: 'move',
              inputs: {
                point: {
                  normalized: { x: 0.5, y: 0.44 },
                },
              },
            },
          ],
        },
      },
      {
        name: 'Click on position',
        params: {
          actions: [
            {
              type: 'click',
              inputs: {
                point: {
                  normalized: { x: 0.5, y: 0.44 },
                },
              },
            },
          ],
        },
      },
      {
        name: 'Type text',
        params: {
          actions: [
            {
              type: 'type',
              inputs: {
                content: 'ADB automation testing',
              },
            },
          ],
        },
      },
      {
        name: 'Press Enter key',
        params: {
          actions: [
            {
              type: 'hotkey',
              inputs: {
                key: 'Enter',
              },
            },
          ],
        },
      },
      {
        name: 'Wait for a moment',
        params: {
          actions: [
            {
              type: 'wait',
              inputs: {
                time: 1,
              },
            },
          ],
        },
      },
      {
        name: 'Scroll down',
        params: {
          actions: [
            {
              type: 'scroll',
              inputs: {
                direction: 'down',
                amount: 5,
              },
            },
          ],
        },
      },
      {
        name: 'Right-click on position',
        params: {
          actions: [
            {
              type: 'right_click',
              inputs: {
                point: {
                  normalized: { x: 0.5, y: 0.5 },
                },
              },
            },
          ],
        },
      },
      {
        name: 'Press Escape key',
        params: {
          actions: [
            {
              type: 'hotkey',
              inputs: {
                key: 'Escape',
              },
            },
          ],
        },
      },
      {
        name: 'Double-click on position',
        params: {
          actions: [
            {
              type: 'double_click',
              inputs: {
                point: {
                  normalized: { x: 0.5, y: 0.5 },
                },
              },
            },
          ],
        },
      },
      {
        name: 'Drag operation',
        params: {
          actions: [
            {
              type: 'drag',
              inputs: {
                start: {
                  normalized: { x: 0.3, y: 0.5 },
                },
                end: {
                  normalized: { x: 0.7, y: 0.5 },
                },
              },
            },
          ],
        },
      },
    ];

    testLogger.log('\n🎯 Starting to test various actions...');
    for (const testCase of testCases) {
      testLogger.log(`\nTest: ${testCase.name}`);
      try {
        // Add required properties for ExecuteParams
        const executeParams = {
          rawContent: testCase.name,
          rawActionStrings: [testCase.params.actions[0].type],
          ...testCase.params,
        };
        const result = await operator.doExecute(executeParams);
        if (!result || result.status !== 'success') {
          throw new Error(`Action failed with status: ${result?.status || 'unknown'}`);
        }
        testLogger.log('Execution result:', JSON.stringify(result));
        testLogger.log(`✅ ${testCase.name} executed successfully`);

        // Take screenshot after each action to verify the result
        const actionScreenshot = await operator.doScreenshot();
        if (actionScreenshot.base64) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `${testCase.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.jpg`;
          const filepath = saveScreenshot(actionScreenshot.base64, filename, dumpsDir);
          testLogger.log(`Screenshot after ${testCase.name} saved:`, filepath);
        }

        // Add a small delay between actions
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        testLogger.error(`❌ ${testCase.name} execution failed:`, errorMessage);
      }
    }

    testLogger.log('\n✅ Actions test completed');
    return true;
  } catch (error) {
    testLogger.error('❌ Error during actions test:', error);
    const errorStack = error instanceof Error ? error.stack : String(error);
    testLogger.error('Error details:', errorStack);
    return false;
  }
}

// Test specific action
async function testSpecificAction(actionType: string) {
  testLogger.log(`🚀 Starting test for specific action: ${actionType}...`);

  try {
    const operator = await createOperator();
    const dumpsDir = createDumpsDir();

    // Define action parameters based on action type
    let actionParams;
    switch (actionType) {
      case 'move':
        actionParams = {
          type: 'move',
          inputs: {
            point: {
              normalized: { x: 0.5, y: 0.5 },
            },
          },
        };
        break;
      case 'click':
        actionParams = {
          type: 'click',
          inputs: {
            point: {
              normalized: { x: 0.5, y: 0.5 },
            },
          },
        };
        break;
      case 'type':
        actionParams = {
          type: 'type',
          inputs: {
            content: 'Test typing with ADB operator',
          },
        };
        break;
      case 'hotkey':
        actionParams = {
          type: 'hotkey',
          inputs: {
            key: 'Enter',
          },
        };
        break;
      case 'wait':
        actionParams = {
          type: 'wait',
          inputs: {
            time: 2,
          },
        };
        break;
      case 'scroll':
        actionParams = {
          type: 'scroll',
          inputs: {
            direction: 'down',
            amount: 3,
          },
        };
        break;
      case 'right_click':
        actionParams = {
          type: 'right_click',
          inputs: {
            point: {
              normalized: { x: 0.5, y: 0.5 },
            },
          },
        };
        break;
      case 'double_click':
        actionParams = {
          type: 'double_click',
          inputs: {
            point: {
              normalized: { x: 0.5, y: 0.5 },
            },
          },
        };
        break;
      case 'drag':
        actionParams = {
          type: 'drag',
          inputs: {
            start: {
              normalized: { x: 0.3, y: 0.5 },
            },
            end: {
              normalized: { x: 0.7, y: 0.5 },
            },
          },
        };
        break;
      default:
        throw new Error(`Unsupported action type: ${actionType}`);
    }

    testLogger.log(`\n🎯 Testing ${actionType} action...`);
    // Execute the action
    const executeParams = {
      rawContent: `Test ${actionType}`,
      rawActionStrings: [actionType],
      actions: [actionParams],
    };
    const result = await operator.doExecute(executeParams);
    if (!result || result.status !== 'success') {
      throw new Error(`Action failed with status: ${result?.status || 'unknown'}`);
    }
    testLogger.log('Execution result:', JSON.stringify(result));
    testLogger.log(`✅ ${actionType} action executed successfully`);

    // Take screenshot after action to verify the result
    const actionScreenshot = await operator.doScreenshot();
    if (actionScreenshot.base64) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${actionType}-action-${timestamp}.jpg`;
      const filepath = saveScreenshot(actionScreenshot.base64, filename, dumpsDir);
      testLogger.log(`Screenshot after ${actionType} action saved:`, filepath);
    }

    return true;
  } catch (error) {
    testLogger.error(`❌ Error during ${actionType} action test:`, error);
    const errorStack = error instanceof Error ? error.stack : String(error);
    testLogger.error('Error details:', errorStack);
    return false;
  }
}

// Original test function that runs all tests
async function testAdbOperator() {
  testLogger.log('🚀 Starting complete AdbOperator test...');

  try {
    await testScreenshot();
    await testGetScreenContext();
    await testActions();
    testLogger.log('\n🎉 All tests completed!');
    return true;
  } catch (error) {
    testLogger.error('❌ Error during test:', error);
    const errorStack = error instanceof Error ? error.stack : String(error);
    testLogger.error('Error details:', errorStack);
    return false;
  }
}

// Display help information
function showHelp() {
  testLogger.log(`
ADB Operator Test Runner
=======================

Usage: node test-runner.js [options]

Options:
  --all                Run all tests
  --screenshot         Test screenshot functionality
  --screen-context     Test getScreenContext functionality
  --actions            Test all actions
  --action [type]      Test specific action (move, click, type, hotkey, wait, scroll, right_click, double_click, drag)
  --help               Show this help message

Examples:
  node test-runner.js --all
  node test-runner.js --screenshot
  node test-runner.js --action click
  `);
}

// Parse command line arguments and run the appropriate test
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    showHelp();
    return;
  }

  let success = true;

  if (args.includes('--all')) {
    success = await testAdbOperator();
  } else if (args.includes('--screenshot')) {
    success = await testScreenshot();
  } else if (args.includes('--screen-context')) {
    success = await testGetScreenContext();
  } else if (args.includes('--actions')) {
    success = await testActions();
  } else if (args.includes('--action')) {
    const actionIndex = args.indexOf('--action');
    if (actionIndex !== -1 && actionIndex + 1 < args.length) {
      const actionType = args[actionIndex + 1];
      success = await testSpecificAction(actionType);
    } else {
      testLogger.error('❌ Error: --action requires an action type parameter');
      showHelp();
      process.exit(1);
    }
  } else {
    testLogger.log('No valid test option specified');
    showHelp();
    process.exit(1);
  }

  if (success) {
    testLogger.log('✨ Test script execution completed successfully');
    process.exit(0);
  } else {
    testLogger.error('💥 Test script execution failed');
    process.exit(1);
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    testLogger.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });
}

export { testAdbOperator, testScreenshot, testGetScreenContext, testActions, testSpecificAction };
