"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getTokenNodeForValue = getTokenNodeForValue;
var _eslintCodemodUtils = require("eslint-codemod-utils");
var _findTokenNameByPropertyValue = require("./find-token-name-by-property-value");
/**
 * Returns a token node for a given value including fallbacks.
 * @param propertyName camelCase CSS property
 * @param value string representing pixel value, or font family, or number representing font weight
 * @example
 * ```
 * propertyName: padding, value: '8px' => token('space.100', '8px')
 * propertyName: fontWeight, value: 400 => token('font.weight.regular', '400')
 * ```
 */
function getTokenNodeForValue(propertyName, value) {
  var token = (0, _findTokenNameByPropertyValue.findTokenNameByPropertyValue)(propertyName, value);
  var fallbackValue = propertyName === 'fontFamily' ? {
    value: "".concat(value),
    raw: "`".concat(value, "`")
  } : "".concat(value);
  return (0, _eslintCodemodUtils.callExpression)({
    callee: (0, _eslintCodemodUtils.identifier)({
      name: 'token'
    }),
    arguments: [(0, _eslintCodemodUtils.literal)({
      value: "'".concat(token !== null && token !== void 0 ? token : '', "'")
    }), (0, _eslintCodemodUtils.literal)(fallbackValue)],
    optional: false
  });
}