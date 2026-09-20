"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.lintJSXIdentifierForColor = void 0;
var _getIsException = require("../utils/get-is-exception");
var _includesHardCodedColor = require("../utils/includes-hard-coded-color");
var _isLegacyColor = require("../utils/is-legacy-color");
var _getTokenSuggestion = require("./get-token-suggestion");
// JSXExpressionContainer > Identifier
var lintJSXIdentifierForColor = exports.lintJSXIdentifierForColor = function lintJSXIdentifierForColor(node, context, config) {
  // To force the correct node type
  if (node.type !== 'Identifier') {
    return;
  }
  var isException = (0, _getIsException.getIsException)(config.exceptions);
  if (isException(node)) {
    return;
  }
  if ((0, _isLegacyColor.isLegacyColor)(node.name) || (0, _includesHardCodedColor.includesHardCodedColor)(node.name)) {
    context.report({
      messageId: 'hardCodedColor',
      node: node,
      suggest: (0, _getTokenSuggestion.getTokenSuggestion)(node, node.name, config)
    });
    return;
  }
};