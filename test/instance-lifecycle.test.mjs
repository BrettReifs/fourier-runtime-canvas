import assert from "node:assert/strict";
import { createServer, get } from "node:http";
import test from "node:test";

import { InstanceLifecycle } from "../extensions/fourier-runtime-canvas/instance-lifecycle.mjs";

async function listen(generation) {
    const server = createServer((request, response) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ generation }));
    });
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });
    return { generation, server };
}

function close(entry) {
    return new Promise((resolve) => entry.server.close(resolve));
}

function requestGeneration(entry) {
    const { port } = entry.server.address();
    return new Promise((resolve, reject) => {
        get({
            agent: false,
            host: "127.0.0.1",
            path: "/",
            port,
        }, (response) => {
            const chunks = [];
            response.on("data", (chunk) => chunks.push(chunk));
            response.on("end", () => {
                resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")).generation);
            });
        }).on("error", reject);
    });
}

function lifecycle(start) {
    return new InstanceLifecycle({
        pending: new Map(),
        start,
        stop: close,
        values: new Map(),
    });
}

test("simultaneous opens share one real loopback server", async () => {
    let starts = 0;
    const instances = lifecycle(async () => {
        starts += 1;
        return listen(starts);
    });
    const [first, second] = await Promise.all([
        instances.open("shared"),
        instances.open("shared"),
    ]);
    try {
        assert.equal(first, second);
        assert.equal(starts, 1);
        assert.equal(first.server.listening, true);
        assert.equal(await requestGeneration(first), 1);
    } finally {
        await instances.close("shared");
    }
    assert.equal(first.server.listening, false);
});

test("open-close-open returns a fresh listening generation", async () => {
    let starts = 0;
    let releaseFirst;
    const firstGate = new Promise((resolve) => {
        releaseFirst = resolve;
    });
    const instances = lifecycle(async () => {
        starts += 1;
        if (starts === 1) {
            await firstGate;
        }
        return listen(starts);
    });

    const firstOpen = instances.open("ordered");
    const closing = instances.close("ordered");
    const secondOpen = instances.open("ordered");
    releaseFirst();

    const first = await firstOpen;
    await closing;
    const second = await secondOpen;
    try {
        assert.equal(first.server.listening, false);
        assert.equal(second.server.listening, true);
        assert.equal(second.generation, 2);
        assert.equal(starts, 2);
        assert.equal(await requestGeneration(second), 2);
    } finally {
        await instances.close("ordered");
    }
});

test("failed startup clears the cached promise for a real retry", async () => {
    let starts = 0;
    const instances = lifecycle(async () => {
        starts += 1;
        if (starts === 1) {
            throw new Error("startup failed");
        }
        return listen(starts);
    });

    await assert.rejects(instances.open("retry"), /startup failed/);
    const recovered = await instances.open("retry");
    try {
        assert.equal(recovered.generation, 2);
        assert.equal(recovered.server.listening, true);
    } finally {
        await instances.close("retry");
    }
});
