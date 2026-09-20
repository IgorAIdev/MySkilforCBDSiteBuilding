"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.normaliseValue = normaliseValue;
/**
 * Translate a raw value into the same value format for further parsing:
 *
 * -> for pixels this '8px'
 * -> for weights     '400'
 * -> for family      'Arial'.
 *
 * @internal
 */
function normaliseValue(propertyName, value) {
  var isFontStringProperty = /fontWeight|fontFamily|fontStyle/.test(propertyName);
  var isLineHeight = /lineHeight/.test(propertyName);
  var propertyValue = typeof value === 'string' ? value.trim() : value;
  var lookupValue;
  if (isFontStringProperty) {
    lookupValue = "".concat(propertyValue);
  } else if (isLineHeight) {
    lookupValue = value === 1 ? "".concat(propertyValue) : "".concat(propertyValue, "px");
  } else {
    lookupValue = typeof propertyValue === 'string' ? propertyValue : "".concat(propertyValue, "px");
  }
  return lookupValue;
}