import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
    compareRuns,
    loadRuns,
    metricDelta,
    renderComparison,
} from "../benchmarks/scripts/compare-runs.mjs";

function run(id, values) {
    const phase = {
        elapsedSeconds: values.elapsedSeconds,
        nanoAiu: values.nanoAiu,
        peakContextTokens: values.peakContextTokens,
        outputTokens: values.outputTokens,
        toolCalls: values.toolCalls,
        artifacts: {
            total: {
                fileCount: values.fileCount,
                bytes: values.bytes,
            },
        },
        quality: { pass: values.quality },
    };
    return {
        id,
        name: id,
        creation: structuredClone(phase),
        revision: structuredClone(phase),
    };
}

test("metricDelta computes candidate-minus-baseline values", () => {
    assert.deepEqual(metricDelta(40, 30), { absolute: -10, percent: -25 });
    assert.deepEqual(metricDelta(0, 5), { absolute: 5, percent: null });
    assert.deepEqual(metricDelta(null, 5), { absolute: null, percent: null });
});

test("compareRuns covers required metrics and quality regressions", () => {
    const baseline = run("baseline", {
        elapsedSeconds: 10,
        nanoAiu: 100,
        peakContextTokens: 20,
        outputTokens: 30,
        toolCalls: 4,
        fileCount: 1,
        bytes: 200,
        quality: true,
    });
    const candidate = run("candidate", {
        elapsedSeconds: 12,
        nanoAiu: 125,
        peakContextTokens: 30,
        outputTokens: 27,
        toolCalls: 3,
        fileCount: 2,
        bytes: null,
        quality: false,
    });

    const comparison = compareRuns(baseline, candidate);
    assert.deepEqual(comparison.phases.creation.elapsedSeconds, {
        baseline: 10,
        candidate: 12,
        absolute: 2,
        percent: 20,
    });
    assert.deepEqual(comparison.phases.revision.toolCalls, {
        baseline: 4,
        candidate: 3,
        absolute: -1,
        percent: -25,
    });
    assert.deepEqual(comparison.phases.creation.bytes, {
        baseline: 200,
        candidate: null,
        absolute: null,
        percent: null,
    });
    assert.deepEqual(comparison.phases.creation.quality, {
        baseline: true,
        candidate: false,
        change: "regression",
    });
    assert.match(renderComparison(baseline, candidate), /creation \| Quality .* regression/);
});

test("loadRuns accepts result documents and rejects duplicate ids", async () => {
    const directory = await mkdtemp(join(tmpdir(), "compare-runs-"));
    const path = join(directory, "runs.json");
    const fixture = run("one", {
        elapsedSeconds: 1,
        nanoAiu: 1,
        peakContextTokens: 1,
        outputTokens: 1,
        toolCalls: 1,
        fileCount: 1,
        bytes: 1,
        quality: true,
    });
    try {
        await writeFile(path, JSON.stringify({ runs: [fixture] }));
        assert.equal((await loadRuns([path])).length, 1);
        await assert.rejects(() => loadRuns([path, path]), /Duplicate run id/);
    } finally {
        await rm(directory, { recursive: true });
    }
});

test("CLI reads a run-result file and prints both phases", async () => {
    const directory = await mkdtemp(join(tmpdir(), "compare-runs-cli-"));
    const path = join(directory, "runs.json");
    const values = {
        elapsedSeconds: 2,
        nanoAiu: 3,
        peakContextTokens: 4,
        outputTokens: 5,
        toolCalls: 6,
        fileCount: 1,
        bytes: 10,
        quality: true,
    };
    try {
        await writeFile(path, JSON.stringify({
            runs: [run("baseline", values), run("candidate", {
                ...values,
                elapsedSeconds: 3,
            })],
        }));
        const result = spawnSync(
            process.execPath,
            ["benchmarks/scripts/compare-runs.mjs", path],
            { encoding: "utf8" },
        );
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /creation \| Elapsed time \(s\) \| 2 \| 3 \| \+1 \| \+50%/);
        assert.match(result.stdout, /revision \| Bytes/);
    } finally {
        await rm(directory, { recursive: true });
    }
});
