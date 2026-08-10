import assert from "node:assert/strict";
import test from "node:test";

import {
    normalizeComposition,
    validateCompositionComplexity,
} from "../extensions/fourier-runtime-canvas/composition.mjs";

test("composition normalization preserves morph targets, motion, and audio settings", () => {
    const composition = normalizeComposition({
        id: "scene",
        format: "fourier-composition/v1",
        name: "Morph scene",
        duration: 8,
        layers: [{
            id: "layer-a",
            name: "Shape shift",
            assetId: "asset-a",
            start: 1,
            end: 7,
            zIndex: 4,
            motion: {
                enabled: true,
                amount: 0.03,
                speed: 1.5,
                detail: 6,
                seed: 42,
            },
            audio: {
                enabled: true,
                triggerTime: 2,
                baseFrequency: 330,
                gain: 0.08,
                duration: 0.4,
                partialCount: 6,
            },
            keyframes: [
                { time: 1, assetId: "asset-a", reveal: 0 },
                { time: 7, assetId: "asset-b", reveal: 1, easing: "linear" },
            ],
        }],
    }, new Set(["asset-a", "asset-b"]));

    const layer = composition.layers[0];
    assert.equal(layer.keyframes[0].assetId, "asset-a");
    assert.equal(layer.keyframes[1].assetId, "asset-b");
    assert.deepEqual(layer.motion, {
        enabled: true,
        amount: 0.03,
        speed: 1.5,
        detail: 6,
        seed: 42,
    });

    assert.deepEqual(layer.audio, {
        enabled: true,
        triggerTime: 2,
        baseFrequency: 330,
        gain: 0.08,
        duration: 0.4,
        partialCount: 6,
    });
});

test("composition normalization preserves animated matte references and occlusion selectors", () => {
    const composition = normalizeComposition({
        format: "fourier-composition/v1",
        duration: 8,
        layers: [
            {
                id: "background",
                assetId: "asset-a",
                zIndex: 0,
            },
            {
                id: "character",
                assetId: "asset-b",
                matteAssetId: "matte-a",
                mattePadding: 4,
                occludes: {
                    layerIds: ["background"],
                    zIndices: [-1],
                },
                zIndex: 2,
                keyframes: [
                    { time: 0, assetId: "asset-b", matteAssetId: "matte-a" },
                    { time: 8, assetId: "asset-c", matteAssetId: "matte-b" },
                ],
            },
        ],
    }, new Set(["asset-a", "asset-b", "asset-c", "matte-a", "matte-b"]));

    const character = composition.layers[1];
    assert.equal(character.matteAssetId, "matte-a");
    assert.equal(character.mattePadding, 4);
    assert.deepEqual(character.occludes, {
        layerIds: ["background"],
        zIndices: [-1],
    });
    assert.deepEqual(
        character.keyframes.map(({ matteAssetId }) => matteAssetId),
        ["matte-a", "matte-b"],
    );
    assert.deepEqual(
        JSON.parse(JSON.stringify(character.occludes)),
        character.occludes,
    );
});

test("composition normalization rejects unavailable morph assets", () => {
    assert.throws(() => normalizeComposition({
        format: "fourier-composition/v1",
        duration: 8,
        layers: [{
            assetId: "asset-a",
            keyframes: [{ time: 4, assetId: "missing" }],
        }],
    }, new Set(["asset-a"])), /unavailable Fourier asset/);
});

test("composition normalization rejects occlusion selectors that are not lower-depth", () => {
    assert.throws(() => normalizeComposition({
        format: "fourier-composition/v1",
        duration: 8,
        layers: [
            {
                id: "foreground",
                assetId: "asset-a",
                zIndex: 2,
                occludes: { layerIds: ["overlay"] },
            },
            {
                id: "overlay",
                assetId: "asset-a",
                zIndex: 3,
            },
        ],
    }, new Set(["asset-a"])), /must target a lower-depth layer/);
});

test("composition normalization bounds numeric fields and rejects duplicate layer IDs", () => {
    assert.throws(() => normalizeComposition({
        format: "fourier-composition/v1",
        duration: 8,
        layers: [{
            id: "layer-a",
            assetId: "asset-a",
            zIndex: 1e308,
            motion: { seed: -1e308 },
            keyframes: [{ time: 0, rotation: 1e308 }],
        }],
    }, new Set(["asset-a"])), /must be from/);

    assert.throws(() => normalizeComposition({
        format: "fourier-composition/v1",
        duration: 8,
        layers: [
            { id: "duplicate", assetId: "asset-a" },
            { id: "duplicate", assetId: "asset-a" },
        ],
    }, new Set(["asset-a"])), /duplicate layer ID duplicate/);
});

test("composition revisions and aggregate keyframes are bounded", () => {
    assert.throws(() => normalizeComposition({
        format: "fourier-composition/v1",
        revision: Number.MAX_SAFE_INTEGER + 1,
        duration: 8,
        layers: [],
    }, new Set()), /non-negative safe integer/);

    assert.throws(() => normalizeComposition({
        format: "fourier-composition/v1",
        duration: 8,
        layers: Array.from({ length: 9 }, (_, layerIndex) => ({
            id: `layer-${layerIndex}`,
            assetId: "asset-a",
            keyframes: Array.from({ length: 128 }, (_, keyframeIndex) => ({
                time: keyframeIndex / 16,
            })),
        })),
    }, new Set(["asset-a"])), /at most 1024 keyframes in total/);
});

test("shared composition validation rejects schema-bypassing fields and types", () => {
    assert.throws(() => normalizeComposition({
        format: "fourier-composition/v1",
        duration: 8,
        unsupported: true,
        layers: [],
    }, new Set()), /unsupported field unsupported/);
    assert.throws(() => normalizeComposition({
        format: "fourier-composition/v1",
        duration: 8,
        layers: [{
            assetId: "asset-a",
            keyframes: [{ time: 1, easing: "spring" }],
        }],
    }, new Set(["asset-a"])), /easing is not supported/);
    assert.throws(() => normalizeComposition({
        format: "fourier-composition/v1",
        duration: 8,
        layers: [{
            assetId: "asset-a",
            motion: { enabled: "yes" },
        }],
    }, new Set(["asset-a"])), /motion enabled must be a boolean/);
});

test("scene complexity counts the union of frequencies used during morphs", () => {
    const assetA = {
        strokes: [{
            coefficients: Array.from({ length: 2048 }, (_, frequency) => ({ frequency })),
        }],
    };
    const assetB = {
        strokes: [{
            coefficients: Array.from(
                { length: 2048 },
                (_, index) => ({ frequency: index + 2048 }),
            ),
        }],
    };
    const assets = new Map([["asset-a", assetA], ["asset-b", assetB]]);
    const composition = normalizeComposition({
        format: "fourier-composition/v1",
        revision: 0,
        duration: 8,
        layers: Array.from({ length: 3 }, (_, index) => ({
            id: `layer-${index}`,
            assetId: "asset-a",
            keyframes: [
                { time: 0, assetId: "asset-a" },
                { time: 8, assetId: "asset-b" },
            ],
        })),
    }, new Set(assets.keys()));

    assert.throws(
        () => validateCompositionComplexity(composition, assets),
        /8192-coefficient scene budget/,
    );
});

test("scene complexity includes distinct matte morph assets", () => {
    const asset = (offset, count) => ({
        strokes: [{
            coefficients: Array.from(
                { length: count },
                (_, index) => ({ frequency: index + offset }),
            ),
        }],
    });
    const assets = new Map([
        ["visual", asset(0, 1)],
        ["matte-a", asset(0, 2048)],
        ["matte-b", asset(2048, 2048)],
    ]);
    const composition = normalizeComposition({
        format: "fourier-composition/v1",
        duration: 8,
        layers: [
            { id: "background", assetId: "visual", zIndex: 0 },
            ...Array.from({ length: 3 }, (_, index) => ({
                id: `foreground-${index}`,
                assetId: "visual",
                matteAssetId: "matte-a",
                occludes: { layerIds: ["background"] },
                zIndex: index + 1,
                keyframes: [
                    { time: 0, matteAssetId: "matte-a" },
                    { time: 8, matteAssetId: "matte-b" },
                ],
            })),
        ],
    }, new Set(assets.keys()));

    assert.throws(
        () => validateCompositionComplexity(composition, assets),
        /8192-coefficient scene budget/,
    );
});
