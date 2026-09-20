"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.lintJSXMemberForColor = void 0;
var _eslintCodemodUtils = require("eslint-codemod-utils");
var _isLegacyColor = require("../utils/is-legacy-color");
var _isLegacyNamedColor = require("../utils/is-legacy-named-color");
var _getTokenSuggestion = require("./get-token-suggestion");
// JSXExpressionContainer > MemberExpression
var lintJSXMemberForColor = exports.lintJSXMemberForColor = function lintJSXMemberForColor(node, context, config) {
  // To force the correct node type
  if (node.type !== 'MemberExpression') {
    return;
  }
  if (!(0, _eslintCodemodUtils.isNodeOfType)(node.property, 'Identifier')) {
    return;
  }
  if ((0, _isLegacyColor.isLegacyColor)(node.property.name) || (0, _eslintCodemodUtils.isNodeOfType)(node.object, 'Identifier') && node.object.name === 'colors' && (0, _isLegacyNamedColor.isLegacyNamedColor)(node.property.name)) {
    context.report({
      messageId: 'hardCodedColor',
      node: node,
      suggest: (0, _getTokenSuggestion.getTokenSuggestion)(node, (0, _eslintCodemodUtils.node)(node).toString(), config)
    });
    return;
  }
};