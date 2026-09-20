"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isRadiusProperty = isRadiusProperty;
var shapeProperties = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius', 'borderRadius', 'borderStartStartRadius', 'borderStartEndRadius', 'borderEndStartRadius', 'borderEndEndRadius'];
function isRadiusProperty(propertyName) {
  return shapeProperties.includes(propertyName);
}