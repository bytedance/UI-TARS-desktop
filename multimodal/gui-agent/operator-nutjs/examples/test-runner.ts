/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

import { ConsoleLogger, LogLevel } from '@agent-infra/logger';
import { NutJSOperator } from '../src';

async function testNutJSOperator() {
  console.log('🚀 Starting NutJSOperator test...');

  try {
    // 1. Create operator instance
    console.log('\n📦 Creating TestableNutJSOperator instance...');
    const logger = new ConsoleLogger(undefined, LogLevel.DEBUG);
    const operator = new NutJSOperator(logger);
    await operator.doInitialize();
    console.log('✅ Instance created successfully');

    // 2. Test screenshot functionality
    console.log('\n📸 Testing screenshot functionality...');
    const screenshot = await operator.doScreenshot();

    // Create dumps directory
    const dumpsDir = path.join(__dirname, 'dumps');
    if (!fs.existsSync(dumpsDir)) {
      fs.mkdirSync(dumpsDir, { recursive: true });
    }

    // Save screenshot
    if (screenshot.base64) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}.jpg`;
      const filepath = path.join(dumpsDir, filename);

      // Convert base64 to buffer and save
      const base64Data = screenshot.base64.replace(/^data:image\/jpeg;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filepath, buffer);

      console.log('Screenshot saved:', filepath);
    }

    console.log('Screenshot result:', {
      base64Length: screenshot.base64?.length || 0,
      contentType: screenshot.contentType,
      status: screenshot.status,
    });
    console.log('✅ Screenshot functionality working');

    // 3. Test Google homepage operations
    console.log('\n🌐 Testing Google homepage operations...');
    console.log('Opening web browser and navigating to Google...');

    // Define test cases for Google homepage
    const testCases = [
      {
        name: 'Move to search box',
        params: {
          actions: [
            {
              type: 'move',
              inputs: {
                point: {
                  normalized: { x: 0.5, y: 0.44 }, // Approximate position of Google search box
                },
              },
            },
          ],
        },
      },
      {
        name: 'Click on search box',
        params: {
          actions: [
            {
              type: 'click',
              inputs: {
                point: {
                  normalized: { x: 0.5, y: 0.44 }, // Approximate position of Google search box
                },
              },
            },
          ],
        },
      },
      {
        name: 'Type search query',
        params: {
          actions: [
            {
              type: 'type',
              inputs: {
                content: 'NutJS automation testing',
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
        name: 'Wait for results',
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
        name: 'Scroll down results',
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
        name: 'Right-click on result',
        params: {
          actions: [
            {
              type: 'right_click',
              inputs: {
                point: {
                  normalized: { x: 0.5, y: 0.5 }, // Approximate position of a search result
                },
              },
            },
          ],
        },
      },
      {
        name: 'Press Escape to close context menu',
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
        name: 'Double-click on result',
        params: {
          actions: [
            {
              type: 'double_click',
              inputs: {
                point: {
                  normalized: { x: 0.5, y: 0.5 }, // Approximate position of a search result
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

    console.log('\n🎯 Starting to test various actions...');
    for (const testCase of testCases) {
      console.log(`\nTest: ${testCase.name}`);
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
        console.log('Execution result:', JSON.stringify(result));
        console.log(`✅ ${testCase.name} executed successfully`);

        // Take screenshot after each action to verify the result
        const actionScreenshot = await operator.doScreenshot();
        if (actionScreenshot.base64) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `${testCase.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.jpg`;
          const filepath = path.join(dumpsDir, filename);

          const base64Data = actionScreenshot.base64.replace(/^data:image\/jpeg;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          fs.writeFileSync(filepath, buffer);

          console.log(`Screenshot after ${testCase.name} saved:`, filepath);
        }

        // Add a small delay between actions
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ ${testCase.name} execution failed:`, errorMessage);
      }
    }

    console.log('\n🎉 All tests completed!');
  } catch (error) {
    console.error('❌ Error during test:', error);
    const errorStack = error instanceof Error ? error.stack : String(error);
    console.error('Error details:', errorStack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testNutJSOperator()
    .then(() => {
      console.log('\n✨ Test script execution completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test script execution failed:', error);
      process.exit(1);
    });
}

export { testNutJSOperator };
