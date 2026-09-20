"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getRawExpression = void 0;
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _eslintCodemodUtils = require("eslint-codemod-utils");
var _contextCompat = require("@atlaskit/eslint-utils/context-compat");
var getRawExpression = exports.getRawExpression = function getRawExpression(node, context) {
  if (!(
  // if not one of our recognized types or doesn't have a range prop, early return

  (0, _eslintCodemodUtils.isNodeOfType)(node, 'Literal') || (0, _eslintCodemodUtils.isNodeOfType)(node, 'Identifier') || (0, _eslintCodemodUtils.isNodeOfType)(node, 'BinaryExpression') || (0, _eslintCodemodUtils.isNodeOfType)(node, 'UnaryExpression') || (0, _eslintCodemodUtils.isNodeOfType)(node, 'TemplateLiteral') || (0, _eslintCodemodUtils.isNodeOfType)(node, 'CallExpression')) || !Array.isArray(node.range)) {
    return null;
  }
  var _node$range = (0, _slicedToArray2.default)(node.range, 2),
    start = _node$range[0],
    end = _node$range[1];
  return (0, _contextCompat.getSourceCode)(context).getText().substring(start, end).replaceAll('\n', '');
};