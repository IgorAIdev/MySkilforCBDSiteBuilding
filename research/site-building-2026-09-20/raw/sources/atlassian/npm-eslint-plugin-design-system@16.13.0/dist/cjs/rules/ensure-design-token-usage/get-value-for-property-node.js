"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getValueForPropertyNode = getValueForPropertyNode;
var _eslintCodemodUtils = require("eslint-codemod-utils");
var _getValue = require("./get-value");
function getValueForPropertyNode(propertyNode, context) {
  var propertyValueRaw = (0, _eslintCodemodUtils.isNodeOfType)(propertyNode, 'Property') ? (0, _getValue.getValue)(propertyNode.value, context) : null;
  var propertyValue = Array.isArray(propertyValueRaw) ? propertyValueRaw[0] : propertyValueRaw;
  return propertyValue;
}