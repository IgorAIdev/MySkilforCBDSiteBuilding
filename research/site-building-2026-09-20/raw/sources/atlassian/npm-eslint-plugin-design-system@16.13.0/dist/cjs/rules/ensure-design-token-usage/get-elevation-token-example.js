"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getElevationTokenExample = void 0;
var getElevationTokenExample = exports.getElevationTokenExample = function getElevationTokenExample(elevation) {
  return "```\nimport { token } from '@atlaskit/tokens';\n\ncss({\n  backgroundColor: token('".concat(elevation.background, "');\n  boxShadow: token('").concat(elevation.shadow, "');\n});\n```");
};