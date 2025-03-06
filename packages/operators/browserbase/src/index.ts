/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  Operator,
  type ScreenshotOutput,
  type ExecuteParams,
  type ExecuteOutput,
  StatusEnum,
} from '@ui-tars/sdk/core';
import { Stagehand, ConstructorParams } from '@browserbasehq/stagehand';

export class BrowserbaseOperator extends Operator {
  private stagehand: Stagehand | null = null;

  constructor(private options: ConstructorParams) {
    super();
    this.options = options;
    console.log('this.options', this.options);
  }

  static MANUAL = {
    ACTION_SPACES: [
      "GOTO(url='') # determine the best URL to start from, then navigate to the target page",
      "ACT(description='') # next step `action`(natural language) in current page to description for instruction",
      "EXTRACT(description='') # Extract information from the page",
      "OBSERVE(description='') # Observe and analyze the webpage to get the next action",
      'CLOSE() # Finish the task, no more actions needed',
      'NAVBACK() # Go back to the previous page',
    ],
    EXAMPLES: [
      `\`\`\`
User Instruction: Who is the top GitHub contributor to Stagehand by Browserbase?
1. Thought: The best starting point to find the top GitHub contributor to the Stagehand project by Browserbase is the project's GitHub repository itself. This will provide direct access to the contributors' list, where you can see who has made the most contributions.\nAction: GOTO(url='https://github.com/browserbase/stagehand')
2. Thought: The 'Insights' tab on a GitHub repository page provides detailed information about the project's contributors, including the number of contributions each has made. By accessing this tab, we can find the top contributor.\nAction: ACT(description='Click on the 'Insights' tab.')
3. The 'Contributors' section under the 'Insights' tab will show a list of contributors along with the number of contributions each has made. This is the most direct way to identify the top contributor to the project.\nAction: ACT(description='Click on the 'Contributors' link in the left sidebar.')
4. The screenshot shows the contributors to the Stagehand project, with 'kamath' listed as the top contributor with 69 commits. This information is directly visible in the 'Contributors' section under the 'Insights' tab.\nAction: CLOSE()

\`\`\``,
    ],
  };

  private async getStagehand() {
    if (this.stagehand) {
      return this.stagehand;
    }
    const stagehand = new Stagehand(this.options);
    await stagehand.init();
    this.stagehand = stagehand;

    return this.stagehand;
  }

  public async screenshot(): Promise<ScreenshotOutput> {
    const stagehand = await this.getStagehand();
    const page = stagehand.page;

    const cdpSession = await page.context().newCDPSession(page);
    const { data: base64 } = await cdpSession.send('Page.captureScreenshot');

    return {
      base64,
      scaleFactor: 1,
    };
  }

  async execute(params: ExecuteParams): Promise<ExecuteOutput> {
    const { parsedPrediction } = params;
    console.log('params', params);

    const stagehand = await this.getStagehand();
    const page = stagehand.page;

    // @ts-ignore
    const instruction = parsedPrediction.action_inputs?.content;
    // @ts-ignore
    const description = parsedPrediction.action_inputs?.description;

    switch (parsedPrediction.action_type) {
      case 'GOTO':
        // @ts-ignore
        const url = parsedPrediction.action_inputs?.url;
        if (url) {
          await page.goto(url, {
            waitUntil: 'commit',
            timeout: 60000,
          });
        }
        break;

      case 'ACT':
        // @ts-ignore
        if (description) {
          await page.act(description!);
        }
        break;

      case 'EXTRACT': {
        const { extraction } = await page.extract(description!);
        console.log('extraction', extraction);
        // TODO: 需要处理返回的 ObserveResult
        // return extraction;
        break;
      }

      case 'OBSERVE':
        await page.observe({
          instruction: description,
          useAccessibilityTree: true,
        });
        break;

      case 'WAIT':
        await new Promise((resolve) =>
          setTimeout(resolve, Number(instruction)),
        );
        break;

      case 'NAVBACK':
        await page.goBack();
        break;

      case 'CLOSE':
        await stagehand.close();
        return { status: StatusEnum.END };
    }
  }
}
