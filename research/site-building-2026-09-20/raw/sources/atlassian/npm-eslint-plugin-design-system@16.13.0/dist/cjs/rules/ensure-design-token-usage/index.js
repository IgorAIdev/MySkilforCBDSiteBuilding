"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.createWithConfig = void 0;
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _eslintCodemodUtils = require("eslint-codemod-utils");
var _contextCompat = require("@atlaskit/eslint-utils/context-compat");
var _isSupportedImport = require("@atlaskit/eslint-utils/is-supported-import");
var _createLintRule = require("../utils/create-lint-rule");
var _errorBoundary = require("../utils/error-boundary");
var _includesHardCodedColor = require("../utils/includes-hard-coded-color");
var _isDecendantOfGlobalToken = require("../utils/is-decendant-of-global-token");
var _isDecendantOfStyleBlock = require("../utils/is-decendant-of-style-block");
var _isDecendantOfType = require("../utils/is-decendant-of-type");
var _isDecendantOfXcssBlock = require("../utils/is-decendant-of-xcss-block");
var _convertHyphenatedNameToCamelCase = require("./convert-hyphenated-name-to-camel-case");
var _emToPixels = require("./em-to-pixels");
var _getDomainsForProperty = require("./get-domains-for-property");
var _getFontSizeValueInScope = require("./get-font-size-value-in-scope");
var _getPropertyNodeFromParent = require("./get-property-node-from-parent");
var _getTokenReplacement = require("./get-token-replacement");
var _getValueForPropertyNode = require("./get-value-for-property-node");
var _getValueFromShorthand = require("./get-value-from-shorthand");
var _getValueFromTemplateLiteralRaw = require("./get-value-from-template-literal-raw");
var _includesTokenString = require("./includes-token-string");
var _insertTokensImport = require("./insert-tokens-import");
var _isAuto = require("./is-auto");
var _isCalc = require("./is-calc");
var _isTokenValueString = require("./is-token-value-string");
var _isValidSpacingValue = require("./is-valid-spacing-value");
var _isZero = require("./is-zero");
var _lintJsxIdentifierForColor = require("./lint-jsx-identifier-for-color");
var _lintJsxLiteralForColor = require("./lint-jsx-literal-for-color");
var _lintJsxMemberForColor = require("./lint-jsx-member-for-color");
var _lintObjectForColor = require("./lint-object-for-color");
var _lintTemplateIdentifierForColor = require("./lint-template-identifier-for-color");
var _processCssNode = require("./process-css-node");
var _ruleMeta = _interopRequireDefault(require("./rule-meta"));
var _spacing = require("./spacing");
var _splitShorthandValues = require("./split-shorthand-values");
var defaultConfig = {
  domains: ['color', 'spacing'],
  applyImport: true,
  shouldEnforceFallbacks: false,
  failSilently: false
};
var createWithConfig = exports.createWithConfig = function createWithConfig(initialConfig) {
  return function (context) {
    // TODO: JFP-2823 - this type cast was added due to Jira's ESLint v9 migration
    var userConfig = context.options[0];
    // merge configs
    var config = {
      domains: (userConfig === null || userConfig === void 0 ? void 0 : userConfig.domains) || initialConfig.domains,
      applyImport: (userConfig === null || userConfig === void 0 ? void 0 : userConfig.applyImport) !== undefined ? userConfig.applyImport : initialConfig.applyImport,
      shouldEnforceFallbacks: (userConfig === null || userConfig === void 0 ? void 0 : userConfig.shouldEnforceFallbacks) !== undefined ? userConfig.shouldEnforceFallbacks : initialConfig.shouldEnforceFallbacks,
      exceptions: (userConfig === null || userConfig === void 0 ? void 0 : userConfig.exceptions) || [],
      failSilently: (userConfig === null || userConfig === void 0 ? void 0 : userConfig.failSilently) || defaultConfig.failSilently
    };
    var tokenNode = null;
    return (0, _errorBoundary.errorBoundary)({
      ImportDeclaration: function ImportDeclaration(node) {
        if (node.source.value === '@atlaskit/tokens' && config.applyImport) {
          tokenNode = node;
        }
      },
      // For expressions within template literals (e.g. `color: ${red}`) - color only
      'TemplateLiteral > Identifier': function TemplateLiteral__Identifier(node) {
        if (config.domains.includes('color')) {
          return (0, _lintTemplateIdentifierForColor.lintTemplateIdentifierForColor)(node, context, config);
        }
        return;
      },
      // const styles = css({ color: 'red', margin: '4px' }), styled.div({ color: 'red', margin: '4px' })
      ObjectExpression: function (_ObjectExpression) {
        function ObjectExpression(_x) {
          return _ObjectExpression.apply(this, arguments);
        }
        ObjectExpression.toString = function () {
          return _ObjectExpression.toString();
        };
        return ObjectExpression;
      }(function (parentNode) {
        var _getScope = (0, _contextCompat.getScope)(context, parentNode),
          references = _getScope.references;
        /**
         * NOTE: This rule doesn't have an `importSources` config option,
         * so this will just be equal to DEFAULT_IMPORT_SOURCES (which is fine)
         */
        var importSources = (0, _isSupportedImport.getImportSources)(context);

        // To force the correct node type
        if (!(0, _eslintCodemodUtils.isNodeOfType)(parentNode, 'ObjectExpression')) {
          return;
        }

        // Return for nested objects - these get handled automatically so without returning we'd be doubling up
        if (parentNode.parent.type === 'Property') {
          return;
        }
        if ((0, _isDecendantOfXcssBlock.isDecendantOfXcssBlock)(parentNode, references, importSources)) {
          return;
        }
        if (!(0, _isDecendantOfStyleBlock.isDecendantOfStyleBlock)(parentNode) && !(0, _isDecendantOfType.isDecendantOfType)(parentNode, 'JSXExpressionContainer')) {
          return;
        }
        function findObjectStyles(node) {
          if (!(0, _eslintCodemodUtils.isNodeOfType)(node, 'Property')) {
            return;
          }
          if ((0, _eslintCodemodUtils.isNodeOfType)(node.value, 'ObjectExpression')) {
            return node.value.properties.forEach(findObjectStyles);
          }
          if (!(0, _eslintCodemodUtils.isNodeOfType)(node.key, 'Identifier') && !(0, _eslintCodemodUtils.isNodeOfType)(node.key, 'Literal')) {
            return;
          }
          var propertyName = (0, _eslintCodemodUtils.isNodeOfType)(node.key, 'Identifier') ? node.key.name : String(node.key.value);

          // Returns which domains to lint against based on rule's config and current property
          var domains = (0, _getDomainsForProperty.getDomainsForProperty)(propertyName, config.domains);
          if (domains.length === 0 || (0, _isDecendantOfGlobalToken.isDecendantOfGlobalToken)(node.value)) {
            return;
          }
          if ((0, _eslintCodemodUtils.isNodeOfType)(node.value, 'TemplateLiteral')) {
            var value = (0, _getValueFromTemplateLiteralRaw.getValueFromTemplateLiteralRaw)(node.value, context);
            if (Array.isArray(value) && value.some(_isCalc.isCalc)) {
              return context.report({
                node: node,
                messageId: 'noCalcUsage',
                data: {
                  payload: "".concat(propertyName)
                }
              });
            }
            if (node.value.expressions.some(_isDecendantOfGlobalToken.isDecendantOfGlobalToken)) {
              return;
            }
          }
          if (domains.includes('color')) {
            return (0, _lintObjectForColor.lintObjectForColor)(node, context, config);
          }
          if (domains.includes('spacing') || domains.includes('shape')) {
            /**
             * We do this in case the fontSize for a style object is declared alongside the `em` or `lineHeight` declaration.
             */
            var fontSizeNode = (0, _getPropertyNodeFromParent.getPropertyNodeFromParent)('fontSize', parentNode);
            var fontSize = fontSizeNode && (0, _getValueForPropertyNode.getValueForPropertyNode)(fontSizeNode, context);
            return (0, _spacing.lintObjectForSpacing)(node, context, config, fontSize, tokenNode);
          }
        }
        parentNode.properties.forEach(findObjectStyles);
      }),
      // CSSTemplateLiteral and StyledTemplateLiteral
      // const cssTemplateLiteral = css`color: red; padding: 12px`;
      // const styledTemplateLiteral = styled.p`color: red; padding: 8px`;
      'TaggedTemplateExpression[tag.name="css"],TaggedTemplateExpression[tag.object.name="styled"],TaggedTemplateExpression[tag.callee.name="styled"]': function TaggedTemplateExpressionTagNameCssTaggedTemplateExpressionTagObjectNameStyledTaggedTemplateExpressionTagCalleeNameStyled(node) {
        // To force the correct node type
        if (!(0, _eslintCodemodUtils.isNodeOfType)(node, 'TaggedTemplateExpression')) {
          return;
        }
        var processedCssLines = (0, _processCssNode.processCssNode)(node, context);
        if (!processedCssLines) {
          // if we can't get a processed css we bail
          return;
        }
        var globalFontSize = (0, _getFontSizeValueInScope.getFontSizeValueInScope)(processedCssLines);
        var textForSource = (0, _contextCompat.getSourceCode)(context).getText(node.quasi);
        var allReplacedValues = [];
        var completeSource = processedCssLines.reduce(function (currentSource, _ref) {
          var _ref2 = (0, _slicedToArray2.default)(_ref, 2),
            resolvedCssLine = _ref2[0],
            originalCssLine = _ref2[1];
          var _resolvedCssLine$spli = resolvedCssLine.split(':'),
            _resolvedCssLine$spli2 = (0, _slicedToArray2.default)(_resolvedCssLine$spli, 2),
            originalProperty = _resolvedCssLine$spli2[0],
            resolvedCssValues = _resolvedCssLine$spli2[1];
          var _originalCssLine$spli = originalCssLine.split(':'),
            _originalCssLine$spli2 = (0, _slicedToArray2.default)(_originalCssLine$spli, 2),
            _ = _originalCssLine$spli2[0],
            originalCssValues = _originalCssLine$spli2[1];
          var propertyName = (0, _convertHyphenatedNameToCamelCase.convertHyphenatedNameToCamelCase)(originalProperty);
          var isFontFamily = /fontFamily/.test(propertyName);
          var replacedValuesPerProperty = [originalProperty];
          var domains = (0, _getDomainsForProperty.getDomainsForProperty)(propertyName, config.domains);
          if (domains.length === 0 || !resolvedCssValues) {
            // in both of these cases no changes should be made to the current property
            return currentSource;
          }
          if (domains.includes('color')) {
            if ((0, _includesTokenString.includesTokenString)(resolvedCssValues.trim())) {
              return currentSource;
            }
            if ((0, _includesHardCodedColor.includesHardCodedColor)(resolvedCssValues)) {
              context.report({
                messageId: 'hardCodedColor',
                node: node
              });
              return currentSource;
            }
          }
          if (domains.includes('spacing') || domains.includes('shape')) {
            if (!(0, _isValidSpacingValue.isValidSpacingValue)(resolvedCssValues, globalFontSize)) {
              // no changes should be made to the current property
              return currentSource;
            }

            // gets the values from the associated property, numeric values or NaN
            var processedNumericValues = (0, _getValueFromShorthand.getValueFromShorthand)(resolvedCssValues);
            var processedValues = (0, _splitShorthandValues.splitShorthandValues)(resolvedCssValues);
            // only splits shorthand values but it does not transform NaNs so tokens are preserved
            var originalValues = (0, _splitShorthandValues.splitShorthandValues)(originalCssValues);

            // reconstructing the string
            // should replace what it can and preserve the raw value for everything else

            var replacementValue = processedNumericValues
            // put together resolved value and original value on a tuple
            .map(function (value, index) {
              return [
              // if emToPX conversion fails we'll default to original value
              (0, _emToPixels.emToPixels)(value, globalFontSize) || value, processedValues[index], originalValues[index]];
            }).map(function (_ref3) {
              var _ref4 = (0, _slicedToArray2.default)(_ref3, 3),
                numericOrNanValue = _ref4[0],
                pxValue = _ref4[1],
                originalValue = _ref4[2];
              if (!originalValue) {
                return originalValue;
              }
              if ((0, _isCalc.isCalc)(originalValue)) {
                context.report({
                  node: node,
                  messageId: 'noCalcUsage',
                  data: {
                    payload: "".concat(propertyName)
                  }
                });
                return originalValue;
              }
              if ((0, _isTokenValueString.isTokenValueString)(originalValue)) {
                // if the value is already valid, nothing to report or replace
                return originalValue;
              }

              // do not replace 0 or auto with tokens
              if ((0, _isZero.isZero)(pxValue) || (0, _isAuto.isAuto)(pxValue)) {
                return originalValue;
              }
              if (isNaN(numericOrNanValue) && !isFontFamily) {
                // do not report if we have nothing to replace with
                return originalValue;
              }

              // value is numeric or fontFamily, and needs replacing we'll report first
              context.report({
                node: node,
                messageId: 'noRawSpacingValues',
                data: {
                  payload: "".concat(propertyName, ":").concat(numericOrNanValue)
                }
              });

              // from here on we know value is numeric or a font family, so it might or might not have a token equivalent
              var replacementNode = (0, _getTokenReplacement.getTokenReplacement)(propertyName, numericOrNanValue);
              if (!replacementNode) {
                return originalValue;
              }
              var replacementToken = '${' + replacementNode.toString() + '}';
              replacedValuesPerProperty.push(isFontFamily ? numericOrNanValue.trim() : pxValue);
              return replacementToken;
            }).join(' ');
            if (replacedValuesPerProperty.length > 1) {
              // first value is the property name, so it will always have at least 1
              allReplacedValues.push(replacedValuesPerProperty);
            }

            // replace property:val with new property:val
            var replacedCssLine = currentSource.replace(originalCssLine, //  padding: ${gridSize()}px;
            "".concat(originalProperty, ": ").concat(replacementValue));
            if (!replacedCssLine) {
              return currentSource;
            }
            return replacedCssLine;
          }
          return currentSource;
        }, textForSource);
        if (completeSource !== textForSource) {
          // means we found some replacement values, we'll give the option to fix them

          context.report({
            node: node,
            messageId: 'autofixesPossible',
            fix: function fix(fixer) {
              return (!tokenNode && config.applyImport ? [(0, _insertTokensImport.insertTokensImport)(fixer)] : []).concat([fixer.replaceText(node.quasi, completeSource)]);
            }
          });
        }
      },
      // For inline JSX styles - literals (e.g. <Test color="red"/>) - color only
      'JSXAttribute > Literal': function JSXAttribute__Literal(node) {
        if (config.domains.includes('color')) {
          return (0, _lintJsxLiteralForColor.lintJSXLiteralForColor)(node, context, config);
        }
        return;
      },
      // Add handling for JSXExpressionContainer with string literals
      'JSXAttribute > JSXExpressionContainer > Literal': function JSXAttribute__JSXExpressionContainer__Literal(node) {
        if (config.domains.includes('color')) {
          return (0, _lintJsxLiteralForColor.lintJSXLiteralForColor)(node, context, config);
        }
        return;
      },
      // For inline JSX styles - members (e.g. <Test color={color.red}/>) - color only
      'JSXExpressionContainer > MemberExpression': function JSXExpressionContainer__MemberExpression(node) {
        if (config.domains.includes('color')) {
          return (0, _lintJsxMemberForColor.lintJSXMemberForColor)(node, context, config);
        }
        return;
      },
      // For inline JSX styles - identifiers (e.g. <Test color={red}/>) - color only
      'JSXExpressionContainer > Identifier': function JSXExpressionContainer__Identifier(node) {
        if (config.domains.includes('color')) {
          return (0, _lintJsxIdentifierForColor.lintJSXIdentifierForColor)(node, context, config);
        }
        return;
      }
    }, config);
  };
};
var rule = (0, _createLintRule.createLintRule)({
  meta: _ruleMeta.default,
  create: createWithConfig(defaultConfig)
});

// eslint-disable-next-line @atlaskit/volt-strict-mode/no-multiple-exports
var _default = exports.default = rule;