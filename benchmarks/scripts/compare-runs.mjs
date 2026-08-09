import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const METRICS = [
    ["elapsedSeconds", "Elapsed time (s)", (phase) => phase.elapsedSeconds],
    ["nanoAiu", "Nano AIU", (phase) => phase.nanoAiu],
    ["peakContextTokens", "Peak context", (phase) => phase.peakContextTokens],
    ["outputTokens", "Output tokens", (phase) => phase.outputTokens],
    ["toolCalls", "Tool calls", (phase) => phase.toolCalls],
    ["fileCount", "File count", (phase) => phase.artifacts?.total?.fileCount],
    ["bytes", "Bytes", (phase) => phase.artifacts?.total?.bytes],
    ["quality", "Quality", (phase) => phase.quality?.pass],
];

function assertRun(run, source) {
    if (!run || typeof run !== "object" || Array.isArray(run)) {
        throw new TypeError(`${source} must contain a run object`);
    }
    if (typeof run.id !== "string" || typeof run.name !== "string") {
        throw new TypeError(`${source} run requires string id and name`);
    }
    for (const phase of ["creation", "revision"]) {
        if (!run[phase] || typeof run[phase] !== "object") {
            throw new TypeError(`${source} run ${run.id} requires ${phase}`);
        }
    }
}

export function runsFromDocument(document, source = "input") {
    const runs = Array.isArray(document)
        ? document
        : Array.isArray(document?.runs)
            ? document.runs
            : [document];
    for (const run of runs) {
        assertRun(run, source);
    }
    return runs;
}

export function metricDelta(baseline, candidate) {
    if (
        typeof baseline !== "number"
        || !Number.isFinite(baseline)
        || typeof candidate !== "number"
        || !Number.isFinite(candidate)
    ) {
        return { absolute: null, percent: null };
    }
    const absolute = candidate - baseline;
    return {
        absolute,
        percent: baseline === 0 ? null : (absolute / baseline) * 100,
    };
}

export function compareRuns(baseline, candidate) {
    const phases = {};
    for (const phaseName of ["creation", "revision"]) {
        const baselinePhase = baseline[phaseName];
        const candidatePhase = candidate[phaseName];
        phases[phaseName] = {};
        for (const [key, , read] of METRICS) {
            const baselineValue = read(baselinePhase);
            const candidateValue = read(candidatePhase);
            phases[phaseName][key] = key === "quality"
                ? {
                    baseline: baselineValue,
                    candidate: candidateValue,
                    change: baselineValue === candidateValue
                        ? "same"
                        : candidateValue
                            ? "improvement"
                            : "regression",
                }
                : {
                    baseline: baselineValue ?? null,
                    candidate: candidateValue ?? null,
                    ...metricDelta(baselineValue, candidateValue),
                };
        }
    }
    return {
        baselineRunId: baseline.id,
        candidateRunId: candidate.id,
        interpretation: "candidate minus baseline",
        phases,
    };
}

function formatNumber(value, digits = 2) {
    if (value === null || value === undefined) {
        return "n/a";
    }
    if (Number.isInteger(value)) {
        return String(value);
    }
    return value.toFixed(digits);
}

function signed(value) {
    if (value === null) {
        return "n/a";
    }
    return `${value >= 0 ? "+" : ""}${formatNumber(value)}`;
}

export function renderComparison(baseline, candidate) {
    const comparison = compareRuns(baseline, candidate);
    const lines = [
        `${candidate.name} vs ${baseline.name}`,
        "Phase | Metric | Baseline | Candidate | Delta | Delta %",
        "--- | --- | ---: | ---: | ---: | ---:",
    ];

    for (const phaseName of ["creation", "revision"]) {
        for (const [key, label] of METRICS) {
            const metric = comparison.phases[phaseName][key];
            if (key === "quality") {
                lines.push([
                    phaseName,
                    label,
                    metric.baseline ? "pass" : "fail",
                    metric.candidate ? "pass" : "fail",
                    metric.change,
                    "n/a",
                ].join(" | "));
                continue;
            }
            lines.push([
                phaseName,
                label,
                formatNumber(metric.baseline),
                formatNumber(metric.candidate),
                signed(metric.absolute),
                metric.percent === null ? "n/a" : `${signed(metric.percent)}%`,
            ].join(" | "));
        }
    }
    return lines.join("\n");
}

export async function loadRuns(paths) {
    const runs = [];
    for (const path of paths) {
        const document = JSON.parse(await readFile(path, "utf8"));
        runs.push(...runsFromDocument(document, path));
    }
    const ids = new Set();
    for (const run of runs) {
        if (ids.has(run.id)) {
            throw new Error(`Duplicate run id: ${run.id}`);
        }
        ids.add(run.id);
    }
    return runs;
}

export async function main(args) {
    const baselineIndex = args.indexOf("--baseline");
    const baselineId = baselineIndex === -1 ? null : args[baselineIndex + 1];
    if (baselineIndex !== -1 && !baselineId) {
        throw new Error("--baseline requires a run id");
    }
    const paths = baselineIndex === -1
        ? args
        : args.filter((argument, index) => (
            index !== baselineIndex && index !== baselineIndex + 1
        ));
    if (paths.length === 0) {
        throw new Error(
            "Usage: node compare-runs.mjs [--baseline RUN_ID] RUN_RESULT.json [...]",
        );
    }

    const runs = await loadRuns(paths);
    if (runs.length < 2) {
        throw new Error("At least two runs are required for comparison");
    }
    const baseline = baselineId
        ? runs.find((run) => run.id === baselineId)
        : runs[0];
    if (!baseline) {
        throw new Error(`Baseline run not found: ${baselineId}`);
    }
    const candidates = runs.filter((run) => run !== baseline);
    process.stdout.write(
        `${candidates.map((run) => renderComparison(baseline, run)).join("\n\n")}\n`,
    );
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
    main(process.argv.slice(2)).catch((error) => {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 1;
    });
}
