"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getValueFromShorthand = void 0;
var _removePixelSuffix = require("./remove-pixel-suffix");
var _splitShorthandValues = require("./split-shorthand-values");
var getValueFromShorthand = exports.getValueFromShorthand = function getValueFromShorthand(str) {
  var valueString = String(str);
  var fontFamily = /(Charlie)|(sans-serif$)|(monospace$)/;
  var fontWeightString = /(regular$)|(medium$)|(semibold$)|(bold$)/;
  var fontStyleString = /(inherit$)|(normal$)|(italic$)/;
  if (fontFamily.test(valueString) || fontWeightString.test(valueString) || fontStyleString.test(valueString)) {
    return [valueString];
  }
  // If we want to filter out NaN just add .filter(Boolean)
  return (0, _splitShorthandValues.splitShorthandValues)(String(str).trim()).map(_removePixelSuffix.removePixelSuffix);
};