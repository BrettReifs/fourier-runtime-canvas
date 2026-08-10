import assert from "node:assert/strict";
import test from "node:test";

import {
    applyOcclusionMattes,
    compositeLayerSurfaces,
    evaluateFourierLayer,
    resolveOccludedLayerIds,
} from "../extensions/fourier-runtime-canvas/renderer.mjs";

test("animated matte evaluation follows layer transforms and matte morph keyframes", () => {
    const evaluated = evaluateFourierLayer({
        assetId: "character-a",
        matteAssetId: "matte-a",
        keyframes: [
            {
                time: 0,
                assetId: "character-a",
                matteAssetId: "matte-a",
                x: 0,
                scale: 1,
                easing: "linear",
            },
            {
                time: 4,
                assetId: "character-b",
                matteAssetId: "matte-b",
                x: 1,
                scale: 2,
                easing: "linear",
            },
        ],
    }, 2);

    assert.equal(evaluated.x, 0.5);
    assert.equal(evaluated.scale, 1.5);
    assert.deepEqual(evaluated.morph, {
        fromAssetId: "character-a",
        toAssetId: "character-b",
        amount: 0.5,
    });

    assert.deepEqual(evaluated.matteMorph, {
        fromAssetId: "matte-a",
        toAssetId: "matte-b",
        amount: 0.5,
    });
});

test("matte compositing subtracts selected surfaces before drawing far-to-near", () => {
    const operations = [];
    const context = (id) => ({
        save() {
            operations.push(`${id}:save`);
        },
        restore() {
            operations.push(`${id}:restore`);
        },
        set globalCompositeOperation(value) {
            operations.push(`${id}:composite:${value}`);
        },
        drawImage(canvas, x, y, width, height) {
            operations.push(`${id}:draw:${canvas.id}:${x},${y},${width},${height}`);
        },
    });
    const layers = [
        { id: "background", zIndex: 0 },
        {
            id: "character",
            zIndex: 2,
            occludes: { layerIds: ["background"], zIndices: [] },
        },
    ];
    const surfaces = new Map([
        ["background", {
            canvas: { id: "background-canvas" },
            context: context("background"),
            width: 320,
            height: 180,
        }],
        ["character", {
            canvas: { id: "character-canvas" },
            context: context("character"),
            width: 320,
            height: 180,
        }],
    ]);
    const mattes = new Map([
        ["character", { canvas: { id: "character-matte" } }],
    ]);

    applyOcclusionMattes(layers, surfaces, mattes);
    compositeLayerSurfaces(context("output"), layers, surfaces, 320, 180);

    assert.deepEqual(operations, [
        "background:save",
        "background:composite:destination-out",
        "background:draw:character-matte:0,0,320,180",
        "background:restore",
        "output:draw:background-canvas:0,0,320,180",
        "output:draw:character-canvas:0,0,320,180",
    ]);
});

test("occlusion selectors resolve only matching lower-depth layers", () => {
    const layers = [
        { id: "far", zIndex: -2 },
        { id: "scenery", zIndex: 0 },
        { id: "character", zIndex: 2, occludes: {
            layerIds: ["scenery", "overlay"],
            zIndices: [-2],
        } },
        { id: "overlay", zIndex: 3 },
    ];

    assert.deepEqual(
        resolveOccludedLayerIds(layers[2], layers),
        ["far", "scenery"],
    );
});
