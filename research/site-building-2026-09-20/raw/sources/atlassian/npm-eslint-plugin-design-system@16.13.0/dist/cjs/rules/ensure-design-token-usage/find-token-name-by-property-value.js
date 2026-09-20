"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.findTokenNameByPropertyValue = findTokenNameByPropertyValue;
var _atlassianSpacing = _interopRequireDefault(require("@atlaskit/tokens/atlassian-spacing"));
var _borderWidthValueToToken = require("./border-width-value-to-token");
var _isBorderSizeProperty = require("./is-border-size-property");
var _isShapeProperty = require("./is-shape-property");
var _normaliseValue = require("./normalise-value");
var _radiusValueToToken = require("./radius-value-to-token");
var spacingValueToToken = Object.fromEntries(_atlassianSpacing.default.map(function (token) {
  return [token.value, token.cleanName];
}));
function findTokenNameByPropertyValue(propertyName, value) {
  var lookupValue = (0, _normaliseValue.normaliseValue)(propertyName, value);
  var tokenName = (0, _isShapeProperty.isShapeProperty)(propertyName) ? (0, _isBorderSizeProperty.isBorderSizeProperty)(propertyName) ? _borderWidthValueToToken.borderWidthValueToToken[lookupValue] : _radiusValueToToken.radiusValueToToken[lookupValue] : spacingValueToToken[lookupValue];
  if (!tokenName) {
    return undefined;
  }
  return tokenName;
}