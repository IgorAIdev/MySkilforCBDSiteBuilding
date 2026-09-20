"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.borderWidthValueToToken = void 0;
var _atlassianShape = _interopRequireDefault(require("@atlaskit/tokens/atlassian-shape"));
var borderWidthValueToToken = exports.borderWidthValueToToken = Object.fromEntries(_atlassianShape.default.filter(function (t) {
  return t.name.startsWith('border.width');
}).map(function (t) {
  return [t.value, t.cleanName];
}).concat([['2px', 'border.width']]));