import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
    commitAssetVersion,
    indexedAssetFiles,
    versionedAssetFileName,
} from "../extensions/fourier-runtime-canvas/asset-store.mjs";
import { writeJsonAtomic } from "../extensions/fourier-runtime-canvas/mutation-queue.mjs";

function manifest(latestFileName, assets) {
    return { version: 1, latestFileName, assets };
}

test("manifest failure rolls back new and same-ID asset versions", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fourier-asset-commit-"));
    const asset = { id: "asset-a", format: "fourier-path/v1" };
    const oldFileName = versionedAssetFileName(asset.id, "old");
    const oldPath = join(directory, oldFileName);
    try {
        await writeJsonAtomic(oldPath, { ...asset, name: "old" });
        const oldManifest = manifest(oldFileName, { [asset.id]: oldFileName });
        await writeJsonAtomic(join(directory, "latest.json"), oldManifest);

        for (const previousFileName of [undefined, oldFileName]) {
            const fileName = versionedAssetFileName(
                previousFileName ? asset.id : "asset-b",
                previousFileName ? "replacement" : "new",
            );
            const nextAssetId = previousFileName ? asset.id : "asset-b";
            let writeCount = 0;
            await assert.rejects(
                commitAssetVersion({
                    asset: { ...asset, id: nextAssetId },
                    directory,
                    fileName,
                    manifest: manifest(fileName, {
                        ...oldManifest.assets,
                        [nextAssetId]: fileName,
                    }),
                    previousFileName,
                    writeJson: async (path, value) => {
                        writeCount += 1;
                        if (writeCount === 2) {
                            throw new Error("manifest write failed");
                        }
                        return writeJsonAtomic(path, value);
                    },
                }),
                /manifest write failed/,
            );
            await assert.rejects(readFile(join(directory, fileName)), { code: "ENOENT" });
            assert.deepEqual(
                JSON.parse(await readFile(join(directory, "latest.json"), "utf8")),
                oldManifest,
            );
        }
        assert.equal(JSON.parse(await readFile(oldPath, "utf8")).name, "old");
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test("same-ID replacement switches the manifest before removing the old version", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fourier-asset-replace-"));
    const asset = { id: "asset-a", format: "fourier-path/v1" };
    const oldFileName = versionedAssetFileName(asset.id, "old");
    const newFileName = versionedAssetFileName(asset.id, "new");
    try {
        await writeJsonAtomic(join(directory, oldFileName), { ...asset, name: "old" });
        await writeJsonAtomic(
            join(directory, "latest.json"),
            manifest(oldFileName, { [asset.id]: oldFileName }),
        );
        await commitAssetVersion({
            asset: { ...asset, name: "new" },
            directory,
            fileName: newFileName,
            manifest: manifest(newFileName, { [asset.id]: newFileName }),
            previousFileName: oldFileName,
        });

        assert.deepEqual(
            JSON.parse(await readFile(join(directory, "latest.json"), "utf8")),
            manifest(newFileName, { [asset.id]: newFileName }),
        );
        assert.equal(
            JSON.parse(await readFile(join(directory, newFileName), "utf8")).name,
            "new",
        );
        await assert.rejects(readFile(join(directory, oldFileName)), { code: "ENOENT" });
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test("versioned manifests keep orphaned files inert during reload", () => {
    const activeFile = versionedAssetFileName("asset-a", "active");
    const obsoleteFile = versionedAssetFileName("asset-a", "obsolete");
    const rolledBackFile = versionedAssetFileName("asset-b", "uncommitted");
    const activeManifest = {
        fileNamesById: new Map([["asset-a", activeFile]]),
        latestFileName: activeFile,
    };

    assert.deepEqual(
        indexedAssetFiles(activeManifest, [obsoleteFile, rolledBackFile, activeFile]),
        [["asset-a", activeFile]],
    );
    assert.deepEqual(
        indexedAssetFiles(null, [obsoleteFile, rolledBackFile, activeFile]),
        [],
    );
});
