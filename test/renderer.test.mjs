import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import { renderHtml } from "../extensions/fourier-runtime-canvas/renderer.mjs";

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
