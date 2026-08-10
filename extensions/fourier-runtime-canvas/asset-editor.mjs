import { transformDrawing } from "./fourier.mjs";

function inputFingerprint(input) {
    return JSON.stringify({
        name: input.name,
        termLimit: input.termLimit,
        strokes: input.strokes,
        runtime: input.runtime,
    });
}

export function reconstructStrokePoints(stroke, pointCount = stroke.sampleCount) {
    if (
        !stroke
        || !Array.isArray(stroke.coefficients)
        || !Number.isSafeInteger(pointCount)
        || pointCount < 2
    ) {
        throw new Error("A valid coefficient stroke and point count are required.");
    }
    return Array.from({ length: pointCount }, (_, index) => {
        const time = index / pointCount;
        let x = 0;
        let y = 0;
        for (const coefficient of stroke.coefficients) {
            const angle = (
                2 * Math.PI * coefficient.frequency * time
                + coefficient.phase
            );
            x += coefficient.amplitude * Math.cos(angle);
            y += coefficient.amplitude * Math.sin(angle);
        }
        return { x, y };
    });
}

export function reconstructAssetGeometry(asset, maximumPoints = 96) {
    if (!asset || !Array.isArray(asset.strokes)) {
        throw new Error("A frequency asset is required.");
    }
    if (!Number.isSafeInteger(maximumPoints) || maximumPoints < 2) {
        throw new Error("Maximum control points must be an integer of at least two.");
    }
    return {
        assetId: asset.id,
        sourceRevision: asset.revision ?? 0,
        strokes: asset.strokes.map((stroke) => {
            const minimum = stroke.closed ? 3 : 2;
            const pointCount = Math.max(
                minimum,
                Math.min(
                    maximumPoints,
                    stroke.sampleCount,
                    Math.max(8, stroke.coefficients.length * 2),
                ),
            );
            return {
                closed: stroke.closed,
                points: reconstructStrokePoints(stroke, pointCount),
            };
        }),
    };
}

export function selectAssetElement(selected, element, options = {}) {
    if (!element || !Number.isSafeInteger(element.strokeIndex)) return [];
    const sameElement = (candidate) => (
        candidate.strokeIndex === element.strokeIndex
        && candidate.pointIndex === element.pointIndex
    );
    const exists = selected.some(sameElement);
    if (!options.toggle) return [structuredClone(element)];
    return exists
        ? selected.filter((candidate) => !sameElement(candidate))
        : [...selected.map((candidate) => structuredClone(candidate)), structuredClone(element)];
}

export function moveSelectedAssetPoints(geometry, selected, deltaX, deltaY) {
    if (![deltaX, deltaY].every(Number.isFinite)) {
        throw new Error("Point movement must be finite.");
    }
    const next = structuredClone(geometry);
    for (const reference of selected) {
        if (!Number.isSafeInteger(reference.pointIndex)) continue;
        const point = next.strokes[reference.strokeIndex]?.points[reference.pointIndex];
        if (!point) continue;
        point.x += deltaX;
        point.y += deltaY;
    }
    return next;
}

export function addAssetPoint(geometry, strokeIndex, afterPointIndex, point) {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
        throw new Error("A finite point is required.");
    }
    const next = structuredClone(geometry);
    const stroke = next.strokes[strokeIndex];
    if (!stroke) throw new Error("The selected stroke does not exist.");
    if (stroke.points.length >= 4096) {
        throw new Error("A stroke may contain at most 4096 editable points.");
    }
    const insertion = Math.max(0, Math.min(stroke.points.length, afterPointIndex + 1));
    stroke.points.splice(insertion, 0, { x: point.x, y: point.y });
    return next;
}

export function deleteSelectedAssetPoints(geometry, selected) {
    const next = structuredClone(geometry);
    const selectedStrokes = new Set(
        selected
            .filter((reference) => reference.pointIndex === undefined)
            .map((reference) => reference.strokeIndex),
    );
    if (selectedStrokes.size) {
        next.strokes = next.strokes.filter((_, index) => !selectedStrokes.has(index));
        if (!next.strokes.length) {
            throw new Error("An asset must keep at least one stroke.");
        }
        return next;
    }
    const pointsByStroke = new Map();
    for (const reference of selected) {
        if (!Number.isSafeInteger(reference.pointIndex)) continue;
        const points = pointsByStroke.get(reference.strokeIndex) ?? new Set();
        points.add(reference.pointIndex);
        pointsByStroke.set(reference.strokeIndex, points);
    }
    for (const [strokeIndex, pointIndexes] of pointsByStroke) {
        const stroke = next.strokes[strokeIndex];
        if (!stroke) continue;
        const minimum = stroke.closed ? 3 : 2;
        if (stroke.points.length - pointIndexes.size < minimum) {
            throw new Error(
                `A ${stroke.closed ? "closed" : "open"} stroke must keep at least ${minimum} points.`,
            );
        }
        stroke.points = stroke.points.filter((_, index) => !pointIndexes.has(index));
    }
    return next;
}

export function setAssetStrokeClosed(geometry, strokeIndex, closed) {
    const next = structuredClone(geometry);
    const stroke = next.strokes[strokeIndex];
    if (!stroke) throw new Error("The selected stroke does not exist.");
    if (closed && stroke.points.length < 3) {
        throw new Error("A closed stroke must have at least three points.");
    }
    stroke.closed = closed === true;
    return next;
}

function drawingInput(current, input) {
    return {
        name: input.name ?? current.name,
        termLimit: input.termLimit ?? current.termLimit,
        strokes: input.strokes,
        runtime: input.runtime ?? current.runtime,
    };
}

function baselineInput(current, input) {
    return {
        name: current.name,
        termLimit: current.termLimit,
        strokes: current.strokes.map((stroke, index) => ({
            closed: stroke.closed,
            points: reconstructStrokePoints(
                stroke,
                input.strokes[index]?.points.length ?? stroke.sampleCount,
            ),
        })),
        runtime: current.runtime,
    };
}

export function buildAssetPreview(current, input) {
    const drawing = drawingInput(current, input);
    return transformDrawing(drawing, {
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: current.updatedAt ?? current.createdAt,
        revision: current.revision ?? 0,
    });
}

export function buildAssetUpdate(
    current,
    expectedRevision,
    input,
    updatedAt = new Date().toISOString(),
) {
    const revision = current.revision ?? 0;
    if (expectedRevision !== revision) {
        const error = new Error(
            "Asset revision is stale. Reload the canonical asset and retry.",
        );
        error.code = "stale_asset_revision";
        error.current = { id: current.id, revision };
        throw error;
    }
    const drawing = drawingInput(current, input);
    if (inputFingerprint(drawing) === inputFingerprint(baselineInput(current, input))) {
        return { asset: current, changed: false };
    }
    return {
        asset: transformDrawing(drawing, {
            id: current.id,
            createdAt: current.createdAt,
            updatedAt,
            revision: revision + 1,
        }),
        changed: true,
    };
}
