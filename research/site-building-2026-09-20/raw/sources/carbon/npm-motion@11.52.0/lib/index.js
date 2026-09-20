Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region js/generated/tokens.js
/** Micro-interactions such as button and toggle. Instant response to user action. */
const durationFast01 = "70ms";
/** Micro-interactions such as fade in. Subtle entrance or exit of small UI elements. */
const durationFast02 = "110ms";
/** Micro-interactions, small expansion, short distance movements. Default transition speed. */
const durationModerate01 = "150ms";
/** Expansion, system communication, toast. Slightly longer interactions with more visual weight. */
const durationModerate02 = "240ms";
/** Large expansion, important system notifications. Deliberate, prominent transitions. */
const durationSlow01 = "400ms";
/** Background dimming, large hero transitions. Slow, immersive motion for maximum emphasis. */
const durationSlow02 = "700ms";
/** @deprecated Use `durationFast01` instead */
const fast01 = durationFast01;
/** @deprecated Use `durationFast02` instead */
const fast02 = durationFast02;
/** @deprecated Use `durationModerate01` instead */
const moderate01 = durationModerate01;
/** @deprecated Use `durationModerate02` instead */
const moderate02 = durationModerate02;
/** @deprecated Use `durationSlow01` instead */
const slow01 = durationSlow01;
/** @deprecated Use `durationSlow02` instead */
const slow02 = durationSlow02;
const easings = {
	standard: {
		productive: "cubic-bezier(0.2, 0, 0.38, 0.9)",
		expressive: "cubic-bezier(0.4, 0.14, 0.3, 1)"
	},
	entrance: {
		productive: "cubic-bezier(0, 0, 0.38, 0.9)",
		expressive: "cubic-bezier(0, 0, 0.3, 1)"
	},
	exit: {
		productive: "cubic-bezier(0.2, 0, 1, 0.9)",
		expressive: "cubic-bezier(0.4, 0.14, 1, 1)"
	}
};
const unstable_tokens = [
	"durationFast01",
	"durationFast02",
	"durationModerate01",
	"durationModerate02",
	"durationSlow01",
	"durationSlow02",
	"fast01",
	"fast02",
	"moderate01",
	"moderate02",
	"slow01",
	"slow02"
];
//#endregion
//#region src/tokens.ts
/**
* Copyright IBM Corp. 2018, 2026
*
* This source code is licensed under the Apache-2.0 license found in the
* LICENSE file in the root directory of this source tree.
*/
const durations = {
	"fast-01": durationFast01,
	"fast-02": durationFast02,
	"moderate-01": durationModerate01,
	"moderate-02": durationModerate02,
	"slow-01": durationSlow01,
	"slow-02": durationSlow02
};
const easingCurves = {
	standard: {
		productive: [
			.2,
			0,
			.38,
			.9
		],
		expressive: [
			.4,
			.14,
			.3,
			1
		]
	},
	entrance: {
		productive: [
			0,
			0,
			.38,
			.9
		],
		expressive: [
			0,
			0,
			.3,
			1
		]
	},
	exit: {
		productive: [
			.2,
			0,
			1,
			.9
		],
		expressive: [
			.4,
			.14,
			1,
			1
		]
	}
};
const motion = (name, mode) => {
	const easing = easings[name];
	if (!easing) throw new Error(`Unable to find easing \`${name}\` in our supported easings. Expected one of: ${Object.keys(easings).join(", ")}`);
	if (!easing[mode]) throw new Error(`Unable to find a mode for the easing \`${name}\` called: \`${mode}\`. Expected one of: ${Object.keys(easing).join(", ")}`);
	return easing[mode];
};
const resolveEasing = (name, mode) => {
	if (!easingCurves[name]) throw new Error(`Unable to find easing \`${name}\` in our supported easings. Expected one of: ${Object.keys(easingCurves).join(", ")}`);
	const easing = easingCurves[name];
	if (!easing[mode]) throw new Error(`Unable to find a mode for the easing \`${name}\` called: \`${mode}\`. Expected one of: ${Object.keys(easing).join(", ")}`);
	return easing[mode];
};
const resolveDuration = (name) => {
	const duration = durations[name];
	if (!duration) throw new Error(`Unable to find duration \`${name}\` in our supported durations. Expected one of: ${Object.keys(durations).join(", ")}`);
	return duration;
};
const surfaces = {
	disclosure: {
		"kind": "reveal",
		"duration": "moderate-01",
		"enter": {
			"blockSize": "auto",
			"opacity": 1
		},
		"exit": {
			"blockSize": 0,
			"opacity": 0
		},
		"enterEasing": ["entrance", "productive"],
		"exitEasing": ["exit", "productive"]
	},
	contextual: {
		"kind": "reveal",
		"duration": "fast-02",
		"enter": {
			"opacity": 1,
			"transform": "scale(1)"
		},
		"exit": {
			"opacity": 0,
			"transform": "scale(0.96)"
		},
		"enterEasing": ["entrance", "expressive"],
		"exitEasing": ["exit", "expressive"]
	},
	stretch: {
		"kind": "reveal",
		"duration": "slow-01",
		"enter": {
			"opacity": 1,
			"clipPath": "inset(0 0 0 0)"
		},
		"exit": {
			"opacity": 0,
			"clipPath": "inset(50% 0 50% 0)"
		},
		"enterEasing": ["entrance", "expressive"],
		"exitEasing": ["exit", "expressive"]
	},
	expand: {
		"kind": "shared-element",
		"duration": "moderate-02",
		"enter": {
			"opacity": 1,
			"transform": "scale(1)"
		},
		"exit": {
			"opacity": 0,
			"transform": "scale(0.96)"
		},
		"enterEasing": ["standard", "productive"],
		"exitEasing": ["standard", "productive"]
	},
	invoke: {
		"kind": "shared-element",
		"origin": "trigger",
		"duration": "moderate-02",
		"enterEasing": ["standard", "expressive"],
		"exitEasing": ["standard", "expressive"]
	}
};
function getMotionSurface(name) {
	const surface = surfaces[name];
	if (!surface) throw new Error(`Unable to find motion surface \`${name}\`. Expected one of: ${Object.keys(surfaces).join(", ")}`);
	return surface;
}
//#endregion
exports.durationFast01 = durationFast01;
exports.durationFast02 = durationFast02;
exports.durationModerate01 = durationModerate01;
exports.durationModerate02 = durationModerate02;
exports.durationSlow01 = durationSlow01;
exports.durationSlow02 = durationSlow02;
exports.easings = easings;
exports.fast01 = fast01;
exports.fast02 = fast02;
exports.getMotionSurface = getMotionSurface;
exports.moderate01 = moderate01;
exports.moderate02 = moderate02;
exports.motion = motion;
exports.resolveDuration = resolveDuration;
exports.resolveEasing = resolveEasing;
exports.slow01 = slow01;
exports.slow02 = slow02;
exports.surfaces = surfaces;
exports.unstable_tokens = unstable_tokens;
