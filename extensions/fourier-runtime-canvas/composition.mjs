import { randomUUID } from "node:crypto";

const MAX_LAYERS = 64;
const MAX_KEYFRAMES_PER_LAYER = 128;
const MAX_ROTATION_MAGNITUDE = 1_000_000;
const MAX_SEED_MAGNITUDE = 1_000_000;
const MAX_Z_INDEX_MAGNITUDE = 1_000_000;
const MAX_TOTAL_KEYFRAMES = 1024;
const MAX_SCENE_COEFFICIENTS = 8192;
const MAX_SCENE_STROKES = 256;
const MAX_SEMANTIC_VALUES = 32;
const MAX_SEMANTIC_TEXT_CHARACTERS = 2048;
const SEMANTIC_LAYER_TYPES = new Set(["text", "bar-chart", "line"]);
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const PROPERTY_DEFAULTS = Object.freeze({
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
    reveal: 1,
});

function finite(value, fallback, label) {
    const result = value ?? fallback;
    if (!Number.isFinite(result)) {
        throw new Error(`${label} must be a finite number.`);
    }
    return result;
}

function bounded(value, fallback, minimum, maximum, label) {
    const result = finite(value, fallback, label);
    if (result < minimum || result > maximum) {
        throw new Error(`${label} must be from ${minimum} to ${maximum}.`);
    }
    return result;
}

function boundedInteger(value, fallback, minimum, maximum, label) {
    const result = bounded(value, fallback, minimum, maximum, label);
    if (!Number.isSafeInteger(result)) {
        throw new Error(`${label} must be a safe integer.`);
    }
    return result;
}

function validId(value) {
    return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(value);
}

function plainObject(value) {
    return value && typeof value === "object" && !Array.isArray(value);
}

function assertAllowedKeys(input, allowed, label) {
    if (!plainObject(input)) {
        throw new Error(`${label} must be an object.`);
    }
    for (const key of Object.keys(input)) {
        if (!allowed.has(key)) {
            throw new Error(`${label} contains unsupported field ${key}.`);
        }
    }
}

function normalizeKeyframe(
    input,
    duration,
    label,
    assetIds,
    fallbackAssetId,
    requiresAsset = true,
) {
    if (!plainObject(input)) {
        throw new Error(`${label} must be an object.`);
    }
    assertAllowedKeys(
        input,
        new Set([
            "time",
            "assetId",
            "x",
            "y",
            "scale",
            "rotation",
            "opacity",
            "reveal",
            "easing",
        ]),
        label,
    );
    if (
        input.easing !== undefined
        && !["linear", "ease-in", "ease-out", "ease-in-out"].includes(input.easing)
    ) {
        throw new Error(`${label} easing is not supported.`);
    }
    const assetId = input.assetId ?? fallbackAssetId;
    if (requiresAsset && (!validId(assetId) || !assetIds.has(assetId))) {
        throw new Error(`${label} references an unavailable Fourier asset.`);
    }
    if (!requiresAsset && input.assetId !== undefined) {
        throw new Error(`${label} cannot reference a Fourier asset on a semantic layer.`);
    }
    return {
        time: bounded(input.time, 0, 0, duration, `${label} time`),
        ...(requiresAsset ? { assetId } : {}),
        x: bounded(input.x, PROPERTY_DEFAULTS.x, -2, 2, `${label} x`),
        y: bounded(input.y, PROPERTY_DEFAULTS.y, -2, 2, `${label} y`),
        scale: bounded(input.scale, PROPERTY_DEFAULTS.scale, 0, 10, `${label} scale`),
        rotation: bounded(
            input.rotation,
            PROPERTY_DEFAULTS.rotation,
            -MAX_ROTATION_MAGNITUDE,
            MAX_ROTATION_MAGNITUDE,
            `${label} rotation`,
        ),
        opacity: bounded(input.opacity, PROPERTY_DEFAULTS.opacity, 0, 1, `${label} opacity`),
        reveal: bounded(input.reveal, PROPERTY_DEFAULTS.reveal, 0, 1, `${label} reveal`),
        easing: ["linear", "ease-in", "ease-out", "ease-in-out"].includes(input.easing)
            ? input.easing
            : "ease-in-out",
    };
}

function requiredString(value, maximum, label, allowEmpty = false) {
    if (
        typeof value !== "string"
        || (!allowEmpty && !value.trim())
        || value.length > maximum
    ) {
        const qualifier = allowEmpty ? "a" : "a non-empty";
        throw new Error(`${label} must be ${qualifier} string of at most ${maximum} characters.`);
    }
    return value.trim();
}

function color(value, label) {
    if (typeof value !== "string" || !HEX_COLOR.test(value)) {
        throw new Error(`${label} must be a six-digit hexadecimal color.`);
    }
    return value.toLowerCase();
}

function normalizeAxis(input, label) {
    assertAllowedKeys(input, new Set(["show", "label", "ticks"]), label);
    if (typeof input.show !== "boolean") {
        throw new Error(`${label} show must be a boolean.`);
    }
    const ticks = boundedInteger(input.ticks, 5, 2, 10, `${label} ticks`);
    return {
        show: input.show,
        label: requiredString(input.label ?? "", 80, `${label} label`, true),
        ticks,
    };
}

function normalizeEntry(input, duration, label) {
    assertAllowedKeys(
        input,
        new Set(["mode", "start", "duration", "stagger", "easing"]),
        label,
    );
    if (!["rise", "fade", "none"].includes(input.mode)) {
        throw new Error(`${label} mode is not supported.`);
    }
    if (!["linear", "ease-in", "ease-out", "ease-in-out"].includes(input.easing)) {
        throw new Error(`${label} easing is not supported.`);
    }
    return {
        mode: input.mode,
        start: bounded(input.start, 0, 0, duration, `${label} start`),
        duration: bounded(input.duration, 0, 0, 10, `${label} duration`),
        stagger: bounded(input.stagger, 0, 0, 5, `${label} stagger`),
        easing: input.easing,
    };
}

function normalizeEmphasis(input, label) {
    assertAllowedKeys(input, new Set(["mode", "pulse"]), label);
    if (!["none", "highest", "threshold"].includes(input.mode)) {
        throw new Error(`${label} mode is not supported.`);
    }
    if (typeof input.pulse !== "boolean") {
        throw new Error(`${label} pulse must be a boolean.`);
    }
    return { mode: input.mode, pulse: input.pulse };
}

function normalizePresentation(input, duration) {
    if (input === undefined) {
        return null;
    }
    assertAllowedKeys(
        input,
        new Set([
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
        ]),
        "Presentation",
    );
    if (!["16:9", "4:3", "9:16"].includes(input.aspectRatio)) {
        throw new Error("Presentation aspect ratio is not supported.");
    }
    if (!["editorial", "technical", "minimal"].includes(input.style)) {
        throw new Error("Presentation style is not supported.");
    }
    assertAllowedKeys(
        input.palette,
        new Set(["background", "surface", "text", "muted", "axis", "threshold", "accent"]),
        "Presentation palette",
    );
    const palette = Object.fromEntries(
        ["background", "surface", "text", "muted", "axis", "threshold", "accent"]
            .map((key) => [key, color(input.palette[key], `Presentation palette ${key}`)]),
    );
    assertAllowedKeys(
        input.threshold,
        new Set(["show", "value", "label", "color"]),
        "Presentation threshold",
    );
    if (typeof input.threshold.show !== "boolean") {
        throw new Error("Presentation threshold show must be a boolean.");
    }
    assertAllowedKeys(
        input.audio,
        new Set(["enabled", "triggerTime", "baseFrequency", "gain", "duration"]),
        "Presentation audio",
    );
    if (typeof input.audio.enabled !== "boolean") {
        throw new Error("Presentation audio enabled must be a boolean.");
    }
    return {
        title: requiredString(input.title, 160, "Presentation title"),
        aspectRatio: input.aspectRatio,
        style: input.style,
        palette,
        safeArea: bounded(input.safeArea, 0.075, 0.04, 0.15, "Presentation safe area"),
        entry: normalizeEntry(input.entry, duration, "Presentation entry"),
        emphasis: normalizeEmphasis(input.emphasis, "Presentation emphasis"),
        axis: normalizeAxis(input.axis, "Presentation axis"),
        threshold: {
            show: input.threshold.show,
            value: bounded(
                input.threshold.value,
                0,
                0,
                1_000_000_000,
                "Presentation threshold value",
            ),
            label: requiredString(
                input.threshold.label ?? "",
                80,
                "Presentation threshold label",
                true,
            ),
            color: color(input.threshold.color, "Presentation threshold color"),
        },
        audio: {
            enabled: input.audio.enabled,
            triggerTime: bounded(
                input.audio.triggerTime,
                0,
                0,
                duration,
                "Presentation audio trigger",
            ),
            baseFrequency: bounded(
                input.audio.baseFrequency,
                220,
                40,
                1200,
                "Presentation audio pitch",
            ),
            gain: bounded(input.audio.gain, 0.04, 0, 0.2, "Presentation audio gain"),
            duration: bounded(
                input.audio.duration,
                0.16,
                0.03,
                2,
                "Presentation audio duration",
            ),
        },
        accessibleSummary: requiredString(
            input.accessibleSummary,
            1200,
            "Presentation accessible summary",
        ),
        semanticLayerFingerprint: (
            typeof input.semanticLayerFingerprint === "string"
            && /^[0-9a-f]{64}$/.test(input.semanticLayerFingerprint)
        )
            ? input.semanticLayerFingerprint
            : (() => {
                throw new Error(
                    "Presentation semantic layer fingerprint must be a SHA-256 digest.",
                );
            })(),
    };
}

function normalizeSemantic(input, type, index) {
    const label = `Layer ${index + 1} semantic content`;
    if (type === "text") {
        assertAllowedKeys(
            input,
            new Set(["role", "text", "color", "fontFamily", "fontWeight", "align"]),
            label,
        );
        if (!["title", "label", "annotation"].includes(input.role)) {
            throw new Error(`${label} role is not supported.`);
        }
        if (!["left", "center", "right"].includes(input.align)) {
            throw new Error(`${label} alignment is not supported.`);
        }
        return {
            role: input.role,
            text: requiredString(input.text, 500, `${label} text`),
            color: color(input.color, `${label} color`),
            fontFamily: requiredString(input.fontFamily, 120, `${label} font family`),
            fontWeight: boundedInteger(
                input.fontWeight,
                700,
                100,
                900,
                `${label} font weight`,
            ),
            align: input.align,
        };
    }
    if (type === "bar-chart") {
        assertAllowedKeys(input, new Set(["values", "maxValue", "axis"]), label);
        const maxValue = bounded(
            input.maxValue,
            undefined,
            Number.MIN_VALUE,
            1_000_000_000,
            `${label} maximum value`,
        );
        if (
            !Array.isArray(input.values)
            || input.values.length < 1
            || input.values.length > MAX_SEMANTIC_VALUES
        ) {
            throw new Error(
                `${label} must contain 1 to ${MAX_SEMANTIC_VALUES} values.`,
            );
        }
        const ids = new Set();
        const values = input.values.map((value, valueIndex) => {
            assertAllowedKeys(
                value,
                new Set(["id", "label", "value", "color"]),
                `${label} value ${valueIndex + 1}`,
            );
            if (!validId(value.id) || ids.has(value.id)) {
                throw new Error(`${label} contains an invalid or duplicate value ID.`);
            }
            ids.add(value.id);
            return {
                id: value.id,
                label: requiredString(
                    value.label,
                    80,
                    `${label} value ${valueIndex + 1} label`,
                ),
                value: bounded(
                    value.value,
                    undefined,
                    0,
                    maxValue,
                    `${label} value ${valueIndex + 1}`,
                ),
                color: color(value.color, `${label} value ${valueIndex + 1} color`),
            };
        });
        return {
            values,
            maxValue,
            axis: normalizeAxis(input.axis, `${label} axis`),
        };
    }
    assertAllowedKeys(
        input,
        new Set(["role", "value", "label", "color", "width", "style"]),
        label,
    );
    if (input.role !== "threshold") {
        throw new Error(`${label} role is not supported.`);
    }
    if (!["solid", "dashed"].includes(input.style)) {
        throw new Error(`${label} style is not supported.`);
    }
    return {
        role: "threshold",
        value: bounded(input.value, 0, 0, 1_000_000_000, `${label} value`),
        label: requiredString(input.label ?? "", 80, `${label} label`, true),
        color: color(input.color, `${label} color`),
        width: bounded(input.width, 2, 1, 8, `${label} width`),
        style: input.style,
    };
}

function normalizeAnimation(input, duration, index) {
    assertAllowedKeys(
        input,
        new Set(["mode", "start", "duration", "stagger", "easing", "staggerIndex", "emphasis"]),
        `Layer ${index + 1} animation`,
    );
    const entry = normalizeEntry({
        mode: input.mode,
        start: input.start,
        duration: input.duration,
        stagger: input.stagger,
        easing: input.easing,
    }, duration, `Layer ${index + 1} animation`);
    return {
        ...entry,
        staggerIndex: boundedInteger(
            input.staggerIndex,
            index,
            0,
            MAX_SEMANTIC_VALUES,
            `Layer ${index + 1} animation stagger index`,
        ),
        emphasis: normalizeEmphasis(
            input.emphasis,
            `Layer ${index + 1} animation emphasis`,
        ),
    };
}

function normalizeLayer(input, duration, index, assetIds) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new Error(`Layer ${index + 1} must be an object.`);
    }
    assertAllowedKeys(
        input,
        new Set([
            "id",
            "name",
            "type",
            "assetId",
            "start",
            "end",
            "zIndex",
            "semantic",
            "animation",
            "motion",
            "audio",
            "keyframes",
        ]),
        `Layer ${index + 1}`,
    );
    if (
        input.name !== undefined
        && (typeof input.name !== "string" || input.name.length > 120)
    ) {
        throw new Error(`Layer ${index + 1} name must be a string of at most 120 characters.`);
    }
    const type = input.type ?? "fourier";
    if (!["fourier", ...SEMANTIC_LAYER_TYPES].includes(type)) {
        throw new Error(`Layer ${index + 1} type is not supported.`);
    }
    if (type === "fourier" && (!validId(input.assetId) || !assetIds.has(input.assetId))) {
        throw new Error(`Layer ${index + 1} references an unavailable Fourier asset.`);
    }
    if (type !== "fourier" && input.assetId !== undefined) {
        throw new Error(`Layer ${index + 1} semantic layers cannot reference Fourier assets.`);
    }
    if (type !== "fourier" && !plainObject(input.semantic)) {
        throw new Error(`Layer ${index + 1} semantic content must be an object.`);
    }
    if (type !== "fourier" && !plainObject(input.animation)) {
        throw new Error(`Layer ${index + 1} animation must be an object.`);
    }

    const start = bounded(input.start, 0, 0, duration, `Layer ${index + 1} start`);
    const end = bounded(input.end, duration, start, duration, `Layer ${index + 1} end`);
    const sourceKeyframes = Array.isArray(input.keyframes) && input.keyframes.length
        ? input.keyframes
        : type === "fourier" ? [
            { time: start, reveal: 0 },
            { time: end, reveal: 1 },
        ] : [];
    if (sourceKeyframes.length > MAX_KEYFRAMES_PER_LAYER) {
        throw new Error(`A layer may contain at most ${MAX_KEYFRAMES_PER_LAYER} keyframes.`);
    }

    const keyframes = sourceKeyframes
        .map((keyframe, keyframeIndex) => normalizeKeyframe(
            keyframe,
            duration,
            `Layer ${index + 1}, keyframe ${keyframeIndex + 1}`,
            assetIds,
            input.assetId,
            type === "fourier",
        ))
        .sort((left, right) => left.time - right.time)
        .filter((keyframe, keyframeIndex, values) => (
            keyframeIndex === values.length - 1
            || Math.abs(keyframe.time - values[keyframeIndex + 1].time) > 0.0001
        ));
    const motionInput = input.motion ?? {};
    const audioInput = input.audio ?? {};
    if (!plainObject(motionInput) || !plainObject(audioInput)) {
        throw new Error(`Layer ${index + 1} motion and audio settings must be objects.`);
    }
    assertAllowedKeys(
        motionInput,
        new Set(["enabled", "amount", "speed", "detail", "seed"]),
        `Layer ${index + 1} motion`,
    );
    assertAllowedKeys(
        audioInput,
        new Set([
            "enabled",
            "triggerTime",
            "baseFrequency",
            "gain",
            "duration",
            "partialCount",
        ]),
        `Layer ${index + 1} audio`,
    );
    if (
        motionInput.enabled !== undefined
        && typeof motionInput.enabled !== "boolean"
    ) {
        throw new Error(`Layer ${index + 1} motion enabled must be a boolean.`);
    }
    if (
        audioInput.enabled !== undefined
        && typeof audioInput.enabled !== "boolean"
    ) {
        throw new Error(`Layer ${index + 1} audio enabled must be a boolean.`);
    }

    return {
        id: validId(input.id) ? input.id : randomUUID(),
        name: typeof input.name === "string" && input.name.trim()
            ? input.name.trim().slice(0, 120)
            : `Layer ${index + 1}`,
        type,
        ...(type === "fourier" ? { assetId: input.assetId } : {}),
        start,
        end,
        zIndex: boundedInteger(
            input.zIndex,
            index,
            -MAX_Z_INDEX_MAGNITUDE,
            MAX_Z_INDEX_MAGNITUDE,
            `Layer ${index + 1} zIndex`,
        ),
        motion: {
            enabled: motionInput.enabled === true,
            amount: bounded(
                motionInput.amount,
                0,
                0,
                0.08,
                `Layer ${index + 1} motion amount`,
            ),
            speed: bounded(
                motionInput.speed,
                0.35,
                0,
                5,
                `Layer ${index + 1} motion speed`,
            ),
            detail: bounded(
                motionInput.detail,
                3,
                0.25,
                20,
                `Layer ${index + 1} motion detail`,
            ),
            seed: bounded(
                motionInput.seed,
                index * 1.618,
                -MAX_SEED_MAGNITUDE,
                MAX_SEED_MAGNITUDE,
                `Layer ${index + 1} motion seed`,
            ),
        },
        audio: {
            enabled: audioInput.enabled === true,
            triggerTime: bounded(
                audioInput.triggerTime,
                start,
                start,
                end,
                `Layer ${index + 1} audio trigger`,
            ),
            baseFrequency: bounded(
                audioInput.baseFrequency,
                220,
                40,
                1200,
                `Layer ${index + 1} audio pitch`,
            ),
            gain: bounded(
                audioInput.gain,
                0.045,
                0,
                0.2,
                `Layer ${index + 1} audio gain`,
            ),
            duration: bounded(
                audioInput.duration,
                0.18,
                0.03,
                2,
                `Layer ${index + 1} audio duration`,
            ),
            partialCount: boundedInteger(
                audioInput.partialCount,
                5,
                1,
                8,
                `Layer ${index + 1} audio partial count`,
            ),
        },
        ...(type !== "fourier" ? {
            semantic: normalizeSemantic(input.semantic, type, index),
            animation: normalizeAnimation(input.animation, duration, index),
        } : {}),
        keyframes,
    };
}

export function createComposition(asset, input = {}) {
    const duration = bounded(input.duration, 8, 0.5, 300, "Composition duration");
    const layers = asset
        ? [{
            id: randomUUID(),
            name: asset.name,
            assetId: asset.id,
            start: 0,
            end: duration,
            zIndex: 0,
            keyframes: [
                { time: 0, ...PROPERTY_DEFAULTS, reveal: 0 },
                { time: Math.min(duration, asset.runtime?.duration ?? 4), ...PROPERTY_DEFAULTS },
            ],
        }]
        : [];
    return normalizeComposition({
        id: randomUUID(),
        format: "fourier-composition/v1",
        revision: 0,
        name: input.name ?? "Untitled Fourier composition",
        duration,
        layers,
    }, new Set(asset ? [asset.id] : []));
}

export function normalizeComposition(input, assetIds) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new Error("Composition input must be an object.");
    }
    assertAllowedKeys(
        input,
        new Set([
            "id",
            "format",
            "revision",
            "name",
            "duration",
            "updatedAt",
            "presentation",
            "layers",
        ]),
        "Composition input",
    );
    if (
        input.name !== undefined
        && (typeof input.name !== "string" || input.name.length > 120)
    ) {
        throw new Error("Composition name must be a string of at most 120 characters.");
    }
    if (input.updatedAt !== undefined && typeof input.updatedAt !== "string") {
        throw new Error("Composition updatedAt must be a string.");
    }
    if (input.format !== "fourier-composition/v1") {
        throw new Error("Expected a fourier-composition/v1 object.");
    }

    const duration = bounded(input.duration, 8, 0.5, 300, "Composition duration");
    const presentation = normalizePresentation(input.presentation, duration);
    const sourceLayers = input.layers ?? [];
    if (!Array.isArray(sourceLayers) || sourceLayers.length > MAX_LAYERS) {
        throw new Error(`A composition may contain at most ${MAX_LAYERS} layers.`);
    }

    const layers = sourceLayers.map((layer, index) => normalizeLayer(
        layer,
        duration,
        index,
        assetIds,
    ));
    const layerIds = new Set();
    let totalKeyframes = 0;
    for (const layer of layers) {
        if (layerIds.has(layer.id)) {
            throw new Error(`Composition contains duplicate layer ID ${layer.id}.`);
        }
        layerIds.add(layer.id);
        totalKeyframes += layer.keyframes.length;
    }
    if (totalKeyframes > MAX_TOTAL_KEYFRAMES) {
        throw new Error(
            `A composition may contain at most ${MAX_TOTAL_KEYFRAMES} keyframes in total.`,
        );
    }
    const hasSemanticLayers = layers.some((layer) => layer.type !== "fourier");
    if (hasSemanticLayers && !presentation) {
        throw new Error("Semantic layers require presentation metadata.");
    }
    const semanticTextCharacters = presentation
        ? presentation.accessibleSummary.length + layers.reduce((sum, layer) => {
            if (layer.type === "text") {
                return sum + layer.semantic.text.length;
            }
            if (layer.type === "bar-chart") {
                return sum + layer.semantic.values.reduce(
                    (valueSum, value) => valueSum + value.label.length,
                    0,
                );
            }
            if (layer.type === "line") {
                return sum + layer.semantic.label.length;
            }
            return sum;
        }, 0)
        : 0;
    if (semanticTextCharacters > MAX_SEMANTIC_TEXT_CHARACTERS) {
        throw new Error(
            `Composition exceeds the ${MAX_SEMANTIC_TEXT_CHARACTERS}-character semantic text budget.`,
        );
    }
    const revision = input.revision ?? 0;
    if (!Number.isSafeInteger(revision) || revision < 0) {
        throw new Error("Composition revision must be a non-negative safe integer.");
    }

    return {
        id: validId(input.id) ? input.id : randomUUID(),
        format: "fourier-composition/v1",
        revision,
        name: typeof input.name === "string" && input.name.trim()
            ? input.name.trim().slice(0, 120)
            : "Untitled Fourier composition",
        duration,
        updatedAt: new Date().toISOString(),
        ...(presentation ? { presentation } : {}),
        layers,
    };
}

export const COMPOSITION_LIMITS = Object.freeze({
    maxKeyframesPerLayer: MAX_KEYFRAMES_PER_LAYER,
    maxLayers: MAX_LAYERS,
    maxRotationMagnitude: MAX_ROTATION_MAGNITUDE,
    maxSeedMagnitude: MAX_SEED_MAGNITUDE,
    maxZIndexMagnitude: MAX_Z_INDEX_MAGNITUDE,
    maxTotalKeyframes: MAX_TOTAL_KEYFRAMES,
    maxSceneCoefficients: MAX_SCENE_COEFFICIENTS,
    maxSceneStrokes: MAX_SCENE_STROKES,
    maxSemanticValues: MAX_SEMANTIC_VALUES,
    maxSemanticTextCharacters: MAX_SEMANTIC_TEXT_CHARACTERS,
});

function assetPairComplexity(sourceAsset, targetAsset) {
    const strokeCount = Math.max(sourceAsset.strokes.length, targetAsset.strokes.length);
    let coefficientCount = 0;
    for (let strokeIndex = 0; strokeIndex < strokeCount; strokeIndex += 1) {
        const frequencies = new Set([
            ...(sourceAsset.strokes[strokeIndex]?.coefficients ?? []).map(
                (coefficient) => coefficient.frequency,
            ),
            ...(targetAsset.strokes[strokeIndex]?.coefficients ?? []).map(
                (coefficient) => coefficient.frequency,
            ),
        ]);
        coefficientCount += frequencies.size;
    }
    return { coefficientCount, strokeCount };
}

export function validateCompositionComplexity(composition, assets) {
    let coefficientCount = 0;
    let strokeCount = 0;
    for (const layer of composition.layers) {
        if (layer.type !== "fourier") {
            continue;
        }
        const assetSequence = layer.keyframes.length > 1
            ? layer.keyframes.map((keyframe) => keyframe.assetId)
            : [layer.assetId, layer.keyframes[0]?.assetId ?? layer.assetId];
        let layerCoefficients = 0;
        let layerStrokes = 0;
        for (let index = 1; index < assetSequence.length; index += 1) {
            const complexity = assetPairComplexity(
                assets.get(assetSequence[index - 1]),
                assets.get(assetSequence[index]),
            );
            layerCoefficients = Math.max(layerCoefficients, complexity.coefficientCount);
            layerStrokes = Math.max(layerStrokes, complexity.strokeCount);
        }
        coefficientCount += layerCoefficients;
        strokeCount += layerStrokes;
    }
    if (coefficientCount > MAX_SCENE_COEFFICIENTS) {
        throw new Error(
            `Composition exceeds the ${MAX_SCENE_COEFFICIENTS}-coefficient scene budget.`,
        );
    }
    if (strokeCount > MAX_SCENE_STROKES) {
        throw new Error(
            `Composition exceeds the ${MAX_SCENE_STROKES}-stroke scene budget.`,
        );
    }
}
