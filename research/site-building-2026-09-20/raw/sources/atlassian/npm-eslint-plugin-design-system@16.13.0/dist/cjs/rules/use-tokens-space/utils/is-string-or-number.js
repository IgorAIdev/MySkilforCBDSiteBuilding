"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isStringOrNumber = void 0;
var isStringOrNumber = exports.isStringOrNumber = function isStringOrNumber(value) {
  return typeof value === 'string' || typeof value === 'number';
};