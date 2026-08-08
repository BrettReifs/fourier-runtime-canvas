import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { join } from "node:path";

import { writeJsonAtomic } from "./mutation-queue.mjs";

export function versionedAssetFileName(assetId, version = randomUUID()) {
    return `${assetId}.${version}.fourier.json`;
}

export function indexedAssetFiles(manifest, diskFileNames) {
    if (manifest?.fileNamesById) {
        return [...manifest.fileNamesById.entries()];
    }
    return manifest?.legacy
        ? diskFileNames
            .filter((fileName) => fileName.endsWith(".fourier.json"))
            .map((fileName) => [null, fileName])
        : [];
}

export async function commitAssetVersion({
    asset,
    directory,
    fileName,
    manifest,
    previousFileName,
    removeFile = rm,
    writeJson = writeJsonAtomic,
}) {
    const filePath = join(directory, fileName);
    await writeJson(filePath, asset);
    try {
        await writeJson(join(directory, "latest.json"), manifest);
    } catch (error) {
        try {
            await removeFile(filePath, { force: true });
        } catch (rollbackError) {
            throw new AggregateError(
                [error, rollbackError],
                "Asset manifest commit failed and the new asset version could not be rolled back.",
            );
        }
        throw error;
    }
    let cleanupError = null;
    if (previousFileName && previousFileName !== fileName) {
        try {
            await removeFile(join(directory, previousFileName), { force: true });
        } catch (error) {
            cleanupError = error;
        }
    }
    return { cleanupError, filePath };
}
