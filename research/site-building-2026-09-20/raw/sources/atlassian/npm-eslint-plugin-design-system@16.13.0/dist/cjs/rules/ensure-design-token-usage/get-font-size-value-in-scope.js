"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getFontSizeValueInScope = getFontSizeValueInScope;
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _getValueFromShorthand = require("./get-value-from-shorthand");
function getFontSizeValueInScope(cssProperties) {
  var fontSizeNode = cssProperties.find(function (_ref) {
    var _ref2 = (0, _slicedToArray2.default)(_ref, 1),
      style = _ref2[0];
    var _style$split = style.split(':'),
      _style$split2 = (0, _slicedToArray2.default)(_style$split, 2),
      rawProperty = _style$split2[0],
      value = _style$split2[1];
    return /font-size/.test(rawProperty) ? value : null;
  });
  if (!fontSizeNode) {
    return undefined;
  }
  var _fontSizeNode$0$split = fontSizeNode[0].split(':'),
    _fontSizeNode$0$split2 = (0, _slicedToArray2.default)(_fontSizeNode$0$split, 2),
    _ = _fontSizeNode$0$split2[0],
    fontSizeValue = _fontSizeNode$0$split2[1];
  if (!fontSizeValue) {
    return undefined;
  }
  return (0, _getValueFromShorthand.getValueFromShorthand)(fontSizeValue)[0];
}