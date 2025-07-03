#!/usr/bin/env node

import {
  onBeforeStart,
  BaseLogger,
  setConfig,
  addMiddleware,
} from '../src/index';

class CustomLogger extends BaseLogger {
  info(...args) {
    console.log('custom');
    console.log(...args);
  }
}

onBeforeStart(async () => {
  addMiddleware((req, res, next) => {
    console.log('req', req.headers);
    next();
  });

  setConfig({
    logger: new CustomLogger(),
  });
  console.log('setConfig');
});
