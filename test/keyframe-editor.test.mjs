import assert from "node:assert/strict";
import test from "node:test";

import {
    applyKeyframePatch,
    deleteKeyframeRefs,
    keyframeDragActivated,
    keyboardKeyframeDelta,
    mixedKeyframeFields,
    planKeyframeRetime,
    selectKeyframeRefs,
} from "../extensions/fourier-runtime-canvas/renderer.mjs";
import {
    createHistory,
    historyStatus,
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

test("retime planning moves one keyframe with grid snapping without mutating source", () => {
    const layers = [{
        id: "character",
        keyframes: [{ time: 0.2 }, { time: 0.8 }],
    }];
    const planned = planKeyframeRetime(
        layers,
        [{ layerId: "character", time: 0.2 }],
        0.126,
        { duration: 2 },
    );

    assert.equal(planned.delta, 0.13);
    assert.deepEqual(planned.layers[0].keyframes.map(({ time }) => time), [0.33, 0.8]);
    assert.deepEqual(planned.selected, [{ layerId: "character", time: 0.33 }]);
    assert.deepEqual(layers[0].keyframes.map(({ time }) => time), [0.2, 0.8]);

    const offGrid = planKeyframeRetime(
        [{ id: "character", keyframes: [{ time: 0.203 }] }],
        [{ layerId: "character", time: 0.203 }],
        0.006,
        { duration: 2, anchorTime: 0.203 },
    );
    assert(Math.abs(offGrid.delta - 0.007) < 1e-12);
    assert.equal(offGrid.layers[0].keyframes[0].time, 0.21);
});

test("retime planning moves a cross-layer group while preserving spacing", () => {
    const layers = [
        {
            id: "character",
            keyframes: [{ time: 0.2 }, { time: 0.5 }, { time: 1.5 }],
        },
        {
            id: "background",
            keyframes: [{ time: 1 }],
        },
    ];
    const selected = [
        { layerId: "character", time: 0.2 },
        { layerId: "character", time: 0.5 },
        { layerId: "background", time: 1 },
    ];
    const planned = planKeyframeRetime(layers, selected, 0.3, { duration: 2 });

    assert.equal(planned.delta, 0.3);
    assert.deepEqual(
        planned.layers[0].keyframes.map(({ time }) => time),
        [0.5, 0.8, 1.5],
    );
    assert.deepEqual(planned.layers[1].keyframes.map(({ time }) => time), [1.3]);
    assert.deepEqual(planned.selected.map(({ time }) => time), [0.5, 0.8, 1.3]);
});

test("retime planning clamps groups to the timeline and adjacent unselected keyframes", () => {
    const boundaryLayers = [
        { id: "a", keyframes: [{ time: 0.2 }] },
        { id: "b", keyframes: [{ time: 1.8 }] },
    ];
    const boundarySelection = [
        { layerId: "a", time: 0.2 },
        { layerId: "b", time: 1.8 },
    ];

    assert.equal(
        planKeyframeRetime(
            boundaryLayers,
            boundarySelection,
            0.5,
            { duration: 2 },
        ).delta,
        0.2,
    );
    assert.equal(
        planKeyframeRetime(
            boundaryLayers,
            boundarySelection,
            -1,
            { duration: 2 },
        ).delta,
        -0.2,
    );

    const collisionLayers = [{
        id: "character",
        keyframes: [{ time: 0.2 }, { time: 0.5 }, { time: 0.8 }],
    }];
    assert.equal(
        planKeyframeRetime(
            collisionLayers,
            [{ layerId: "character", time: 0.2 }],
            0.4,
            { duration: 2 },
        ).delta,
        0.29,
    );
    assert(
        Math.abs(planKeyframeRetime(
            collisionLayers,
            [{ layerId: "character", time: 0.8 }],
            -0.4,
            { duration: 2 },
        ).delta + 0.29) < 1e-12,
    );

    const denseLayers = [{
        id: "character",
        keyframes: [{ time: 0 }, { time: 0.005 }],
    }];
    const densePlan = planKeyframeRetime(
        denseLayers,
        [{ layerId: "character", time: 0 }],
        0.02,
        { duration: 2 },
    );
    assert.equal(densePlan.delta, 0);
    assert.deepEqual(
        densePlan.layers[0].keyframes.map(({ time }) => time),
        [0, 0.005],
    );

    const highPrecisionLayers = [{
        id: "character",
        keyframes: [{ time: 0.4998998 }, { time: 0.5 }],
    }];
    const highPrecisionPlan = planKeyframeRetime(
        highPrecisionLayers,
        [{ layerId: "character", time: 0.4998998 }],
        0.1,
        { duration: 1 },
    );
    assert.equal(highPrecisionPlan.delta, 0);
    assert.deepEqual(highPrecisionPlan.layers, highPrecisionLayers);

    const gridConstraintPlan = planKeyframeRetime(
        [{
            id: "character",
            keyframes: [{ time: 0.203 }, { time: 0.503 }],
        }],
        [{ layerId: "character", time: 0.203 }],
        0.4,
        { duration: 1, anchorTime: 0.203 },
    );
    assert(Math.abs(gridConstraintPlan.layers[0].keyframes[0].time - 0.49) < 1e-12);
});

test("retime planning supports Alt free movement and cancellation by discarding preview", () => {
    const layers = [{
        id: "character",
        keyframes: [{ time: 0.2 }, { time: 0.8 }],
    }];
    const selected = [{ layerId: "character", time: 0.2 }];

    assert.equal(
        planKeyframeRetime(layers, selected, 0.126, {
            duration: 2,
            snap: true,
        }).delta,
        0.13,
    );
    const freePreview = planKeyframeRetime(layers, selected, 0.126, {
        duration: 2,
        snap: false,
    });
    assert.equal(freePreview.delta, 0.126);
    assert.deepEqual(layers[0].keyframes.map(({ time }) => time), [0.2, 0.8]);
});

test("drag thresholds and keyboard retiming use documented precision", () => {
    assert.equal(keyframeDragActivated(3.99), false);
    assert.equal(keyframeDragActivated(4), true);
    assert.equal(keyboardKeyframeDelta("ArrowLeft", false), -0.01);
    assert.equal(keyboardKeyframeDelta("ArrowRight", false), 0.01);
    assert.equal(keyboardKeyframeDelta("ArrowRight", true), 0.1);
    assert.equal(keyboardKeyframeDelta("ArrowUp", false), null);
});

test("one retime plan records one undoable history entry", () => {
    const original = {
        revision: 1,
        layers: [{
            id: "character",
            keyframes: [{ time: 0.2 }, { time: 0.8 }],
        }],
    };
    const planned = {
        ...original,
        revision: 2,
        layers: planKeyframeRetime(
            original.layers,
            [{ layerId: "character", time: 0.2 }],
            0.2,
            { duration: 2 },
        ).layers,
    };
    const history = createHistory();

    assert.equal(recordHistory(history, original, planned), true);
    assert.equal(historyStatus(history).undoCount, 1);
    assert.deepEqual(undoHistory(history, planned), original);
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
