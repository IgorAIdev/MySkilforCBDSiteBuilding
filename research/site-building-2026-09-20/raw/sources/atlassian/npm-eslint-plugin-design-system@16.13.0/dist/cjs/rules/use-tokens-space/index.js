"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _createLintRule = require("../utils/create-lint-rule");
var _styleProperty = require("./transformers/style-property");
var rule = (0, _createLintRule.createLintRule)({
  meta: {
    name: 'use-tokens-space',
    type: 'problem',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description: 'Enforces usage of space design tokens rather than hard-coded values.',
      recommended: false,
      severity: 'error'
    },
    messages: {
      noRawSpacingValues: 'The use of spacing primitives or tokens is preferred over the direct application of spacing properties.'
    }
  },
  create: function create(context) {
    return {
      'CallExpression[callee.name="css"] ObjectExpression Property': function CallExpressionCalleeNameCss_ObjectExpression_Property(node) {
        return _styleProperty.StyleProperty.lint(node, {
          context: context
        });
      },
      'CallExpression[callee.name="keyframes"] ObjectExpression Property': function CallExpressionCalleeNameKeyframes_ObjectExpression_Property(node) {
        return _styleProperty.StyleProperty.lint(node, {
          context: context
        });
      },
      'CallExpression[callee.name="cssMap"] ObjectExpression Property': function CallExpressionCalleeNameCssMap_ObjectExpression_Property(node) {
        return _styleProperty.StyleProperty.lint(node, {
          context: context
        });
      },
      'CallExpression[callee.object.name=styled] ObjectExpression Property': function CallExpressionCalleeObjectNameStyled_ObjectExpression_Property(node) {
        return _styleProperty.StyleProperty.lint(node, {
          context: context
        });
      },
      'CallExpression[callee.object.name=styled2] ObjectExpression Property': function CallExpressionCalleeObjectNameStyled2_ObjectExpression_Property(node) {
        return _styleProperty.StyleProperty.lint(node, {
          context: context
        });
      }
    };
  }
});
var _default = exports.default = rule;