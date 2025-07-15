#!/usr/bin/env node

import {
  BaseLogger,
  setConfig,
  addMiddleware,
} from '../src/request-context.ts';

class CustomLogger extends BaseLogger {
  info(...args) {
    console.log('custom');
    console.log(...args);
  }
}

addMiddleware((req, res, next) => {
  console.log('req', req.headers);
  next();
});

setConfig({
  logger: new CustomLogger(),
});
console.log('setConfig');

// start server
import '../src/index';
