import { createHash } from "node:crypto";

const MAX_VALUES = 32;
const MAX_LABEL_LENGTH = 80;
const MAX_TITLE_LENGTH = 160;
const MAX_SUMMARY_LENGTH = 1200;
const MAX_TEXT_CHARACTERS = 2048;
const ASPECT_RATIOS = Object.freeze({
    "16:9": 16 / 9,
    "4:3": 4 / 3,
    "9:16": 9 / 16,
});
const ENTRY_MODES = Object.freeze(["rise", "fade", "none"]);
const EASINGS = Object.freeze(["linear", "ease-in", "ease-out", "ease-in-out"]);
const EMPHASIS_MODES = Object.freeze(["none", "highest", "threshold"]);
const STYLES = Object.freeze(["editorial", "technical", "minimal"]);
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;

const DEFAULT_PALETTE = Object.freeze({
    background: "#0d1117",
    surface: "#161b22",
    text: "#f0f6fc",
    muted: "#8b949e",
    axis: "#30363d",
    threshold: "#f85149",
    accent: "#2f81f7",
});

const DEFAULT_ENTRY = Object.freeze({
    mode: "rise",
    start: 0.35,
    duration: 0.75,
    stagger: 0.1,
    easing: "ease-out",
});

const DEFAULT_EMPHASIS = Object.freeze({
    mode: "highest",
    pulse: false,
});

const DEFAULT_AXIS = Object.freeze({
    show: true,
    label: "",
    ticks: 5,
});

const DEFAULT_THRESHOLD = Object.freeze({
    show: false,
    value: 0,
    label: "",
    color: DEFAULT_PALETTE.threshold,
});

const DEFAULT_AUDIO = Object.freeze({
    enabled: false,
    triggerTime: 0.35,
    baseFrequency: 220,
    gain: 0.04,
    duration: 0.16,
});

const COLOR_SCHEMA = {
    type: "string",
    pattern: "^#[0-9a-fA-F]{6}$",
};

const VALUE_SCHEMA = {
    type: "object",
    required: ["id", "label", "value", "color"],
    properties: {
        id: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$" },
        label: { type: "string", minLength: 1, maxLength: MAX_LABEL_LENGTH },
        value: { type: "number", minimum: 0, maximum: 1_000_000_000 },
        color: COLOR_SCHEMA,
    },
    additionalProperties: false,
};

const PALETTE_PROPERTIES = {
    background: COLOR_SCHEMA,
    surface: COLOR_SCHEMA,
    text: COLOR_SCHEMA,
    muted: COLOR_SCHEMA,
    axis: COLOR_SCHEMA,
    threshold: COLOR_SCHEMA,
    accent: COLOR_SCHEMA,
};

const ENTRY_PROPERTIES = {
    mode: { type: "string", enum: ENTRY_MODES },
    start: { type: "number", minimum: 0, maximum: 300 },
    duration: { type: "number", minimum: 0, maximum: 10 },
    stagger: { type: "number", minimum: 0, maximum: 5 },
    easing: { type: "string", enum: EASINGS },
};

const EMPHASIS_PROPERTIES = {
    mode: { type: "string", enum: EMPHASIS_MODES },
    pulse: { type: "boolean" },
};

const AXIS_PROPERTIES = {
    show: { type: "boolean" },
    label: { type: "string", maxLength: MAX_LABEL_LENGTH },
    ticks: { type: "integer", minimum: 2, maximum: 10 },
};

const THRESHOLD_PROPERTIES = {
    show: { type: "boolean" },
    value: { type: "number", minimum: 0, maximum: 1_000_000_000 },
    label: { type: "string", maxLength: MAX_LABEL_LENGTH },
    color: COLOR_SCHEMA,
};

const AUDIO_PROPERTIES = {
    enabled: { type: "boolean" },
    triggerTime: { type: "number", minimum: 0, maximum: 300 },
    baseFrequency: { type: "number", minimum: 40, maximum: 1200 },
    gain: { type: "number", minimum: 0, maximum: 0.2 },
    duration: { type: "number", minimum: 0.03, maximum: 2 },
};

export const KPI_CREATE_SCHEMA = Object.freeze({
    type: "object",
    required: ["sceneId", "name", "title", "duration", "values", "maxValue"],
    properties: {
        sceneId: {
            type: "string",
            maxLength: 110,
            pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,109}$",
        },
        name: { type: "string", minLength: 1, maxLength: 120 },
        title: { type: "string", minLength: 1, maxLength: MAX_TITLE_LENGTH },
        duration: { type: "number", minimum: 0.5, maximum: 300 },
        values: {
            type: "array",
            minItems: 1,
            maxItems: MAX_VALUES,
            items: VALUE_SCHEMA,
        },
        maxValue: { type: "number", exclusiveMinimum: 0, maximum: 1_000_000_000 },
        aspectRatio: { type: "string", enum: Object.keys(ASPECT_RATIOS) },
        style: { type: "string", enum: STYLES },
        palette: {
            type: "object",
            properties: PALETTE_PROPERTIES,
            additionalProperties: false,
        },
        entry: {
            type: "object",
            properties: ENTRY_PROPERTIES,
            additionalProperties: false,
        },
        emphasis: {
            type: "object",
            properties: EMPHASIS_PROPERTIES,
            additionalProperties: false,
        },
        axis: {
            type: "object",
            properties: AXIS_PROPERTIES,
            additionalProperties: false,
        },
        threshold: {
            type: "object",
            properties: THRESHOLD_PROPERTIES,
            additionalProperties: false,
        },
        audio: {
            type: "object",
            properties: AUDIO_PROPERTIES,
            additionalProperties: false,
        },
    },
    additionalProperties: false,
});

export const KPI_PATCH_SCHEMA = Object.freeze({
    type: "object",
    required: ["expectedRevision"],
    properties: {
        expectedRevision: { type: "integer", minimum: 0 },
        title: { type: "string", minLength: 1, maxLength: MAX_TITLE_LENGTH },
        duration: { type: "number", minimum: 0.5, maximum: 300 },
        maxValue: { type: "number", exclusiveMinimum: 0, maximum: 1_000_000_000 },
        style: { type: "string", enum: STYLES },
        aspectRatio: { type: "string", enum: Object.keys(ASPECT_RATIOS) },
        palette: {
            type: "object",
            properties: PALETTE_PROPERTIES,
            additionalProperties: false,
        },
        entry: {
            type: "object",
            properties: ENTRY_PROPERTIES,
            additionalProperties: false,
        },
        emphasis: {
            type: "object",
            properties: EMPHASIS_PROPERTIES,
            additionalProperties: false,
        },
        axis: {
            type: "object",
            properties: AXIS_PROPERTIES,
            additionalProperties: false,
        },
        threshold: {
            type: "object",
            properties: THRESHOLD_PROPERTIES,
            additionalProperties: false,
        },
        audio: {
            type: "object",
            properties: AUDIO_PROPERTIES,
            additionalProperties: false,
        },
        values: {
            type: "object",
            properties: {
                update: {
                    type: "array",
                    maxItems: MAX_VALUES,
                    items: {
                        type: "object",
                        required: ["id"],
                        properties: {
                            id: VALUE_SCHEMA.properties.id,
                            label: VALUE_SCHEMA.properties.label,
                            value: VALUE_SCHEMA.properties.value,
                            color: COLOR_SCHEMA,
                        },
                        additionalProperties: false,
                    },
                },
                add: {
                    type: "array",
                    maxItems: MAX_VALUES,
                    items: VALUE_SCHEMA,
                },
                remove: {
                    type: "array",
                    maxItems: MAX_VALUES,
                    uniqueItems: true,
                    items: VALUE_SCHEMA.properties.id,
                },
                order: {
                    type: "array",
                    maxItems: MAX_VALUES,
                    uniqueItems: true,
                    items: VALUE_SCHEMA.properties.id,
                },
            },
            additionalProperties: false,
        },
    },
    additionalProperties: false,
});

export const KPI_SYNC_SCHEMA = Object.freeze({
    type: "object",
    required: ["expectedRevision"],
    properties: {
        expectedRevision: { type: "integer", minimum: 0 },
    },
    additionalProperties: false,
});

export const KPI_PRESENTATION_LIMITS = Object.freeze({
    maxValues: MAX_VALUES,
    maxTextCharacters: MAX_TEXT_CHARACTERS,
    maxSummaryLength: MAX_SUMMARY_LENGTH,
});

function plainObject(value) {
    return value && typeof value === "object" && !Array.isArray(value);
}

function fitLayerToDuration(layer, duration) {
    const fitted = structuredClone(layer);
    fitted.start = Math.min(fitted.start, duration);
    fitted.end = Math.max(fitted.start, Math.min(fitted.end, duration));
    fitted.keyframes = fitted.keyframes.map((keyframe) => ({
        ...keyframe,
        time: Math.min(keyframe.time, duration),
    }));
    if (fitted.audio) {
        fitted.audio.triggerTime = Math.max(
            fitted.start,
            Math.min(fitted.audio.triggerTime, fitted.end),
        );
    }
    if (fitted.animation) {
        fitted.animation.start = Math.min(fitted.animation.start, duration);
        fitted.animation.duration = Math.min(
            fitted.animation.duration,
            Math.max(0, duration - fitted.animation.start),
        );
    }
    return fitted;
}

function allowedKeys(input, keys, label) {
    if (!plainObject(input)) {
        throw new Error(`${label} must be an object.`);
    }
    for (const key of Object.keys(input)) {
        if (!keys.has(key)) {
            throw new Error(`${label} contains unsupported field ${key}.`);
        }
    }
}

function text(value, fallback, maximum, label) {
    const result = value ?? fallback;
    if (typeof result !== "string" || !result.trim() || result.length > maximum) {
        throw new Error(`${label} must be a non-empty string of at most ${maximum} characters.`);
    }
    return result.trim();
}

function optionalText(value, fallback, maximum, label) {
    const result = value ?? fallback;
    if (typeof result !== "string" || result.length > maximum) {
        throw new Error(`${label} must be a string of at most ${maximum} characters.`);
    }
    return result.trim();
}

function number(value, fallback, minimum, maximum, label, exclusiveMinimum = false) {
    const result = value ?? fallback;
    if (
        !Number.isFinite(result)
        || (exclusiveMinimum ? result <= minimum : result < minimum)
        || result > maximum
    ) {
        const relation = exclusiveMinimum ? "greater than" : "at least";
        throw new Error(`${label} must be ${relation} ${minimum} and at most ${maximum}.`);
    }
    return result;
}

function boolean(value, fallback, label) {
    const result = value ?? fallback;
    if (typeof result !== "boolean") {
        throw new Error(`${label} must be a boolean.`);
    }
    return result;
}

function choice(value, fallback, choices, label) {
    const result = value ?? fallback;
    if (!choices.includes(result)) {
        throw new Error(`${label} is not supported.`);
    }
    return result;
}

function color(value, fallback, label) {
    const result = value ?? fallback;
    if (typeof result !== "string" || !HEX_COLOR.test(result)) {
        throw new Error(`${label} must be a six-digit hexadecimal color.`);
    }
    return result.toLowerCase();
}

function identifier(value, label) {
    if (typeof value !== "string" || !ID_PATTERN.test(value)) {
        throw new Error(`${label} must be a safe identifier of at most 120 characters.`);
    }
    return value;
}

function normalizePalette(input = {}, fallback = DEFAULT_PALETTE) {
    allowedKeys(input, new Set(Object.keys(PALETTE_PROPERTIES)), "Palette");
    return Object.fromEntries(
        Object.keys(PALETTE_PROPERTIES).map((key) => [
            key,
            color(input[key], fallback[key], `Palette ${key}`),
        ]),
    );
}

function normalizeEntry(input = {}, fallback = DEFAULT_ENTRY, duration = 8) {
    allowedKeys(input, new Set(Object.keys(ENTRY_PROPERTIES)), "Entry");
    const start = number(input.start, fallback.start, 0, duration, "Entry start");
    const entryDuration = number(input.duration, fallback.duration, 0, 10, "Entry duration");
    return {
        mode: choice(input.mode, fallback.mode, ENTRY_MODES, "Entry mode"),
        start,
        duration: Math.min(entryDuration, Math.max(0, duration - start)),
        stagger: number(input.stagger, fallback.stagger, 0, 5, "Entry stagger"),
        easing: choice(input.easing, fallback.easing, EASINGS, "Entry easing"),
    };
}

function normalizeEmphasis(input = {}, fallback = DEFAULT_EMPHASIS) {
    allowedKeys(input, new Set(Object.keys(EMPHASIS_PROPERTIES)), "Emphasis");
    return {
        mode: choice(input.mode, fallback.mode, EMPHASIS_MODES, "Emphasis mode"),
        pulse: boolean(input.pulse, fallback.pulse, "Emphasis pulse"),
    };
}

function normalizeAxis(input = {}, fallback = DEFAULT_AXIS) {
    allowedKeys(input, new Set(Object.keys(AXIS_PROPERTIES)), "Axis");
    const ticks = number(input.ticks, fallback.ticks, 2, 10, "Axis ticks");
    if (!Number.isSafeInteger(ticks)) {
        throw new Error("Axis ticks must be a safe integer.");
    }
    return {
        show: boolean(input.show, fallback.show, "Axis show"),
        label: optionalText(input.label, fallback.label, MAX_LABEL_LENGTH, "Axis label"),
        ticks,
    };
}

function normalizeThreshold(input = {}, fallback = DEFAULT_THRESHOLD, maxValue = 1) {
    allowedKeys(input, new Set(Object.keys(THRESHOLD_PROPERTIES)), "Threshold");
    return {
        show: boolean(input.show, fallback.show, "Threshold show"),
        value: number(input.value, fallback.value, 0, maxValue, "Threshold value"),
        label: optionalText(
            input.label,
            fallback.label,
            MAX_LABEL_LENGTH,
            "Threshold label",
        ),
        color: color(input.color, fallback.color, "Threshold color"),
    };
}

function normalizeAudio(input = {}, fallback = DEFAULT_AUDIO, duration = 8) {
    allowedKeys(input, new Set(Object.keys(AUDIO_PROPERTIES)), "Audio");
    return {
        enabled: boolean(input.enabled, fallback.enabled, "Audio enabled"),
        triggerTime: number(
            input.triggerTime,
            fallback.triggerTime,
            0,
            duration,
            "Audio trigger time",
        ),
        baseFrequency: number(
            input.baseFrequency,
            fallback.baseFrequency,
            40,
            1200,
            "Audio base frequency",
        ),
        gain: number(input.gain, fallback.gain, 0, 0.2, "Audio gain"),
        duration: number(input.duration, fallback.duration, 0.03, 2, "Audio duration"),
    };
}

function normalizeValue(input, maxValue, label) {
    allowedKeys(input, new Set(["id", "label", "value", "color"]), label);
    return {
        id: identifier(input.id, `${label} ID`),
        label: text(input.label, undefined, MAX_LABEL_LENGTH, `${label} label`),
        value: number(input.value, undefined, 0, maxValue, `${label} value`),
        color: color(input.color, undefined, `${label} color`),
    };
}

function normalizeValues(input, maxValue) {
    if (!Array.isArray(input) || input.length < 1 || input.length > MAX_VALUES) {
        throw new Error(`A KPI presentation must contain at most ${MAX_VALUES} values and at least one.`);
    }
    const values = input.map((value, index) => normalizeValue(
        value,
        maxValue,
        `Value ${index + 1}`,
    ));
    const ids = new Set();
    for (const value of values) {
        if (ids.has(value.id)) {
            throw new Error(`KPI values contain duplicate ID ${value.id}.`);
        }
        ids.add(value.id);
    }
    return values;
}

function accessibleSummary(title, values, maxValue, axis, threshold) {
    const parts = [
        title,
        ...values.map((value) => `${value.label} ${value.value}`),
        `Scale maximum ${maxValue}`,
    ];
    if (axis.show && axis.label) {
        parts.push(`Axis ${axis.label}`);
    }
    if (threshold.show) {
        parts.push(`${threshold.label || "Threshold"} target ${threshold.value}`);
    }
    return parts.join(". ").slice(0, MAX_SUMMARY_LENGTH);
}

function semanticAudio(audio) {
    return {
        ...audio,
        partialCount: 1,
    };
}

function ownedSemanticLayers(composition) {
    const expected = [
        [`${composition.id}-title`, "text"],
        [`${composition.id}-bars`, "bar-chart"],
        [`${composition.id}-threshold`, "line"],
    ];
    return expected.flatMap(([id, type]) => {
        const layer = composition.layers.find((candidate) => (
            candidate.id === id
            && candidate.type === type
            && (type !== "line" || candidate.semantic?.role === "threshold")
        ));
        return layer ? [{
            id: layer.id,
            name: layer.name,
            type: layer.type,
            start: layer.start,
            end: layer.end,
            zIndex: layer.zIndex,
            semantic: layer.semantic,
            animation: layer.animation,
            audio: layer.audio,
            keyframes: layer.keyframes,
        }] : [];
    });
}

export function semanticLayerFingerprint(composition) {
    return createHash("sha256")
        .update(JSON.stringify(ownedSemanticLayers(composition)))
        .digest("hex");
}

function assertSemanticOwnership(composition) {
    const current = semanticLayerFingerprint(composition);
    if (composition.presentation?.semanticLayerFingerprint !== current) {
        const error = new Error(
            "Owned semantic layers changed outside compact KPI actions. "
            + "Run sync_kpi_presentation before applying another compact patch.",
        );
        error.code = "semantic_drift";
        error.currentRevision = composition.revision;
        error.warnings = [
            "Compact patch rejected to preserve low-level semantic layer edits.",
        ];
        throw error;
    }
}

function compileComposition(config, revision) {
    const layers = [
        {
            id: `${config.sceneId}-title`,
            name: "Presentation title",
            type: "text",
            start: 0,
            end: config.duration,
            zIndex: 100,
            semantic: {
                role: "title",
                text: config.title,
                color: config.palette.text,
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 700,
                align: "left",
            },
            animation: {
                ...config.entry,
                staggerIndex: 0,
                emphasis: { mode: "none", pulse: false },
            },
            audio: semanticAudio({ ...config.audio, enabled: false }),
            keyframes: [],
        },
        {
            id: `${config.sceneId}-bars`,
            name: "KPI bars",
            type: "bar-chart",
            start: 0,
            end: config.duration,
            zIndex: 20,
            semantic: {
                values: config.values,
                maxValue: config.maxValue,
                axis: config.axis,
            },
            animation: {
                ...config.entry,
                staggerIndex: 1,
                emphasis: config.emphasis,
            },
            audio: semanticAudio(config.audio),
            keyframes: [],
        },
    ];
    if (config.threshold.show) {
        layers.push({
            id: `${config.sceneId}-threshold`,
            name: config.threshold.label
                ? `${config.threshold.label} threshold`
                : "KPI threshold",
            type: "line",
            start: 0,
            end: config.duration,
            zIndex: 50,
            semantic: {
                role: "threshold",
                value: config.threshold.value,
                label: config.threshold.label,
                color: config.threshold.color,
                width: 2,
                style: "dashed",
            },
            animation: {
                ...config.entry,
                staggerIndex: 2,
                emphasis: { mode: "none", pulse: false },
            },
            audio: semanticAudio({ ...config.audio, enabled: false }),
            keyframes: [],
        });
    }
    const summary = accessibleSummary(
        config.title,
        config.values,
        config.maxValue,
        config.axis,
        config.threshold,
    );
    const textCharacterCount = config.title.length
        + config.values.reduce((sum, value) => sum + value.label.length, 0)
        + config.axis.label.length
        + config.threshold.label.length
        + summary.length;
    if (textCharacterCount > MAX_TEXT_CHARACTERS) {
        throw new Error(
            `Presentation text exceeds the ${MAX_TEXT_CHARACTERS}-character aggregate limit.`,
        );
    }
    const composition = {
        id: config.sceneId,
        format: "fourier-composition/v1",
        revision,
        name: config.name,
        duration: config.duration,
        updatedAt: new Date().toISOString(),
        presentation: {
            title: config.title,
            aspectRatio: config.aspectRatio,
            style: config.style,
            palette: config.palette,
            safeArea: 0.075,
            entry: config.entry,
            emphasis: config.emphasis,
            axis: config.axis,
            threshold: config.threshold,
            audio: config.audio,
            accessibleSummary: summary,
            semanticLayerFingerprint: "",
        },
        layers,
    };
    composition.presentation.semanticLayerFingerprint = semanticLayerFingerprint(composition);
    return composition;
}

function normalizeCreateSpec(input) {
    allowedKeys(input, new Set(Object.keys(KPI_CREATE_SCHEMA.properties)), "KPI presentation");
    const duration = number(input.duration, undefined, 0.5, 300, "Duration");
    const maxValue = number(input.maxValue, undefined, 0, 1_000_000_000, "Maximum value", true);
    const palette = normalizePalette(input.palette);
    const thresholdFallback = { ...DEFAULT_THRESHOLD, color: palette.threshold };
    const config = {
        sceneId: identifier(input.sceneId, "Scene ID"),
        name: text(input.name, undefined, 120, "Scene name"),
        title: text(input.title, undefined, MAX_TITLE_LENGTH, "Presentation title"),
        duration,
        values: normalizeValues(input.values, maxValue),
        maxValue,
        aspectRatio: choice(input.aspectRatio, "16:9", Object.keys(ASPECT_RATIOS), "Aspect ratio"),
        style: choice(input.style, "editorial", STYLES, "Presentation style"),
        palette,
        entry: normalizeEntry(input.entry, DEFAULT_ENTRY, duration),
        emphasis: normalizeEmphasis(input.emphasis),
        axis: normalizeAxis(input.axis),
        threshold: normalizeThreshold(input.threshold, thresholdFallback, maxValue),
        audio: normalizeAudio(input.audio, DEFAULT_AUDIO, duration),
    };
    if (config.sceneId.length > 110) {
        throw new Error("Scene ID must contain at most 110 characters.");
    }
    return config;
}

function configFromComposition(composition) {
    const presentation = composition.presentation;
    const bars = composition.layers.find(
        (layer) => layer.id === `${composition.id}-bars` && layer.type === "bar-chart",
    );
    if (!presentation || !bars) {
        throw new Error("The active composition is not a semantic KPI presentation.");
    }
    return {
        sceneId: composition.id,
        name: composition.name,
        title: presentation.title,
        duration: composition.duration,
        values: structuredClone(bars.semantic.values),
        maxValue: bars.semantic.maxValue,
        aspectRatio: presentation.aspectRatio,
        style: presentation.style,
        palette: structuredClone(presentation.palette),
        entry: structuredClone(presentation.entry),
        emphasis: structuredClone(presentation.emphasis),
        axis: structuredClone(presentation.axis),
        threshold: structuredClone(presentation.threshold),
        audio: structuredClone(presentation.audio),
    };
}

function configFromOwnedLayers(composition) {
    const presentation = composition.presentation;
    const title = composition.layers.find((layer) => (
        layer.id === `${composition.id}-title` && layer.type === "text"
    ));
    const bars = composition.layers.find((layer) => (
        layer.id === `${composition.id}-bars` && layer.type === "bar-chart"
    ));
    const threshold = composition.layers.find((layer) => (
        layer.id === `${composition.id}-threshold`
        && layer.type === "line"
        && layer.semantic?.role === "threshold"
    ));
    if (!presentation || !title || !bars) {
        throw new Error(
            "Reconciliation requires the deterministic KPI title and bar-chart layers.",
        );
    }
    const entry = {
        mode: bars.animation.mode,
        start: bars.animation.start,
        duration: bars.animation.duration,
        stagger: bars.animation.stagger,
        easing: bars.animation.easing,
    };
    const audio = {
        enabled: bars.audio.enabled,
        triggerTime: bars.audio.triggerTime,
        baseFrequency: bars.audio.baseFrequency,
        gain: bars.audio.gain,
        duration: bars.audio.duration,
    };
    const palette = {
        ...structuredClone(presentation.palette),
        text: title.semantic.color,
        ...(threshold ? { threshold: threshold.semantic.color } : {}),
    };
    return {
        sceneId: composition.id,
        name: composition.name,
        title: title.semantic.text,
        duration: composition.duration,
        values: structuredClone(bars.semantic.values),
        maxValue: bars.semantic.maxValue,
        aspectRatio: presentation.aspectRatio,
        style: presentation.style,
        palette,
        entry,
        emphasis: structuredClone(bars.animation.emphasis),
        axis: structuredClone(bars.semantic.axis),
        threshold: threshold ? {
            show: true,
            value: threshold.semantic.value,
            label: threshold.semantic.label,
            color: threshold.semantic.color,
        } : {
            show: false,
            value: 0,
            label: "",
            color: palette.threshold,
        },
        audio,
    };
}

function patchValues(current, patch, maxValue) {
    if (patch === undefined) {
        return normalizeValues(current, maxValue);
    }
    allowedKeys(patch, new Set(["update", "add", "remove", "order"]), "Value patch");
    const valuesById = new Map(current.map((value) => [value.id, structuredClone(value)]));
    for (const id of patch.remove ?? []) {
        identifier(id, "Removed value ID");
        if (!valuesById.delete(id)) {
            throw new Error(`Cannot remove unknown KPI value ${id}.`);
        }
    }
    for (const update of patch.update ?? []) {
        allowedKeys(update, new Set(["id", "label", "value", "color"]), "Value update");
        const id = identifier(update.id, "Updated value ID");
        const existing = valuesById.get(id);
        if (!existing) {
            throw new Error(`Cannot update unknown KPI value ${id}.`);
        }
        valuesById.set(id, normalizeValue({ ...existing, ...update }, maxValue, `Value ${id}`));
    }
    for (const value of patch.add ?? []) {
        const normalized = normalizeValue(value, maxValue, "Added value");
        if (valuesById.has(normalized.id)) {
            throw new Error(`Cannot add duplicate KPI value ${normalized.id}.`);
        }
        valuesById.set(normalized.id, normalized);
    }
    let values = [...valuesById.values()];
    if (patch.order !== undefined) {
        if (
            !Array.isArray(patch.order)
            || patch.order.length !== values.length
            || new Set(patch.order).size !== values.length
            || patch.order.some((id) => !valuesById.has(id))
        ) {
            throw new Error("Value order must contain every active KPI value ID exactly once.");
        }
        values = patch.order.map((id) => valuesById.get(id));
    }
    return normalizeValues(values, maxValue);
}

export function createKpiComposition(input, options = {}) {
    const revision = options.revision ?? 0;
    if (!Number.isSafeInteger(revision) || revision < 0) {
        throw new Error("Composition revision must be a non-negative safe integer.");
    }
    return compileComposition(normalizeCreateSpec(input), revision);
}

export function patchKpiComposition(composition, input) {
    allowedKeys(input, new Set(Object.keys(KPI_PATCH_SCHEMA.properties)), "KPI patch");
    if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) {
        throw new Error("Expected revision must be a non-negative safe integer.");
    }
    if (input.expectedRevision !== composition.revision) {
        const error = new Error("Composition revision is stale.");
        error.code = "stale_revision";
        throw error;
    }
    assertSemanticOwnership(composition);
    const current = configFromComposition(composition);
    const duration = number(input.duration, current.duration, 0.5, 300, "Duration");
    const maxValue = number(
        input.maxValue,
        current.maxValue,
        0,
        1_000_000_000,
        "Maximum value",
        true,
    );
    const palette = normalizePalette(input.palette ?? {}, current.palette);
    const fittedEntry = {
        ...current.entry,
        start: Math.min(current.entry.start, duration),
        duration: Math.min(
            current.entry.duration,
            Math.max(0, duration - Math.min(current.entry.start, duration)),
        ),
    };
    const fittedAudio = {
        ...current.audio,
        triggerTime: Math.min(current.audio.triggerTime, duration),
    };
    const config = {
        ...current,
        title: text(input.title, current.title, MAX_TITLE_LENGTH, "Presentation title"),
        duration,
        maxValue,
        aspectRatio: choice(
            input.aspectRatio,
            current.aspectRatio,
            Object.keys(ASPECT_RATIOS),
            "Aspect ratio",
        ),
        style: choice(input.style, current.style, STYLES, "Presentation style"),
        palette,
        values: patchValues(current.values, input.values, maxValue),
        entry: normalizeEntry(input.entry ?? {}, fittedEntry, duration),
        emphasis: normalizeEmphasis(input.emphasis ?? {}, current.emphasis),
        axis: normalizeAxis(input.axis ?? {}, current.axis),
        threshold: normalizeThreshold(
            input.threshold ?? {},
            { ...current.threshold, color: current.threshold.color ?? palette.threshold },
            maxValue,
        ),
        audio: normalizeAudio(input.audio ?? {}, fittedAudio, duration),
    };
    const compiled = compileComposition(config, composition.revision);
    const ownedLayerTypes = new Map([
        [`${config.sceneId}-title`, "text"],
        [`${config.sceneId}-bars`, "bar-chart"],
        [`${config.sceneId}-threshold`, "line"],
    ]);
    const compiledById = new Map(compiled.layers.map((layer) => [layer.id, layer]));
    const layers = composition.layers.flatMap((layer) => {
        const expectedType = ownedLayerTypes.get(layer.id);
        const isOwned = layer.type === expectedType && (
            expectedType !== "line" || layer.semantic?.role === "threshold"
        );
        if (!isOwned) {
            return [fitLayerToDuration(layer, config.duration)];
        }
        const replacement = compiledById.get(layer.id);
        compiledById.delete(layer.id);
        return replacement ? [replacement] : [];
    });
    for (const layerId of compiledById.keys()) {
        if (layers.some((layer) => layer.id === layerId)) {
            throw new Error(
                `Cannot create KPI layer ${layerId} because another layer already uses that ID.`,
            );
        }
    }
    layers.push(...compiledById.values());
    return {
        ...compiled,
        layers,
    };
}

export function syncKpiComposition(composition, input) {
    allowedKeys(input, new Set(["expectedRevision"]), "KPI reconciliation");
    if (
        !Number.isSafeInteger(input.expectedRevision)
        || input.expectedRevision !== composition.revision
    ) {
        const error = new Error("Composition revision is stale.");
        error.code = "stale_revision";
        throw error;
    }
    const compiled = compileComposition(
        configFromOwnedLayers(composition),
        composition.revision,
    );
    const compiledById = new Map(compiled.layers.map((layer) => [layer.id, layer]));
    const layers = composition.layers.flatMap((layer) => {
        const replacement = compiledById.get(layer.id);
        if (!replacement) {
            return [layer];
        }
        compiledById.delete(layer.id);
        return [replacement];
    });
    layers.push(...compiledById.values());
    const reconciled = { ...compiled, layers };
    reconciled.presentation.semanticLayerFingerprint = semanticLayerFingerprint(reconciled);
    return reconciled;
}

export function responsiveSceneLayout(
    viewportWidth,
    viewportHeight,
    aspectRatio,
    maxValue,
    valueCount,
) {
    const width = number(viewportWidth, undefined, 1, 100_000, "Viewport width");
    const height = number(viewportHeight, undefined, 1, 100_000, "Viewport height");
    const ratio = ASPECT_RATIOS[aspectRatio];
    if (!ratio) {
        throw new Error("Aspect ratio is not supported.");
    }
    const sceneWidth = Math.min(width, height * ratio);
    const sceneHeight = sceneWidth / ratio;
    const scene = {
        left: (width - sceneWidth) / 2,
        top: (height - sceneHeight) / 2,
        width: sceneWidth,
        height: sceneHeight,
    };
    const inset = Math.max(8, Math.min(sceneWidth, sceneHeight) * 0.075);
    const safe = {
        left: scene.left + inset,
        top: scene.top + inset,
        right: scene.left + scene.width - inset,
        bottom: scene.top + scene.height - inset,
    };
    const titleHeight = Math.max(32, sceneHeight * 0.14);
    const labelHeight = Math.max(28, sceneHeight * 0.1);
    const axisWidth = Math.max(36, sceneWidth * 0.055);
    const plot = {
        left: safe.left + axisWidth,
        top: safe.top + titleHeight,
        width: Math.max(1, safe.right - safe.left - axisWidth),
        height: Math.max(1, safe.bottom - safe.top - titleHeight - labelHeight),
    };
    const count = Math.max(1, Math.min(MAX_VALUES, Math.floor(valueCount)));
    const slotWidth = plot.width / count;
    const barWidth = slotWidth * (count > 16 ? 0.62 : 0.7);
    const bars = Array.from({ length: count }, (_, index) => ({
        left: plot.left + (slotWidth * index) + ((slotWidth - barWidth) / 2),
        width: barWidth,
        center: plot.left + slotWidth * (index + 0.5),
    }));
    const maximum = number(maxValue, undefined, 0, 1_000_000_000, "Maximum value", true);
    return {
        scene,
        safe,
        plot,
        bars,
        valueScale: (value) => (
            Math.max(0, Math.min(maximum, value)) / maximum
        ) * plot.height,
    };
}

export function presentationSummary(composition, details = {}) {
    const layerSummaries = composition.layers.map((layer) => ({
        id: layer.id,
        name: layer.name,
        type: layer.type ?? "fourier",
    }));
    const changedLayerIds = details.changedLayerIds ?? [];
    return {
        revision: composition.revision,
        scene: {
            id: composition.id,
            name: composition.name,
            title: composition.presentation?.title ?? null,
            duration: composition.duration,
            aspectRatio: composition.presentation?.aspectRatio ?? null,
            style: composition.presentation?.style ?? null,
            accessibleSummary: composition.presentation?.accessibleSummary ?? null,
        },
        layers: layerSummaries,
        changedLayerIds,
        changedLayerCount: changedLayerIds.length,
        artifacts: {
            frequencyAssetCount: details.assetCount ?? 0,
            frequencyAssetBytes: details.assetBytes ?? 0,
            compositionBytes: details.compositionBytes ?? 0,
            historyBytes: details.historyBytes ?? 0,
            totalPersistedBytes: (
                (details.assetBytes ?? 0)
                + (details.compositionBytes ?? 0)
                + (details.historyBytes ?? 0)
            ),
        },
        warnings: (details.warnings ?? []).slice(0, 16),
    };
}

export function presentationMutationSummary(composition, details = {}) {
    const changedLayerIds = details.changedLayerIds ?? [];
    return {
        revision: composition.revision,
        changedLayerIds,
        changedLayerCount: changedLayerIds.length,
        warnings: (details.warnings ?? []).slice(0, 16),
        persistedBytes: {
            composition: details.compositionBytes ?? 0,
            history: details.historyBytes ?? 0,
            assets: details.assetBytes ?? 0,
            total: (
                (details.assetBytes ?? 0)
                + (details.compositionBytes ?? 0)
                + (details.historyBytes ?? 0)
            ),
        },
    };
}

export function presentationWarnings(composition) {
    const warnings = [];
    if (
        composition.presentation
        && composition.presentation.semanticLayerFingerprint
            !== semanticLayerFingerprint(composition)
    ) {
        warnings.push(
            "Owned semantic layers diverged from compact presentation metadata; "
            + "run sync_kpi_presentation before patching.",
        );
    }
    const bars = composition.layers.find((layer) => layer.type === "bar-chart");
    const valueCount = bars?.semantic.values.length ?? 0;
    if (valueCount > 16) {
        warnings.push("Dense chart: labels are abbreviated at narrow widths.");
    }
    if (composition.presentation?.aspectRatio === "9:16" && valueCount > 8) {
        warnings.push("Portrait chart: consider eight or fewer values for larger labels.");
    }
    if (composition.presentation?.audio.enabled && composition.duration < 1) {
        warnings.push("Audio cue may overlap the end of this short presentation.");
    }
    return warnings;
}
