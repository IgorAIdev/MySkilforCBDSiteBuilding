"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StyleProperty = void 0;
var _eslintCodemodUtils = require("eslint-codemod-utils");
var _objectEntry = require("../../../../ast-nodes/object-entry");
var _root = require("../../../../ast-nodes/root");
var _isStringOrNumber = require("../../utils/is-string-or-number");
var _styleMap = require("./style-map");
var _supported = _interopRequireDefault(require("./supported"));
/* eslint-disable @repo/internal/react/require-jsdoc */

var messageId = 'noRawSpacingValues';
var StyleProperty = exports.StyleProperty = {
  lint: function lint(node, _ref) {
    var context = _ref.context;
    // Check whether all criteria needed to make a transformation are met
    var _StyleProperty$_check = StyleProperty._check(node),
      success = _StyleProperty$_check.success,
      ref = _StyleProperty$_check.ref;
    if (!success) {
      return;
    }
    context.report({
      node: ref.node.value,
      messageId: messageId,
      fix: ref.token ? StyleProperty._fix(ref, context) : undefined
    });
  },
  _check: function _check(node) {
    if (!(0, _eslintCodemodUtils.isNodeOfType)(node, 'Property')) {
      return {
        success: false,
        ref: undefined
      };
    }

    /**
     * Currently, we support values like:
     * ```
     * {
     *   padding: '8px', // value.type is Literal
     *   margin: -8, // value.type is UnaryExpression
     * }
     * ```
     */
    if (!((0, _eslintCodemodUtils.isNodeOfType)(node.value, 'Literal') || (0, _eslintCodemodUtils.isNodeOfType)(node.value, 'UnaryExpression'))) {
      return {
        success: false,
        ref: undefined
      };
    }
    var _ObjectEntry$getPrope = _objectEntry.ObjectEntry.getProperty(node),
      property = _ObjectEntry$getPrope.value;

    // Bail if the property is not `padding`, `margin`, etc
    if (!property || !_styleMap.styleMap[property]) {
      return {
        success: false,
        ref: undefined
      };
    }
    var value = _objectEntry.ObjectEntry.getValue(node);

    // This is mainly useful as a type guard, so the checks after don't have to have duplicate checks for other types.
    if (!(0, _isStringOrNumber.isStringOrNumber)(value)) {
      return {
        success: false,
        ref: undefined
      };
    }

    // ignore CSS vars. See: https://stash.atlassian.com/projects/ATLASSIAN/repos/atlassian-frontend-monorepo/pull-requests/74844/overview?commentId=6741571
    if (value.toString().startsWith('var(')) {
      return {
        success: false,
        ref: undefined
      };
    }

    // There are valid values to ignore, such as `margin: auto`
    if (_supported.default.values.ignore.includes(value)) {
      return {
        success: false,
        ref: undefined
      };
    }

    // Don't report on stuff like `padding: '8px 16px'`.
    // We may iterate to handle values like this in future.
    if (value.toString().includes(' ')) {
      return {
        success: false,
        ref: undefined
      };
    }
    var ref = {
      node: node,
      token: _styleMap.styleMap[property][value],
      fallback: value
    };
    return {
      success: true,
      ref: ref
    };
  },
  /**
   * All required validation steps have been taken care of before this
   * transformer is called, so it just goes ahead providing all necessary fixes
   */
  _fix: function _fix(ref, context) {
    return function (fixer) {
      var importFix = _root.Root.upsertNamedImportDeclaration({
        module: '@atlaskit/tokens',
        specifiers: ['token']
      }, context, fixer);
      var tokenCall = ref.fallback ? "token('".concat(ref.token, "', '").concat(ref.fallback, "')") : "token('".concat(ref.token, "')");
      var tokenFix = fixer.replaceText(ref.node.value, tokenCall);
      return [importFix, tokenFix].filter(function (fix) {
        return Boolean(fix);
      }); // Some of the transformers can return arrays with undefined, so filter them out
    };
  }
};