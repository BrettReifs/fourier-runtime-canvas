import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
    enqueueMutation,
    ensureContainedDirectory,
    getOrCreateAsync,
    initializeWorkspaceEntry,
    jsonStorageBytes,
    pendingMutationQueues,
    writeJsonAtomic,
} from "../extensions/fourier-runtime-canvas/mutation-queue.mjs";

test("workspace mutations are serialized and survive a rejected predecessor", async () => {
    const events = [];
    const first = enqueueMutation("workspace-a", async () => {
        events.push("first:start");
        await new Promise((resolve) => setTimeout(resolve, 20));
        events.push("first:end");
    });
    const second = enqueueMutation("workspace-a", async () => {
        events.push("second");
        throw new Error("expected");
    });
    const third = enqueueMutation("workspace-a", async () => {
        events.push("third");
    });

    await first;
    await assert.rejects(second, /expected/);
    await third;
    assert.deepEqual(events, ["first:start", "first:end", "second", "third"]);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(pendingMutationQueues(), 0);
});

test("different workspace queues can run concurrently", async () => {
    const events = [];
    const left = enqueueMutation("workspace-left", async () => {
        events.push("left:start");
        await new Promise((resolve) => setTimeout(resolve, 15));
        events.push("left:end");
    });
    const right = enqueueMutation("workspace-right", async () => {
        events.push("right");
    });

    await Promise.all([left, right]);
    assert(events.indexOf("right") < events.indexOf("left:end"));
});

test("concurrent persistent writes remain complete and ordered", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fourier-mutation-test-"));
    const filePath = join(directory, "state.json");
    try {
        const writes = Array.from({ length: 20 }, (_, revision) => (
            enqueueMutation(directory, () => writeJsonAtomic(filePath, {
                revision,
                payload: String(revision).repeat(100),
            }))
        ));
        await Promise.all(writes);
        const persisted = JSON.parse(await readFile(filePath, "utf8"));
        assert.equal((await stat(filePath)).size, jsonStorageBytes({
            revision: 19,
            payload: "19".repeat(100),
        }));
        assert.equal(persisted.revision, 19);
        assert.equal(persisted.payload, "19".repeat(100));
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test("storage directories are created inside their workspace", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "fourier-storage-test-"));
    try {
        const directory = await ensureContainedDirectory(workspace, "fourier-assets");
        assert.equal(directory, join(workspace, "fourier-assets"));
        assert((await stat(directory)).isDirectory());
    } finally {
        await rm(workspace, { recursive: true, force: true });
    }
});

test("storage directories reject links that escape their workspace", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "fourier-storage-root-"));
    const outside = await mkdtemp(join(tmpdir(), "fourier-storage-outside-"));
    try {
        await symlink(
            outside,
            join(workspace, "fourier-assets"),
            process.platform === "win32" ? "junction" : "dir",
        );
        await assert.rejects(
            ensureContainedDirectory(workspace, "fourier-assets"),
            /must resolve inside the workspace/,
        );
    } finally {
        await rm(workspace, { recursive: true, force: true });
        await rm(outside, { recursive: true, force: true });
    }
});

test("a final rejected mutation does not leave an unhandled queue tail", async () => {
    await assert.rejects(
        enqueueMutation("final-rejection", async () => {
            throw new Error("final failure");
        }),
        /final failure/,
    );
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(pendingMutationQueues(), 0);
});

test("concurrent startup shares one operation and clears failures", async () => {
    const values = new Map();
    const pending = new Map();
    let createCount = 0;
    let release;
    const gate = new Promise((resolve) => {
        release = resolve;
    });

    const create = async () => {
        createCount += 1;
        await gate;
        return { id: "shared" };
    };

    const first = getOrCreateAsync(values, pending, "instance", create);
    const second = getOrCreateAsync(values, pending, "instance", create);
    release();
    assert.equal(await first, await second);
    assert.equal(createCount, 1);
    assert.equal(pending.size, 0);

    await assert.rejects(
        getOrCreateAsync(values, pending, "failed", async () => {
            throw new Error("startup failed");
        }),
        /startup failed/,
    );
    assert.equal(pending.has("failed"), false);
    assert.deepEqual(
        await getOrCreateAsync(values, pending, "failed", async () => ({ id: "retry" })),
        { id: "retry" },
    );
});

test("workspace entry is registered before queued mutations can pass it", async () => {
    const registry = new Set();
    const existing = { revision: 0, workspacePath: "shared-startup-workspace" };
    const starting = { workspacePath: existing.workspacePath };
    registry.add(existing);
    let releaseLoad;
    const loadGate = new Promise((resolve) => {
        releaseLoad = resolve;
    });

    const initializing = initializeWorkspaceEntry(starting, registry, async () => {
        await loadGate;
        return { revision: 0 };
    });
    const mutation = enqueueMutation(existing.workspacePath, async () => {
        for (const entry of registry) {
            entry.revision = 1;
        }
    });
    releaseLoad();

    await Promise.all([initializing, mutation]);
    assert.equal(starting.revision, 1);
    assert.equal(registry.has(starting), true);
});
