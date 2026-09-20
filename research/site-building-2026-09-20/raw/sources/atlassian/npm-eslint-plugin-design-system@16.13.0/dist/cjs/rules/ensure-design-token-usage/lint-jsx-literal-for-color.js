"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.lintJSXLiteralForColor = void 0;
var _eslintCodemodUtils = require("eslint-codemod-utils");
var _contextCompat = require("@atlaskit/eslint-utils/context-compat");
var _getIsException = require("../utils/get-is-exception");
var _includesHardCodedColor = require("../utils/includes-hard-coded-color");
var _isDecendantOfPrimitive = require("../utils/is-decendant-of-primitive");
var _isDecendantOfSvgElement = require("../utils/is-decendant-of-svg-element");
var _isHardCodedColor = require("../utils/is-hard-coded-color");
var _getTokenSuggestion = require("./get-token-suggestion");
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t.return || t.return(); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
/**
 * Check if the JSXAttribute is a 'color' prop on a Tag component imported from @atlaskit/tag
 */
var isTagComponentColorProp = function isTagComponentColorProp(jsxAttributeNode, context) {
  var _variable$defs;
  if (!(0, _eslintCodemodUtils.isNodeOfType)(jsxAttributeNode, 'JSXAttribute')) {
    return false;
  }

  // Check if the attribute name is 'color'
  var attributeName = typeof jsxAttributeNode.name.name === 'string' ? jsxAttributeNode.name.name : jsxAttributeNode.name.name.name;
  if (attributeName !== 'color') {
    return false;
  }

  // Find the JSXOpeningElement
  var currentNode = jsxAttributeNode.parent;
  while (currentNode && !(0, _eslintCodemodUtils.isNodeOfType)(currentNode, 'JSXOpeningElement')) {
    currentNode = currentNode.parent;
  }
  if (!currentNode || !(0, _eslintCodemodUtils.isNodeOfType)(currentNode, 'JSXOpeningElement')) {
    return false;
  }

  // Get the component name
  var elementName = (0, _eslintCodemodUtils.isNodeOfType)(currentNode.name, 'JSXIdentifier') ? currentNode.name.name : null;
  if (!elementName) {
    return false;
  }

  // Check if the component is imported from @atlaskit/tag (scope-based resolution)
  var scope = (0, _contextCompat.getScope)(context, jsxAttributeNode);
  var variable = scope.variables.find(function (v) {
    return v.name === elementName;
  });
  if (variable !== null && variable !== void 0 && (_variable$defs = variable.defs) !== null && _variable$defs !== void 0 && _variable$defs.length) {
    var _iterator = _createForOfIteratorHelper(variable.defs),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var def = _step.value;
        if (def.type === 'ImportBinding' && def.parent && (0, _eslintCodemodUtils.isNodeOfType)(def.parent, 'ImportDeclaration')) {
          var importSource = def.parent.source.value;
          if (typeof importSource === 'string' && importSource.match(/^@atlaskit\/tag(\/|$)/)) {
            return true;
          }
        }
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  }

  // Fallback: scan AST for ImportDeclaration (more reliable when scope differs e.g. in some monorepo/parser setups)
  var sourceCode = (0, _contextCompat.getSourceCode)(context);
  var ast = sourceCode.ast;
  if (ast !== null && ast !== void 0 && ast.body) {
    var _iterator2 = _createForOfIteratorHelper(ast.body),
      _step2;
    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var _node$source, _node$specifiers;
        var node = _step2.value;
        if (!(0, _eslintCodemodUtils.isNodeOfType)(node, 'ImportDeclaration')) {
          continue;
        }
        var source = (_node$source = node.source) === null || _node$source === void 0 ? void 0 : _node$source.value;
        if (typeof source !== 'string' || !source.match(/^@atlaskit\/tag(\/|$)/)) {
          continue;
        }
        var hasMatchingImport = (_node$specifiers = node.specifiers) === null || _node$specifiers === void 0 ? void 0 : _node$specifiers.some(function (s) {
          var _s$local, _s$local2;
          return s.type === 'ImportDefaultSpecifier' && ((_s$local = s.local) === null || _s$local === void 0 ? void 0 : _s$local.name) === elementName || s.type === 'ImportSpecifier' && ((_s$local2 = s.local) === null || _s$local2 === void 0 ? void 0 : _s$local2.name) === elementName;
        });
        if (hasMatchingImport) {
          return true;
        }
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
  }
  return false;
};

// JSXAttribute > Literal
var lintJSXLiteralForColor = exports.lintJSXLiteralForColor = function lintJSXLiteralForColor(node, context, config) {
  // To force the correct node type
  if (node.type !== 'Literal') {
    return;
  }

  // Changed this condition to properly handle both direct literals and expression containers
  var parent = (0, _eslintCodemodUtils.isNodeOfType)(node.parent, 'JSXExpressionContainer') ? node.parent.parent : node.parent;
  if (!(0, _eslintCodemodUtils.isNodeOfType)(parent, 'JSXAttribute')) {
    return;
  }
  if ((0, _isDecendantOfSvgElement.isDecendantOfSvgElement)(parent)) {
    return;
  }

  // Box backgroundColor prop accepts token names directly - don't lint against this
  if ((0, _isDecendantOfPrimitive.isDecendantOfPrimitive)(parent, context)) {
    return;
  }
  if (['alt', 'src', 'label', 'key', 'appearance'].includes(typeof parent.name.name === 'string' ? parent.name.name : parent.name.name.name)) {
    return;
  }
  var isException = (0, _getIsException.getIsException)(config.exceptions);
  if (isException(parent)) {
    return;
  }

  // Bypass Tag component color prop from @atlaskit/tag
  if (isTagComponentColorProp(parent, context)) {
    return;
  }

  // We only care about hex values
  if (typeof node.value !== 'string') {
    return;
  }
  if ((0, _isHardCodedColor.isHardCodedColor)(node.value) || (0, _includesHardCodedColor.includesHardCodedColor)(node.value)) {
    context.report({
      messageId: 'hardCodedColor',
      node: node,
      suggest: (0, _getTokenSuggestion.getTokenSuggestion)(node, node.value, config)
    });
    return;
  }
};