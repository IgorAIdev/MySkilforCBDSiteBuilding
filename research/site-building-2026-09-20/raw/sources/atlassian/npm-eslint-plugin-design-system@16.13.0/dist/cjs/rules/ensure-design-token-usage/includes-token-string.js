"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.includesTokenString = includesTokenString;
function includesTokenString(originalValue) {
  return originalValue.includes('${token(');
}