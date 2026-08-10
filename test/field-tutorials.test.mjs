import assert from "node:assert/strict";
import test from "node:test";

import {
    FIELD_TUTORIALS,
    createTutorialDemoCache,
    tutorialDemoFrame,
    tutorialForField,
} from "../extensions/fourier-runtime-canvas/field-tutorials.mjs";
import { renderHtml } from "../extensions/fourier-runtime-canvas/renderer.mjs";

const requiredFields = [
    "creator-asset-library",
    "asset-library",
    "asset-name",
    "term-limit",
    "close-strokes",
    "composition-time",
    "asset-speed",
    "show-epicycles",
    "layer-start",
    "layer-end",
    "key-time",
    "key-shape",
    "key-x",
    "key-y",
    "key-scale",
    "key-rotation",
    "key-opacity",
    "key-reveal",
    "key-easing",
    "motion-enabled",
    "motion-amount",
    "motion-speed",
    "motion-detail",
    "audio-enabled",
    "audio-trigger",
    "audio-frequency",
    "audio-gain",
    "audio-duration",
    "audio-partials",
    "matte-padding",
    "occlusion-targets",
    "asset-closed",
];

test("every editable scene field has complete tutorial metadata and a demo", () => {
    const html = renderHtml("tutorial-completeness-nonce");
    const editableMarkup = html.match(
        /id="create-view"[\s\S]*?id="series-view"/,
    )?.[0] ?? "";
    const renderedFields = [...editableMarkup.matchAll(
        /<(?:input|select)\b[^>]*\bid="([^"]+)"/g,
    )].map((match) => match[1]);
    const missing = renderedFields.filter((fieldId) => !FIELD_TUTORIALS[fieldId]);

    assert.deepEqual(missing, []);
    assert.deepEqual(Object.keys(FIELD_TUTORIALS).sort(), requiredFields.sort());
    for (const fieldId of requiredFields) {
        const tutorial = tutorialForField(fieldId);
        assert.equal(tutorial.fieldId, fieldId);
        assert(tutorial.title.length > 0);
        assert(tutorial.explanation.length > 0);
        assert(tutorial.whenToUse.length > 0);
        assert(tutorial.tradeoffs.length > 0);
        assert(tutorial.demo.kind.length > 0);
        assert.doesNotThrow(() => tutorialDemoFrame(tutorial.demo, 0.5, false));
    }
});

test("tutorial demos are deterministic, reduced-motion safe, cached, and local", () => {
    const tutorial = tutorialForField("key-rotation");
    const first = tutorialDemoFrame(tutorial.demo, 0.42, false);
    const second = tutorialDemoFrame(tutorial.demo, 0.42, false);
    assert.deepEqual(first, second);

    const reduced = tutorialDemoFrame(tutorial.demo, 0.42, true);
    assert.deepEqual(reduced.progress, [0, 1]);

    let renderCount = 0;
    const cache = createTutorialDemoCache((demo, reducedMotion) => {
        renderCount += 1;
        return tutorialDemoFrame(demo, 0.42, reducedMotion);
    });
    assert.equal(cache.get(tutorial, false), cache.get(tutorial, false));
    assert.equal(renderCount, 1);
    cache.get(tutorial, true);
    assert.equal(renderCount, 2);
});

test("renderer installs accessible non-modal tutorial controls without persistence", () => {
    const html = renderHtml("tutorial-renderer-nonce");
    const script = html.match(
        /<script nonce="tutorial-renderer-nonce">([\s\S]*?)<\/script>/,
    )?.[1];

    assert.match(html, /id="field-tutorial-popover"[^>]*popover="manual"/);
    assert.match(html, /id="field-tutorial-demo"/);
    assert.match(script, /installFieldTutorials\(\)/);
    assert.match(script, /aria-label[\s\S]*Learn about/);
    assert.match(script, /event\.key === "Escape"[\s\S]*closeFieldTutorial/);
    const install = script.match(
        /function installFieldTutorials\(\) \{([\s\S]*?)\n    \}\n\n/,
    )?.[1];
    assert(install);
    assert.doesNotMatch(install, /requestJson|saveComposition|fetch\(/);
});
