const DEFAULT_LIMIT = 50;

function clone(value) {
    return structuredClone(value);
}

function fingerprint(composition) {
    if (!composition) {
        return "";
    }
    const { revision, updatedAt, ...semantic } = composition;
    return JSON.stringify(semantic);
}

export function createHistory(input = {}, limit = DEFAULT_LIMIT) {
    return {
        limit,
        undo: Array.isArray(input.undo) ? input.undo.map(clone).slice(-limit) : [],
        redo: Array.isArray(input.redo) ? input.redo.map(clone).slice(-limit) : [],
    };
}

export function recordHistory(history, current, next) {
    if (!current || fingerprint(current) === fingerprint(next)) {
        return false;
    }
    history.undo.push(clone(current));
    if (history.undo.length > history.limit) {
        history.undo.splice(0, history.undo.length - history.limit);
    }
    history.redo = [];
    return true;
}

export function undoHistory(history, current) {
    if (history.undo.length === 0) {
        throw new Error("There is no composition change to undo.");
    }
    const composition = history.undo.pop();
    history.redo.push(clone(current));
    if (history.redo.length > history.limit) {
        history.redo.splice(0, history.redo.length - history.limit);
    }
    return clone(composition);
}

export function redoHistory(history, current) {
    if (history.redo.length === 0) {
        throw new Error("There is no composition change to redo.");
    }
    const composition = history.redo.pop();
    history.undo.push(clone(current));
    if (history.undo.length > history.limit) {
        history.undo.splice(0, history.undo.length - history.limit);
    }
    return clone(composition);
}

export function historyStatus(history) {
    return {
        canUndo: history.undo.length > 0,
        canRedo: history.redo.length > 0,
        undoCount: history.undo.length,
        redoCount: history.redo.length,
        limit: history.limit,
    };
}
