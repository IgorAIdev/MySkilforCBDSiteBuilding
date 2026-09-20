"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isBorderSizeProperty = isBorderSizeProperty;
var borderSizeProperties = ['borderWidth', 'outlineWidth', 'borderRightWidth', 'borderLeftWidth', 'borderTopWidth', 'borderBottomWidth', 'borderInlineWidth', 'borderBlockWidth'];
function isBorderSizeProperty(propertyName) {
  return borderSizeProperties.includes(propertyName);
}