Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region src/tokens.ts
/**
* Copyright IBM Corp. 2018, 2026
*
* This source code is licensed under the Apache-2.0 license found in the
* LICENSE file in the root directory of this source tree.
*/
const unstable_tokens = [
	"spacing01",
	"spacing02",
	"spacing03",
	"spacing04",
	"spacing05",
	"spacing06",
	"spacing07",
	"spacing08",
	"spacing09",
	"spacing10",
	"spacing11",
	"spacing12",
	"spacing13",
	"fluidSpacing01",
	"fluidSpacing02",
	"fluidSpacing03",
	"fluidSpacing04",
	"container01",
	"container02",
	"container03",
	"container04",
	"container05",
	"sizeXSmall",
	"sizeSmall",
	"sizeMedium",
	"sizeLarge",
	"sizeXLarge",
	"size2XLarge",
	"iconSize01",
	"iconSize02",
	"layout01",
	"layout02",
	"layout03",
	"layout04",
	"layout05",
	"layout06",
	"layout07"
];
//#endregion
//#region src/index.ts
/**
* Copyright IBM Corp. 2018, 2026
*
* This source code is licensed under the Apache-2.0 license found in the
* LICENSE file in the root directory of this source tree.
*/
const baseFontSize = 16;
const rem = (px) => {
	return `${px / 16}rem`;
};
const em = (px) => {
	return `${px / 16}em`;
};
const px = (value) => {
	return `${value}px`;
};
const breakpoints = {
	sm: {
		width: /*#__PURE__*/ rem(320),
		columns: 4,
		margin: "0"
	},
	md: {
		width: /*#__PURE__*/ rem(672),
		columns: 8,
		margin: /*#__PURE__*/ rem(16)
	},
	lg: {
		width: /*#__PURE__*/ rem(1056),
		columns: 16,
		margin: /*#__PURE__*/ rem(16)
	},
	xlg: {
		width: /*#__PURE__*/ rem(1312),
		columns: 16,
		margin: /*#__PURE__*/ rem(16)
	},
	max: {
		width: /*#__PURE__*/ rem(1584),
		columns: 16,
		margin: /*#__PURE__*/ rem(24)
	}
};
const breakpointUp = (name) => {
	return `@media (min-width: ${breakpoints[name].width})`;
};
const breakpointDown = (name) => {
	return `@media (max-width: ${breakpoints[name].width})`;
};
const breakpoint = breakpointUp;
const miniUnit = 8;
const miniUnits = (count) => {
	return rem(8 * count);
};
const spacing01 = /*#__PURE__*/ miniUnits(.25);
const spacing02 = /*#__PURE__*/ miniUnits(.5);
const spacing03 = /*#__PURE__*/ miniUnits(1);
const spacing04 = /*#__PURE__*/ miniUnits(1.5);
const spacing05 = /*#__PURE__*/ miniUnits(2);
const spacing06 = /*#__PURE__*/ miniUnits(3);
const spacing07 = /*#__PURE__*/ miniUnits(4);
const spacing08 = /*#__PURE__*/ miniUnits(5);
const spacing09 = /*#__PURE__*/ miniUnits(6);
const spacing10 = /*#__PURE__*/ miniUnits(8);
const spacing11 = /*#__PURE__*/ miniUnits(10);
const spacing12 = /*#__PURE__*/ miniUnits(12);
const spacing13 = /*#__PURE__*/ miniUnits(20);
const spacing = [
	spacing01,
	spacing02,
	spacing03,
	spacing04,
	spacing05,
	spacing06,
	spacing07,
	spacing08,
	spacing09,
	spacing10,
	spacing11,
	spacing12,
	spacing13
];
const fluidSpacing01 = 0;
const fluidSpacing02 = "2vw";
const fluidSpacing03 = "5vw";
const fluidSpacing04 = "10vw";
const fluidSpacing = [
	0,
	"2vw",
	"5vw",
	fluidSpacing04
];
const layout01 = /*#__PURE__*/ miniUnits(2);
const layout02 = /*#__PURE__*/ miniUnits(3);
const layout03 = /*#__PURE__*/ miniUnits(4);
const layout04 = /*#__PURE__*/ miniUnits(6);
const layout05 = /*#__PURE__*/ miniUnits(8);
const layout06 = /*#__PURE__*/ miniUnits(12);
const layout07 = /*#__PURE__*/ miniUnits(20);
const layout = [
	layout01,
	layout02,
	layout03,
	layout04,
	layout05,
	layout06,
	layout07
];
const container01 = /*#__PURE__*/ miniUnits(3);
const container02 = /*#__PURE__*/ miniUnits(4);
const container03 = /*#__PURE__*/ miniUnits(5);
const container04 = /*#__PURE__*/ miniUnits(6);
const container05 = /*#__PURE__*/ miniUnits(8);
const container = [
	container01,
	container02,
	container03,
	container04,
	container05
];
const sizeXSmall = /*#__PURE__*/ rem(24);
const sizeSmall = /*#__PURE__*/ rem(32);
const sizeMedium = /*#__PURE__*/ rem(40);
const sizeLarge = /*#__PURE__*/ rem(48);
const sizeXLarge = /*#__PURE__*/ rem(64);
const size2XLarge = /*#__PURE__*/ rem(80);
const sizes = {
	XSmall: sizeXSmall,
	Small: sizeSmall,
	Medium: sizeMedium,
	Large: sizeLarge,
	XLarge: sizeXLarge,
	"2XLarge": size2XLarge
};
const iconSize01 = "1rem";
const iconSize02 = "1.25rem";
const iconSize = [iconSize01, iconSize02];
const borderRadius00 = "0px";
const borderRadius02 = rem(2);
const borderRadius04 = rem(4);
const borderRadius08 = rem(8);
const borderRadius16 = rem(16);
const borderRadius24 = rem(24);
const borderRadiusMax = "999999px";
const borderRadius = {
	"border-radius-00": "0px",
	"border-radius-02": borderRadius02,
	"border-radius-04": borderRadius04,
	"border-radius-08": borderRadius08,
	"border-radius-16": borderRadius16,
	"border-radius-24": borderRadius24,
	"border-radius-max": borderRadiusMax
};
//#endregion
exports.baseFontSize = baseFontSize;
exports.borderRadius = borderRadius;
exports.borderRadius00 = borderRadius00;
exports.borderRadius02 = borderRadius02;
exports.borderRadius04 = borderRadius04;
exports.borderRadius08 = borderRadius08;
exports.borderRadius16 = borderRadius16;
exports.borderRadius24 = borderRadius24;
exports.borderRadiusMax = borderRadiusMax;
exports.breakpoint = breakpoint;
exports.breakpointDown = breakpointDown;
exports.breakpointUp = breakpointUp;
exports.breakpoints = breakpoints;
exports.container = container;
exports.container01 = container01;
exports.container02 = container02;
exports.container03 = container03;
exports.container04 = container04;
exports.container05 = container05;
exports.em = em;
exports.fluidSpacing = fluidSpacing;
exports.fluidSpacing01 = fluidSpacing01;
exports.fluidSpacing02 = fluidSpacing02;
exports.fluidSpacing03 = fluidSpacing03;
exports.fluidSpacing04 = fluidSpacing04;
exports.iconSize = iconSize;
exports.iconSize01 = iconSize01;
exports.iconSize02 = iconSize02;
exports.layout = layout;
exports.layout01 = layout01;
exports.layout02 = layout02;
exports.layout03 = layout03;
exports.layout04 = layout04;
exports.layout05 = layout05;
exports.layout06 = layout06;
exports.layout07 = layout07;
exports.miniUnit = miniUnit;
exports.miniUnits = miniUnits;
exports.px = px;
exports.rem = rem;
exports.size2XLarge = size2XLarge;
exports.sizeLarge = sizeLarge;
exports.sizeMedium = sizeMedium;
exports.sizeSmall = sizeSmall;
exports.sizeXLarge = sizeXLarge;
exports.sizeXSmall = sizeXSmall;
exports.sizes = sizes;
exports.spacing = spacing;
exports.spacing01 = spacing01;
exports.spacing02 = spacing02;
exports.spacing03 = spacing03;
exports.spacing04 = spacing04;
exports.spacing05 = spacing05;
exports.spacing06 = spacing06;
exports.spacing07 = spacing07;
exports.spacing08 = spacing08;
exports.spacing09 = spacing09;
exports.spacing10 = spacing10;
exports.spacing11 = spacing11;
exports.spacing12 = spacing12;
exports.spacing13 = spacing13;
exports.unstable_tokens = unstable_tokens;
