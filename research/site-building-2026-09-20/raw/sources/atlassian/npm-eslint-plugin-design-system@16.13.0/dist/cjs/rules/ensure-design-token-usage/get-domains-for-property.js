"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDomainsForProperty = getDomainsForProperty;
var _isColorCssPropertyName = require("../utils/is-color-css-property-name");
var _isCurrentSurfaceCustomPropertyName = require("../utils/is-current-surface-custom-property-name");
var _isShapeProperty = require("./is-shape-property");
var _isSpacingProperty = require("./is-spacing-property");
/**
 * Returns an array of domains that are relevant to the provided property based on the rule options.
 * @param propertyName camelCase CSS property
 * @param targetOptions Array containing the types of properties that should be included in the rule.
 * @example
 * ```
 * propertyName: padding, targetOptions: ['spacing'] -> returns ['spacing']
 * propertyName: backgroundColor, targetOptions: ['spacing'] -> returns []
 * propertyName: backgroundColor, targetOptions: ['color', 'spacing'] -> returns ['color']
 * ```
 */
function getDomainsForProperty(propertyName, targetOptions) {
  var domains = [];
  if (((0, _isColorCssPropertyName.isColorCssPropertyName)(propertyName) || (0, _isCurrentSurfaceCustomPropertyName.isCurrentSurfaceCustomPropertyName)(propertyName)) && targetOptions.includes('color')) {
    domains.push('color');
  }
  if ((0, _isSpacingProperty.isSpacingProperty)(propertyName) && targetOptions.includes('spacing')) {
    domains.push('spacing');
  }
  if ((0, _isShapeProperty.isShapeProperty)(propertyName) && targetOptions.includes('shape')) {
    domains.push('shape');
  }
  return domains;
}