"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.emToPixels = void 0;
var emRegex = /(.*\d+)em$/;
var percentageRegex = /(%$)/;
var emToPixels = exports.emToPixels = function emToPixels(value, fontSize) {
  if (typeof value === 'string') {
    var emMatch = value.match(emRegex);
    if (emMatch && typeof fontSize === 'number') {
      return Number(emMatch[1]) * fontSize;
    } else if (value.match(percentageRegex)) {
      return value;
    } else {
      return null;
    }
  }
  return value;
};