"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isTokenValueString = isTokenValueString;
/**
 * Returns whether the current string is a token value.
 * @param originalVaue string representing a css property value e.g 1em, 12px.
 */
function isTokenValueString(originalValue) {
  return originalValue.startsWith('${token(') && originalValue.endsWith('}');
}