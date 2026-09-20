"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getValueFromTemplateLiteralRaw = void 0;
var _eslintCodemodUtils = require("eslint-codemod-utils");
var _getValue = require("./get-value");
/**
 * @example
 * ```js
 * `2 ${variable} 0`
 *
 * // results in [2, NaN, 0]
 * ```
 * ```js
 * const variable = 4;
 * `2 ${variable} 0`
 *
 * // results in [2, 4, 0]
 * ```
 */
var getValueFromTemplateLiteralRaw = exports.getValueFromTemplateLiteralRaw = function getValueFromTemplateLiteralRaw(node, context) {
  if (!(0, _eslintCodemodUtils.isNodeOfType)(node, "TemplateLiteral")) {
    return null;
  }
  var combinedString = node.quasis.map(function (q, i) {
    return "".concat(q.value.raw).concat(node.expressions[i] ? (0, _getValue.getValue)(node.expressions[i], context) : '');
  }).join('').trim();
  var fontFamily = /(sans-serif$)|(monospace$)/;
  if (fontFamily.test(combinedString)) {
    return combinedString;
  }
  return combinedString.split(' ');
};