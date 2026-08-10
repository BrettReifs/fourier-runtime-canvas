import assert from "node:assert/strict";
import test from "node:test";

import {
    applyKeyframePatch,
    deleteKeyframeRefs,
    mixedKeyframeFields,
    selectKeyframeRefs,
} from "../extensions/fourier-runtime-canvas/renderer.mjs";
import {
    createHistory,
    recordHistory,
    undoHistory,
} from "../extensions/fourier-runtime-canvas/history.mjs";

const refs = [
    { layerId: "character", time: 0 },
    { layerId: "character", time: 1 },
    { layerId: "character", time: 2 },
    { layerId: "background", time: 0 },
];

test("keyframe selection supports single, toggle, and same-layer anchored ranges", () => {
    const single = selectKeyframeRefs([], refs[1], refs, {});
    assert.deepEqual(single, {
        selected: [refs[1]],
        anchor: refs[1],
    });

    const toggled = selectKeyframeRefs(
        single.selected,
        refs[2],
        refs,
        { toggle: true, anchor: single.anchor },
    );
    assert.deepEqual(toggled.selected, [refs[1], refs[2]]);

    const range = selectKeyframeRefs(
        toggled.selected,
        refs[0],
        refs,
        { range: true, anchor: refs[2] },
    );
    assert.deepEqual(range.selected, refs.slice(0, 3));

    const crossLayerRange = selectKeyframeRefs(
        range.selected,
        refs[3],
        refs,
        { range: true, anchor: refs[0] },
    );
    assert.deepEqual(crossLayerRange, {
        selected: [refs[3]],
        anchor: refs[3],
    });

    assert.deepEqual(
        selectKeyframeRefs(crossLayerRange.selected, null, refs, {}),
        { selected: [], anchor: null },
    );
});

test("grouped keyframe fields report common and mixed values", () => {
    assert.deepEqual(
        mixedKeyframeFields([
            { time: 1, x: 0.25, opacity: 1, easing: "linear" },
            { time: 2, x: 0.25, opacity: 0.5, easing: "linear" },
        ], ["time", "x", "opacity", "easing"]),
        {
            time: null,
            x: 0.25,
            opacity: null,
            easing: "linear",
        },
    );
});

test("grouped updates and deletion apply to selected keyframes and remain undoable", () => {
    const original = {
        revision: 1,
        layers: [{
            id: "character",
            keyframes: [
                { time: 0, x: 0, opacity: 1, easing: "linear" },
                { time: 1, x: 0.5, opacity: 0.5, easing: "ease-in" },
                { time: 2, x: 1, opacity: 0, easing: "ease-out" },
            ],
        }],
    };
    const selected = [refs[0], refs[1]];
    const updatedLayers = applyKeyframePatch(
        original.layers,
        selected,
        { time: 0.5, x: -0.25, easing: "ease-in-out", opacity: null },
    );
    assert.deepEqual(
        updatedLayers[0].keyframes.map(({ x, opacity, easing }) => ({ x, opacity, easing })),
        [
            { x: -0.25, opacity: 1, easing: "ease-in-out" },
            { x: -0.25, opacity: 0.5, easing: "ease-in-out" },
            { x: 1, opacity: 0, easing: "ease-out" },
        ],
    );
    assert.deepEqual(
        updatedLayers[0].keyframes.map(({ time }) => time),
        [0.5, 1.5, 2],
    );

    const updated = { ...original, revision: 2, layers: updatedLayers };
    const updatedSelection = [
        { layerId: "character", time: 0.5 },
        { layerId: "character", time: 1.5 },
    ];
    const deleted = {
        ...updated,
        revision: 3,
        layers: deleteKeyframeRefs(updated.layers, updatedSelection),
    };
    assert.deepEqual(
        deleted.layers[0].keyframes.map(({ time }) => time),
        [2],
    );

    const history = createHistory();
    assert.equal(recordHistory(history, updated, deleted), true);
    assert.deepEqual(undoHistory(history, deleted), updated);
    assert.throws(
        () => deleteKeyframeRefs(updated.layers, [
            { layerId: "character", time: 0.5 },
            { layerId: "character", time: 1.5 },
            { layerId: "character", time: 2 },
        ]),
        /must keep at least one keyframe/,
    );
});
