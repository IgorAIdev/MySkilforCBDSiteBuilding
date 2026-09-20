"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var supported = {
  values: {
    ignore: ['auto', 'initial', 'inherit', 'unset', 'revert', 'revert-layer', 'none',
    // outline-offset can be set to none
    // Currently the DST opinion is that 0 is valid. It doesn't need to be converted to `space.0`
    0, '0', '0px', '0em', '0rem']
  }
};
var _default = exports.default = supported;