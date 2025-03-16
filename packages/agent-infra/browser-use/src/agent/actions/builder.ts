/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/actions/builder.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
import { ActionResult, type AgentContext } from '../types';
import {
  clickElementActionSchema,
  doneActionSchema,
  extractContentActionSchema,
  goBackActionSchema,
  goToUrlActionSchema,
  inputTextActionSchema,
  openTabActionSchema,
  searchGoogleActionSchema,
  switchTabActionSchema,
  type ActionSchema,
  scrollDownActionSchema,
  scrollUpActionSchema,
  sendKeysActionSchema,
  scrollToTextActionSchema,
  cacheContentActionSchema,
} from './schemas';
import { z } from 'zod';
import { createLogger } from '../../utils';
import { PromptTemplate } from '@langchain/core/prompts';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ExecutionState, Actors } from '../event/types';

const logger = createLogger('Action');

export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}

/**
 * An action is a function that takes an input and returns an ActionResult
 */
export class Action {
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly handler: (input: any) => Promise<ActionResult>,
    public readonly schema: ActionSchema,
  ) {}

  async call(input: unknown): Promise<ActionResult> {
    // Validate input before calling the handler
    const schema = this.schema.schema;

    // check if the schema is schema: z.object({}), if so, ignore the input
    const isEmptySchema =
      schema instanceof z.ZodObject &&
      Object.keys(
        (schema as z.ZodObject<Record<string, z.ZodTypeAny>>).shape || {},
      ).length === 0;

    if (isEmptySchema) {
      return await this.handler({});
    }

    const parsedArgs = this.schema.schema.safeParse(input);
    if (!parsedArgs.success) {
      const errorMessage = parsedArgs.error.message;
      throw new InvalidInputError(errorMessage);
    }
    return await this.handler(parsedArgs.data);
  }

  name() {
    return this.schema.name;
  }

  /**
   * Returns the prompt for the action
   * @returns {string} The prompt for the action
   */
  prompt() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schemaShape = (this.schema.schema as z.ZodObject<any>).shape || {};
    const schemaProperties = Object.entries(schemaShape).map(([key, value]) => {
      const zodValue = value as z.ZodTypeAny;
      return `'${key}': {'type': '${zodValue.description}', ${zodValue.isOptional() ? "'optional': true" : "'required': true"}}`;
    });

    const schemaStr =
      schemaProperties.length > 0
        ? `{${this.name()}: {${schemaProperties.join(', ')}}}`
        : `{${this.name()}: {}}`;

    return `${this.schema.description}:\n${schemaStr}`;
  }
}

// TODO: can not make every action optional, don't know why
export function buildDynamicActionSchema(actions: Action[]): z.ZodType {
  let schema = z.object({});
  for (const action of actions) {
    // create a schema for the action, it could be action.schema.schema or null
    // but don't use default: null as it causes issues with Google Generative AI
    const actionSchema = action.schema.schema.nullable();
    schema = schema.extend({
      [action.name()]: actionSchema,
    });
  }
  return schema.partial().nullable();
}

export class ActionBuilder {
  private readonly context: AgentContext;
  private readonly extractorLLM: BaseChatModel;

  constructor(context: AgentContext, extractorLLM: BaseChatModel) {
    this.context = context;
    this.extractorLLM = extractorLLM;
  }

  buildDefaultActions() {
    const actions = [];

    const done = new Action(
      async (input: z.infer<typeof doneActionSchema.schema>) => {
        this.context.emitEvent(
          Actors.NAVIGATOR,
          ExecutionState.ACT_START,
          doneActionSchema.name,
        );
        this.context.emitEvent(
          Actors.NAVIGATOR,
          ExecutionState.ACT_OK,
          input.text,
        );
        return new ActionResult({
          isDone: true,
          extractedContent: input.text,
        });
      },
      doneActionSchema,
    );
    actions.push(done);

    const searchGoogle = new Action(async (input: { query: string }) => {
      const msg = `Searching for "${input.query}" in Google`;
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, msg);

      const page = await this.context.browserContext.getCurrentPage();
      await page.navigateTo(`https://www.google.com/search?q=${input.query}`);

      const msg2 = `Searched for "${input.query}" in Google`;
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg2);
      return new ActionResult({
        extractedContent: msg2,
        includeInMemory: true,
      });
    }, searchGoogleActionSchema);
    actions.push(searchGoogle);

    const goToUrl = new Action(async (input: { url: string }) => {
      const msg = `Navigating to ${input.url}`;
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, msg);

      await this.context.browserContext.navigateTo(input.url);
      const msg2 = `Navigated to ${input.url}`;
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg2);
      return new ActionResult({
        extractedContent: msg2,
        includeInMemory: true,
      });
    }, goToUrlActionSchema);
    actions.push(goToUrl);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const goBack = new Action(async (_input = {}) => {
      const msg = 'Navigating back';
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, msg);

      const page = await this.context.browserContext.getCurrentPage();
      await page.goBack();
      const msg2 = 'Navigated back';
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg2);
      return new ActionResult({
        extractedContent: msg2,
        includeInMemory: true,
      });
    }, goBackActionSchema);
    actions.push(goBack);

    // Element Interaction Actions
    const clickElement = new Action(
      async (input: z.infer<typeof clickElementActionSchema.schema>) => {
        const todo = input.desc || `Click element with index ${input.index}`;
        this.context.emitEvent(
          Actors.NAVIGATOR,
          ExecutionState.ACT_START,
          todo,
        );

        const page = await this.context.browserContext.getCurrentPage();
        const state = await page.getState();

        const elementNode = state?.selectorMap.get(input.index);
        if (!elementNode) {
          throw new Error(
            `Element with index ${input.index} does not exist - retry or use alternative actions`,
          );
        }

        // Check if element is a file uploader
        if (await page.isFileUploader(elementNode)) {
          const msg = `Index ${input.index} - has an element which opens file upload dialog. To upload files please use a specific function to upload files`;
          logger.info(msg);
          return new ActionResult({
            extractedContent: msg,
            includeInMemory: true,
          });
        }

        try {
          // const initialTabIds =
          //   await this.context.browserContext.getAllTabIds();
          console.log('elementNode', elementNode);
          await page.clickElementNode(
            this.context.options.useVision,
            elementNode,
          );
          const msg = `Clicked button with index ${input.index}: ${elementNode.getAllTextTillNextClickableElement(2)}`;
          logger.info(msg);

          // TODO: could be optimized by chrome extension tab api
          // const currentTabIds =
          //   await this.context.browserContext.getAllTabIds();
          // if (currentTabIds.size > initialTabIds.size) {
          //   const newTabMsg = 'New tab opened - switching to it';
          //   msg += ` - ${newTabMsg}`;
          //   logger.info(newTabMsg);
          //   // find the tab id that is not in the initial tab ids
          //   const newTabId = Array.from(currentTabIds).find(
          //     (id) => !initialTabIds.has(id),
          //   );
          //   if (newTabId) {
          //     await this.context.browserContext.switchTab(newTabId);
          //   }
          // }
          this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
          return new ActionResult({
            extractedContent: msg,
            includeInMemory: true,
          });
        } catch (error) {
          const msg = `Element no longer available with index ${input.index} - most likely the page changed`;
          this.context.emitEvent(
            Actors.NAVIGATOR,
            ExecutionState.ACT_FAIL,
            msg,
          );
          return new ActionResult({
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
      clickElementActionSchema,
    );
    actions.push(clickElement);

    const inputText = new Action(
      async (input: z.infer<typeof inputTextActionSchema.schema>) => {
        const todo = input.desc || `Input text into index ${input.index}`;
        this.context.emitEvent(
          Actors.NAVIGATOR,
          ExecutionState.ACT_START,
          todo,
        );

        const page = await this.context.browserContext.getCurrentPage();
        const state = await page.getState();

        const elementNode = state?.selectorMap.get(input.index);
        if (!elementNode) {
          throw new Error(
            `Element with index ${input.index} does not exist - retry or use alternative actions`,
          );
        }

        await page.inputTextElementNode(
          this.context.options.useVision,
          elementNode,
          input.text,
        );
        const msg = `Input ${input.text} into index ${input.index}`;
        this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
        return new ActionResult({
          extractedContent: msg,
          includeInMemory: true,
        });
      },
      inputTextActionSchema,
    );
    actions.push(inputText);

    // Tab Management Actions
    const switchTab = new Action(
      async (input: z.infer<typeof switchTabActionSchema.schema>) => {
        this.context.emitEvent(
          Actors.NAVIGATOR,
          ExecutionState.ACT_START,
          `Switching to tab ${input.tab_id}`,
        );
        await this.context.browserContext.switchTab(input.tab_id);
        const msg = `Switched to tab ${input.tab_id}`;
        this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
        return new ActionResult({
          extractedContent: msg,
          includeInMemory: true,
        });
      },
      switchTabActionSchema,
    );
    actions.push(switchTab);

    const openTab = new Action(
      async (input: z.infer<typeof openTabActionSchema.schema>) => {
        this.context.emitEvent(
          Actors.NAVIGATOR,
          ExecutionState.ACT_START,
          `Opening ${input.url} in new tab`,
        );
        await this.context.browserContext.openTab(input.url);
        const msg = `Opened ${input.url} in new tab`;
        this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
        return new ActionResult({
          extractedContent: msg,
          includeInMemory: true,
        });
      },
      openTabActionSchema,
    );
    actions.push(openTab);

    // Content Actions
    // TODO: this is not used currently, need to improve on input size
    const extractContent = new Action(
      async (input: z.infer<typeof extractContentActionSchema.schema>) => {
        const goal = input.goal;
        const page = await this.context.browserContext.getCurrentPage();
        const content = await page.getReadabilityContent();
        const promptTemplate = PromptTemplate.fromTemplate(
          'Your task is to extract the content of the page. You will be given a page and a goal and you should extract all relevant information around this goal from the page. If the goal is vague, summarize the page. Respond in json format. Extraction goal: {goal}, Page: {page}',
        );
        const prompt = await promptTemplate.invoke({
          goal,
          page: content?.content,
        });

        try {
          const output = await this.extractorLLM.invoke(prompt);
          const msg = `📄  Extracted from page\n: ${output.content}\n`;
          return new ActionResult({
            extractedContent: msg,
            includeInMemory: true,
          });
        } catch (error) {
          logger.error(
            `Error extracting content: ${error instanceof Error ? error.message : String(error)}`,
          );
          const msg =
            'Failed to extract content from page, you need to extract content from the current state of the page and store it in the memory. Then scroll down if you still need more information.';
          return new ActionResult({
            extractedContent: msg,
            includeInMemory: true,
          });
        }
      },
      extractContentActionSchema,
    );
    actions.push(extractContent);

    // cache content for future use
    const cacheContent = new Action(
      async (input: z.infer<typeof cacheContentActionSchema.schema>) => {
        this.context.emitEvent(
          Actors.NAVIGATOR,
          ExecutionState.ACT_START,
          cacheContentActionSchema.name,
        );

        const msg = `Cached findings: ${input.content}`;
        this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
        return new ActionResult({
          extractedContent: msg,
          includeInMemory: true,
        });
      },
      cacheContentActionSchema,
    );
    actions.push(cacheContent);

    const scrollDown = new Action(
      async (input: z.infer<typeof scrollDownActionSchema.schema>) => {
        const todo = input.desc || 'Scroll down the page';
        this.context.emitEvent(
          Actors.NAVIGATOR,
          ExecutionState.ACT_START,
          todo,
        );

        const page = await this.context.browserContext.getCurrentPage();
        await page.scrollDown(input.amount);
        const amount =
          input.amount !== undefined ? `${input.amount} pixels` : 'one page';
        const msg = `Scrolled down the page by ${amount}`;
        this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
        return new ActionResult({
          extractedContent: msg,
          includeInMemory: true,
        });
      },
      scrollDownActionSchema,
    );
    actions.push(scrollDown);

    const scrollUp = new Action(
      async (input: z.infer<typeof scrollUpActionSchema.schema>) => {
        const todo = input.desc || 'Scroll up the page';
        this.context.emitEvent(
          Actors.NAVIGATOR,
          ExecutionState.ACT_START,
          todo,
        );

        const page = await this.context.browserContext.getCurrentPage();
        await page.scrollUp(input.amount);
        const amount =
          input.amount !== undefined ? `${input.amount} pixels` : 'one page';
        const msg = `Scrolled up the page by ${amount}`;
        this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
        return new ActionResult({
          extractedContent: msg,
          includeInMemory: true,
        });
      },
      scrollUpActionSchema,
    );
    actions.push(scrollUp);

    // Keyboard Actions
    const sendKeys = new Action(
      async (input: z.infer<typeof sendKeysActionSchema.schema>) => {
        const todo = input.desc || `Send keys: ${input.keys}`;
        this.context.emitEvent(
          Actors.NAVIGATOR,
          ExecutionState.ACT_START,
          todo,
        );

        const page = await this.context.browserContext.getCurrentPage();
        await page.sendKeys(input.keys);
        const msg = `Sent keys: ${input.keys}`;
        this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
        return new ActionResult({
          extractedContent: msg,
          includeInMemory: true,
        });
      },
      sendKeysActionSchema,
    );
    actions.push(sendKeys);

    const scrollToText = new Action(
      async (input: z.infer<typeof scrollToTextActionSchema.schema>) => {
        const todo = input.desc || `Scroll to text: ${input.text}`;
        this.context.emitEvent(
          Actors.NAVIGATOR,
          ExecutionState.ACT_START,
          todo,
        );

        const page = await this.context.browserContext.getCurrentPage();
        try {
          const scrolled = await page.scrollToText(input.text);
          const msg = scrolled
            ? `Scrolled to text: ${input.text}`
            : `Text '${input.text}' not found or not visible on page`;
          this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
          return new ActionResult({
            extractedContent: msg,
            includeInMemory: true,
          });
        } catch (error) {
          const msg = `Failed to scroll to text: ${error instanceof Error ? error.message : String(error)}`;
          this.context.emitEvent(
            Actors.NAVIGATOR,
            ExecutionState.ACT_FAIL,
            msg,
          );
          return new ActionResult({ error: msg, includeInMemory: true });
        }
      },
      scrollToTextActionSchema,
    );
    actions.push(scrollToText);

    return actions;
  }
}
