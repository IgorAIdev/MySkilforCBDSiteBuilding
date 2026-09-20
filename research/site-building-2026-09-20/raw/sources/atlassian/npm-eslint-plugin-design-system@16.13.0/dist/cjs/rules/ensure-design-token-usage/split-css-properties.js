"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.splitCssProperties = splitCssProperties;
/**
 * Attempts to remove all non-essential words & characters from a style block.
 * Including selectors and queries.
 * @param styleString string of css properties
 */
function splitCssProperties(styleString) {
  return styleString.split('\n').filter(function (line) {
    return !line.trim().startsWith('@');
  })
  // sometimes makers will end a css line with `;` that's output from a function expression
  // since we'll rely on `;` to split each line, we need to ensure it's there
  .map(function (line) {
    return line.endsWith(';') ? line : "".concat(line, ";");
  }).join('\n').replace(/\n/g, '').split(/;|(?<!\$){|(?<!\${.+?)}/) // don't split on template literal expressions i.e. `${...}`
  // filters lines that are completely null, this could be from function expressions that output both property and value
  .filter(function (line) {
    return line.trim() !== 'null' && line.trim() !== 'null;';
  }).map(function (el) {
    return el.trim() || '';
  })
  // we won't be able to reason about lines that don't have colon (:)
  .filter(function (line) {
    return line.split(':').length === 2;
  }).filter(Boolean);
}