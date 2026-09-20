"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.radiusValueToToken = void 0;
var _atlassianShape = _interopRequireDefault(require("@atlaskit/tokens/atlassian-shape"));
var radiusValueToToken = exports.radiusValueToToken = Object.fromEntries(_atlassianShape.default.filter(function (t) {
  return t.name.startsWith('radius');
}).map(function (t) {
  return [t.value, t.cleanName];
})
// add in extra entries to resolve 3px, 50%, and 100% to tokens
.concat([['3px', 'radius.small'], ['50%', 'radius.full'], ['100%', 'radius.full']]));