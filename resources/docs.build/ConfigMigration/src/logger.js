/**
 * Logger configuration.
 */

'use strict';

const path = require('path');
const fs = require('fs');

const {format, loggers, transports} = require('winston');
const {combine, timestamp, colorize, printf} = format;

// container winston logger to avoid logger collisions when imported as dependency
loggers.add('migration-logger');
const logger = loggers.get('migration-logger');


const opBuildLogLevelMap = {
  info: 'info',
  warn: 'warning',
  error: 'error'
};

const opBuildFormat = combine(
  timestamp(),
  format((info, opts) => {
    return {
      message: info.message,
      message_severity: opBuildLogLevelMap[info.level],
      source: 'docFX-migration-tool',
      log_item_type: opts.logItemType || 'System',
      date_time: info.timestamp,
      code: info.code || `migration-tool-${info.level}`,
      file: info.file || ''
    };
  })(),
  format.json()
);

const getConsoleFormat = function (enableColor = true) {
  let formats = [
    timestamp(),
    printf(info => {
      return `${info.timestamp} ${info.level}: ${info.message}`;
    })];
  enableColor && formats.unshift(colorize());
  return combine(...formats);
};


const resetDest = function (logDirectory) {
  logger.removeAllListeners();

  let logFilePath = path.join(logDirectory, '.errors.log');

  logger.add(new transports.Console({name: 'console', level: 'verbose', format: getConsoleFormat()}));
  logger.add(new transports.File({filename: logFilePath, level: 'warn', format: opBuildFormat}));
};

const suppressLogger = function(level) {
  logger.removeAllListeners();
  logger.add(new transports.Console({name: 'console', level: level || 'verbose', format: getConsoleFormat(), silent: true}));
};

const consoleOnlyLogger = function(level, enableColor = true) {
  logger.removeAllListeners();
  logger.add(new transports.Console({name: 'console', level: level || 'verbose', format: getConsoleFormat(enableColor)}));
};

// by default turn to console-only logger, whenever required by other projects
if (!logger.transports || logger.transports.length == 0) {
  consoleOnlyLogger();
}

module.exports.suppressLogger = suppressLogger;
module.exports.consoleOnlyLogger = consoleOnlyLogger;
module.exports.resetDest = resetDest;
module.exports.logger = logger;