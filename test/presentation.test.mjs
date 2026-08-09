import assert from "node:assert/strict";
import test from "node:test";

import {
    KPI_CREATE_SCHEMA,
    KPI_PATCH_SCHEMA,
    KPI_PRESENTATION_LIMITS,
    KPI_SYNC_SCHEMA,
    createKpiComposition,
    patchKpiComposition,
    presentationMutationSummary,
    presentationSummary,
    responsiveSceneLayout,
    semanticLayerFingerprint,
    syncKpiComposition,
} from "../extensions/fourier-runtime-canvas/presentation.mjs";
import {
    normalizeComposition,
    validateCompositionComplexity,
} from "../extensions/fourier-runtime-canvas/composition.mjs";
import {
    createHistory,
    recordHistory,
    redoHistory,
    undoHistory,
} from "../extensions/fourier-runtime-canvas/history.mjs";

const SPEC = {
    sceneId: "quarterly-kpis",
    name: "Quarterly KPIs",
    title: "Revenue by region",
    duration: 8,
    values: [
        { id: "north", label: "North", value: 72, color: "#2f81f7" },
        { id: "south", label: "South", value: 48, color: "#a371f7" },
    ],
    maxValue: 100,
    aspectRatio: "16:9",
    style: "editorial",
    palette: {
        background: "#0d1117",
        surface: "#161b22",
        text: "#f0f6fc",
        muted: "#8b949e",
        axis: "#30363d",
        threshold: "#f85149",
        accent: "#2f81f7",
    },
    entry: {
        mode: "rise",
        start: 0.4,
        duration: 0.8,
        stagger: 0.12,
        easing: "ease-out",
    },
    emphasis: { mode: "highest", pulse: false },
    axis: { show: true, label: "Revenue", ticks: 5 },
    threshold: {
        show: true,
        value: 60,
        label: "Target",
        color: "#f85149",
    },
    audio: {
        enabled: true,
        triggerTime: 0.4,
        baseFrequency: 220,
        gain: 0.04,
        duration: 0.16,
    },
};

test("KPI creation produces explicit, editable semantic layers without assets", () => {
    const composition = createKpiComposition(SPEC, { revision: 4 });

    assert.equal(composition.revision, 4);
    assert.equal(composition.presentation.title, "Revenue by region");
    assert.deepEqual(composition.presentation.palette, SPEC.palette);
    assert.deepEqual(
        composition.layers.map(({ id, name, type }) => ({ id, name, type })),
        [
            { id: "quarterly-kpis-title", name: "Presentation title", type: "text" },
            { id: "quarterly-kpis-bars", name: "KPI bars", type: "bar-chart" },
            { id: "quarterly-kpis-threshold", name: "Target threshold", type: "line" },
        ],
    );
    assert(composition.layers.every((layer) => !("assetId" in layer)));
    assert(composition.layers.every((layer) => !("coefficients" in layer)));
    assert.match(composition.presentation.accessibleSummary, /North 72/);
    assert.match(composition.presentation.accessibleSummary, /target 60/i);
});

test("KPI patches are revision-bound and preserve deterministic layer identities", () => {
    const current = createKpiComposition(SPEC, { revision: 7 });
    assert.throws(
        () => patchKpiComposition(current, {
            expectedRevision: 6,
            title: "Stale",
        }),
        /revision is stale/i,
    );

    const patched = patchKpiComposition(current, {
        expectedRevision: 7,
        title: "Updated revenue",
        values: {
            update: [{ id: "north", value: 80, label: "North America" }],
            add: [{ id: "west", label: "West", value: 64, color: "#3fb950" }],
            remove: ["south"],
            order: ["west", "north"],
        },
        threshold: { show: true, value: 65, label: "Plan", color: "#d29922" },
    });

    assert.equal(patched.revision, 7);
    assert.equal(patched.presentation.title, "Updated revenue");
    assert.deepEqual(
        patched.layers.find((layer) => layer.type === "bar-chart")
            .semantic.values.map((value) => value.id),
        ["west", "north"],
    );
    assert.deepEqual(
        patched.layers.map((layer) => layer.id),
        current.layers.map((layer) => layer.id),
    );
    assert(patched.layers.every((layer) => !("assetId" in layer)));
});

test("presentation summaries remain compact and never expose composition payloads", () => {
    const composition = createKpiComposition(SPEC, { revision: 2 });
    const summary = presentationSummary(composition, {
        assetCount: 3,
        assetBytes: 4096,
        compositionBytes: 1800,
        historyBytes: 7200,
        changedLayerIds: composition.layers.map((layer) => layer.id),
        warnings: [],
    });
    const serialized = JSON.stringify(summary);

    assert(serialized.length < 2048);
    assert.equal(summary.revision, 2);
    assert.equal(summary.changedLayerCount, 3);
    assert.equal(summary.artifacts.frequencyAssetCount, 3);
    assert(!serialized.includes("coefficients"));
    assert(!serialized.includes("\"composition\""));
    assert(!serialized.includes("\"semantic\""));

    const mutationSummary = presentationMutationSummary(composition, {
        assetBytes: 4096,
        compositionBytes: 1800,
        historyBytes: 7200,
        changedLayerIds: ["quarterly-kpis-bars"],
        warnings: [],
    });
    assert.deepEqual(Object.keys(mutationSummary), [
        "revision",
        "changedLayerIds",
        "changedLayerCount",
        "warnings",
        "persistedBytes",
    ]);
    assert(!JSON.stringify(mutationSummary).includes("Revenue by region"));
});

test("responsive layout preserves scene aspect ratio and one shared bar scale", () => {
    const wide = responsiveSceneLayout(1600, 900, "16:9", 100, 2);
    const narrow = responsiveSceneLayout(360, 720, "16:9", 100, 2);
    const fourThree = responsiveSceneLayout(1200, 900, "4:3", 100, 2);

    assert.equal(wide.scene.width / wide.scene.height, 16 / 9);
    assert.equal(fourThree.scene.width / fourThree.scene.height, 4 / 3);
    assert.equal(narrow.scene.width / narrow.scene.height, 16 / 9);
    assert(narrow.scene.top > 0, "A narrow viewport should letterbox the scene safely.");
    assert.equal(wide.valueScale(50), wide.plot.height / 2);
    assert.equal(wide.valueScale(100), wide.plot.height);
    assert.equal(wide.bars.length, 2);
    assert(wide.safe.left > wide.scene.left);
});

test("semantic aggregate limits reject oversized presentations", () => {
    assert.throws(() => createKpiComposition({
        ...SPEC,
        values: Array.from(
            { length: KPI_PRESENTATION_LIMITS.maxValues + 1 },
            (_, index) => ({
                id: `value-${index}`,
                label: `Value ${index}`,
                value: index,
                color: "#2f81f7",
            }),
        ),
    }), /at most .* values/i);
    assert.throws(() => createKpiComposition({
        ...SPEC,
        sceneId: "a".repeat(111),
    }), /Scene ID must contain at most 110 characters/);
});

test("normalized compositions support hybrid semantic and Fourier layers", () => {
    const semantic = createKpiComposition(SPEC, { revision: 1 });
    const hybrid = normalizeComposition({
        ...semantic,
        layers: [
            ...semantic.layers,
            {
                id: "brand-mark",
                name: "Brand mark",
                type: "fourier",
                assetId: "mark-asset",
                start: 0,
                end: semantic.duration,
                zIndex: 5,
                keyframes: [
                    { time: 0, opacity: 0, reveal: 0 },
                    { time: 1, opacity: 1, reveal: 1 },
                ],
            },
        ],
    }, new Set(["mark-asset"]));
    const assets = new Map([["mark-asset", {
        strokes: [{ coefficients: [{ frequency: 0 }] }],
    }]]);

    assert.deepEqual(
        hybrid.layers.map((layer) => layer.type),
        ["text", "bar-chart", "line", "fourier"],
    );
    assert.equal(hybrid.layers.at(-1).assetId, "mark-asset");
    assert.doesNotThrow(() => validateCompositionComplexity(hybrid, assets));

    const patched = patchKpiComposition(hybrid, {
        expectedRevision: 1,
        title: "Hybrid KPI update",
    });
    assert.equal(patched.layers.find((layer) => layer.id === "brand-mark").assetId, "mark-asset");
    assert.deepEqual(
        patched.layers.map((layer) => layer.id),
        hybrid.layers.map((layer) => layer.id),
    );

    const shortened = patchKpiComposition(hybrid, {
        expectedRevision: 1,
        duration: 0.75,
    });
    const fittedMark = shortened.layers.find((layer) => layer.id === "brand-mark");
    assert.equal(fittedMark.end, 0.75);
    assert(fittedMark.keyframes.every((keyframe) => keyframe.time <= 0.75));

    const lateEntry = createKpiComposition({
        ...SPEC,
        entry: { ...SPEC.entry, start: 7 },
        audio: { ...SPEC.audio, triggerTime: 7 },
    }, { revision: 2 });
    assert.doesNotThrow(() => patchKpiComposition(lateEntry, {
        expectedRevision: 2,
        duration: 1,
    }));
});

test("KPI patches resolve the deterministic owned chart in hybrid scenes", () => {
    const semantic = createKpiComposition(SPEC, { revision: 3 });
    const unrelatedChart = {
        ...structuredClone(semantic.layers.find((layer) => layer.type === "bar-chart")),
        id: "comparison-bars",
        name: "Comparison bars",
        semantic: {
            ...structuredClone(semantic.layers.find((layer) => layer.type === "bar-chart").semantic),
            values: [{ id: "other", label: "Other", value: 1, color: "#ffffff" }],
        },
    };
    const hybrid = {
        ...semantic,
        layers: [unrelatedChart, ...semantic.layers],
    };

    const patched = patchKpiComposition(hybrid, {
        expectedRevision: 3,
        title: "Owned chart update",
    });
    const owned = patched.layers.find((layer) => layer.id === "quarterly-kpis-bars");
    assert.deepEqual(owned.semantic.values.map((value) => value.id), ["north", "south"]);
    assert.equal(patched.layers[0].id, "comparison-bars");
});

test("KPI patches preserve foreign layers that collide with an absent threshold ID", () => {
    const semantic = createKpiComposition({
        ...SPEC,
        threshold: { ...SPEC.threshold, show: false },
    }, { revision: 5 });
    const foreign = {
        id: "quarterly-kpis-threshold",
        name: "Fourier threshold flourish",
        type: "fourier",
        assetId: "flourish",
        start: 0,
        end: 8,
        zIndex: 40,
        keyframes: [],
    };
    const hybrid = { ...semantic, layers: [...semantic.layers, foreign] };
    const patched = patchKpiComposition(hybrid, {
        expectedRevision: 5,
        title: "Keep flourish",
    });

    assert.equal(patched.layers.at(-1).assetId, "flourish");
});

test("semantic action schemas are strict and revision-bound", () => {
    assert.equal(KPI_CREATE_SCHEMA.additionalProperties, false);
    assert.equal(KPI_CREATE_SCHEMA.properties.values.maxItems, 32);
    assert.equal(KPI_CREATE_SCHEMA.properties.values.items.additionalProperties, false);
    assert.deepEqual(KPI_PATCH_SCHEMA.required, ["expectedRevision"]);
    assert.equal(KPI_PATCH_SCHEMA.additionalProperties, false);
    assert.equal(KPI_PATCH_SCHEMA.properties.values.additionalProperties, false);
    assert.deepEqual(KPI_SYNC_SCHEMA.required, ["expectedRevision"]);
    assert.equal(KPI_SYNC_SCHEMA.additionalProperties, false);
});

test("semantic patches do not create asset payloads and support undo and redo", () => {
    const original = createKpiComposition(SPEC, { revision: 0 });
    const patched = patchKpiComposition(original, {
        expectedRevision: 0,
        title: "Revised title",
    });
    patched.revision = 1;
    const history = createHistory();

    assert.equal(recordHistory(history, original, patched), true);
    assert.equal(JSON.stringify(patched).includes("assetId"), false);
    assert.equal(JSON.stringify(patched).includes("coefficients"), false);
    const undone = undoHistory(history, patched);
    assert.equal(undone.presentation.title, SPEC.title);
    const redone = redoHistory(history, undone);
    assert.equal(redone.presentation.title, "Revised title");
});

test("compact patches reject low-level semantic drift until explicit reconciliation", () => {
    const original = createKpiComposition(SPEC, { revision: 8 });
    assert.equal(
        original.presentation.semanticLayerFingerprint,
        semanticLayerFingerprint(original),
    );
    const lowLevel = structuredClone(original);
    lowLevel.layers.find((layer) => layer.type === "text").semantic.text =
        "Edited through low-level composition";

    assert.throws(
        () => patchKpiComposition(lowLevel, {
            expectedRevision: 8,
            duration: 9,
        }),
        (error) => (
            error.code === "semantic_drift"
            && /sync_kpi_presentation/.test(error.message)
            && error.warnings.length === 1
        ),
    );

    const reconciled = syncKpiComposition(lowLevel, { expectedRevision: 8 });
    assert.equal(
        reconciled.presentation.title,
        "Edited through low-level composition",
    );
    assert.equal(
        reconciled.presentation.semanticLayerFingerprint,
        semanticLayerFingerprint(reconciled),
    );
    const patched = patchKpiComposition(reconciled, {
        expectedRevision: 8,
        duration: 9,
    });
    assert.equal(patched.duration, 9);
    assert.equal(patched.presentation.title, "Edited through low-level composition");
});

test("Fourier overlay edits do not trigger semantic ownership drift", () => {
    const original = createKpiComposition(SPEC, { revision: 4 });
    const overlay = {
        id: "overlay",
        name: "Overlay",
        type: "fourier",
        assetId: "asset-a",
        start: 0,
        end: 8,
        zIndex: 4,
        motion: {
            enabled: false,
            amount: 0,
            speed: 0.35,
            detail: 3,
            seed: 0,
        },
        audio: {
            enabled: false,
            triggerTime: 0,
            baseFrequency: 220,
            gain: 0.045,
            duration: 0.18,
            partialCount: 5,
        },
        keyframes: [],
    };
    const hybrid = { ...original, layers: [...original.layers, overlay] };
    hybrid.layers.at(-1).zIndex = 12;

    assert.doesNotThrow(() => patchKpiComposition(hybrid, {
        expectedRevision: 4,
        title: "Overlay-safe patch",
    }));
});
