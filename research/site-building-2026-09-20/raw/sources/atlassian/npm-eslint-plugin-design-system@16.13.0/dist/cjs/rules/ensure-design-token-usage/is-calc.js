"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isCalc = void 0;
var calcRegex = /(^calc)/;
var isCalc = exports.isCalc = function isCalc(value) {
  if (typeof value === 'string') {
    if (calcRegex.test(value)) {
      return true;
    }
  }
  return false;
};