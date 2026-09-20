"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isValidSpacingValue = void 0;
var emRegex = /(.*\d+)em$/;
var invalidSpacingUnitRegex = /(\d+rem$)|(vw$)|(vh$)/;
var isValidSpacingValue = exports.isValidSpacingValue = function isValidSpacingValue(value, fontSize) {
  if (typeof value === 'string') {
    if (invalidSpacingUnitRegex.test(value)) {
      return false;
    }
  } else if (Array.isArray(value)) {
    // could be array due to shorthand
    for (var val in value) {
      if (invalidSpacingUnitRegex.test(val)) {
        return false;
      }
    }
  }
  if (emRegex.test(value) && typeof fontSize !== 'number') {
    return false;
  }
  return true;
};