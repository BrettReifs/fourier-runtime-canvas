import assert from "node:assert/strict";
import test from "node:test";

import {
    addAssetPoint,
    buildAssetPreview,
    buildAssetUpdate,
    deleteSelectedAssetPoints,
    moveSelectedAssetPoints,
    reconstructAssetGeometry,
    selectAssetElement,
    setAssetStrokeClosed,
} from "../extensions/fourier-runtime-canvas/asset-editor.mjs";
import {
    createHistory,
    historyStatus,
    recordHistory,
    redoHistory,
    undoHistory,
} from "../extensions/fourier-runtime-canvas/history.mjs";

function circleAsset() {
    return {
        id: "circle",
        format: "fourier-path/v1",
        name: "Circle",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        revision: 3,
        coordinateSystem: "normalized-complex",
        strokeCount: 1,
        termLimit: 8,
        strokes: [{
            closed: true,
            sampleCount: 64,
            coefficients: [
                { frequency: 0, amplitude: 0, phase: 0 },
                { frequency: 1, amplitude: 1, phase: 0 },
            ],
        }],
        runtime: { duration: 4, showEpicycles: true },
    };
}

test("coefficient reconstruction is deterministic and frequency-only", () => {
    const asset = circleAsset();
    const first = reconstructAssetGeometry(asset, 8);
    const second = reconstructAssetGeometry(asset, 8);

    assert.deepEqual(first, second);
    assert.deepEqual(first.strokes[0].points[0], { x: 1, y: 0 });
    assert(Math.abs(first.strokes[0].points[2].x) < 1e-12);
    assert(Math.abs(first.strokes[0].points[2].y - 1) < 1e-12);
    assert(!JSON.stringify(asset).includes('"points"'));
});

test("element selection and safe point editing preserve source immutability", () => {
    const geometry = reconstructAssetGeometry(circleAsset(), 8);
    const stroke = selectAssetElement([], { strokeIndex: 0 }, {});
    const point = selectAssetElement(
        stroke,
        { strokeIndex: 0, pointIndex: 2 },
        { toggle: true },
    );
    assert.deepEqual(point, [
        { strokeIndex: 0 },
        { strokeIndex: 0, pointIndex: 2 },
    ]);

    const moved = moveSelectedAssetPoints(
        geometry,
        [{ strokeIndex: 0, pointIndex: 2 }],
        0.25,
        -0.5,
    );
    assert.equal(moved.strokes[0].points[2].x, geometry.strokes[0].points[2].x + 0.25);
    assert.equal(moved.strokes[0].points[2].y, geometry.strokes[0].points[2].y - 0.5);
    assert.notEqual(moved, geometry);

    const added = addAssetPoint(moved, 0, 2, { x: 0.1, y: 0.2 });
    assert.equal(added.strokes[0].points.length, 9);
    const deleted = deleteSelectedAssetPoints(
        added,
        [{ strokeIndex: 0, pointIndex: 3 }],
    );
    assert.equal(deleted.strokes[0].points.length, 8);
    assert.equal(setAssetStrokeClosed(deleted, 0, false).strokes[0].closed, false);
});

test("preview is transient and stable-ID updates are idempotent and conflict-safe", () => {
    const asset = circleAsset();
    const geometry = reconstructAssetGeometry(asset, 8);
    const input = {
        name: asset.name,
        termLimit: asset.termLimit,
        strokes: geometry.strokes,
        runtime: asset.runtime,
    };
    const before = structuredClone(asset);
    const preview = buildAssetPreview(asset, input);

    assert.equal(preview.id, asset.id);
    assert.equal(preview.revision, asset.revision);
    assert.deepEqual(asset, before);
    assert(!JSON.stringify(preview).includes('"points"'));

    const unchanged = buildAssetUpdate(
        asset,
        asset.revision,
        input,
        "2026-01-02T00:00:00.000Z",
    );
    assert.equal(unchanged.changed, false);
    assert.equal(unchanged.asset, asset);

    const editedGeometry = moveSelectedAssetPoints(
        geometry,
        [{ strokeIndex: 0, pointIndex: 2 }],
        0.2,
        0,
    );
    const edited = buildAssetUpdate(asset, asset.revision, {
        ...input,
        strokes: editedGeometry.strokes,
    }, "2026-01-02T00:00:00.000Z");
    assert.equal(edited.changed, true);
    assert.equal(edited.asset.id, asset.id);
    assert.equal(edited.asset.revision, asset.revision + 1);
    assert.equal(edited.asset.createdAt, asset.createdAt);

    assert.throws(
        () => buildAssetUpdate(asset, asset.revision - 1, input),
        (error) => (
            error.code === "stale_asset_revision"
            && error.current.revision === asset.revision
        ),
    );
});

test("asset revisions use bounded undo and redo without changing references", () => {
    const original = circleAsset();
    const geometry = moveSelectedAssetPoints(
        reconstructAssetGeometry(original, 8),
        [{ strokeIndex: 0, pointIndex: 1 }],
        0.15,
        0,
    );
    const updated = buildAssetUpdate(original, original.revision, {
        name: original.name,
        termLimit: original.termLimit,
        strokes: geometry.strokes,
        runtime: original.runtime,
    }).asset;
    const history = createHistory({}, 8);

    assert.equal(recordHistory(history, original, updated), true);
    assert.equal(historyStatus(history).undoCount, 1);
    const undone = undoHistory(history, updated);
    assert.equal(undone.id, "circle");
    assert.equal(redoHistory(history, undone).id, "circle");
    const composition = { layers: [{ assetId: "circle", matteAssetId: "circle" }] };
    assert.deepEqual(composition.layers[0], {
        assetId: updated.id,
        matteAssetId: updated.id,
    });
});
