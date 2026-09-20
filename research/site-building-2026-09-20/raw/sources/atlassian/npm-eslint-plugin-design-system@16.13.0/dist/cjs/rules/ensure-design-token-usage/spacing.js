"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.lintObjectForSpacing = void 0;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _eslintCodemodUtils = require("eslint-codemod-utils");
var _emToPixels = require("./em-to-pixels");
var _findTokenNameByPropertyValue = require("./find-token-name-by-property-value");
var _getRawExpression = require("./get-raw-expression");
var _getTokenNodeForValue = require("./get-token-node-for-value");
var _getTokenReplacement = require("./get-token-replacement");
var _getValue = require("./get-value");
var _insertTokensImport = require("./insert-tokens-import");
var _isAuto = require("./is-auto");
var _isCalc = require("./is-calc");
var _isValidSpacingValue = require("./is-valid-spacing-value");
var _isZero = require("./is-zero");
var _splitShorthandValues = require("./split-shorthand-values");
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2.default)(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
var lintObjectForSpacing = exports.lintObjectForSpacing = function lintObjectForSpacing(node, context, ruleConfig, fontSize, tokenNode) {
  if ((0, _eslintCodemodUtils.isNodeOfType)(node.value, 'Literal') && !(0, _isValidSpacingValue.isValidSpacingValue)(node.value.value, fontSize)) {
    context.report({
      node: node,
      messageId: 'noRawSpacingValues',
      data: {
        payload: "NaN:".concat(node.value.value)
      }
    });
    return;
  }
  var propertyName = node.key.name;
  var isFontFamily = /fontFamily/.test(propertyName);

  // Report on CSS calc function for strings
  if ((0, _eslintCodemodUtils.isNodeOfType)(node.value, 'Literal') && (0, _isCalc.isCalc)(node.value.value)) {
    return context.report({
      node: node,
      messageId: 'noCalcUsage',
      data: {
        payload: "".concat(propertyName)
      }
    });
  }
  var value = (0, _getValue.getValue)(node.value, context);

  // Value is a token string (e.g. set via a variable)
  if (typeof value === 'string' && /\${token\(.*\)}/.test(value)) {
    return;
  }

  // value is either NaN or it can't be resolved (e.g. em, 100% etc...)
  if (!(value && (0, _isValidSpacingValue.isValidSpacingValue)(value, fontSize))) {
    return context.report({
      node: node,
      messageId: 'noRawSpacingValues',
      data: {
        payload: "NaN:".concat(value)
      }
    });
  }

  // The corresponding values for a single CSS property (e.g. padding: '8px 16px 2px' => [8, 16, 2])
  var valuesForProperty = Array.isArray(value) ? value : [value];

  // value is a single value so we can apply a more robust approach to our fix
  // treat fontFamily as having one value
  if (valuesForProperty.length === 1 || isFontFamily) {
    var _valuesForProperty = (0, _slicedToArray2.default)(valuesForProperty, 1),
      _value = _valuesForProperty[0];

    // Do not report or suggest a token to replace 0 or auto
    if ((0, _isZero.isZero)(_value) || (0, _isAuto.isAuto)(_value)) {
      return;
    }
    var pixelValue = isFontFamily ? _value : (0, _emToPixels.emToPixels)(_value, fontSize);
    return context.report({
      node: node,
      messageId: 'noRawSpacingValues',
      data: {
        payload: "".concat(propertyName, ":").concat(pixelValue)
      },
      fix: function fix(fixer) {
        // Casting due to possibility of pixelValue being string | number from emToPixels
        var replacementNode = pixelValue && (0, _getTokenReplacement.getTokenReplacement)(propertyName, pixelValue);
        if (!replacementNode) {
          return null;
        }
        return (!tokenNode && ruleConfig.applyImport ? [(0, _insertTokensImport.insertTokensImport)(fixer)] : []).concat([fixer.replaceText(node, (0, _eslintCodemodUtils.property)(_objectSpread(_objectSpread({}, node), {}, {
          value: replacementNode
        })).toString())]);
      }
    });
  }

  /**
   * Compound values are hard to deal with / replace because we need to find/replace strings inside an
   * estree node.
   *
   * @example
   * { padding: '8px 0px' }
   */
  valuesForProperty.forEach(function (val) {
    if ((0, _isCalc.isCalc)(val)) {
      return context.report({
        node: node,
        messageId: 'noCalcUsage',
        data: {
          payload: "".concat(propertyName, ":").concat(val)
        }
      });
    }
    var pixelValue = (0, _emToPixels.emToPixels)(val, fontSize);

    // Do not report or suggest a token to replace 0 or auto
    if ((0, _isZero.isZero)(val) || (0, _isAuto.isAuto)(val)) {
      return;
    }
    context.report({
      node: node,
      messageId: 'noRawSpacingValues',
      data: {
        payload: "".concat(propertyName, ":").concat(pixelValue)
      },
      fix: function fix(fixer) {
        var allResolvableValues = valuesForProperty.every(function (value) {
          return !Number.isNaN((0, _emToPixels.emToPixels)(value, fontSize));
        });
        if (!allResolvableValues) {
          return null;
        }

        // Casting due to possibility of value being string | number
        var valuesWithTokenReplacement = valuesForProperty.filter(function (value) {
          return (0, _findTokenNameByPropertyValue.findTokenNameByPropertyValue)(propertyName, value);
        }).filter(function (value) {
          return value !== 0;
        });
        if (valuesWithTokenReplacement.length === 0) {
          // all values could be replaceable but that just means they're numeric
          // if none of the values have token replacement we bail
          return null;
        }
        var originalCssString = (0, _getRawExpression.getRawExpression)(node.value, context);
        if (!originalCssString) {
          return null;
        }
        /**
         * at this stage none of the values are tokens or irreplaceable values
         * since we know this is shorthand, there will be multiple values
         * we'll need to remove all quote chars since `getRawExpression` will return those as part of the string
         * given they're part of the substring of the current node
         */
        var originalValues = (0, _splitShorthandValues.splitShorthandValues)(originalCssString.replace(/`|'|"/g, ''));
        if (originalValues.length !== valuesForProperty.length) {
          // we bail just in case original values don't correspond to the replaced values
          return null;
        }
        return (!tokenNode && ruleConfig.applyImport ? [(0, _insertTokensImport.insertTokensImport)(fixer)] : []).concat([fixer.replaceText(node.value, "`".concat(valuesForProperty.map(function (value, index) {
          if ((0, _isZero.isZero)(value)) {
            return originalValues[index];
          }
          var pixelValue = (0, _emToPixels.emToPixels)(value, fontSize);
          var pixelValueString = "".concat(pixelValue, "px");
          // if there is a token we take it, otherwise we go with the original value

          // Casting due to possibility of value being string | number
          return (0, _findTokenNameByPropertyValue.findTokenNameByPropertyValue)(propertyName, value) ? "${".concat((0, _getTokenNodeForValue.getTokenNodeForValue)(propertyName, pixelValueString), "}") : originalValues[index];
        }).join(' '), "`"))]);
      }
    });
  });
};