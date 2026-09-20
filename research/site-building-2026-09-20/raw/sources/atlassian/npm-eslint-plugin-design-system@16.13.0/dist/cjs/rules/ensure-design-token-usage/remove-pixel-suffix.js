"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.removePixelSuffix = void 0;
var _isCalc = require("./is-calc");
var percentageOrEmOrAuto = /(%$)|(\d+em$)|(auto$)/;
var removePixelSuffix = exports.removePixelSuffix = function removePixelSuffix(value) {
  if (typeof value === 'string' && (percentageOrEmOrAuto.test(value) || (0, _isCalc.isCalc)(value))) {
    return value;
  }
  return Number(typeof value === 'string' ? value.replace('px', '') : value);
};