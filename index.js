'use strict';

// Global init
global.Promise = require('babel-runtime/core-js/promise').default = require('bluebird');

// Exports
module.exports = require('./dist/index').default;