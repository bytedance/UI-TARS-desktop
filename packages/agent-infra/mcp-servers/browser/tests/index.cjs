#!/usr/bin/env node

const {
  BaseLogger,
  setConfig,
  addMiddleware,
} = require('../dist/request-context.cjs');

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

// start server
require('../dist/index.cjs');
