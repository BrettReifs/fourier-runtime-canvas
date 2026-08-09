import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { compareRuns } from "./compare-runs.mjs";

const DATASET_PATH = "benchmarks/datasets/vscode-arch-benchmark-v1.json";
const RESULTS_PATH = "benchmarks/pilot-01/results.json";
const MAX_DATASET_BYTES = 20 * 1024;

function assertFiniteNonNegative(value, label, { nullable = false } = {}) {
    if (nullable && value === null) {
        return;
    }
    assert.equal(typeof value, "number", `${label} must be a number`);
    assert(Number.isFinite(value) && value >= 0, `${label} must be finite and non-negative`);
}

function validateDataset(dataset, byteLength) {
    assert(byteLength < MAX_DATASET_BYTES, "dataset must be smaller than 20 KiB");
    assert.equal(dataset._meta?.datasetId, "vscode-arch-benchmark-v1");
    assert.equal(dataset._meta?.encoding, "tuple-v1");
    assert.match(dataset._meta?.extractedBlockSha256, /^[a-f0-9]{64}$/);
    assert.deepEqual(dataset._meta.schemas.nodes, [
        "id", "label", "group", "responsibility", "derivation", "sourceRefs",
    ]);
    assert.deepEqual(dataset._meta.schemas.edges, [
        "id", "source", "target", "relation", "derivation", "note", "sourceRef",
    ]);
    assert.deepEqual(dataset._meta.schemas.changeEvents, [
        "sequence", "affectedNodeIds", "changeType", "description", "version",
        "sourceRef", "derivation", "note",
    ]);
    assert.equal(dataset.nodes.length, 20);
    assert.equal(dataset.edges.length, 38);
    assert.equal(dataset.changeEvents.length, 10);

    const nodeIds = new Set();
    const citationCount = dataset._meta.citations.length;
    for (const node of dataset.nodes) {
        assert.equal(node.length, 6);
        assert(!nodeIds.has(node[0]), `duplicate node id: ${node[0]}`);
        nodeIds.add(node[0]);
        assert(["direct", "inferred"].includes(node[4]));
        assert(node[5].length > 0);
        assert(node[5].every((ref) => (
            Number.isInteger(ref) && ref >= 0 && ref < citationCount
        )));
    }
    for (const edge of dataset.edges) {
        assert.equal(edge.length, 7);
        assert(nodeIds.has(edge[1]), `unknown edge source: ${edge[1]}`);
        assert(nodeIds.has(edge[2]), `unknown edge target: ${edge[2]}`);
        assert(["direct", "inferred"].includes(edge[4]));
        assert(Number.isInteger(edge[6]) && edge[6] >= 0 && edge[6] < citationCount);
    }
    dataset.changeEvents.forEach((event, index) => {
        assert.equal(event.length, 8);
        assert.equal(event[0], index + 1);
        assert(event[1].every((id) => nodeIds.has(id)));
        assert(["direct", "inferred"].includes(event[6]));
        assert(Number.isInteger(event[5]) && event[5] >= 0 && event[5] < citationCount);
    });
    for (const [baseIndex, suffix] of dataset._meta.citations) {
        assert(Number.isInteger(baseIndex) && baseIndex >= 0);
        assert(baseIndex < dataset._meta.citationBases.length);
        assert.equal(typeof suffix, "string");
        assert(suffix.length > 0);
    }
}

function validatePhase(phase, label) {
    for (const key of [
        "elapsedSeconds", "modelCalls", "summedInputTokens", "peakContextTokens",
        "outputTokens", "modelDurationMs", "nanoAiu", "toolCalls",
    ]) {
        assertFiniteNonNegative(phase[key], `${label}.${key}`);
    }
    assertFiniteNonNegative(phase.artifacts.total.fileCount, `${label}.artifacts.fileCount`);
    assertFiniteNonNegative(
        phase.artifacts.total.bytes,
        `${label}.artifacts.bytes`,
        { nullable: true },
    );
    assert.equal(typeof phase.quality.pass, "boolean");
    assert(
        phase.quality.humanScore === null
        || (
            Number.isInteger(phase.quality.humanScore)
            && phase.quality.humanScore >= 1
            && phase.quality.humanScore <= 5
        ),
    );
}

function roundComparison(comparison) {
    return structuredClone(comparison, {
        transfer: [],
    });
}

function normalizeNumbers(value) {
    if (Array.isArray(value)) {
        return value.map(normalizeNumbers);
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, child]) => [key, normalizeNumbers(child)]),
        );
    }
    return typeof value === "number" && !Number.isInteger(value)
        ? Number(value.toFixed(2))
        : value;
}

function validateResults(results) {
    assert.equal(results.schemaVersion, 1);
    assert.equal(results.pilotId, "pilot-01");
    assert.match(results.measurementNotes.summedInputTokens, /double-count/i);
    assert.match(results.measurementNotes.peakContextTokens, /context-growth/i);
    assert.equal(results.runs.length, 2);
    for (const run of results.runs) {
        assert.equal(run.model, "GPT-5.6 Sol");
        assert.equal(run.reasoningEffort, "high");
        validatePhase(run.creation, `${run.id}.creation`);
        validatePhase(run.revision, `${run.id}.revision`);
    }
    const baseline = results.runs.find(
        (run) => run.id === results.comparisons.baselineRunId,
    );
    const candidate = results.runs.find(
        (run) => run.id === results.comparisons.candidateRunId,
    );
    assert(baseline && candidate);
    const computed = normalizeNumbers(roundComparison(compareRuns(baseline, candidate)));
    assert.deepEqual(results.comparisons, computed);
}

const datasetBuffer = await readFile(DATASET_PATH);
const dataset = JSON.parse(datasetBuffer.toString("utf8"));
validateDataset(dataset, datasetBuffer.byteLength);

const results = JSON.parse(await readFile(RESULTS_PATH, "utf8"));
validateResults(results);

process.stdout.write(
    `Benchmarks valid: ${dataset.nodes.length} nodes, ${dataset.edges.length} edges, `
    + `${dataset.changeEvents.length} change events, ${datasetBuffer.byteLength} bytes.\n`,
);
