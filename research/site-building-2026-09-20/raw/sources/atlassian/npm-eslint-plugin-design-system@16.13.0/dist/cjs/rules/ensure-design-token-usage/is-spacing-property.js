"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isSpacingProperty = void 0;
var properties = ['padding', 'paddingBlock', 'paddingInline', 'paddingLeft', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingInline', 'paddingInlineStart', 'paddingInlineEnd', 'paddingBlock', 'paddingBlockStart', 'paddingBlockEnd', 'marginLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginInline', 'marginInlineStart', 'marginInlineEnd', 'marginBlock', 'marginBlockStart', 'marginBlockEnd', 'margin', 'gap', 'rowGap', 'gridRowGap', 'columnGap', 'gridColumnGap', 'top', 'left', 'right', 'bottom', 'inlineStart', 'inlineEnd', 'blockStart', 'blockEnd', 'outline-offset'];
var isSpacingProperty = exports.isSpacingProperty = function isSpacingProperty(propertyName) {
  return properties.includes(propertyName);
};