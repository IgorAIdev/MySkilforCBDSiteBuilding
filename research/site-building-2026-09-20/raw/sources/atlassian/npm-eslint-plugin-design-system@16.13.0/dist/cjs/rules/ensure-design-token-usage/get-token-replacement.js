"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getTokenReplacement = getTokenReplacement;
var _findTokenNameByPropertyValue = require("./find-token-name-by-property-value");
var _getTokenNodeForValue = require("./get-token-node-for-value");
var _normaliseValue = require("./normalise-value");
/**
 * Returns a stringifiable node with the token expression corresponding to its matching token.
 * If no token found for the pair the function returns undefined.
 * @param propertyName string camelCased css property.
 * @param value The computed value e.g '8px' -> '8'.
 */
function getTokenReplacement(propertyName, value) {
  var tokenName = (0, _findTokenNameByPropertyValue.findTokenNameByPropertyValue)(propertyName, value);
  if (!tokenName) {
    return undefined;
  }
  var fallbackValue = (0, _normaliseValue.normaliseValue)(propertyName, value);
  return (0, _getTokenNodeForValue.getTokenNodeForValue)(propertyName, fallbackValue);
}