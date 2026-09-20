"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isAuto = void 0;
var isAuto = exports.isAuto = function isAuto(value) {
  if (typeof value === 'string') {
    if (value === 'auto') {
      return true;
    }
  }
  return false;
};