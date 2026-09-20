"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getValue = void 0;
var _eslintCodemodUtils = require("eslint-codemod-utils");
var _contextCompat = require("@atlaskit/eslint-utils/context-compat");
var _findInParent = require("../utils/find-in-parent");
var _getValueFromShorthand = require("./get-value-from-shorthand");
var _getValueFromTemplateLiteralRaw = require("./get-value-from-template-literal-raw");
var _isBorderRadius = require("./is-border-radius");
var _removePixelSuffix = require("./remove-pixel-suffix");
var isGridSize = function isGridSize(node) {
  return (0, _eslintCodemodUtils.isNodeOfType)(node, 'CallExpression') && (0, _eslintCodemodUtils.isNodeOfType)(node.callee, 'Identifier') && (node.callee.name === 'gridSize' || node.callee.name === 'getGridSize') &&
  // If there are arguments we know it's a custom gridSize function and cannot be certain what it returns
  node.arguments.length === 0;
};
var isToken = function isToken(node) {
  return (0, _eslintCodemodUtils.isNodeOfType)(node, 'CallExpression') && (0, _eslintCodemodUtils.isNodeOfType)(node.callee, 'Identifier') && node.callee.name === 'token';
};
var getRawExpressionForToken = function getRawExpressionForToken(node, context) {
  var args = node.arguments;
  var call = "${token(".concat(args.map(function (argNode) {
    if ((0, _eslintCodemodUtils.isNodeOfType)(argNode, 'Literal')) {
      return argNode.raw;
    }
    if ((0, _eslintCodemodUtils.isNodeOfType)(argNode, 'Identifier')) {
      return argNode.name;
    }
    if ((0, _eslintCodemodUtils.isNodeOfType)(argNode, 'MemberExpression')) {
      return getValue(argNode, context);
    }
  }).join(', '), ")}");
  return call;
};
var isFontSize = function isFontSize(node) {
  return (0, _eslintCodemodUtils.isNodeOfType)(node, 'CallExpression') && (0, _eslintCodemodUtils.isNodeOfType)(node.callee, 'Identifier') && (node.callee.name === 'fontSize' || node.callee.name === 'getFontSize');
};
var isFontSizeSmall = function isFontSizeSmall(node) {
  return (0, _eslintCodemodUtils.isNodeOfType)(node, 'CallExpression') && (0, _eslintCodemodUtils.isNodeOfType)(node.callee, 'Identifier') && node.callee.name === 'fontSizeSmall';
};
var getValueFromCallExpression = function getValueFromCallExpression(node, context) {
  if (!(0, _eslintCodemodUtils.isNodeOfType)(node, 'CallExpression')) {
    return null;
  }
  if (isGridSize(node)) {
    return 8;
  }
  if ((0, _isBorderRadius.isBorderRadius)(node)) {
    return 3;
  }
  if (isFontSize(node)) {
    return 14;
  }
  if (isFontSizeSmall(node)) {
    return 11;
  }
  if (isToken(node)) {
    return getRawExpressionForToken(node, context);
  }
  return null;
};
var getValueFromUnaryExpression = function getValueFromUnaryExpression(node, context) {
  if (!(0, _eslintCodemodUtils.isNodeOfType)(node, 'UnaryExpression')) {
    return null;
  }
  var value = getValue(node.argument, context);
  if (!value) {
    return null;
  }

  // eslint-disable-next-line no-eval
  return eval("".concat(node.operator, "(").concat(value, ")"));
};
var getValueFromBinaryExpression = function getValueFromBinaryExpression(node, context) {
  if (!(0, _eslintCodemodUtils.isNodeOfType)(node, 'BinaryExpression')) {
    return null;
  }
  var left = node.left,
    right = node.right,
    operator = node.operator;
  var leftValue = getValue(left, context);
  var rightValue = getValue(right, context);
  if (rightValue === null || rightValue === undefined || leftValue === null || leftValue === undefined) {
    return null;
  }
  try {
    // Token calls are represented as template fragments, which cannot always be
    // evaluated as JavaScript when composed into a binary expression.
    // eslint-disable-next-line no-eval
    return eval("".concat(leftValue).concat(operator).concat(rightValue));
  } catch (_unused) {
    return null;
  }
};
var getValueFromIdentifier = function getValueFromIdentifier(node, context) {
  if (!(0, _eslintCodemodUtils.isNodeOfType)(node, 'Identifier')) {
    return null;
  }
  if (node.name === 'gridSize') {
    return 8;
  }
  var scope = (0, _contextCompat.getScope)(context, node);
  var variable = (0, _findInParent.findIdentifierInParentScope)({
    scope: scope,
    identifierName: node.name
  });
  if (!variable) {
    return null;
  }
  var definition = variable.defs[0];
  if ((0, _eslintCodemodUtils.isNodeOfType)(definition.node, 'ImportSpecifier') && (0, _eslintCodemodUtils.isNodeOfType)(definition.node.parent, 'ImportDeclaration') && definition.node.parent.source.value === '@atlassian/jira-common-styles/src/main.tsx') {
    return definition.node.imported.type === 'Identifier' && definition.node.imported.name === 'gridSize' ? 8 : null;
  }
  if (!(0, _eslintCodemodUtils.isNodeOfType)(definition.node, 'VariableDeclarator')) {
    return null;
  }
  if (!definition.node.init) {
    return null;
  }
  return getValue(definition.node.init, context);
};
var getValueFromTemplateLiteral = function getValueFromTemplateLiteral(node, context) {
  var value = (0, _getValueFromTemplateLiteralRaw.getValueFromTemplateLiteralRaw)(node, context);
  return Array.isArray(value) ? value.map(_removePixelSuffix.removePixelSuffix) : value;
};
var getValue = exports.getValue = function getValue(node, context) {
  if ((0, _eslintCodemodUtils.isNodeOfType)(node, 'Literal')) {
    return (0, _getValueFromShorthand.getValueFromShorthand)(node.value);
  }
  if ((0, _eslintCodemodUtils.isNodeOfType)(node, 'BinaryExpression')) {
    return getValueFromBinaryExpression(node, context);
  }
  if ((0, _eslintCodemodUtils.isNodeOfType)(node, 'UnaryExpression')) {
    return getValueFromUnaryExpression(node, context);
  }
  if ((0, _eslintCodemodUtils.isNodeOfType)(node, 'CallExpression')) {
    return getValueFromCallExpression(node, context);
  }
  if ((0, _eslintCodemodUtils.isNodeOfType)(node, 'Identifier')) {
    return getValueFromIdentifier(node, context);
  }
  if ((0, _eslintCodemodUtils.isNodeOfType)(node, 'TemplateLiteral')) {
    return getValueFromTemplateLiteral(node, context);
  }
  return null;
};