"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.processCssNode = processCssNode;
var _cleanComments = require("./clean-comments");
var _getRawExpression = require("./get-raw-expression");
var _getValue = require("./get-value");
var _splitCssProperties = require("./split-css-properties");
/**
 * Returns an array of tuples representing a processed css within `TaggedTemplateExpression` node.
 * Each element of the array is a tuple `[string, string]`,
 * where the first element is the processed css line with computed values
 * and the second element of the tuple is the original css line from source.
 * @param node TaggedTemplateExpression node.
 * @param context Rule.RuleContext.
 * @example
 * ```
 * `[['padding: 8', 'padding: ${gridSize()}'], ['margin: 6', 'margin: 6px' ]]`
 * ```
 */
function processCssNode(node, context) {
  var combinedString = node.quasi.quasis.map(function (q, i) {
    return "".concat(q.value.raw).concat(node.quasi.expressions[i] ? (0, _getValue.getValue)(node.quasi.expressions[i], context) : '');
  }).join('');
  var rawString = node.quasi.quasis.map(function (q, i) {
    return "".concat(q.value.raw).concat(node.quasi.expressions[i] ? (0, _getRawExpression.getRawExpression)(node.quasi.expressions[i], context) ? "${".concat((0, _getRawExpression.getRawExpression)(node.quasi.expressions[i], context), "}") : null : '');
  }).join('');
  var cssProperties = (0, _splitCssProperties.splitCssProperties)((0, _cleanComments.cleanComments)(combinedString));
  var unalteredCssProperties = (0, _splitCssProperties.splitCssProperties)((0, _cleanComments.cleanComments)(rawString));
  if (cssProperties.length !== unalteredCssProperties.length) {
    // this means something went wrong with the parsing, the original lines can't be reconciled with the processed lines
    return undefined;
  }
  return cssProperties.map(function (cssProperty, index) {
    return [cssProperty, unalteredCssProperties[index]];
  });
}