import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import {
    audioCueCrossed,
    renderHtml,
    selectRuntimeMode,
    showRuntimeMode,
} from "../extensions/fourier-runtime-canvas/renderer.mjs";

function runtimeDocument() {
    const views = ["create", "asset", "series"].map((mode) => ({
        hidden: mode !== "series",
        id: `${mode}-view`,
    }));
    const tabs = ["create", "asset", "series"].map((mode) => ({
        classList: {
            active: mode === "series",
            toggle(_name, active) {
                this.active = active;
            },
        },
        dataset: { mode },
        attributes: new Map([["aria-selected", String(mode === "series")]]),
        setAttribute(name, value) {
            this.attributes.set(name, value);
        },
        tabIndex: mode === "series" ? 0 : -1,
    }));
    return {
        querySelectorAll(selector) {
            return selector === ".view" ? views : tabs;
        },
        tabs,
        views,
    };
}

test("rendered client script is valid JavaScript", () => {
    const html = renderHtml("renderer-test-nonce");
    const script = html.match(/<script nonce="renderer-test-nonce">([\s\S]*?)<\/script>/)?.[1];

    assert(script, "Expected an inline client script.");
    assert.doesNotThrow(() => new vm.Script(script, {
        filename: "fourier-runtime-canvas-client.js",
    }));
    assert.match(script, /const capabilityToken = new URLSearchParams/);
    assert.match(script, /"X-Fourier-Capability": capabilityToken/);
    assert.match(script, /new EventSource\([\s\S]*encodeURIComponent\(capabilityToken\)/);
    assert.match(script, /state\.saveChain = operation\.catch/);
    assert.match(script, /localSaveRevision/);
    assert.match(script, /const baseRevision = draft\.revision/);
    assert.doesNotMatch(script, /draft\.revision = state\.composition\.revision/);
    assert.doesNotMatch(script, /const instanceId/);
});

test("renderHtml applies the supplied CSP nonce without embedding runtime values", () => {
    const html = renderHtml("safe-nonce");
    const scripts = [...html.matchAll(/<script nonce="safe-nonce">([\s\S]*?)<\/script>/g)];

    assert.equal(scripts.length, 1);
    assert.doesNotThrow(() => new vm.Script(scripts[0][1]));
    assert(!html.includes("instanceId"));
    assert.match(html, /role="tablist"/);
    assert.match(html, /<canvas id="drawing">[^<]+<\/canvas>/);
});

test("renderer includes native responsive semantic presentation drawing", () => {
    const html = renderHtml("semantic-renderer-nonce");
    const script = html.match(
        /<script nonce="semantic-renderer-nonce">([\s\S]*?)<\/script>/,
    )?.[1];

    assert.match(script, /function presentationLayout\(width, height\)/);
    assert.match(script, /"16:9": 16 \/ 9, "4:3": 4 \/ 3, "9:16": 9 \/ 16/);
    assert.match(script, /function drawSemanticText/);
    assert.match(script, /function drawSemanticBars/);
    assert.match(script, /function chartLayout\(layout, semantic\)/);
    assert.match(script, /const resolvedLayout = chartLayout\(layout, semantic\)/);
    assert.match(script, /function drawSemanticLine/);
    assert.match(script, /resolvedLayout\.valueScale\(value\.value\)/);
    assert.match(script, /layout\.valueScale\(semantic\.value\)/);
    assert.match(script, /setMode\(selectRuntimeMode\(state\.mode, composition\)\)/);
    assert.match(script, /title\.textContent = state\.composition\.presentation\.title/);
    assert.match(script, /"Presentation revision " \+ state\.composition\.revision/);
    assert.match(script, /context\.fillText/);
    assert.match(script, /context\.fillRect\(pulseLeft, top, pulseWidth, barHeight\)/);
    assert.match(script, /layer\.animation\.emphasis\.pulse/);
    assert.match(script, /fourierFrame = layout\?\.scene/);
    assert.doesNotMatch(script, /context\.scale\(1,\s*-1\)/);
});

test("hybrid renderer avoids semantic asset loads and exposes accessible playback controls", () => {
    const html = renderHtml("hybrid-renderer-nonce");
    const script = html.match(
        /<script nonce="hybrid-renderer-nonce">([\s\S]*?)<\/script>/,
    )?.[1];

    assert.match(script, /layer\.type === "fourier"/);
    assert.match(script, /\.filter\(Boolean\)\s*\n\s*\)\;/);
    assert.match(script, /layer\.type !== "fourier"[\s\S]*ratio: 1, weight: 1/);
    assert.match(html, /id="scene-summary"[^>]*aria-live="polite"/);
    assert.match(html, /id="restart-composition"/);
    assert.match(html, /aria-describedby="scene-summary"/);
});

test("renderer wires offscreen matte compositing and accessible grouped keyframe selection", () => {
    const html = renderHtml("matte-editor-nonce");
    const script = html.match(
        /<script nonce="matte-editor-nonce">([\s\S]*?)<\/script>/,
    )?.[1];

    assert.match(script, /function acquireDrawingSurface\(pool, id, width, height\)/);
    assert.match(script, /layerSurfacePool: new Map\(\)/);
    assert.match(script, /globalCompositeOperation = "destination-out"/);
    assert.match(script, /transform\.matteMorph/);
    assert.match(script, /layer\.mattePadding \* 2/);
    assert.match(script, /selectKeyframeRefs\(/);
    assert.match(script, /event\.ctrlKey \|\| event\.metaKey/);
    assert.match(script, /range: event\.shiftKey/);
    assert.match(script, /mixedKeyframeFields\(/);
    assert.match(script, /focusedKeyframe[\s\S]*keyframeTime[\s\S]*\.focus\(\)/);
    assert.match(html, /id="keyframe-selection-status" aria-live="polite"/);
    assert.match(html, /id="key-time"/);
});

test("renderer wires thresholded pointer previews and one-save keyframe retiming", () => {
    const html = renderHtml("retime-renderer-nonce");
    const script = html.match(
        /<script nonce="retime-renderer-nonce">([\s\S]*?)<\/script>/,
    )?.[1];
    const preview = script.match(
        /function previewKeyframeDrag\(event\) \{([\s\S]*?)\n    \}\n\n    async function finishKeyframeDrag/,
    )?.[1];
    const finish = script.match(
        /async function finishKeyframeDrag\(event\) \{([\s\S]*?)\n    \}\n\n    function cancelKeyframeDrag/,
    )?.[1];
    const cancel = script.match(
        /function cancelKeyframeDrag\(\) \{([\s\S]*?)\n    \}\n\n    async function retimeKeyframesFromKeyboard/,
    )?.[1];
    const keyboard = script.match(
        /async function retimeKeyframesFromKeyboard\(event, ref\) \{([\s\S]*?)\n    \}\n\n    function renderTimeline/,
    )?.[1];

    assert(preview);
    assert(finish);
    assert(cancel);
    assert(keyboard);
    assert.match(script, /setPointerCapture\(event\.pointerId\)/);
    assert.match(script, /pointercancel[\s\S]*cancelKeyframeDrag/);
    assert.match(script, /keyframeDragActivated\(distance\)/);
    assert.match(script, /snap: !event\.altKey/);
    assert.match(script, /keyboardKeyframeDelta\(event\.key, event\.shiftKey\)/);
    assert.match(preview, /planKeyframeRetime/);
    assert.match(preview, /state\.selectedLayerId = drag\.ref\.layerId/);
    assert.doesNotMatch(preview, /saveComposition/);
    assert.match(finish, /if \(!drag\.active \|\| !drag\.preview\) return/);
    assert.match(finish, /await saveComposition\(\)/);
    assert.match(cancel, /state\.keyframeDrag = null/);
    assert.match(cancel, /renderTimeline\(\)/);
    assert.doesNotMatch(cancel, /saveComposition|state\.composition\.layers\s*=/);
    assert.match(keyboard, /state\.selectedLayerId = ref\.layerId/);
    assert.match(keyboard, /ref\.time = focused\.time/);
    assert.match(keyboard, /await saveComposition\(\)/);
    assert.match(html, /id="keyframe-retime-status" aria-live="polite"/);
});

test("semantic initial state and create events select the visible composition view", () => {
    const semantic = {
        revision: 3,
        presentation: { title: "Quarterly KPIs" },
    };
    const initialDocument = runtimeDocument();
    const eventDocument = runtimeDocument();

    showRuntimeMode(initialDocument, selectRuntimeMode("series", semantic));
    showRuntimeMode(eventDocument, selectRuntimeMode("series", semantic));

    for (const document of [initialDocument, eventDocument]) {
        assert.equal(document.views.find(({ id }) => id === "asset-view").hidden, false);
        assert.equal(document.views.find(({ id }) => id === "series-view").hidden, true);
        assert.equal(document.tabs.find(({ dataset }) => dataset.mode === "asset")
            .attributes.get("aria-selected"), "true");
    }
});

test("series-only opens and Fourier-only composition events preserve their view", () => {
    const fourierOnly = {
        revision: 2,
        layers: [{ type: "fourier", assetId: "mark" }],
    };

    const seriesDocument = runtimeDocument();
    const fourierDocument = runtimeDocument();

    showRuntimeMode(seriesDocument, selectRuntimeMode("series", null));
    showRuntimeMode(fourierDocument, selectRuntimeMode("series", fourierOnly));

    assert.equal(seriesDocument.views.find(({ id }) => id === "series-view").hidden, false);
    assert.equal(fourierDocument.views.find(({ id }) => id === "series-view").hidden, false);
    assert.equal(selectRuntimeMode("asset", fourierOnly), "asset");
});

test("audio cue crossings fire once at starts, positive crossings, and wraps", () => {
    assert.equal(audioCueCrossed(0, 0, 0, false, true), true);
    assert.equal(audioCueCrossed(0, 0, 0.016, false, false), false);
    assert.equal(audioCueCrossed(1, 0.9, 1.1), true);
    assert.equal(audioCueCrossed(1, 1, 1.1), false);
    assert.equal(audioCueCrossed(0, 7.99, 0.01, true), true);
    assert.equal(audioCueCrossed(0, 0, 0.01, false), false);

    const script = renderHtml("audio-runtime-nonce").match(
        /<script nonce="audio-runtime-nonce">([\s\S]*?)<\/script>/,
    )?.[1];
    assert.match(script, /if \(startsAtZero\) triggerAudioCues\(0, 0, false, true\)/);
    assert.match(
        script,
        /restart-composition[\s\S]*triggerAudioCues\(0, 0, false, true\)/,
    );
});
