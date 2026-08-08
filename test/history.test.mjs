import assert from "node:assert/strict";
import test from "node:test";

import {
    createHistory,
    historyStatus,
    recordHistory,
    redoHistory,
    undoHistory,
} from "../extensions/fourier-runtime-canvas/history.mjs";

function composition(name, updatedAt) {
    return {
        id: "scene",
        format: "fourier-composition/v1",
        name,
        duration: 8,
        layers: [],
        updatedAt,
    };
}

test("history ignores timestamp-only updates and returns defensive copies", () => {
    const history = createHistory({}, 2);
    const current = composition("A", "2026-01-01T00:00:00.000Z");
    const timestampOnly = composition("A", "2026-01-02T00:00:00.000Z");

    assert.equal(recordHistory(history, current, timestampOnly), false);
    assert.deepEqual(historyStatus(history), {
        canUndo: false,
        canRedo: false,
        undoCount: 0,
        redoCount: 0,
        limit: 2,
    });

    const next = composition("B", "2026-01-03T00:00:00.000Z");
    assert.equal(recordHistory(history, current, next), true);
    current.name = "mutated";
    assert.equal(history.undo[0].name, "A");
});

test("undo and redo move snapshots between bounded stacks", () => {
    const history = createHistory({}, 2);
    const first = composition("A", "1");
    const second = composition("B", "2");
    const third = composition("C", "3");
    const fourth = composition("D", "4");

    recordHistory(history, first, second);
    recordHistory(history, second, third);
    recordHistory(history, third, fourth);
    assert.deepEqual(history.undo.map((item) => item.name), ["B", "C"]);

    const undone = undoHistory(history, fourth);
    assert.equal(undone.name, "C");
    assert.equal(redoHistory(history, undone).name, "D");
    assert.throws(() => redoHistory(history, fourth), /no composition change to redo/);
});
