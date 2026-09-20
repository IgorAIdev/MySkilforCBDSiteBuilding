"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.findParentNodeForLine = void 0;
/**
 * @param node
 * @returns The furthest parent node that is on the same line as the input node.
 */
var _findParentNodeForLine = exports.findParentNodeForLine = function findParentNodeForLine(node) {
  var _node$loc, _node$parent$loc;
  if (!node.parent) {
    return node;
  }
  if (((_node$loc = node.loc) === null || _node$loc === void 0 ? void 0 : _node$loc.start.line) !== ((_node$parent$loc = node.parent.loc) === null || _node$parent$loc === void 0 ? void 0 : _node$parent$loc.start.line)) {
    return node;
  } else {
    return _findParentNodeForLine(node.parent);
  }
};