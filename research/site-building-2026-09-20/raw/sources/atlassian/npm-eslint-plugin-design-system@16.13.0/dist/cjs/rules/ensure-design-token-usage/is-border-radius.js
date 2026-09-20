"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isBorderRadius = isBorderRadius;
var _eslintCodemodUtils = require("eslint-codemod-utils");
function isBorderRadius(node) {
  return (0, _eslintCodemodUtils.isNodeOfType)(node, 'CallExpression') && (0, _eslintCodemodUtils.isNodeOfType)(node.callee, 'Identifier') && (node.callee.name === 'borderRadius' || node.callee.name === 'getBorderRadius');
}