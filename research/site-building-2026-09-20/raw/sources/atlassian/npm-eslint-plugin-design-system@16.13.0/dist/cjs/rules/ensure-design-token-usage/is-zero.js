"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isZero = void 0;
var isZero = exports.isZero = function isZero(value) {
  if (typeof value === 'string') {
    if (value === '0px' || value === '0') {
      return true;
    }
  }
  if (typeof value === 'number') {
    if (value === 0) {
      return true;
    }
  }
  return false;
};