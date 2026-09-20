"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.convertHyphenatedNameToCamelCase = void 0;
// convert line-height to lineHeight
var convertHyphenatedNameToCamelCase = exports.convertHyphenatedNameToCamelCase = function convertHyphenatedNameToCamelCase(prop) {
  return prop.replace(/-./g, function (m) {
    return m[1].toUpperCase();
  });
};