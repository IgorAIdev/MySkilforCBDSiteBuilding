"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.insertTokensImport = insertTokensImport;
var _eslintCodemodUtils = require("eslint-codemod-utils");
function insertTokensImport(fixer) {
  return (0, _eslintCodemodUtils.insertAtStartOfFile)(fixer, "".concat((0, _eslintCodemodUtils.insertImportDeclaration)('@atlaskit/tokens', ['token']), "\n"));
}