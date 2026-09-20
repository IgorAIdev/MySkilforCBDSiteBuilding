"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getPropertyNodeFromParent = getPropertyNodeFromParent;
var _eslintCodemodUtils = require("eslint-codemod-utils");
function getPropertyNodeFromParent(property, parentNode) {
  var propertyNode = parentNode.properties.find(function (node) {
    if (!(0, _eslintCodemodUtils.isNodeOfType)(node, 'Property')) {
      return;
    }
    if (!(0, _eslintCodemodUtils.isNodeOfType)(node.key, 'Identifier')) {
      return;
    }
    return node.key.name === property;
  });
  return propertyNode;
}