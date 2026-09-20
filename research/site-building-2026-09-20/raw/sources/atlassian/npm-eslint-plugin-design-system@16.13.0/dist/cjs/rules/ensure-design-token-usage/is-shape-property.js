"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isShapeProperty = isShapeProperty;
var _isBorderSizeProperty = require("./is-border-size-property");
var _isRadiusProperty = require("./is-radius-property");
function isShapeProperty(propertyName) {
  return (0, _isRadiusProperty.isRadiusProperty)(propertyName) || (0, _isBorderSizeProperty.isBorderSizeProperty)(propertyName);
}