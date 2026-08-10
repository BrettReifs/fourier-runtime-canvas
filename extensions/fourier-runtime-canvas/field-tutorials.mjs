/**
 * @typedef {object} FieldTutorial
 * @property {string} fieldId
 * @property {string} title
 * @property {string} explanation
 * @property {string} whenToUse
 * @property {string} tradeoffs
 * @property {{kind: string, from: number|string|boolean, to: number|string|boolean}} demo
 */

function defineTutorial(
    fieldId,
    title,
    explanation,
    whenToUse,
    tradeoffs,
    demo,
) {
    return Object.freeze({
        fieldId,
        title,
        explanation,
        whenToUse,
        tradeoffs,
        demo: Object.freeze(demo),
    });
}

const entries = [
    ["creator-asset-library", "Creator asset", "The Creator library selects the stable asset identity you are editing.", "Choose an existing asset for in-place revision or New asset for a separate object.", "Edits update every scene reference to this ID, including matte references.", { kind: "shape", from: "asset A", to: "asset B" }],
    ["asset-library", "Layer asset", "The layer asset menu chooses a frequency asset to add at the current playhead.", "Use it when the scene needs another independent object.", "Adding a layer reuses the asset; it does not duplicate its coefficient data.", { kind: "shape", from: "library", to: "scene" }],
    ["asset-name", "Asset name", "Names identify reusable frequency assets in the Creator and layer menus.", "Use a short object name that stays meaningful when the asset appears in several scenes.", "Renaming does not change the stable asset ID or layer references.", { kind: "label", from: "Shape 1", to: "Walking character" }],
    ["term-limit", "Sine components", "The term limit controls how many frequency coefficients reconstruct each stroke.", "Raise it for tight corners or handwriting; lower it for smoother motion and less work.", "More terms improve fidelity but increase render and storage cost.", { kind: "terms", from: 12, to: 64 }],
    ["close-strokes", "Close new strokes", "Closing joins the last sampled point back to the first before transformation.", "Use it for silhouettes, loops, and matte contours.", "Closing an open mark adds a straight return segment that may be visible.", { kind: "topology", from: false, to: true }],
    ["composition-time", "Scene time", "The playhead chooses the frame shown on the scene and the keyframe editing time.", "Scrub to inspect transitions or place a new keyframe precisely.", "Edits at dense times may be constrained to avoid duplicate keyframes.", { kind: "time", from: 0, to: 1 }],
    ["asset-speed", "Playback speed", "Playback speed changes how quickly the scene clock advances without changing keyframe times.", "Slow down to inspect motion or speed up a review.", "Audio cues follow the scene clock, so extreme speeds can feel abrupt.", { kind: "time", from: 0.5, to: 2 }],
    ["show-epicycles", "Epicycles", "Epicycles reveal the rotating frequency vectors that reconstruct the selected path.", "Turn them on to inspect how coefficients build the line.", "They add visual density and render work, so keep them off for presentation.", { kind: "epicycles", from: false, to: true }],
    ["layer-start", "Layer start", "Start is the first scene time at which a layer can be visible.", "Delay an entrance without moving every keyframe.", "Keyframes before start are retained but do not render until the layer becomes active.", { kind: "range", from: 0, to: 0.35 }],
    ["layer-end", "Layer end", "End is the last scene time at which a layer can be visible.", "Use it to remove an object after its role in the scene is complete.", "Ending early hides later keyframes rather than deleting them.", { kind: "range", from: 1, to: 0.65 }],
    ["key-time", "Time or group start", "Time positions one keyframe; for a group it moves the earliest selected keyframe and preserves spacing.", "Use exact values after arranging keyframes by drag.", "The group is constrained by scene bounds and unselected neighbors.", { kind: "time", from: 0.25, to: 0.75 }],
    ["key-shape", "Shape", "Shape selects the frequency asset reconstructed at this keyframe.", "Choose another topology-compatible asset to morph a layer over time.", "Very different stroke counts or frequency bins can produce unstable morphs.", { kind: "shape", from: "round", to: "diamond" }],
    ["key-x", "Horizontal position", "X moves the layer left or right in normalized scene space.", "Use it for travel, framing, and side-by-side comparison.", "Large values can move the layer outside the visible scene.", { kind: "x", from: -0.65, to: 0.65 }],
    ["key-y", "Vertical position", "Y moves the layer up or down in normalized scene space.", "Use it for entrances, lifts, and vertical alignment.", "Scene space is aspect-aware, so edge clearance changes with layout.", { kind: "y", from: 0.55, to: -0.55 }],
    ["key-scale", "Scale", "Scale changes the reconstructed path size around its center.", "Use it for emphasis, depth cues, and growth.", "Near-zero scale can make selection and matte edges hard to inspect.", { kind: "scale", from: 0.45, to: 1.15 }],
    ["key-rotation", "Rotation", "Rotation turns the layer around its center in degrees.", "Use it for orientation changes or expressive motion.", "Fast large rotations can make detailed paths shimmer.", { kind: "rotation", from: -25, to: 25 }],
    ["key-opacity", "Opacity", "Opacity fades the whole reconstructed layer, including all strokes.", "Use it for entrances, exits, and de-emphasis.", "Opacity does not change matte coverage; masking follows the transformed silhouette.", { kind: "opacity", from: 0.2, to: 1 }],
    ["key-reveal", "Reveal", "Reveal controls how much of each Fourier path is drawn from its start.", "Use it for handwriting, tracing, and line-build animation.", "Reveal follows path order, which may differ from visual reading order.", { kind: "reveal", from: 0.15, to: 1 }],
    ["key-easing", "Easing", "Easing changes the rate of interpolation between this keyframe and the next.", "Use ease in/out for natural movement and linear for mechanical timing.", "Strong easing can cluster motion near one end of a short interval.", { kind: "easing", from: "linear", to: "ease-in-out" }],
    ["motion-enabled", "Procedural motion", "Procedural motion adds deterministic line variation after keyframe transforms.", "Enable it when a static line needs subtle life.", "It is disabled by reduced-motion preferences and should not carry essential meaning.", { kind: "motion", from: false, to: true }],
    ["motion-amount", "Motion amount", "Amount sets the maximum procedural displacement of the line.", "Keep it low for texture; raise it for deliberately loose marks.", "High values can separate visible strokes from tight matte contours.", { kind: "motion", from: 0.002, to: 0.05 }],
    ["motion-speed", "Motion speed", "Speed controls how quickly procedural displacement evolves.", "Use slow values for breathing lines and faster values for energy.", "Fast motion can flicker on high-frequency paths.", { kind: "motion", from: 0.2, to: 3 }],
    ["motion-detail", "Motion detail", "Detail controls the spatial frequency of procedural variation along a stroke.", "Use low detail for broad bends and high detail for fine vibration.", "High detail adds visual noise without changing stored coefficients.", { kind: "motion", from: 0.5, to: 12 }],
    ["audio-enabled", "Spectral cue", "A spectral cue turns strong stored frequencies into a short local sine sound.", "Enable it for meaningful entrances or beats.", "Sound needs user activation and should not be the only signal for an event.", { kind: "audio", from: false, to: true }],
    ["audio-trigger", "Audio trigger", "Trigger is the scene time when the layer cue starts.", "Align it with a keyframe or visible entrance.", "Rapid playback or scrubbing may skip perceptually useful spacing.", { kind: "time", from: 0.2, to: 0.8 }],
    ["audio-frequency", "Audio pitch", "Pitch sets the cue's base frequency in hertz.", "Use lower values for weight and higher values for lightness.", "Very high pitches can be tiring or hard to hear.", { kind: "audio", from: 120, to: 720 }],
    ["audio-gain", "Audio volume", "Volume sets the cue gain before its short envelope.", "Balance cues so no layer dominates unexpectedly.", "Keep gain low when several cues can overlap.", { kind: "audio", from: 0.01, to: 0.12 }],
    ["audio-duration", "Audio duration", "Duration sets how long the cue envelope lasts.", "Use short cues for timing marks and longer cues for emphasis.", "Long cues can overlap after fast scene changes.", { kind: "audio", from: 0.08, to: 0.8 }],
    ["audio-partials", "Audio partials", "Partials chooses how many strong stored frequency bins shape the cue.", "Raise it for a richer spectral identity.", "More partials can sound harsh and cost more audio work.", { kind: "audio", from: 1, to: 8 }],
    ["matte-padding", "Matte padding", "Padding expands the animated silhouette before it subtracts selected lower layers.", "Use a few pixels to stop background lines leaking around edges.", "Too much padding creates a visible halo around the foreground shape.", { kind: "matte", from: 0, to: 8 }],
    ["occlusion-targets", "Occlusion targets", "Targets choose which lower layers or depths the matte removes.", "Mask scenery behind a character while leaving reference or effect layers visible.", "Only lower-depth layers are valid; broad targets can hide intentional overlaps.", { kind: "occlusion", from: "none", to: "selected" }],
    ["asset-closed", "Closed path", "Closed joins the final reconstructed control point to the first.", "Keep matte silhouettes closed and use open paths for marks such as handwriting.", "Opening a matte contour can leak masking; closing a line adds a return segment.", { kind: "topology", from: false, to: true }],
    ["circle-center-x", "Circle center X", "Center X positions the circle horizontally inside its frequency asset.", "Use it to align a circle before scene-layer transforms are applied.", "Asset-space offsets compound with layer X movement, so prefer layer transforms for scene motion.", { kind: "x", from: -0.5, to: 0.5 }],
    ["circle-center-y", "Circle center Y", "Center Y positions the circle vertically inside its frequency asset.", "Use it to correct an off-center reusable circle.", "Asset-space offsets compound with layer Y movement, so prefer layer transforms for scene motion.", { kind: "y", from: -0.5, to: 0.5 }],
    ["circle-radius", "Circle radius", "Radius is the amplitude of the circle's single rotating frequency term.", "Use it to change the reusable circle's exact size without adding control points.", "A very small radius can make the line and its matte difficult to inspect.", { kind: "scale", from: 0.25, to: 1 }],
    ["circle-phase", "Circle phase", "Phase changes where reconstruction starts around the circle while preserving its shape.", "Use it when reveal animation should begin from a particular point.", "Phase is measured in radians and has no visible effect when the full closed circle is shown.", { kind: "circle-phase", from: 0, to: 3.14159 }],
];

export const FIELD_TUTORIALS = Object.freeze(Object.fromEntries(
    entries.map((entry) => {
        const tutorial = defineTutorial(...entry);
        return [tutorial.fieldId, tutorial];
    }),
));

export function tutorialForField(fieldId) {
    const tutorial = FIELD_TUTORIALS[fieldId];
    if (!tutorial) throw new Error(`No field tutorial is registered for ${fieldId}.`);
    return tutorial;
}

export function tutorialDemoFrame(demo, progress, reducedMotion) {
    const clamped = Math.max(0, Math.min(1, progress));
    const progressValue = reducedMotion ? [0, 1] : clamped;
    const numeric = typeof demo.from === "number" && typeof demo.to === "number";
    const value = numeric
        ? demo.from + (demo.to - demo.from) * clamped
        : (clamped < 0.5 ? demo.from : demo.to);
    return Object.freeze({
        kind: demo.kind,
        from: demo.from,
        to: demo.to,
        value,
        progress: progressValue,
    });
}

export function createTutorialDemoCache(render) {
    const cache = new Map();
    return Object.freeze({
        get(tutorial, reducedMotion) {
            const key = `${tutorial.fieldId}:${reducedMotion ? "static" : "motion"}`;
            if (!cache.has(key)) {
                cache.set(key, render(tutorial.demo, reducedMotion));
            }
            return cache.get(key);
        },
        get size() {
            return cache.size;
        },
    });
}
