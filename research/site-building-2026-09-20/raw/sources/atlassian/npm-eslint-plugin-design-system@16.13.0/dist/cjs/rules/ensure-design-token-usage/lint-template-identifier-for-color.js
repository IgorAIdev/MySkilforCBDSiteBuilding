"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.lintTemplateIdentifierForColor = void 0;
var _getIsException = require("../utils/get-is-exception");
var _isChildOfType = require("../utils/is-child-of-type");
var _isDecendantOfGlobalToken = require("../utils/is-decendant-of-global-token");
var _isDecendantOfStyleBlock = require("../utils/is-decendant-of-style-block");
var _isElevation = require("../utils/is-elevation");
var _isLegacyColor = require("../utils/is-legacy-color");
var _isLegacyNamedColor = require("../utils/is-legacy-named-color");
var _getElevationTokenExample = require("./get-elevation-token-example");
var _getTokenSuggestion = require("./get-token-suggestion");
var getNodeColumn = function getNodeColumn(node) {
  return node.loc ? node.loc.start.column : 0;
};

// TemplateLiteral > Identifier
var lintTemplateIdentifierForColor = exports.lintTemplateIdentifierForColor = function lintTemplateIdentifierForColor(node, context, config) {
  if (node.type !== 'Identifier') {
    return;
  }
  if ((0, _isDecendantOfGlobalToken.isDecendantOfGlobalToken)(node) || !(0, _isDecendantOfStyleBlock.isDecendantOfStyleBlock)(node)) {
    return;
  }
  var elevation = (0, _isElevation.isLegacyElevation)(node.name);
  if (elevation) {
    context.report({
      messageId: 'legacyElevation',
      node: node,
      data: {
        example: (0, _getElevationTokenExample.getElevationTokenExample)(elevation)
      },
      fix: function fix(fixer) {
        if ((0, _isChildOfType.isChildOfType)(node, 'TemplateLiteral') && node.range) {
          return fixer.replaceTextRange([node.range[0] - 2, node.range[1] + 1], "background-color: ${token('".concat(elevation.background, "')};\n").concat(' '.repeat(getNodeColumn(node) - 2), "box-shadow: ${token('").concat(elevation.shadow, "')}"));
        }
        return null;
      }
    });
  }
  var isException = (0, _getIsException.getIsException)(config.exceptions);
  if ((0, _isLegacyColor.isLegacyColor)(node.name) || (0, _isLegacyNamedColor.isLegacyNamedColor)(node.name) && !isException(node)) {
    context.report({
      messageId: 'hardCodedColor',
      node: node,
      suggest: (0, _getTokenSuggestion.getTokenSuggestion)(node, node.name, config)
    });
    return;
  }
};