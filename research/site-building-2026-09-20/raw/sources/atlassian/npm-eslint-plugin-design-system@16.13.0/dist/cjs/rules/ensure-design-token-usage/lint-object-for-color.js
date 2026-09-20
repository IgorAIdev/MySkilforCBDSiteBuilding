"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.lintObjectForColor = void 0;
var _eslintCodemodUtils = require("eslint-codemod-utils");
var _contextCompat = require("@atlaskit/eslint-utils/context-compat");
var _getIsException = require("../utils/get-is-exception");
var _includesHardCodedColor = require("../utils/includes-hard-coded-color");
var _isHardCodedColor = require("../utils/is-hard-coded-color");
var _isLegacyColor = require("../utils/is-legacy-color");
var _isLegacyNamedColor = require("../utils/is-legacy-named-color");
var _getTokenSuggestion = require("./get-token-suggestion");
var TYPESCRIPT_EXPRESSION_WRAPPER_TYPES = new Set(['TSAsExpression', 'TSTypeAssertion', 'TSNonNullExpression', 'TSSatisfiesExpression']);

/**
 * TypeScript's expression wrappers are transparent for color classification.
 * In particular, `key as readonly string[]` is still the same computed key as
 * `key`. Unwrapping before inspecting the member property also keeps the
 * codemod stringifier away from type-only nodes it does not support.
 */
var unwrapTypeScriptExpression = function unwrapTypeScriptExpression(node) {
  var expression = node;
  while (TYPESCRIPT_EXPRESSION_WRAPPER_TYPES.has(expression.type)) {
    expression = expression.expression;
  }
  return expression;
};

// ObjectExpression
var lintObjectForColor = exports.lintObjectForColor = function lintObjectForColor(propertyNode, context, config) {
  var _identifierNode;
  var propertyKey = '';
  if (propertyNode.key.type === 'Identifier') {
    propertyKey = propertyNode.key.name.toString();
  }
  var node = propertyNode.value;

  // ObjectExpression > Property > Literal
  if (node.type === 'Literal') {
    var _node$value;
    var nodeVal = ((_node$value = node.value) === null || _node$value === void 0 ? void 0 : _node$value.toString()) || '';
    var _isException = (0, _getIsException.getIsException)(config.exceptions);
    if (((0, _isHardCodedColor.isHardCodedColor)(nodeVal) || (0, _includesHardCodedColor.includesHardCodedColor)(nodeVal)) && !_isException(node)) {
      context.report({
        messageId: 'hardCodedColor',
        node: node,
        suggest: (0, _getTokenSuggestion.getTokenSuggestion)(node, "'".concat(nodeVal, "'"), config)
      });
    }
    return;
  }
  var isException = (0, _getIsException.getIsException)(config.exceptions);

  // ObjectExpression > Property > CallExpression
  if (node.type === 'CallExpression') {
    if (!(0, _eslintCodemodUtils.isNodeOfType)(node.callee, 'Identifier')) {
      return;
    }
    if (!(0, _isLegacyNamedColor.isLegacyNamedColor)(node.callee.name) || isException(node)) {
      return;
    }
    context.report({
      messageId: 'hardCodedColor',
      node: node,
      suggest: (0, _getTokenSuggestion.getTokenSuggestion)(node, "".concat(node.callee.name, "()"), config)
    });
    return;
  }

  // Template literals are already handled by 'TemplateLiteral > Identifier' in the main file
  if (node.type === 'TemplateLiteral') {
    return;
  }
  var identifierNode = null;

  // ObjectExpression > Property > MemberExpression
  if (node.type === 'MemberExpression') {
    var property = unwrapTypeScriptExpression(node.property);
    if (property.type !== 'Identifier') {
      context.report({
        messageId: 'hardCodedColor',
        node: node,
        suggest: (0, _getTokenSuggestion.getTokenSuggestion)(node, property === node.property ? (0, _eslintCodemodUtils.node)(node).toString() : (0, _contextCompat.getSourceCode)(context).getText(node), config)
      });
      return;
    }
    identifierNode = property;
  }
  if (node.type === 'Identifier') {
    // identifier is the key and not the value
    if (node.name === propertyKey) {
      return;
    }
    identifierNode = node;
  }

  // ObjectExpression > Property > MemberExpression > Identifier
  // ObjectExpression > Property > Identifier
  if (((_identifierNode = identifierNode) === null || _identifierNode === void 0 ? void 0 : _identifierNode.type) === 'Identifier') {
    if (((0, _isHardCodedColor.isHardCodedColor)(identifierNode.name) || (0, _includesHardCodedColor.includesHardCodedColor)(identifierNode.name) || (0, _isLegacyColor.isLegacyColor)(identifierNode.name)) && !isException(identifierNode)) {
      context.report({
        messageId: 'hardCodedColor',
        node: identifierNode,
        suggest: (0, _getTokenSuggestion.getTokenSuggestion)(identifierNode, identifierNode.name, config)
      });
      return;
    }
  }
  return;
};