import { randomUUID } from "node:crypto";

const MAX_STROKES = 32;
const MAX_POINTS_PER_STROKE = 4096;
const MAX_TOTAL_POINTS = 16384;
const MAX_ASSET_TERMS = 256;
const MAX_TOTAL_ASSET_TERMS = 2048;
const MAX_DFT_SAMPLE_WORK = 4096;
const MAX_DFT_OPERATION_WORK = 1_000_000;
const MAX_COORDINATE_MAGNITUDE = 1_000_000;
const MAX_FREQUENCY_MAGNITUDE = 1_000_000;
const MAX_COEFFICIENT_AMPLITUDE = 1_000_000;
const MAX_PHASE_MAGNITUDE = 1_000_000;

function finiteNumber(value, label) {
    if (!Number.isFinite(value)) {
        throw new Error(`${label} must be a finite number.`);
    }
    return value;
}

function boundedNumber(value, maximumMagnitude, label) {
    const result = finiteNumber(value, label);
    if (Math.abs(result) > maximumMagnitude) {
        throw new Error(`${label} must not exceed ${maximumMagnitude} in magnitude.`);
    }
    return result;
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

function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
}

function nextPowerOfTwo(value) {
    return 2 ** Math.ceil(Math.log2(value));
}

function validateSourceStrokes(strokes) {
    if (!Array.isArray(strokes) || strokes.length === 0) {
        throw new Error("At least one stroke is required.");
    }
    if (strokes.length > MAX_STROKES) {
        throw new Error(`A drawing may contain at most ${MAX_STROKES} strokes.`);
    }

    let totalPoints = 0;
    const validated = strokes.map((stroke, strokeIndex) => {
        if (!stroke || !Array.isArray(stroke.points) || stroke.points.length < 2) {
            throw new Error(`Stroke ${strokeIndex + 1} must contain at least two points.`);
        }
        if (stroke.points.length > MAX_POINTS_PER_STROKE) {
            throw new Error(`A stroke may contain at most ${MAX_POINTS_PER_STROKE} points.`);
        }
        assertAllowedKeys(
            stroke,
            new Set(["closed", "points"]),
            `Stroke ${strokeIndex + 1}`,
        );
        if (stroke.closed !== undefined && typeof stroke.closed !== "boolean") {
            throw new Error(`Stroke ${strokeIndex + 1} closed must be a boolean.`);
        }
        totalPoints += stroke.points.length;
        const points = stroke.points.map((point, pointIndex) => {
            assertAllowedKeys(
                point,
                new Set(["x", "y"]),
                `Stroke ${strokeIndex + 1}, point ${pointIndex + 1}`,
            );
            return {
                x: boundedNumber(
                point?.x,
                MAX_COORDINATE_MAGNITUDE,
                `Stroke ${strokeIndex + 1}, point ${pointIndex + 1} x`,
                ),
                y: boundedNumber(
                point?.y,
                MAX_COORDINATE_MAGNITUDE,
                `Stroke ${strokeIndex + 1}, point ${pointIndex + 1} y`,
                ),
            };
        });
        return { closed: stroke.closed === true, points };
    });

    if (totalPoints > MAX_TOTAL_POINTS) {
        throw new Error(`A drawing may contain at most ${MAX_TOTAL_POINTS} points.`);
    }
    return validated;
}

function normalizePoints(strokes) {
    const points = strokes.flatMap((stroke) => stroke.points);
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const scale = Math.max(maxX - minX, maxY - minY, 1) / 2;

    return strokes.map((stroke) => ({
        closed: stroke.closed,
        points: stroke.points.map((point) => ({
            x: (point.x - centerX) / scale,
            y: (point.y - centerY) / scale,
        })),
    }));
}

function makePeriodic(stroke) {
    if (stroke.closed) {
        return [...stroke.points, stroke.points[0]];
    }
    return [
        ...stroke.points,
        ...stroke.points.slice(1, -1).reverse(),
        stroke.points[0],
    ];
}

function resamplePath(points, sampleCount) {
    const cumulative = [0];
    for (let index = 1; index < points.length; index++) {
        const dx = points[index].x - points[index - 1].x;
        const dy = points[index].y - points[index - 1].y;
        cumulative.push(cumulative[index - 1] + Math.hypot(dx, dy));
    }

    const totalLength = cumulative.at(-1);
    if (totalLength === 0) {
        throw new Error("A stroke must cover a non-zero distance.");
    }

    const samples = [];
    let segment = 1;
    for (let index = 0; index < sampleCount; index++) {
        const target = (index / sampleCount) * totalLength;
        while (segment < cumulative.length - 1 && cumulative[segment] < target) {
            segment += 1;
        }
        const startDistance = cumulative[segment - 1];
        const endDistance = cumulative[segment];
        const ratio = endDistance === startDistance
            ? 0
            : (target - startDistance) / (endDistance - startDistance);
        const start = points[segment - 1];
        const end = points[segment];
        samples.push({
            x: start.x + (end.x - start.x) * ratio,
            y: start.y + (end.y - start.y) * ratio,
        });
    }
    return samples;
}

function discreteFourierTransform(samples) {
    const count = samples.length;
    const coefficients = [];
    for (let k = 0; k < count; k++) {
        let real = 0;
        let imaginary = 0;
        for (let sampleIndex = 0; sampleIndex < count; sampleIndex++) {
            const angle = (-2 * Math.PI * k * sampleIndex) / count;
            const cosine = Math.cos(angle);
            const sine = Math.sin(angle);
            const point = samples[sampleIndex];
            real += point.x * cosine - point.y * sine;
            imaginary += point.x * sine + point.y * cosine;
        }
        real /= count;
        imaginary /= count;
        coefficients.push({
            frequency: k <= count / 2 ? k : k - count,
            amplitude: Math.hypot(real, imaginary),
            phase: Math.atan2(imaginary, real),
        });
    }
    return coefficients;
}

function selectCoefficients(coefficients, termLimit, preserveFrequencyPairs) {
    const dc = coefficients.find((coefficient) => coefficient.frequency === 0);
    const oscillating = coefficients
        .filter((coefficient) => coefficient.frequency !== 0)
        .sort((left, right) => right.amplitude - left.amplitude);

    let selected;
    if (preserveFrequencyPairs) {
        const groups = new Map();
        for (const coefficient of oscillating) {
            const key = Math.abs(coefficient.frequency);
            const group = groups.get(key) ?? [];
            group.push(coefficient);
            groups.set(key, group);
        }
        selected = [];
        const rankedGroups = [...groups.values()]
            .sort((left, right) => right[0].amplitude - left[0].amplitude);
        for (const group of rankedGroups) {
            if (selected.length + group.length + 1 > termLimit) {
                continue;
            }
            selected.push(...group);
        }
    } else {
        selected = oscillating.slice(0, Math.max(0, termLimit - 1));
    }

    return [dc, ...selected]
        .filter(Boolean)
        .map((coefficient) => ({
            frequency: coefficient.frequency,
            amplitude: Number(coefficient.amplitude.toPrecision(12)),
            phase: Number(coefficient.phase.toPrecision(12)),
        }));
}

export function transformDrawing(input, identity = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new Error("Drawing input must be an object.");
    }
    assertAllowedKeys(
        input,
        new Set(["name", "termLimit", "strokes", "runtime"]),
        "Drawing input",
    );
    if (
        input.name !== undefined
        && (typeof input.name !== "string" || input.name.length > 120)
    ) {
        throw new Error("Drawing name must be a string of at most 120 characters.");
    }
    if (input.runtime !== undefined && !plainObject(input.runtime)) {
        throw new Error("Drawing runtime must be an object.");
    }
    if (input.runtime) {
        assertAllowedKeys(
            input.runtime,
            new Set(["duration", "showEpicycles"]),
            "Drawing runtime",
        );
        if (
            input.runtime.duration !== undefined
            && typeof input.runtime.duration !== "number"
        ) {
            throw new Error("Drawing runtime duration must be a number.");
        }
        if (
            input.runtime.showEpicycles !== undefined
            && typeof input.runtime.showEpicycles !== "boolean"
        ) {
            throw new Error("Drawing showEpicycles must be a boolean.");
        }
    }

    const requestedTermLimit = input.termLimit ?? 64;
    if (
        !Number.isSafeInteger(requestedTermLimit)
        || requestedTermLimit < 4
        || requestedTermLimit > MAX_ASSET_TERMS
    ) {
        throw new Error(`Term limit must be an integer from 4 to ${MAX_ASSET_TERMS}.`);
    }
    const termLimit = requestedTermLimit;
    const duration = input.runtime?.duration ?? 4;
    if (!Number.isFinite(duration) || duration < 0.5 || duration > 60) {
        throw new Error("Runtime duration must be a number from 0.5 to 60.");
    }
    const strokes = normalizePoints(validateSourceStrokes(input.strokes));
    const plans = strokes.map((stroke) => {
        const periodicPoints = makePeriodic(stroke);
        const sampleCount = clamp(
            nextPowerOfTwo(Math.max(64, periodicPoints.length * 2)),
            64,
            512,
        );
        return { periodicPoints, sampleCount, stroke };
    });
    const sampleWork = plans.reduce((sum, plan) => sum + plan.sampleCount, 0);
    if (sampleWork > MAX_DFT_SAMPLE_WORK) {
        throw new Error(
            `Drawing transform work exceeds ${MAX_DFT_SAMPLE_WORK} resampled points.`,
        );
    }
    const operationWork = plans.reduce(
        (sum, plan) => sum + plan.sampleCount ** 2,
        0,
    );
    if (operationWork > MAX_DFT_OPERATION_WORK) {
        throw new Error(
            `Drawing transform work exceeds ${MAX_DFT_OPERATION_WORK} Fourier operations.`,
        );
    }
    const transformedStrokes = plans.map(({ periodicPoints, sampleCount, stroke }) => {
        const samples = resamplePath(periodicPoints, sampleCount);
        return {
            closed: stroke.closed,
            sampleCount,
            coefficients: selectCoefficients(
                discreteFourierTransform(samples),
                Math.min(termLimit, sampleCount),
                !stroke.closed,
            ),
        };
    });
    const transformedTermCount = transformedStrokes.reduce(
        (sum, stroke) => sum + stroke.coefficients.length,
        0,
    );
    if (transformedTermCount > MAX_TOTAL_ASSET_TERMS) {
        throw new Error(
            `A transformed asset may contain at most ${MAX_TOTAL_ASSET_TERMS} coefficients.`,
        );
    }

    const createdAt = typeof identity.createdAt === "string"
        ? identity.createdAt
        : new Date().toISOString();
    return {
        id: typeof identity.id === "string" ? identity.id : randomUUID(),
        format: "fourier-path/v1",
        name: typeof input.name === "string" && input.name.trim()
            ? input.name.trim().slice(0, 120)
            : "Untitled Fourier drawing",
        createdAt,
        updatedAt: typeof identity.updatedAt === "string"
            ? identity.updatedAt
            : createdAt,
        revision: Number.isSafeInteger(identity.revision) && identity.revision >= 0
            ? identity.revision
            : 0,
        coordinateSystem: "normalized-complex",
        strokeCount: transformedStrokes.length,
        termLimit,
        strokes: transformedStrokes,
        runtime: {
            duration,
            showEpicycles: input.runtime?.showEpicycles !== false,
        },
    };
}

export function normalizeFrequencyAsset(input) {
    if (
        !input
        || input.format !== "fourier-path/v1"
        || !Array.isArray(input.strokes)
        || input.strokes.length === 0
        || input.strokes.length > MAX_STROKES
    ) {
        throw new Error("Expected a fourier-path/v1 asset with at least one stroke.");
    }
    assertAllowedKeys(
        input,
        new Set([
            "id",
            "format",
            "name",
            "createdAt",
            "updatedAt",
            "revision",
            "coordinateSystem",
            "strokeCount",
            "termLimit",
            "strokes",
            "runtime",
        ]),
        "Fourier asset",
    );

    const duration = input.runtime?.duration ?? 4;
    if (!Number.isFinite(duration) || duration < 0.5 || duration > 60) {
        throw new Error("Asset runtime duration must be a number from 0.5 to 60.");
    }
    if (
        input.name !== undefined
        && (typeof input.name !== "string" || input.name.length > 120)
    ) {
        throw new Error("Asset name must be a string of at most 120 characters.");
    }
    if (input.runtime !== undefined && !plainObject(input.runtime)) {
        throw new Error("Asset runtime must be an object.");
    }
    if (input.runtime) {
        assertAllowedKeys(
            input.runtime,
            new Set(["duration", "showEpicycles"]),
            "Asset runtime",
        );
        if (
            input.runtime.duration !== undefined
            && typeof input.runtime.duration !== "number"
        ) {
            throw new Error("Asset runtime duration must be a number.");
        }
        if (
            input.runtime.showEpicycles !== undefined
            && typeof input.runtime.showEpicycles !== "boolean"
        ) {
            throw new Error("Asset showEpicycles must be a boolean.");
        }
    }
    if (
        input.createdAt !== undefined
        && (
            typeof input.createdAt !== "string"
            || input.createdAt.length > 64
            || !Number.isFinite(Date.parse(input.createdAt))
        )
    ) {
        throw new Error("Asset createdAt must be a valid date string of at most 64 characters.");
    }
    if (
        input.updatedAt !== undefined
        && (
            typeof input.updatedAt !== "string"
            || input.updatedAt.length > 64
            || !Number.isFinite(Date.parse(input.updatedAt))
        )
    ) {
        throw new Error("Asset updatedAt must be a valid date string of at most 64 characters.");
    }
    if (
        input.revision !== undefined
        && (!Number.isSafeInteger(input.revision) || input.revision < 0)
    ) {
        throw new Error("Asset revision must be a non-negative safe integer.");
    }

    const createdAt = typeof input.createdAt === "string"
        ? input.createdAt
        : new Date().toISOString();
    const strokes = input.strokes.map((stroke, strokeIndex) => {
        if (
            !stroke
            || !Array.isArray(stroke.coefficients)
            || stroke.coefficients.length === 0
            || stroke.coefficients.length > MAX_ASSET_TERMS
        ) {
            throw new Error(`Asset stroke ${strokeIndex + 1} has invalid coefficients.`);
        }
        const frequencies = new Set();
        assertAllowedKeys(
            stroke,
            new Set(["closed", "sampleCount", "coefficients"]),
            `Asset stroke ${strokeIndex + 1}`,
        );
        if (stroke.closed !== undefined && typeof stroke.closed !== "boolean") {
            throw new Error(`Asset stroke ${strokeIndex + 1} closed must be a boolean.`);
        }
        const sampleCount = finiteNumber(
            stroke.sampleCount ?? 256,
            `Asset stroke ${strokeIndex + 1} sample count`,
        );
        if (!Number.isSafeInteger(sampleCount) || sampleCount < 8 || sampleCount > 4096) {
            throw new Error(
                `Asset stroke ${strokeIndex + 1} sample count must be an integer from 8 to 4096.`,
            );
        }
        return {
            closed: stroke.closed === true,
            sampleCount,
            coefficients: stroke.coefficients.map((coefficient, coefficientIndex) => {
                assertAllowedKeys(
                    coefficient,
                    new Set(["frequency", "amplitude", "phase"]),
                    `Stroke ${strokeIndex + 1}, coefficient ${coefficientIndex + 1}`,
                );
                const frequency = boundedNumber(
                    coefficient?.frequency,
                    MAX_FREQUENCY_MAGNITUDE,
                    `Stroke ${strokeIndex + 1}, coefficient ${coefficientIndex + 1} frequency`,
                );
                if (!Number.isInteger(frequency)) {
                    throw new Error(
                        `Stroke ${strokeIndex + 1}, coefficient ${coefficientIndex + 1} frequency must be an integer.`,
                    );
                }
                if (frequencies.has(frequency)) {
                    throw new Error(
                        `Asset stroke ${strokeIndex + 1} contains duplicate frequency ${frequency}.`,
                    );
                }
                frequencies.add(frequency);
                const amplitude = boundedNumber(
                    coefficient?.amplitude,
                    MAX_COEFFICIENT_AMPLITUDE,
                    `Stroke ${strokeIndex + 1}, coefficient ${coefficientIndex + 1} amplitude`,
                );
                if (amplitude < 0) {
                    throw new Error(
                        `Stroke ${strokeIndex + 1}, coefficient ${coefficientIndex + 1} amplitude must not be negative.`,
                    );
                }
                return {
                    frequency,
                    amplitude,
                    phase: boundedNumber(
                        coefficient?.phase,
                        MAX_PHASE_MAGNITUDE,
                        `Stroke ${strokeIndex + 1}, coefficient ${coefficientIndex + 1} phase`,
                    ),
                };
            }),
        };
    });
    const totalTerms = strokes.reduce(
        (sum, stroke) => sum + stroke.coefficients.length,
        0,
    );
    if (totalTerms > MAX_TOTAL_ASSET_TERMS) {
        throw new Error(`An asset may contain at most ${MAX_TOTAL_ASSET_TERMS} coefficients.`);
    }

    return {
        id: typeof input.id === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(input.id)
            ? input.id
            : randomUUID(),
        format: "fourier-path/v1",
        name: typeof input.name === "string" && input.name.trim()
            ? input.name.trim().slice(0, 120)
            : "Untitled Fourier drawing",
        createdAt,
        updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : createdAt,
        revision: input.revision ?? 0,
        coordinateSystem: "normalized-complex",
        strokeCount: strokes.length,
        termLimit: Math.max(...strokes.map((stroke) => stroke.coefficients.length)),
        strokes,
        runtime: {
            duration,
            showEpicycles: input.runtime?.showEpicycles !== false,
        },
    };
}

export const FOURIER_LIMITS = Object.freeze({
    maxAssetTerms: MAX_ASSET_TERMS,
    maxCoefficientAmplitude: MAX_COEFFICIENT_AMPLITUDE,
    maxCoordinateMagnitude: MAX_COORDINATE_MAGNITUDE,
    maxFrequencyMagnitude: MAX_FREQUENCY_MAGNITUDE,
    maxDftSampleWork: MAX_DFT_SAMPLE_WORK,
    maxDftOperationWork: MAX_DFT_OPERATION_WORK,
    maxPhaseMagnitude: MAX_PHASE_MAGNITUDE,
    maxPointsPerStroke: MAX_POINTS_PER_STROKE,
    maxStrokes: MAX_STROKES,
    maxTotalPoints: MAX_TOTAL_POINTS,
    maxTotalAssetTerms: MAX_TOTAL_ASSET_TERMS,
});
