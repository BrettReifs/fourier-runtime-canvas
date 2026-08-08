import assert from "node:assert/strict";
import test from "node:test";

import {
    FOURIER_LIMITS,
    normalizeFrequencyAsset,
    transformDrawing,
} from "../extensions/fourier-runtime-canvas/fourier.mjs";

const drawing = {
    name: "Unit square",
    termLimit: 32,
    strokes: [{
        closed: true,
        points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 },
        ],
    }],
    runtime: { duration: 3, showEpicycles: true },
};

test("transformDrawing creates bounded Fourier coefficients without mutating input", () => {
    const before = structuredClone(drawing);
    const asset = transformDrawing(drawing);

    assert.deepEqual(drawing, before);
    assert.equal(asset.format, "fourier-path/v1");
    assert.equal(asset.coordinateSystem, "normalized-complex");
    assert.equal(asset.strokeCount, 1);
    assert(asset.strokes[0].coefficients.length <= drawing.termLimit);
    assert(asset.strokes[0].coefficients.length <= FOURIER_LIMITS.maxAssetTerms);
    assert(asset.strokes[0].coefficients.every((coefficient) => (
        Number.isInteger(coefficient.frequency)
        && Number.isFinite(coefficient.amplitude)
        && coefficient.amplitude >= 0
        && Number.isFinite(coefficient.phase)
    )));
});

test("transformed assets retain frequencies only, not source points", () => {
    const asset = transformDrawing(drawing);
    const serialized = JSON.stringify(asset);

    assert(!serialized.includes('"points"'));
    assert(!serialized.includes('"x"'));
    assert(!serialized.includes('"y"'));
    assert.deepEqual(
        Object.keys(asset.strokes[0]).sort(),
        ["closed", "coefficients", "sampleCount"],
    );
});

test("normalizeFrequencyAsset rejects non-integer frequency bins", () => {
    assert.throws(() => normalizeFrequencyAsset({
        format: "fourier-path/v1",
        strokes: [{
            coefficients: [{ frequency: 0.5, amplitude: 1, phase: 0 }],
        }],
    }), /frequency must be an integer/);
});

test("transformDrawing resolves the known dominant coefficient of a unit circle", () => {
    const points = Array.from({ length: 64 }, (_, index) => {
        const angle = (index / 64) * Math.PI * 2;
        return { x: Math.cos(angle), y: Math.sin(angle) };
    });
    const asset = transformDrawing({
        termLimit: 8,
        strokes: [{ closed: true, points }],
    });
    const dominant = asset.strokes[0].coefficients.find(
        (coefficient) => coefficient.frequency === 1,
    );

    assert(dominant);
    assert(Math.abs(dominant.amplitude - 1) < 0.01);
    assert(Math.abs(dominant.phase) < 0.01);
});

test("asset normalization rejects duplicate bins and excessive numeric magnitudes", () => {
    assert.throws(() => normalizeFrequencyAsset({
        format: "fourier-path/v1",
        strokes: [{
            coefficients: [
                { frequency: 1, amplitude: 1, phase: 0 },
                { frequency: 1, amplitude: 0.5, phase: 1 },
            ],
        }],
    }), /duplicate frequency 1/);

    assert.throws(() => transformDrawing({
        strokes: [{
            points: [{ x: 0, y: 0 }, { x: 1e308, y: 1 }],
        }],
    }), /must not exceed/);

    assert.throws(() => transformDrawing({
        termLimit: "bad",
        strokes: [{
            points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        }],
    }), /Term limit must be an integer/);

    assert.throws(() => normalizeFrequencyAsset({
        format: "fourier-path/v1",
        strokes: [{
            sampleCount: "bad",
            coefficients: [{ frequency: 1, amplitude: 1, phase: 0 }],
        }],
    }), /sample count must be a finite number/);

    assert.throws(() => transformDrawing({
        termLimit: 257,
        strokes: [{
            points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        }],
    }), /integer from 4 to 256/);

    assert.throws(() => normalizeFrequencyAsset({
        format: "fourier-path/v1",
        strokes: [{
            sampleCount: 4097,
            coefficients: [{ frequency: 1, amplitude: 1, phase: 0 }],
        }],
    }), /integer from 8 to 4096/);
});

test("transform work and aggregate coefficient budgets reject expensive drawings", () => {
    const circle = Array.from({ length: 128 }, (_, index) => {
        const angle = (index / 128) * Math.PI * 2;
        return { x: Math.cos(angle), y: Math.sin(angle) };
    });

    assert.throws(() => transformDrawing({
        termLimit: 64,
        strokes: Array.from({ length: 8 }, () => ({
            closed: true,
            points: circle,
        })),
    }), /Fourier operations/);

    const shortClosedStroke = Array.from({ length: 33 }, (_, index) => ({
        x: index,
        y: index % 2,
    }));
    assert.throws(() => transformDrawing({
        termLimit: 128,
        strokes: Array.from({ length: 17 }, () => ({
            closed: true,
            points: shortClosedStroke,
        })),
    }), /transformed asset may contain at most 2048 coefficients/);
});

test("shared Fourier validation rejects schema-bypassing fields and types", () => {
    assert.throws(() => transformDrawing({
        unsupported: true,
        strokes: [{ points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }],
    }), /unsupported field unsupported/);
    assert.throws(() => transformDrawing({
        strokes: [{
            closed: "yes",
            points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        }],
    }), /closed must be a boolean/);
    assert.throws(() => normalizeFrequencyAsset({
        format: "fourier-path/v1",
        strokes: [{
            coefficients: [{
                frequency: 1,
                amplitude: 1,
                phase: 0,
                unexpected: true,
            }],
        }],
    }), /unsupported field unexpected/);
});
