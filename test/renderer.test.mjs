import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import {
    audioCueCrossed,
    renderHtml,
} from "../extensions/fourier-runtime-canvas/renderer.mjs";

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
