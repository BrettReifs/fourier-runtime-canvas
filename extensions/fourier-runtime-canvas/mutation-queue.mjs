import { randomUUID } from "node:crypto";
import {
    lstat,
    mkdir,
    realpath,
    rename,
    rm,
    writeFile,
} from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";

const queueTails = new Map();

export function enqueueMutation(key, operation) {
    const previous = queueTails.get(key) ?? Promise.resolve();
    const result = previous.then(operation);
    const tail = result.then(
        () => undefined,
        () => undefined,
    ).finally(() => {
        if (queueTails.get(key) === tail) {
            queueTails.delete(key);
        }
    });
    queueTails.set(key, tail);
    return result;
}

export function enqueueInstanceLifecycle(instanceId, operation) {
    return enqueueMutation(`\0fourier-server:${instanceId}`, operation);
}

export function initializeWorkspaceEntry(entry, registry, load) {
    return enqueueMutation(entry.workspacePath, async () => {
        Object.assign(entry, await load());
        registry.add(entry);
        return entry;
    });
}

export function pendingMutationQueues() {
    return queueTails.size;
}

export function getOrCreateAsync(values, pending, key, create) {
    const existing = values.get(key);
    if (existing) {
        return Promise.resolve(existing);
    }
    const inProgress = pending.get(key);
    if (inProgress) {
        return inProgress;
    }
    let operation;
    operation = Promise.resolve()
        .then(create)
        .then((value) => {
            values.set(key, value);
            return value;
        })
        .finally(() => {
            if (pending.get(key) === operation) {
                pending.delete(key);
            }
        });
    pending.set(key, operation);
    return operation;
}

export function jsonStorageBytes(value) {
    return Buffer.byteLength(`${JSON.stringify(value, null, 2)}\n`);
}

export async function ensureContainedDirectory(rootPath, directoryName) {
    const root = await realpath(rootPath);
    const directory = join(rootPath, directoryName);
    await mkdir(directory, { recursive: true });
    const directoryStat = await lstat(directory);
    const resolved = await realpath(directory);
    const relativePath = relative(root, resolved);
    if (
        !directoryStat.isDirectory()
        || directoryStat.isSymbolicLink()
        || relativePath === ".."
        || relativePath.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)
        || isAbsolute(relativePath)
    ) {
        throw new Error(`Storage directory ${directoryName} must resolve inside the workspace.`);
    }
    return directory;
}

export async function writeJsonAtomic(filePath, value) {
    const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
    const serialized = `${JSON.stringify(value, null, 2)}\n`;
    try {
        await writeFile(temporaryPath, serialized, "utf8");
        await rename(temporaryPath, filePath);
    } catch (error) {
        await rm(temporaryPath, { force: true });
        throw error;
    }
}
