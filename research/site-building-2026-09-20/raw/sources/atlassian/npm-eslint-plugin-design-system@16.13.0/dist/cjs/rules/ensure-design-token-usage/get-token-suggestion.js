"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getTokenSuggestion = void 0;
var _eslintCodemodUtils = require("eslint-codemod-utils");
var _isDecendantOfGlobalToken = require("../utils/is-decendant-of-global-token");
var filterSuggestion = function filterSuggestion(_ref) {
  var shouldReturnSuggestion = _ref.shouldReturnSuggestion;
  return shouldReturnSuggestion;
};
var getTokenSuggestion = exports.getTokenSuggestion = function getTokenSuggestion(node, reference, config) {
  return [{
    shouldReturnSuggestion: !(0, _isDecendantOfGlobalToken.isDecendantOfGlobalToken)(node) && config.shouldEnforceFallbacks === false,
    desc: "Convert to token",
    fix: function fix(fixer) {
      return fixer.replaceText((0, _eslintCodemodUtils.isNodeOfType)(node.parent, 'MemberExpression') ? node.parent : node, (0, _eslintCodemodUtils.isNodeOfType)(node.parent, 'JSXAttribute') ? "{token('')}" : "token('')");
    }
  }, {
    shouldReturnSuggestion: !(0, _isDecendantOfGlobalToken.isDecendantOfGlobalToken)(node) && config.shouldEnforceFallbacks === true,
    desc: "Convert to token with fallback",
    fix: function fix(fixer) {
      return fixer.replaceText((0, _eslintCodemodUtils.isNodeOfType)(node.parent, 'MemberExpression') ? node.parent : node, (0, _eslintCodemodUtils.isNodeOfType)(node.parent, 'JSXAttribute') ? "{token('', ".concat(reference, ")}") : "token('', ".concat(reference, ")"));
    }
  }].filter(filterSuggestion);
};