import { Logger } from '@agent-infra/logger';
import { Browser, Page } from 'puppeteer-core';

export type ToolContext = {
  page: Page;
  browser: Browser;
  logger: Logger;
};
