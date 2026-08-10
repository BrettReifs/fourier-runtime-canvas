import { createServer } from "node:http";
import { readdir, readFile, rename, stat } from "node:fs/promises";
import { join } from "node:path";
import {
    CanvasError,
    createCanvas,
    joinSession,
} from "@github/copilot-sdk/extension";
import {
    commitAssetVersion,
    indexedAssetFiles,
    versionedAssetFileName,
} from "./asset-store.mjs";
import {
    FOURIER_LIMITS,
    normalizeFrequencyAsset,
    transformDrawing,
} from "./fourier.mjs";
import {
    buildAssetPreview,
    buildAssetUpdate,
} from "./asset-editor.mjs";
import {
    COMPOSITION_LIMITS,
    createComposition,
    normalizeComposition,
    validateCompositionComplexity,
} from "./composition.mjs";
import {
    KPI_CREATE_SCHEMA,
    KPI_PATCH_SCHEMA,
    KPI_SYNC_SCHEMA,
    createKpiComposition,
    patchKpiComposition,
    presentationMutationSummary,
    presentationSummary,
    presentationWarnings,
    syncKpiComposition,
} from "./presentation.mjs";
import {
    createHistory,
    historyStatus,
    recordHistory,
    redoHistory,
    undoHistory,
} from "./history.mjs";
import { InstanceLifecycle } from "./instance-lifecycle.mjs";
import { renderHtml } from "./renderer.mjs";
import {
    enqueueMutation,
    ensureContainedDirectory,
    initializeWorkspaceEntry,
    jsonStorageBytes,
    writeJsonAtomic,
} from "./mutation-queue.mjs";
import {
    CAPABILITY_HEADER,
    authorizeCanvasRequest,
    contentSecurityPolicy,
    createCapabilityToken,
    createScriptNonce,
} from "./security.mjs";

const MAX_BODY_BYTES = 1024 * 1024;
const MAX_TERMS = 256;
const MAX_SERIES_MAGNITUDE = 1_000_000;
const MAX_HARMONIC = 1_000_000;
const MAX_ASSETS = 128;
const MAX_ASSET_BYTES = MAX_BODY_BYTES;
const MAX_TOTAL_ASSET_BYTES = 64 * 1024 * 1024;
const MAX_SSE_CLIENTS = 8;
const MAX_PERSISTED_COMPOSITION_BYTES = 2 * 1024 * 1024;
const MAX_PERSISTED_HISTORY_BYTES = 8 * 1024 * 1024;
const MAX_PERSISTED_STATE_BYTES = (
    MAX_PERSISTED_COMPOSITION_BYTES
    + MAX_PERSISTED_HISTORY_BYTES
    + 4096
);
const MAX_SSE_PENDING_BYTES = 4 * 1024 * 1024;
const MAX_SSE_BACKPRESSURE_MS = 5000;
const WORKSPACE_STATE_VERSION = 1;
const servers = new Map();
const serverStarts = new Map();
const workspaceEntryRegistry = new Set();
let copilotSession;

const DEFAULT_SERIES = Object.freeze({
    name: "Square wave",
    fundamentalFrequency: 1,
    amplitudeScale: 1,
    terms: Array.from({ length: 8 }, (_, index) => ({
        harmonic: index * 2 + 1,
        amplitude: 4 / (Math.PI * (index * 2 + 1)),
        phase: 0,
    })),
    runtime: {
        playing: true,
        speed: 0.35,
        cycles: 2,
    },
});

const SERIES_SCHEMA = {
    type: "object",
    properties: {
        name: { type: "string", maxLength: 120 },
        preset: {
            type: "string",
            enum: ["square", "sawtooth", "triangle", "sine"],
        },
        fundamentalFrequency: {
            type: "number",
            exclusiveMinimum: 0,
            maximum: MAX_SERIES_MAGNITUDE,
        },
        amplitudeScale: {
            type: "number",
            exclusiveMinimum: 0,
            maximum: MAX_SERIES_MAGNITUDE,
        },
        coefficients: {
            type: "array",
            maxItems: MAX_TERMS,
            items: {
                type: "number",
                minimum: -MAX_SERIES_MAGNITUDE,
                maximum: MAX_SERIES_MAGNITUDE,
            },
        },
        terms: {
            type: "array",
            maxItems: MAX_TERMS,
            items: {
                type: "object",
                required: ["harmonic", "amplitude"],
                properties: {
                    harmonic: { type: "integer", minimum: 1, maximum: MAX_HARMONIC },
                    amplitude: {
                        type: "number",
                        minimum: -MAX_SERIES_MAGNITUDE,
                        maximum: MAX_SERIES_MAGNITUDE,
                    },
                    phase: {
                        type: "number",
                        minimum: -MAX_SERIES_MAGNITUDE,
                        maximum: MAX_SERIES_MAGNITUDE,
                    },
                },
                additionalProperties: false,
            },
        },
        runtime: {
            type: "object",
            properties: {
                playing: { type: "boolean" },
                speed: { type: "number", minimum: 0, maximum: 10 },
                cycles: { type: "number", minimum: 0.25, maximum: 20 },
            },
            additionalProperties: false,
        },
    },
    additionalProperties: false,
};

const POINT_SCHEMA = {
    type: "object",
    required: ["x", "y"],
    properties: {
        x: {
            type: "number",
            minimum: -FOURIER_LIMITS.maxCoordinateMagnitude,
            maximum: FOURIER_LIMITS.maxCoordinateMagnitude,
        },
        y: {
            type: "number",
            minimum: -FOURIER_LIMITS.maxCoordinateMagnitude,
            maximum: FOURIER_LIMITS.maxCoordinateMagnitude,
        },
    },
    additionalProperties: false,
};

const TRANSFORM_SCHEMA = {
    type: "object",
    required: ["strokes"],
    properties: {
        name: { type: "string", maxLength: 120 },
        termLimit: {
            type: "integer",
            minimum: 4,
            maximum: FOURIER_LIMITS.maxAssetTerms,
        },
        strokes: {
            type: "array",
            minItems: 1,
            maxItems: FOURIER_LIMITS.maxStrokes,
            items: {
                type: "object",
                required: ["points"],
                properties: {
                    closed: { type: "boolean" },
                    points: {
                        type: "array",
                        minItems: 2,
                        maxItems: FOURIER_LIMITS.maxPointsPerStroke,
                        items: POINT_SCHEMA,
                    },
                },
                additionalProperties: false,
            },
        },
        runtime: {
            type: "object",
            properties: {
                duration: { type: "number", minimum: 0.5, maximum: 60 },
                showEpicycles: { type: "boolean" },
            },
            additionalProperties: false,
        },
    },
    additionalProperties: false,
};

const FREQUENCY_ASSET_SCHEMA = {
    type: "object",
    required: ["format", "strokes"],
    properties: {
        id: { type: "string", maxLength: 120 },
        format: { const: "fourier-path/v1" },
        name: { type: "string", maxLength: 120 },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
        revision: { type: "integer", minimum: 0 },
        coordinateSystem: { type: "string" },
        strokeCount: { type: "integer", minimum: 1 },
        termLimit: { type: "integer", minimum: 1, maximum: FOURIER_LIMITS.maxAssetTerms },
        strokes: {
            type: "array",
            minItems: 1,
            maxItems: FOURIER_LIMITS.maxStrokes,
            items: {
                type: "object",
                required: ["coefficients"],
                properties: {
                    closed: { type: "boolean" },
                    sampleCount: { type: "integer", minimum: 8, maximum: 4096 },
                    coefficients: {
                        type: "array",
                        minItems: 1,
                        maxItems: FOURIER_LIMITS.maxAssetTerms,
                        items: {
                            type: "object",
                            required: ["frequency", "amplitude", "phase"],
                            properties: {
                                frequency: {
                                    type: "integer",
                                    minimum: -FOURIER_LIMITS.maxFrequencyMagnitude,
                                    maximum: FOURIER_LIMITS.maxFrequencyMagnitude,
                                },
                                amplitude: {
                                    type: "number",
                                    minimum: 0,
                                    maximum: FOURIER_LIMITS.maxCoefficientAmplitude,
                                },
                                phase: {
                                    type: "number",
                                    minimum: -FOURIER_LIMITS.maxPhaseMagnitude,
                                    maximum: FOURIER_LIMITS.maxPhaseMagnitude,
                                },
                            },
                            additionalProperties: false,
                        },
                    },
                },
                additionalProperties: false,
            },
        },
        runtime: {
            type: "object",
            properties: {
                duration: { type: "number", minimum: 0.5, maximum: 60 },
                showEpicycles: { type: "boolean" },
            },
            additionalProperties: false,
        },
    },
    additionalProperties: false,
};

const KEYFRAME_SCHEMA = {
    type: "object",
    required: ["time"],
    properties: {
        time: { type: "number", minimum: 0, maximum: 300 },
        assetId: { type: "string", maxLength: 120 },
        matteAssetId: { type: "string", maxLength: 120 },
        x: { type: "number", minimum: -2, maximum: 2 },
        y: { type: "number", minimum: -2, maximum: 2 },
        scale: { type: "number", minimum: 0, maximum: 10 },
        rotation: {
            type: "number",
            minimum: -COMPOSITION_LIMITS.maxRotationMagnitude,
            maximum: COMPOSITION_LIMITS.maxRotationMagnitude,
        },
        opacity: { type: "number", minimum: 0, maximum: 1 },
        reveal: { type: "number", minimum: 0, maximum: 1 },
        easing: {
            type: "string",
            enum: ["linear", "ease-in", "ease-out", "ease-in-out"],
        },
    },
    additionalProperties: false,
};

const PRESENTATION_PALETTE_SCHEMA = {
    type: "object",
    required: ["background", "surface", "text", "muted", "axis", "threshold", "accent"],
    properties: {
        background: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
        surface: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
        text: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
        muted: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
        axis: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
        threshold: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
        accent: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
    },
    additionalProperties: false,
};

const PRESENTATION_ENTRY_SCHEMA = {
    type: "object",
    required: ["mode", "start", "duration", "stagger", "easing"],
    properties: {
        mode: { type: "string", enum: ["rise", "fade", "none"] },
        start: { type: "number", minimum: 0, maximum: 300 },
        duration: { type: "number", minimum: 0, maximum: 10 },
        stagger: { type: "number", minimum: 0, maximum: 5 },
        easing: {
            type: "string",
            enum: ["linear", "ease-in", "ease-out", "ease-in-out"],
        },
    },
    additionalProperties: false,
};

const PRESENTATION_EMPHASIS_SCHEMA = {
    type: "object",
    required: ["mode", "pulse"],
    properties: {
        mode: { type: "string", enum: ["none", "highest", "threshold"] },
        pulse: { type: "boolean" },
    },
    additionalProperties: false,
};

const PRESENTATION_AXIS_SCHEMA = {
    type: "object",
    required: ["show", "label", "ticks"],
    properties: {
        show: { type: "boolean" },
        label: { type: "string", maxLength: 80 },
        ticks: { type: "integer", minimum: 2, maximum: 10 },
    },
    additionalProperties: false,
};

const PRESENTATION_AUDIO_SCHEMA = {
    type: "object",
    required: ["enabled", "triggerTime", "baseFrequency", "gain", "duration"],
    properties: {
        enabled: { type: "boolean" },
        triggerTime: { type: "number", minimum: 0, maximum: 300 },
        baseFrequency: { type: "number", minimum: 40, maximum: 1200 },
        gain: { type: "number", minimum: 0, maximum: 0.2 },
        duration: { type: "number", minimum: 0.03, maximum: 2 },
    },
    additionalProperties: false,
};

const SEMANTIC_ANIMATION_SCHEMA = {
    type: "object",
    required: [
        "mode",
        "start",
        "duration",
        "stagger",
        "easing",
        "staggerIndex",
        "emphasis",
    ],
    properties: {
        ...PRESENTATION_ENTRY_SCHEMA.properties,
        staggerIndex: {
            type: "integer",
            minimum: 0,
            maximum: COMPOSITION_LIMITS.maxSemanticValues,
        },
        emphasis: PRESENTATION_EMPHASIS_SCHEMA,
    },
    additionalProperties: false,
};

const COMPOSITION_SCHEMA = {
    type: "object",
    required: ["format", "revision", "layers"],
    properties: {
        id: { type: "string", maxLength: 120 },
        format: { const: "fourier-composition/v1" },
        revision: { type: "integer", minimum: 0 },
        name: { type: "string", maxLength: 120 },
        duration: { type: "number", minimum: 0.5, maximum: 300 },
        updatedAt: { type: "string" },
        presentation: {
            type: "object",
            required: [
                "title",
                "aspectRatio",
                "style",
                "palette",
                "safeArea",
                "entry",
                "emphasis",
                "axis",
                "threshold",
                "audio",
                "accessibleSummary",
                "semanticLayerFingerprint",
            ],
            properties: {
                title: { type: "string", minLength: 1, maxLength: 160 },
                aspectRatio: { type: "string", enum: ["16:9", "4:3", "9:16"] },
                style: { type: "string", enum: ["editorial", "technical", "minimal"] },
                palette: PRESENTATION_PALETTE_SCHEMA,
                safeArea: { type: "number", minimum: 0.04, maximum: 0.15 },
                entry: PRESENTATION_ENTRY_SCHEMA,
                emphasis: PRESENTATION_EMPHASIS_SCHEMA,
                axis: PRESENTATION_AXIS_SCHEMA,
                threshold: {
                    type: "object",
                    required: ["show", "value", "label", "color"],
                    properties: {
                        show: { type: "boolean" },
                        value: { type: "number", minimum: 0, maximum: 1_000_000_000 },
                        label: { type: "string", maxLength: 80 },
                        color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
                    },
                    additionalProperties: false,
                },
                audio: PRESENTATION_AUDIO_SCHEMA,
                accessibleSummary: { type: "string", minLength: 1, maxLength: 1200 },
                semanticLayerFingerprint: {
                    type: "string",
                    pattern: "^[0-9a-f]{64}$",
                },
            },
            additionalProperties: false,
        },
        layers: {
            type: "array",
            maxItems: COMPOSITION_LIMITS.maxLayers,
            items: {
                type: "object",
                properties: {
                    id: { type: "string", maxLength: 120 },
                    name: { type: "string", maxLength: 120 },
                    type: {
                        type: "string",
                        enum: ["fourier", "text", "bar-chart", "line"],
                    },
                    assetId: { type: "string", maxLength: 120 },
                    matteAssetId: { type: "string", maxLength: 120 },
                    mattePadding: {
                        type: "number",
                        minimum: 0,
                        maximum: COMPOSITION_LIMITS.maxMattePadding,
                    },
                    occludes: {
                        type: "object",
                        properties: {
                            layerIds: {
                                type: "array",
                                uniqueItems: true,
                                items: { type: "string", maxLength: 120 },
                            },
                            zIndices: {
                                type: "array",
                                uniqueItems: true,
                                items: {
                                    type: "integer",
                                    minimum: -COMPOSITION_LIMITS.maxZIndexMagnitude,
                                    maximum: COMPOSITION_LIMITS.maxZIndexMagnitude,
                                },
                            },
                        },
                        additionalProperties: false,
                    },
                    start: { type: "number", minimum: 0, maximum: 300 },
                    end: { type: "number", minimum: 0, maximum: 300 },
                    zIndex: {
                        type: "integer",
                        minimum: -COMPOSITION_LIMITS.maxZIndexMagnitude,
                        maximum: COMPOSITION_LIMITS.maxZIndexMagnitude,
                    },
                    motion: {
                        type: "object",
                        properties: {
                            enabled: { type: "boolean" },
                            amount: { type: "number", minimum: 0, maximum: 0.08 },
                            speed: { type: "number", minimum: 0, maximum: 5 },
                            detail: { type: "number", minimum: 0.25, maximum: 20 },
                            seed: {
                                type: "number",
                                minimum: -COMPOSITION_LIMITS.maxSeedMagnitude,
                                maximum: COMPOSITION_LIMITS.maxSeedMagnitude,
                            },
                        },
                        additionalProperties: false,
                    },
                    audio: {
                        type: "object",
                        properties: {
                            enabled: { type: "boolean" },
                            triggerTime: { type: "number", minimum: 0, maximum: 300 },
                            baseFrequency: { type: "number", minimum: 40, maximum: 1200 },
                            gain: { type: "number", minimum: 0, maximum: 0.2 },
                            duration: { type: "number", minimum: 0.03, maximum: 2 },
                            partialCount: { type: "integer", minimum: 1, maximum: 8 },
                        },
                        additionalProperties: false,
                    },
                    semantic: {
                        oneOf: [
                            {
                                type: "object",
                                required: [
                                    "role",
                                    "text",
                                    "color",
                                    "fontFamily",
                                    "fontWeight",
                                    "align",
                                ],
                                properties: {
                                    role: {
                                        type: "string",
                                        enum: ["title", "label", "annotation"],
                                    },
                                    text: { type: "string", minLength: 1, maxLength: 500 },
                                    color: {
                                        type: "string",
                                        pattern: "^#[0-9a-fA-F]{6}$",
                                    },
                                    fontFamily: { type: "string", maxLength: 120 },
                                    fontWeight: {
                                        type: "integer",
                                        minimum: 100,
                                        maximum: 900,
                                    },
                                    align: {
                                        type: "string",
                                        enum: ["left", "center", "right"],
                                    },
                                },
                                additionalProperties: false,
                            },
                            {
                                type: "object",
                                required: ["values", "maxValue", "axis"],
                                properties: {
                                    values: {
                                        type: "array",
                                        minItems: 1,
                                        maxItems: COMPOSITION_LIMITS.maxSemanticValues,
                                        items: {
                                            type: "object",
                                            required: ["id", "label", "value", "color"],
                                            properties: {
                                                id: { type: "string", maxLength: 120 },
                                                label: { type: "string", maxLength: 80 },
                                                value: {
                                                    type: "number",
                                                    minimum: 0,
                                                    maximum: 1_000_000_000,
                                                },
                                                color: {
                                                    type: "string",
                                                    pattern: "^#[0-9a-fA-F]{6}$",
                                                },
                                            },
                                            additionalProperties: false,
                                        },
                                    },
                                    maxValue: {
                                        type: "number",
                                        exclusiveMinimum: 0,
                                        maximum: 1_000_000_000,
                                    },
                                    axis: PRESENTATION_AXIS_SCHEMA,
                                },
                                additionalProperties: false,
                            },
                            {
                                type: "object",
                                required: ["role", "value", "label", "color", "width", "style"],
                                properties: {
                                    role: { const: "threshold" },
                                    value: {
                                        type: "number",
                                        minimum: 0,
                                        maximum: 1_000_000_000,
                                    },
                                    label: { type: "string", maxLength: 80 },
                                    color: {
                                        type: "string",
                                        pattern: "^#[0-9a-fA-F]{6}$",
                                    },
                                    width: { type: "number", minimum: 1, maximum: 8 },
                                    style: {
                                        type: "string",
                                        enum: ["solid", "dashed"],
                                    },
                                },
                                additionalProperties: false,
                            },
                        ],
                    },
                    animation: SEMANTIC_ANIMATION_SCHEMA,
                    keyframes: {
                        type: "array",
                        maxItems: COMPOSITION_LIMITS.maxKeyframesPerLayer,
                        items: KEYFRAME_SCHEMA,
                    },
                },
                additionalProperties: false,
            },
        },
    },
    additionalProperties: false,
};

function clone(value) {
    return structuredClone(value);
}

function assertAllowedKeys(input, allowed, label) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new CanvasError("invalid_object", `${label} must be a JSON object.`);
    }
    for (const key of Object.keys(input)) {
        if (!allowed.has(key)) {
            throw new CanvasError("invalid_field", `${label} contains unsupported field ${key}.`);
        }
    }
}

function presetSeries(name) {
    const termCount = 16;
    if (name === "sine") {
        return {
            name: "Sine wave",
            fundamentalFrequency: 1,
            amplitudeScale: 1,
            terms: [{ harmonic: 1, amplitude: 1, phase: 0 }],
            runtime: { playing: true, speed: 0.35, cycles: 2 },
        };
    }

    if (name === "sawtooth") {
        return {
            name: "Sawtooth wave",
            fundamentalFrequency: 1,
            amplitudeScale: 1,
            terms: Array.from({ length: termCount }, (_, index) => ({
                harmonic: index + 1,
                amplitude: (2 / Math.PI) * ((index % 2 === 0 ? 1 : -1) / (index + 1)),
                phase: 0,
            })),
            runtime: { playing: true, speed: 0.35, cycles: 2 },
        };
    }

    if (name === "triangle") {
        return {
            name: "Triangle wave",
            fundamentalFrequency: 1,
            amplitudeScale: 1,
            terms: Array.from({ length: termCount }, (_, index) => {
                const harmonic = index * 2 + 1;
                return {
                    harmonic,
                    amplitude: (8 / (Math.PI ** 2)) * ((index % 2 === 0 ? 1 : -1) / harmonic ** 2),
                    phase: 0,
                };
            }),
            runtime: { playing: true, speed: 0.35, cycles: 2 },
        };
    }

    return clone(DEFAULT_SERIES);
}

function normalizeSeries(input = {}, previous = DEFAULT_SERIES) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new CanvasError("invalid_series", "Series input must be a JSON object.");
    }
    assertAllowedKeys(input, new Set([
        "name",
        "preset",
        "fundamentalFrequency",
        "amplitudeScale",
        "coefficients",
        "terms",
        "runtime",
    ]), "Series input");
    if (
        input.name !== undefined
        && (typeof input.name !== "string" || input.name.length > 120)
    ) {
        throw new CanvasError("invalid_name", "Series name must be a string of at most 120 characters.");
    }
    if (
        input.preset !== undefined
        && !["square", "sawtooth", "triangle", "sine"].includes(input.preset)
    ) {
        throw new CanvasError("invalid_preset", "Series preset is not supported.");
    }
    if (
        input.runtime !== undefined
        && (
            !input.runtime
            || typeof input.runtime !== "object"
            || Array.isArray(input.runtime)
        )
    ) {
        throw new CanvasError("invalid_runtime", "runtime must be a JSON object.");
    }
    if (input.runtime) {
        assertAllowedKeys(
            input.runtime,
            new Set(["playing", "speed", "cycles"]),
            "Series runtime",
        );
    }

    const base = input.preset ? presetSeries(input.preset) : clone(previous);
    let terms = base.terms;

    if (input.coefficients !== undefined) {
        if (!Array.isArray(input.coefficients)) {
            throw new CanvasError("invalid_coefficients", "coefficients must be an array.");
        }
        terms = input.coefficients.map((amplitude, index) => ({
            harmonic: index + 1,
            amplitude,
            phase: 0,
        }));
    } else if (input.terms !== undefined) {
        if (!Array.isArray(input.terms)) {
            throw new CanvasError("invalid_terms", "terms must be an array.");
        }
        terms = input.terms.map((term) => {
            assertAllowedKeys(
                term,
                new Set(["harmonic", "amplitude", "phase"]),
                "Series term",
            );
            return {
                harmonic: term.harmonic,
                amplitude: term.amplitude,
                phase: term.phase ?? 0,
            };
        });
    }

    if (terms.length > MAX_TERMS) {
        throw new CanvasError("too_many_terms", `A series may contain at most ${MAX_TERMS} terms.`);
    }

    for (const term of terms) {
        if (
            !Number.isInteger(term.harmonic)
            || term.harmonic < 1
            || term.harmonic > MAX_HARMONIC
            || !Number.isFinite(term.amplitude)
            || Math.abs(term.amplitude) > MAX_SERIES_MAGNITUDE
            || !Number.isFinite(term.phase)
            || Math.abs(term.phase) > MAX_SERIES_MAGNITUDE
        ) {
            throw new CanvasError(
                "invalid_term",
                "Each term needs a positive integer harmonic and finite amplitude and phase values.",
            );
        }
    }

    const fundamentalFrequency = input.fundamentalFrequency ?? base.fundamentalFrequency;
    const amplitudeScale = input.amplitudeScale ?? base.amplitudeScale;
    const runtime = {
        ...base.runtime,
        ...(input.runtime ?? {}),
    };

    if (
        !Number.isFinite(fundamentalFrequency)
        || fundamentalFrequency <= 0
        || fundamentalFrequency > MAX_SERIES_MAGNITUDE
    ) {
        throw new CanvasError("invalid_frequency", "fundamentalFrequency must be greater than zero.");
    }
    if (
        !Number.isFinite(amplitudeScale)
        || amplitudeScale <= 0
        || amplitudeScale > MAX_SERIES_MAGNITUDE
    ) {
        throw new CanvasError("invalid_scale", "amplitudeScale must be greater than zero.");
    }
    if (
        typeof runtime.playing !== "boolean"
        || !Number.isFinite(runtime.speed)
        || runtime.speed < 0
        || runtime.speed > 10
        || !Number.isFinite(runtime.cycles)
        || runtime.cycles < 0.25
        || runtime.cycles > 20
    ) {
        throw new CanvasError("invalid_runtime", "runtime contains an invalid playing, speed, or cycles value.");
    }

    return {
        name: input.name ?? base.name,
        fundamentalFrequency,
        amplitudeScale,
        terms,
        runtime,
        updatedAt: new Date().toISOString(),
    };
}

function sendJson(res, status, value) {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(value));
}

async function readJson(req) {
    const chunks = [];
    let size = 0;

    for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) {
            throw new CanvasError("body_too_large", "Request body exceeds 1 MB.");
        }
        chunks.push(chunk);
    }

    const body = Buffer.concat(chunks).toString("utf8");
    if (!body) {
        return {};
    }

    try {
        return JSON.parse(body);
    } catch {
        throw new CanvasError("invalid_json", "Request body must be valid JSON.");
    }
}

async function readFileBounded(filePath, maximumBytes, label) {
    const fileStat = await stat(filePath);
    if (fileStat.size > maximumBytes) {
        throw new Error(`${label} exceeds ${maximumBytes} bytes.`);
    }
    return readFile(filePath, "utf8");
}

function sendRequestError(res, error, fallbackCode, fallbackStatus = 400) {
    if (res.headersSent) {
        res.destroy();
        return;
    }
    const requestStatus = error.code === "body_too_large"
        ? 413
        : ["stale_revision", "stale_asset_revision"].includes(error.code)
            ? 409
            : typeof error.code === "string" && /^[A-Z]/.test(error.code)
                ? 500
                : fallbackStatus;
    const isServerError = requestStatus === 500
        || error instanceof TypeError
        || error instanceof RangeError;
    sendJson(res, isServerError ? 500 : requestStatus, {
        error: isServerError ? "internal_error" : (error.code ?? fallbackCode),
        message: isServerError ? "The request could not be completed." : error.message,
        ...(error.current ? { current: error.current } : {}),
    });
}

function safeLoadError(error, fallback) {
    if (typeof error.code === "string" && /^[A-Z]/.test(error.code)) {
        return fallback;
    }
    return String(error.message ?? fallback).slice(0, 500);
}

function closeEventClient(entry, client) {
    if (client.closed) {
        return;
    }
    client.closed = true;
    clearTimeout(client.backpressureTimer);
    clearInterval(client.heartbeat);
    entry.clients.delete(client);
    client.response.destroy();
}

function flushEventClient(entry, client) {
    if (client.closed || client.waitingForDrain) {
        return;
    }
    while (client.queue.length > 0) {
        const message = client.queue.shift();
        client.queuedBytes -= Buffer.byteLength(message);
        if (!client.response.write(message)) {
            client.waitingForDrain = true;
            client.backpressureTimer = setTimeout(
                () => closeEventClient(entry, client),
                MAX_SSE_BACKPRESSURE_MS,
            );
            client.response.once("drain", () => {
                if (client.closed) {
                    return;
                }
                clearTimeout(client.backpressureTimer);
                client.waitingForDrain = false;
                flushEventClient(entry, client);
            });
            return;
        }
    }
}

function queueEventMessage(entry, client, message) {
    if (client.closed) {
        return;
    }
    const messageBytes = Buffer.byteLength(message);
    if (client.queuedBytes + messageBytes > MAX_SSE_PENDING_BYTES) {
        closeEventClient(entry, client);
        return;
    }
    client.queue.push(message);
    client.queuedBytes += messageBytes;
    flushEventClient(entry, client);
}

function broadcast(entry, eventName, value) {
    const message = `event: ${eventName}\ndata: ${JSON.stringify(value)}\n\n`;
    for (const client of entry.clients) {
        queueEventMessage(entry, client, message);
    }
}

function updateEntry(entry, input) {
    entry.state = normalizeSeries(input, entry.state);
    broadcast(entry, "series", entry.state);
    return entry.state;
}

function workspaceEntries(entry) {
    return [...new Set([entry, ...workspaceEntryRegistry])]
        .filter((candidate) => candidate.workspacePath === entry.workspacePath);
}

async function assetDirectory() {
    if (!copilotSession?.workspacePath) {
        throw new CanvasError(
            "workspace_unavailable",
            "The session workspace is unavailable for frequency asset storage.",
        );
    }
    return ensureContainedDirectory(copilotSession.workspacePath, "fourier-assets");
}

async function compositionDirectory() {
    if (!copilotSession?.workspacePath) {
        throw new CanvasError(
            "workspace_unavailable",
            "The session workspace is unavailable for composition storage.",
        );
    }
    return ensureContainedDirectory(copilotSession.workspacePath, "fourier-compositions");
}

async function loadAssetLibrary(manifest) {
    const directory = await assetDirectory();
    const fileNames = manifest?.fileNamesById ? [] : await readdir(directory);

    const assets = new Map();
    const assetsByFileName = new Map();
    const fileNamesById = new Map();
    const errors = [];
    let totalAssetBytes = 0;
    const assetFiles = indexedAssetFiles(manifest, fileNames);
    for (const [indexedId, fileName] of assetFiles) {
        if (assets.size >= MAX_ASSETS) {
            errors.push({ fileName, message: `Asset library limit is ${MAX_ASSETS} files.` });
            continue;
        }
        let asset;
        let sourceBytes;
        try {
            const source = await readFileBounded(
                join(directory, fileName),
                MAX_ASSET_BYTES,
                "Fourier asset",
            );
            sourceBytes = Buffer.byteLength(source);
            asset = normalizeFrequencyAsset(JSON.parse(source));
            if (indexedId && indexedId !== asset.id) {
                throw new Error(`Asset index ID ${indexedId} does not match file asset ID ${asset.id}.`);
            }
        } catch (error) {
            errors.push({
                fileName,
                message: safeLoadError(error, "The asset could not be loaded."),
            });
            try {
                const quarantineDirectory = await ensureContainedDirectory(
                    directory,
                    "quarantine",
                );
                await rename(
                    join(directory, fileName),
                    join(quarantineDirectory, `${Date.now()}-${fileName}.invalid`),
                );
            } catch {
                // Keep the original file when quarantine is unavailable.
            }
            continue;
        }
        if (totalAssetBytes + sourceBytes > MAX_TOTAL_ASSET_BYTES) {
            errors.push({
                fileName,
                message: `Asset library exceeds the ${MAX_TOTAL_ASSET_BYTES}-byte storage budget.`,
            });
            continue;
        }
        totalAssetBytes += sourceBytes;
        if (assets.has(asset.id)) {
            if (fileName === manifest?.latestFileName) {
                const previousFileName = fileNamesById.get(asset.id);
                errors.push({
                    fileName: previousFileName,
                    message: `Superseded asset version for ID ${asset.id} was ignored.`,
                });
                assets.set(asset.id, asset);
                assetsByFileName.set(fileName, asset);
                fileNamesById.set(asset.id, fileName);
                continue;
            }
            errors.push({
                fileName,
                message: `Another asset already uses ID ${asset.id}.`,
            });
            continue;
        }
        assets.set(asset.id, asset);
        assetsByFileName.set(fileName, asset);
        fileNamesById.set(asset.id, fileName);
    }
    return { assets, assetsByFileName, errors, fileNamesById };
}

function assetSummaries(assets) {
    return [...assets.values()]
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map((asset) => ({
            id: asset.id,
            name: asset.name,
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt,
            revision: asset.revision,
            strokeCount: asset.strokeCount,
            termCount: asset.strokes.reduce(
                (sum, stroke) => sum + stroke.coefficients.length,
                0,
            ),
        }));
}

function cloneAssetHistories(histories) {
    return new Map([...histories].map(([assetId, history]) => [
        assetId,
        createHistory(history, history.limit),
    ]));
}

function assetHistoryStatus(entry, assetId) {
    const history = entry.assetHistories.get(assetId) ?? createHistory({}, 8);
    return { assetId, ...historyStatus(history) };
}

async function persistAsset(entry, asset) {
    const directory = await assetDirectory();
    const fileName = versionedAssetFileName(asset.id);
    const serializedBytes = jsonStorageBytes(asset);
    if (serializedBytes > MAX_ASSET_BYTES) {
        throw new Error(`A Fourier asset may contain at most ${MAX_ASSET_BYTES} bytes.`);
    }
    const previousBytes = entry.assetBytes.get(asset.id) ?? 0;
    const totalBytes = [...entry.assetBytes.values()].reduce((sum, bytes) => sum + bytes, 0)
        - previousBytes
        + serializedBytes;
    if (!entry.assets.has(asset.id) && entry.assets.size >= MAX_ASSETS) {
        throw new Error(`An asset library may contain at most ${MAX_ASSETS} assets.`);
    }
    if (totalBytes > MAX_TOTAL_ASSET_BYTES) {
        throw new Error(
            `Asset library exceeds the ${MAX_TOTAL_ASSET_BYTES}-byte storage budget.`,
        );
    }
    const previousFileName = entry.assetFileNames.get(asset.id);
    const nextFileNames = new Map(entry.assetFileNames);
    nextFileNames.set(asset.id, fileName);
    const committed = await commitAssetVersion({
        asset,
        directory,
        fileName,
        manifest: {
            version: 1,
            latestFileName: fileName,
            assets: Object.fromEntries(nextFileNames),
        },
        previousFileName,
    });
    if (committed.cleanupError) {
        entry.loadErrors.push({
            fileName: previousFileName,
            message: "A superseded asset version could not be removed.",
        });
    }
    return { fileName, filePath: committed.filePath, serializedBytes };
}

async function loadAssetManifest() {
    const directory = await assetDirectory();
    let source;
    try {
        source = await readFileBounded(
            join(directory, "latest.json"),
            64 * 1024,
            "Asset library manifest",
        );
    } catch (error) {
        if (error.code === "ENOENT") {
            return { fileNamesById: new Map(), latestFileName: null };
        }
        throw error;
    }
    let index;
    try {
        index = JSON.parse(source);
    } catch (error) {
        return { error: { fileName: "latest.json", message: error.message } };
    }
    if (
        index?.version === 1
        && typeof index.latestFileName === "string"
        && /^[^/\\]+\.fourier\.json$/.test(index.latestFileName)
        && index.assets
        && typeof index.assets === "object"
        && !Array.isArray(index.assets)
    ) {
        const entries = Object.entries(index.assets);
        if (
            entries.length <= MAX_ASSETS
            && new Set(entries.map(([, fileName]) => fileName)).size === entries.length
            && entries.every(([assetId, fileName]) => (
                /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(assetId)
                && typeof fileName === "string"
                && /^[^/\\]+\.fourier\.json$/.test(fileName)
            ))
            && entries.some(([, fileName]) => fileName === index.latestFileName)
        ) {
            return {
                fileNamesById: new Map(entries),
                latestFileName: index.latestFileName,
            };
        }
    }
    if (
        index
        && typeof index.fileName === "string"
        && /^[^/\\]+\.fourier\.json$/.test(index.fileName)
    ) {
        return {
            fileNamesById: null,
            latestFileName: index.fileName,
            legacy: true,
        };
    }
    return {
        error: {
            fileName: "latest.json",
            message: "The asset library manifest is invalid.",
        },
    };
}

async function setAsset(entry, asset) {
    const nextAsset = normalizeFrequencyAsset(asset);
    return enqueueMutation(entry.workspacePath, async () => {
        const nextAssets = new Map(entry.assets);
        nextAssets.set(nextAsset.id, nextAsset);
        for (const target of workspaceEntries(entry)) {
            validateCompositionComplexity(target.composition, nextAssets);
            for (const snapshot of [...target.history.undo, ...target.history.redo]) {
                validateCompositionComplexity(snapshot, nextAssets);
            }
        }
        const persisted = await persistAsset(entry, nextAsset);
        for (const target of workspaceEntries(entry)) {
            target.asset = nextAsset;
            target.assetFileNames.set(nextAsset.id, persisted.fileName);
            target.assetBytes.set(nextAsset.id, persisted.serializedBytes);
            target.assets.set(nextAsset.id, nextAsset);
            broadcast(target, "asset", nextAsset);
            broadcast(target, "assets", assetSummaries(target.assets));
        }
        return nextAsset;
    });
}

async function transformEntry(entry, input) {
    const nextAsset = transformDrawing(input);
    return setAsset(entry, nextAsset);
}

function broadcastAssetState(entry, assetId) {
    broadcast(entry, "asset-history", assetHistoryStatus(entry, assetId));
}

async function commitAssetEdit(entry, assetId, input) {
    return enqueueMutation(entry.workspacePath, async () => {
        const current = entry.assets.get(assetId);
        if (!current) {
            throw new CanvasError("asset_not_found", `Asset ${assetId} is not available.`);
        }
        const { expectedRevision, ...drawing } = input;
        const result = buildAssetUpdate(current, expectedRevision, drawing);
        if (!result.changed) return current;

        const nextAssets = new Map(entry.assets);
        nextAssets.set(assetId, result.asset);
        for (const target of workspaceEntries(entry)) {
            validateCompositionComplexity(target.composition, nextAssets);
            for (const snapshot of [...target.history.undo, ...target.history.redo]) {
                validateCompositionComplexity(snapshot, nextAssets);
            }
        }
        const nextHistories = cloneAssetHistories(entry.assetHistories);
        const history = nextHistories.get(assetId) ?? createHistory({}, 8);
        recordHistory(history, current, result.asset);
        nextHistories.set(assetId, history);
        const persisted = await persistAsset(entry, result.asset);
        await persistCompositionState(entry.composition, entry.history, nextHistories);

        for (const target of workspaceEntries(entry)) {
            target.asset = result.asset;
            target.assetFileNames.set(assetId, persisted.fileName);
            target.assetBytes.set(assetId, persisted.serializedBytes);
            target.assets.set(assetId, result.asset);
            target.assetHistories = cloneAssetHistories(nextHistories);
            broadcast(target, "asset", result.asset);
            broadcast(target, "assets", assetSummaries(target.assets));
            broadcastAssetState(target, assetId);
        }
        return result.asset;
    });
}

function previewAssetEdit(entry, assetId, input) {
    const current = entry.assets.get(assetId);
    if (!current) {
        throw new CanvasError("asset_not_found", `Asset ${assetId} is not available.`);
    }
    return buildAssetPreview(current, input);
}

async function restoreAssetEdit(entry, assetId, expectedRevision, direction) {
    return enqueueMutation(entry.workspacePath, async () => {
        const current = entry.assets.get(assetId);
        if (!current) {
            throw new CanvasError("asset_not_found", `Asset ${assetId} is not available.`);
        }
        if (expectedRevision !== (current.revision ?? 0)) {
            const error = new CanvasError(
                "stale_asset_revision",
                "Asset revision is stale. Reload the canonical asset and retry.",
            );
            error.current = { id: assetId, revision: current.revision ?? 0 };
            throw error;
        }
        const nextHistories = cloneAssetHistories(entry.assetHistories);
        const history = nextHistories.get(assetId) ?? createHistory({}, 8);
        let snapshot;
        try {
            snapshot = direction === "undo"
                ? undoHistory(history, current)
                : redoHistory(history, current);
        } catch {
            throw new CanvasError(
                `nothing_to_${direction}`,
                `There is no asset edit to ${direction}.`,
            );
        }
        const next = normalizeFrequencyAsset({
            ...snapshot,
            id: assetId,
            createdAt: current.createdAt,
            updatedAt: new Date().toISOString(),
            revision: (current.revision ?? 0) + 1,
        });
        nextHistories.set(assetId, history);
        const persisted = await persistAsset(entry, next);
        await persistCompositionState(entry.composition, entry.history, nextHistories);
        for (const target of workspaceEntries(entry)) {
            target.asset = next;
            target.assetFileNames.set(assetId, persisted.fileName);
            target.assetBytes.set(assetId, persisted.serializedBytes);
            target.assets.set(assetId, next);
            target.assetHistories = cloneAssetHistories(nextHistories);
            broadcast(target, "asset", next);
            broadcast(target, "assets", assetSummaries(target.assets));
            broadcastAssetState(target, assetId);
        }
        return next;
    });
}

async function persistComposition(composition) {
    const directory = await compositionDirectory();
    const bytes = jsonStorageBytes(composition);
    if (bytes > MAX_PERSISTED_COMPOSITION_BYTES) {
        throw new Error(
            `Composition exceeds ${MAX_PERSISTED_COMPOSITION_BYTES} persisted bytes.`,
        );
    }
    await writeJsonAtomic(
        join(directory, "latest.fourier-composition.json"),
        composition,
    );
}

async function persistHistory(history) {
    const directory = await compositionDirectory();
    const value = { undo: history.undo, redo: history.redo };
    const bytes = jsonStorageBytes(value);
    if (bytes > MAX_PERSISTED_HISTORY_BYTES) {
        throw new Error(`Composition history exceeds ${MAX_PERSISTED_HISTORY_BYTES} bytes.`);
    }
    await writeJsonAtomic(
        join(directory, "composition-history.json"),
        value,
    );
}

async function loadHistory(assets, loadErrors) {
    try {
        const input = JSON.parse(await readFileBounded(
            join(await compositionDirectory(), "composition-history.json"),
            MAX_PERSISTED_HISTORY_BYTES,
            "Composition history",
        ));
        const assetIds = new Set(assets.keys());
        const history = createHistory({
            undo: (input.undo ?? []).map((composition) => normalizeComposition(
                composition,
                assetIds,
            )),
            redo: (input.redo ?? []).map((composition) => normalizeComposition(
                composition,
                assetIds,
            )),
        });
        for (const snapshot of [...history.undo, ...history.redo]) {
            validateCompositionComplexity(snapshot, assets);
        }
        return history;
    } catch (error) {
        if (error.code === "ENOENT") {
            return createHistory();
        }
        loadErrors.push({
            fileName: "composition-history.json",
            message: safeLoadError(error, "Composition history could not be loaded."),
        });
        return createHistory();
    }
}

async function loadComposition(assets, latestAsset, loadErrors) {
    try {
        const input = JSON.parse(await readFileBounded(
            join(await compositionDirectory(), "latest.fourier-composition.json"),
            MAX_PERSISTED_COMPOSITION_BYTES,
            "Fourier composition",
        ));
        const composition = normalizeComposition(input, new Set(assets.keys()));
        validateCompositionComplexity(composition, assets);
        return composition;
    } catch (error) {
        const composition = createComposition(latestAsset);
        if (error.code === "ENOENT") {
            await persistComposition(composition);
        } else {
            loadErrors.push({
                fileName: "latest.fourier-composition.json",
                message: safeLoadError(error, "The composition could not be loaded."),
            });
        }
        return composition;
    }
}

function broadcastHistory(entry) {
    broadcast(entry, "history", historyStatus(entry.history));
}

async function persistCompositionState(composition, history, assetHistories) {
    const directory = await compositionDirectory();
    const historyValue = { undo: history.undo, redo: history.redo };
    const assetHistoryValue = Object.fromEntries(
        [...(assetHistories ?? new Map())].map(([assetId, assetHistory]) => [
            assetId,
            { undo: assetHistory.undo, redo: assetHistory.redo },
        ]),
    );
    const state = {
        version: WORKSPACE_STATE_VERSION,
        composition,
        history: historyValue,
        assetHistories: assetHistoryValue,
    };
    if (jsonStorageBytes(composition) > MAX_PERSISTED_COMPOSITION_BYTES) {
        throw new Error(
            `Composition exceeds ${MAX_PERSISTED_COMPOSITION_BYTES} persisted bytes.`,
        );
    }
    if (
        jsonStorageBytes({ history: historyValue, assetHistories: assetHistoryValue })
        > MAX_PERSISTED_HISTORY_BYTES
    ) {
        throw new Error(`Workspace history exceeds ${MAX_PERSISTED_HISTORY_BYTES} bytes.`);
    }
    const bytes = jsonStorageBytes(state);
    if (bytes > MAX_PERSISTED_STATE_BYTES) {
        throw new Error(`Workspace state exceeds ${MAX_PERSISTED_STATE_BYTES} bytes.`);
    }
    await writeJsonAtomic(join(directory, "workspace-state.json"), state);
}

function broadcastCompositionState(entry) {
    broadcast(entry, "composition", entry.composition);
    broadcastHistory(entry);
}

function layerPayload(layer) {
    const { updatedAt, ...payload } = layer;
    return JSON.stringify(payload);
}

function changedLayerIds(current, next) {
    const currentById = new Map(current.layers.map((layer) => [layer.id, layerPayload(layer)]));
    const nextById = new Map(next.layers.map((layer) => [layer.id, layerPayload(layer)]));
    return [...new Set([...currentById.keys(), ...nextById.keys()])]
        .filter((id) => currentById.get(id) !== nextById.get(id));
}

function persistedPresentationDetails(entry, composition, history, changedIds = []) {
    const historyValue = { undo: history.undo, redo: history.redo };
    return {
        assetCount: entry.assets.size,
        assetBytes: [...entry.assetBytes.values()].reduce((sum, bytes) => sum + bytes, 0),
        compositionBytes: jsonStorageBytes(composition),
        historyBytes: jsonStorageBytes(historyValue),
        changedLayerIds: changedIds,
        warnings: presentationWarnings(composition),
    };
}

async function commitComposition(entry, expectedRevision, buildNext, options = {}) {
    return enqueueMutation(entry.workspacePath, async () => {
        if (
            expectedRevision !== null
            && (
                !Number.isSafeInteger(expectedRevision)
                || expectedRevision !== entry.composition.revision
            )
        ) {
            const error = new CanvasError(
                "stale_revision",
                "Composition revision is stale. Reload the canonical composition and retry.",
            );
            error.current = options.compactConflict
                ? { revision: entry.composition.revision }
                : entry.composition;
            throw error;
        }
        const draft = await buildNext(clone(entry.composition));
        const next = normalizeComposition(draft, new Set(entry.assets.keys()));
        validateCompositionComplexity(next, entry.assets);
        const nextHistory = createHistory(entry.history, entry.history.limit);
        const changed = recordHistory(nextHistory, entry.composition, next);
        if (!changed && entry.composition) {
            return {
                composition: entry.composition,
                history: entry.history,
                changedLayerIds: [],
            };
        }
        const changedIds = changedLayerIds(entry.composition, next);
        next.revision = entry.composition.revision + 1;
        await persistCompositionState(next, nextHistory, entry.assetHistories);
        for (const target of workspaceEntries(entry)) {
            target.composition = clone(next);
            target.history = createHistory(nextHistory, nextHistory.limit);
            broadcastCompositionState(target);
        }
        return {
            composition: entry.composition,
            history: entry.history,
            changedLayerIds: changedIds,
        };
    });
}

async function setComposition(entry, input) {
    const result = await commitComposition(entry, input.revision, () => input);
    return result.composition;
}

async function createKpiPresentation(entry, input) {
    const result = await commitComposition(entry, null, (current) => (
        createKpiComposition(input, { revision: current.revision })
    ));
    return presentationMutationSummary(
        result.composition,
        persistedPresentationDetails(
            entry,
            result.composition,
            result.history,
            result.changedLayerIds,
        ),
    );
}

async function patchKpiPresentation(entry, input) {
    let result;
    try {
        result = await commitComposition(entry, input.expectedRevision, (current) => (
            patchKpiComposition(current, input)
        ), { compactConflict: true });
    } catch (error) {
        if (error.code !== "semantic_drift") {
            throw error;
        }
        const conflict = new CanvasError("semantic_drift", error.message);
        conflict.current = {
            revision: error.currentRevision,
            warnings: error.warnings,
        };
        throw conflict;
    }
    return presentationMutationSummary(
        result.composition,
        persistedPresentationDetails(
            entry,
            result.composition,
            result.history,
            result.changedLayerIds,
        ),
    );
}

async function syncKpiPresentation(entry, input) {
    const result = await commitComposition(entry, input.expectedRevision, (current) => (
        syncKpiComposition(current, input)
    ), { compactConflict: true });
    return presentationMutationSummary(
        result.composition,
        persistedPresentationDetails(
            entry,
            result.composition,
            result.history,
            result.changedLayerIds,
        ),
    );
}

function getSceneSummary(entry) {
    return presentationSummary(
        entry.composition,
        persistedPresentationDetails(entry, entry.composition, entry.history),
    );
}

async function undoComposition(entry) {
    return enqueueMutation(entry.workspacePath, async () => {
        const nextHistory = createHistory(entry.history, entry.history.limit);
        const nextComposition = normalizeComposition(
            undoHistory(nextHistory, entry.composition),
            new Set(entry.assets.keys()),
        );
        validateCompositionComplexity(nextComposition, entry.assets);
        nextComposition.updatedAt = new Date().toISOString();
        nextComposition.revision = entry.composition.revision + 1;
        await persistCompositionState(nextComposition, nextHistory, entry.assetHistories);
        for (const target of workspaceEntries(entry)) {
            target.composition = clone(nextComposition);
            target.history = createHistory(nextHistory, nextHistory.limit);
            broadcastCompositionState(target);
        }
        return entry.composition;
    });
}

async function redoComposition(entry) {
    return enqueueMutation(entry.workspacePath, async () => {
        const nextHistory = createHistory(entry.history, entry.history.limit);
        const nextComposition = normalizeComposition(
            redoHistory(nextHistory, entry.composition),
            new Set(entry.assets.keys()),
        );
        validateCompositionComplexity(nextComposition, entry.assets);
        nextComposition.updatedAt = new Date().toISOString();
        nextComposition.revision = entry.composition.revision + 1;
        await persistCompositionState(nextComposition, nextHistory, entry.assetHistories);
        for (const target of workspaceEntries(entry)) {
            target.composition = clone(nextComposition);
            target.history = createHistory(nextHistory, nextHistory.limit);
            broadcastCompositionState(target);
        }
        return entry.composition;
    });
}

async function loadWorkspaceState() {
    const manifest = await loadAssetManifest();
    const library = await loadAssetLibrary(manifest);
    const loadErrors = [
        ...(manifest?.error ? [manifest.error] : []),
        ...library.errors,
    ];
    let asset = null;
    if (manifest?.latestFileName) {
        asset = library.assetsByFileName.get(manifest.latestFileName) ?? null;
        if (!asset && !loadErrors.some((error) => error.fileName === manifest.latestFileName)) {
            loadErrors.push({
                fileName: manifest.latestFileName,
                message: "The latest asset file is missing.",
            });
        }
    }
    if (asset) {
        library.assets.set(asset.id, asset);
        library.fileNamesById.set(asset.id, manifest.latestFileName);
    }
    const assetBytes = new Map();
    for (const [assetId, fileName] of library.fileNamesById) {
        try {
            assetBytes.set(assetId, (await stat(join(await assetDirectory(), fileName))).size);
        } catch {
            assetBytes.set(assetId, 0);
        }
    }
    let composition;
    let history;
    let assetHistories = new Map();
    try {
        const persistedState = JSON.parse(await readFileBounded(
            join(await compositionDirectory(), "workspace-state.json"),
            MAX_PERSISTED_STATE_BYTES,
            "Fourier workspace state",
        ));
        if (persistedState.version !== WORKSPACE_STATE_VERSION) {
            throw new Error("Fourier workspace state version is not supported.");
        }
        const assetIds = new Set(library.assets.keys());
        composition = normalizeComposition(persistedState.composition, assetIds);
        validateCompositionComplexity(composition, library.assets);
        history = createHistory({
            undo: (persistedState.history?.undo ?? []).map((item) => (
                normalizeComposition(item, assetIds)
            )),
            redo: (persistedState.history?.redo ?? []).map((item) => (
                normalizeComposition(item, assetIds)
            )),
        });
        for (const snapshot of [...history.undo, ...history.redo]) {
            validateCompositionComplexity(snapshot, library.assets);
        }
        if (
            persistedState.assetHistories !== undefined
            && (
                !persistedState.assetHistories
                || typeof persistedState.assetHistories !== "object"
                || Array.isArray(persistedState.assetHistories)
            )
        ) {
            throw new Error("Asset histories must be an object.");
        }
        assetHistories = new Map(Object.entries(
            persistedState.assetHistories ?? {},
        ).map(([assetId, assetHistory]) => {
            if (!library.assets.has(assetId)) {
                throw new Error(`Asset history references unavailable asset ${assetId}.`);
            }
            const normalizeSnapshot = (snapshot) => {
                const normalized = normalizeFrequencyAsset(snapshot);
                if (normalized.id !== assetId) {
                    throw new Error(`Asset history identity mismatch for ${assetId}.`);
                }
                return normalized;
            };
            return [assetId, createHistory({
                undo: (assetHistory?.undo ?? []).map(normalizeSnapshot),
                redo: (assetHistory?.redo ?? []).map(normalizeSnapshot),
            }, 8)];
        }));
    } catch (error) {
        if (error.code !== "ENOENT") {
            loadErrors.push({
                fileName: "workspace-state.json",
                message: safeLoadError(error, "Fourier workspace state could not be loaded."),
            });
        }
        composition = await loadComposition(
            library.assets,
            asset,
            loadErrors,
        );
        history = await loadHistory(library.assets, loadErrors);
        assetHistories = new Map();
        await persistCompositionState(composition, history, assetHistories);
    }
    return {
        asset,
        assetBytes,
        assetFileNames: library.fileNamesById,
        loadErrors,
        assets: library.assets,
        assetHistories,
        composition,
        history,
    };
}

async function startServer(instanceId, initialInput) {
    const entry = {
        asset: null,
        assetBytes: new Map(),
        assetFileNames: new Map(),
        assetHistories: new Map(),
        loadErrors: [],
        assets: new Map(),
        clients: new Set(),
        capabilityToken: createCapabilityToken(),
        composition: null,
        history: createHistory(),
        server: undefined,
        state: normalizeSeries(initialInput),
        url: "",
        workspacePath: copilotSession.workspacePath,
    };
    await initializeWorkspaceEntry(entry, workspaceEntryRegistry, loadWorkspaceState);

    const handleRequest = async (req, res) => {
        const authorization = authorizeCanvasRequest(req, req.url, {
            capabilityToken: entry.capabilityToken,
            expectedHost: entry.host,
            expectedOrigin: entry.origin,
        });
        if (authorization.error) {
            sendJson(res, authorization.error.status, {
                error: authorization.error.error,
                message: authorization.error.error === "unsupported_media_type"
                    ? "Mutation requests require application/json."
                    : "The loopback request was not authorized.",
            });
            return;
        }
        const { url } = authorization;

        if (req.method === "GET" && url.pathname === "/") {
            const nonce = createScriptNonce();
            res.writeHead(200, {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-store",
                "Content-Security-Policy": contentSecurityPolicy(nonce),
                "Referrer-Policy": "no-referrer",
                "X-Content-Type-Options": "nosniff",
            });
            res.end(renderHtml(nonce));
            return;
        }

        if (req.method === "GET" && url.pathname === "/api/state") {
            sendJson(res, 200, entry.state);
            return;
        }

        if (req.method === "GET" && url.pathname === "/api/asset") {
            if (!entry.asset) {
                sendJson(res, 404, {
                    error: "asset_not_created",
                    message: "No frequency-domain drawing asset has been created.",
                });
                return;
            }
            sendJson(res, 200, entry.asset);
            return;
        }

        if (req.method === "GET" && url.pathname === "/api/assets") {
            sendJson(res, 200, assetSummaries(entry.assets));
            return;
        }

        const assetHistoryMatch = url.pathname.match(
            /^\/api\/assets\/([^/]+)\/history$/,
        );
        if (req.method === "GET" && assetHistoryMatch) {
            try {
                const assetId = decodeURIComponent(assetHistoryMatch[1]);
                if (!entry.assets.has(assetId)) {
                    sendJson(res, 404, {
                        error: "asset_not_found",
                        message: "The requested Fourier asset was not found.",
                    });
                    return;
                }
                sendJson(res, 200, assetHistoryStatus(entry, assetId));
            } catch {
                sendJson(res, 400, {
                    error: "invalid_asset_id",
                    message: "The requested Fourier asset ID is not valid URL encoding.",
                });
            }
            return;
        }

        if (req.method === "GET" && url.pathname.startsWith("/api/assets/")) {
            let assetId;
            try {
                assetId = decodeURIComponent(url.pathname.slice("/api/assets/".length));
            } catch {
                sendJson(res, 400, {
                    error: "invalid_asset_id",
                    message: "The requested Fourier asset ID is not valid URL encoding.",
                });
                return;
            }
            const asset = entry.assets.get(assetId);
            if (!asset) {
                sendJson(res, 404, {
                    error: "asset_not_found",
                    message: "The requested Fourier asset was not found.",
                });
                return;
            }
            sendJson(res, 200, asset);
            return;
        }

        if (req.method === "GET" && url.pathname === "/api/composition") {
            sendJson(res, 200, entry.composition);
            return;
        }

        if (req.method === "GET" && url.pathname === "/api/history") {
            sendJson(res, 200, historyStatus(entry.history));
            return;
        }

        if (req.method === "GET" && url.pathname === "/api/info") {
            sendJson(res, 200, {
                instanceId,
                updateEndpoint: `${entry.url}api/series`,
                transformEndpoint: `${entry.url}api/transform`,
                assetEndpoint: `${entry.url}api/asset`,
                assetsEndpoint: `${entry.url}api/assets`,
                compositionEndpoint: `${entry.url}api/composition`,
                historyEndpoint: `${entry.url}api/history`,
                eventEndpoint: `${entry.url}events`,
                loadErrors: entry.loadErrors,
                maxTerms: MAX_TERMS,
                fourierLimits: FOURIER_LIMITS,
            });
            return;
        }

        if (req.method === "GET" && url.pathname === "/events") {
            if (entry.clients.size >= MAX_SSE_CLIENTS) {
                sendJson(res, 503, {
                    error: "too_many_event_clients",
                    message: `At most ${MAX_SSE_CLIENTS} event clients may connect.`,
                });
                return;
            }
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            });
            const client = {
                response: res,
                queue: [],
                queuedBytes: 0,
                waitingForDrain: false,
                backpressureTimer: undefined,
                heartbeat: undefined,
                closed: false,
            };
            entry.clients.add(client);
            const initialEvents = [
                ["series", entry.state],
                ...(entry.asset ? [["asset", entry.asset]] : []),
                ["assets", assetSummaries(entry.assets)],
                ["composition", entry.composition],
                ["history", historyStatus(entry.history)],
            ];
            for (const [eventName, value] of initialEvents) {
                queueEventMessage(
                    entry,
                    client,
                    `event: ${eventName}\ndata: ${JSON.stringify(value)}\n\n`,
                );
            }
            client.heartbeat = setInterval(() => {
                queueEventMessage(entry, client, ": heartbeat\n\n");
            }, 15000);
            req.on("close", () => {
                clearInterval(client.heartbeat);
                clearTimeout(client.backpressureTimer);
                client.closed = true;
                entry.clients.delete(client);
            });
            return;
        }

        if (req.method === "POST" && url.pathname === "/api/series") {
            try {
                const state = updateEntry(entry, await readJson(req));
                sendJson(res, 200, state);
            } catch (error) {
                sendRequestError(res, error, "invalid_request");
            }
            return;
        }

        if (req.method === "POST" && url.pathname === "/api/transform") {
            try {
                const asset = await transformEntry(entry, await readJson(req));
                sendJson(res, 200, asset);
            } catch (error) {
                sendRequestError(res, error, "invalid_drawing");
            }
            return;
        }

        if (req.method === "POST" && url.pathname === "/api/asset") {
            try {
                const asset = await setAsset(entry, await readJson(req));
                sendJson(res, 200, asset);
            } catch (error) {
                sendRequestError(res, error, "invalid_asset");
            }
            return;
        }

        const assetEditMatch = url.pathname.match(
            /^\/api\/assets\/([^/]+)(?:\/(preview|undo|redo))?$/,
        );
        if (assetEditMatch && ["PUT", "POST"].includes(req.method)) {
            try {
                const assetId = decodeURIComponent(assetEditMatch[1]);
                const action = assetEditMatch[2] ?? "update";
                const input = await readJson(req);
                if (action === "preview" && req.method === "POST") {
                    sendJson(res, 200, previewAssetEdit(entry, assetId, input));
                    return;
                }
                if (action === "update" && req.method === "PUT") {
                    sendJson(res, 200, await commitAssetEdit(entry, assetId, input));
                    return;
                }
                if (["undo", "redo"].includes(action) && req.method === "POST") {
                    assertAllowedKeys(
                        input,
                        new Set(["expectedRevision"]),
                        `Asset ${action} request`,
                    );
                    sendJson(
                        res,
                        200,
                        await restoreAssetEdit(
                            entry,
                            assetId,
                            input.expectedRevision,
                            action,
                        ),
                    );
                    return;
                }
                sendJson(res, 405, {
                    error: "method_not_allowed",
                    message: "The asset edit action does not support this method.",
                });
            } catch (error) {
                sendRequestError(res, error, "invalid_asset_edit");
            }
            return;
        }

        if (req.method === "POST" && url.pathname === "/api/composition") {
            try {
                const composition = await setComposition(entry, await readJson(req));
                sendJson(res, 200, composition);
            } catch (error) {
                sendRequestError(res, error, "invalid_composition");
            }
            return;
        }

        if (req.method === "POST" && url.pathname === "/api/history/undo") {
            try {
                assertAllowedKeys(await readJson(req), new Set(), "Undo request");
                sendJson(res, 200, await undoComposition(entry));
            } catch (error) {
                sendRequestError(res, error, "nothing_to_undo", 409);
            }
            return;
        }

        if (req.method === "POST" && url.pathname === "/api/history/redo") {
            try {
                assertAllowedKeys(await readJson(req), new Set(), "Redo request");
                sendJson(res, 200, await redoComposition(entry));
            } catch (error) {
                sendRequestError(res, error, "nothing_to_redo", 409);
            }
            return;
        }

        sendJson(res, 404, { error: "not_found", message: "Route not found." });
    };
    const server = createServer((req, res) => {
        handleRequest(req, res).catch(() => {
            if (res.headersSent) {
                res.destroy();
                return;
            }
            sendJson(res, 500, {
                error: "internal_error",
                message: "The request could not be completed.",
            });
        });
    });

    try {
        await new Promise((resolve, reject) => {
            server.once("error", reject);
            server.listen(0, "127.0.0.1", resolve);
        });
    } catch (error) {
        workspaceEntryRegistry.delete(entry);
        throw error;
    }
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    entry.server = server;
    entry.url = `http://127.0.0.1:${port}/`;
    entry.host = `127.0.0.1:${port}`;
    entry.origin = `http://${entry.host}`;
    return entry;
}

async function stopServer(entry) {
    workspaceEntryRegistry.delete(entry);
    for (const client of entry.clients) {
        closeEventClient(entry, client);
    }
    await new Promise((resolve) => entry.server.close(resolve));
}

const serverLifecycle = new InstanceLifecycle({
    pending: serverStarts,
    start: startServer,
    stop: stopServer,
    values: servers,
});

const canvas = createCanvas({
    id: "fourier-runtime-canvas",
    displayName: "Fourier Runtime Canvas",
    description: "Creates compact semantic presentations and hybrid scenes alongside frequency-only Fourier path assets and live sine-series signals.",
    inputSchema: SERIES_SCHEMA,
    actions: [
        {
            name: "update_series",
            description: "Replace or patch the Fourier series shown by this canvas.",
            inputSchema: SERIES_SCHEMA,
            handler: (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) {
                    throw new CanvasError("instance_not_open", "The canvas instance is not open.");
                }
                return updateEntry(entry, ctx.input);
            },
        },
        {
            name: "load_preset",
            description: "Load a sine, square, sawtooth, or triangle Fourier series preset.",
            inputSchema: {
                type: "object",
                required: ["preset"],
                properties: {
                    preset: {
                        type: "string",
                        enum: ["square", "sawtooth", "triangle", "sine"],
                    },
                },
                additionalProperties: false,
            },
            handler: (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) {
                    throw new CanvasError("instance_not_open", "The canvas instance is not open.");
                }
                return updateEntry(entry, { preset: ctx.input.preset });
            },
        },
        {
            name: "transform_drawing",
            description: "Transform raw path strokes into a frequency-only Fourier drawing asset and display it.",
            inputSchema: TRANSFORM_SCHEMA,
            handler: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) {
                    throw new CanvasError("instance_not_open", "The canvas instance is not open.");
                }
                try {
                    return await transformEntry(entry, ctx.input);
                } catch (error) {
                    throw new CanvasError("invalid_drawing", error.message);
                }
            },
        },
        {
            name: "get_frequency_asset",
            description: "Get the active frequency-domain drawing asset. The result contains coefficients, never source pixels or path points.",
            handler: (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) {
                    throw new CanvasError("instance_not_open", "The canvas instance is not open.");
                }
                if (!entry.asset) {
                    throw new CanvasError("asset_not_created", "No frequency-domain drawing asset has been created.");
                }
                return entry.asset;
            },
        },
        {
            name: "load_frequency_asset",
            description: "Load and display an existing fourier-path/v1 coefficient asset.",
            inputSchema: FREQUENCY_ASSET_SCHEMA,
            handler: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) {
                    throw new CanvasError("instance_not_open", "The canvas instance is not open.");
                }
                try {
                    return await setAsset(entry, ctx.input);
                } catch (error) {
                    throw new CanvasError("invalid_asset", error.message);
                }
            },
        },
        {
            name: "list_frequency_assets",
            description: "List frequency-only drawing assets available for composition layers.",
            handler: (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) {
                    throw new CanvasError("instance_not_open", "The canvas instance is not open.");
                }
                return assetSummaries(entry.assets);
            },
        },
        {
            name: "create_kpi_presentation",
            description: "Compact semantic action: create a responsive native text, threshold, and shared-scale bar presentation without Fourier assets or coefficient payloads.",
            inputSchema: KPI_CREATE_SCHEMA,
            handler: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) {
                    throw new CanvasError("instance_not_open", "The canvas instance is not open.");
                }
                try {
                    return await createKpiPresentation(entry, ctx.input);
                } catch (error) {
                    throw new CanvasError("invalid_kpi_presentation", error.message);
                }
            },
        },
        {
            name: "patch_kpi_presentation",
            description: "Compact semantic action: atomically patch KPI title, values, order, palette, timing, threshold, emphasis, or audio using an expected revision.",
            inputSchema: KPI_PATCH_SCHEMA,
            handler: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) {
                    throw new CanvasError("instance_not_open", "The canvas instance is not open.");
                }
                try {
                    return await patchKpiPresentation(entry, ctx.input);
                } catch (error) {
                    if (["stale_revision", "semantic_drift"].includes(error.code)) {
                        throw error;
                    }
                    throw new CanvasError("invalid_kpi_patch", error.message);
                }
            },
        },
        {
            name: "sync_kpi_presentation",
            description: "Explicit reconciliation action: derive supported KPI metadata from low-level owned semantic layer edits, rebuild those layers canonically, and preserve a history snapshot.",
            inputSchema: KPI_SYNC_SCHEMA,
            handler: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) {
                    throw new CanvasError("instance_not_open", "The canvas instance is not open.");
                }
                try {
                    return await syncKpiPresentation(entry, ctx.input);
                } catch (error) {
                    if (error.code === "stale_revision") {
                        throw error;
                    }
                    throw new CanvasError("invalid_kpi_reconciliation", error.message);
                }
            },
        },
        {
            name: "get_scene_summary",
            description: "Compact read action: get semantic scene metadata, active layer names and types, revision, artifact byte counts, and warnings without full state or coefficients.",
            handler: (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) {
                    throw new CanvasError("instance_not_open", "The canvas instance is not open.");
                }
                return getSceneSummary(entry);
            },
        },
        {
            name: "get_composition",
            description: "Advanced low-level action: get the full hybrid composition, including semantic content and Fourier timing/keyframes.",
            handler: (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) {
                    throw new CanvasError("instance_not_open", "The canvas instance is not open.");
                }
                return entry.composition;
            },
        },
        {
            name: "update_composition",
            description: "Advanced low-level action: replace the full hybrid composition and persist semantic layers plus Fourier timeline keyframes.",
            inputSchema: COMPOSITION_SCHEMA,
            handler: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) {
                    throw new CanvasError("instance_not_open", "The canvas instance is not open.");
                }
                try {
                    return await setComposition(entry, ctx.input);
                } catch (error) {
                    throw new CanvasError("invalid_composition", error.message);
                }
            },
        },
        {
            name: "get_composition_history",
            description: "Get undo and redo availability for the active Fourier composition.",
            handler: (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) {
                    throw new CanvasError("instance_not_open", "The canvas instance is not open.");
                }
                return historyStatus(entry.history);
            },
        },
        {
            name: "undo_composition",
            description: "Undo the most recent saved composition change.",
            handler: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) {
                    throw new CanvasError("instance_not_open", "The canvas instance is not open.");
                }
                try {
                    return await undoComposition(entry);
                } catch (error) {
                    throw new CanvasError("nothing_to_undo", error.message);
                }
            },
        },
        {
            name: "redo_composition",
            description: "Redo the most recently undone composition change.",
            handler: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) {
                    throw new CanvasError("instance_not_open", "The canvas instance is not open.");
                }
                try {
                    return await redoComposition(entry);
                } catch (error) {
                    throw new CanvasError("nothing_to_redo", error.message);
                }
            },
        },
        {
            name: "get_bridge_info",
            description: "Get the current state and loopback endpoints for script integration.",
            handler: (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) {
                    throw new CanvasError("instance_not_open", "The canvas instance is not open.");
                }
                return {
                    updateEndpoint: `${entry.url}api/series`,
                    transformEndpoint: `${entry.url}api/transform`,
                    assetEndpoint: `${entry.url}api/asset`,
                    assetsEndpoint: `${entry.url}api/assets`,
                    compositionEndpoint: `${entry.url}api/composition`,
                    historyEndpoint: `${entry.url}api/history`,
                    eventEndpoint: `${entry.url}events`,
                    capabilityHeader: CAPABILITY_HEADER,
                    capabilityToken: entry.capabilityToken,
                    state: entry.state,
                    asset: entry.asset,
                    composition: entry.composition,
                    history: historyStatus(entry.history),
                };
            },
        },
    ],
    open: async (ctx) => {
        const entry = await serverLifecycle.open(ctx.instanceId, ctx.input);
        return {
            title: entry.state.name,
            status: `${entry.state.terms.length} sine terms`,
            url: `${entry.url}?token=${encodeURIComponent(entry.capabilityToken)}`,
        };
    },
    onClose: (ctx) => serverLifecycle.close(ctx.instanceId),
});

copilotSession = await joinSession({ canvases: [canvas] });
