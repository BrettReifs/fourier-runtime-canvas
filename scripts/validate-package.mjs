import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const extensionDirectory = join("extensions", "fourier-runtime-canvas");
const pluginDirectory = join("plugins", "fourier-runtime-canvas");
const requiredExtensionFiles = [
    "extension.mjs",
    "renderer.mjs",
    "fourier.mjs",
    "composition.mjs",
    "history.mjs",
    "instance-lifecycle.mjs",
    "asset-store.mjs",
    "mutation-queue.mjs",
    "security.mjs",
    "package.json",
    "package-lock.json",
    join("assets", "preview.png"),
];

for (const file of requiredExtensionFiles) {
    await access(join(extensionDirectory, file));
}
await access(join(pluginDirectory, "README.md"));

const extensionPackage = JSON.parse(
    await readFile(join(extensionDirectory, "package.json"), "utf8"),
);
assert.equal(extensionPackage.name, "fourier-runtime-canvas");
assert.equal(extensionPackage.type, "module");
assert.equal(extensionPackage.main, "extension.mjs");
assert.equal(extensionPackage.dependencies["@github/copilot-sdk"], "1.0.9");
assert.equal(extensionPackage.engines.node, "^20.19.0 || >=22.12.0");

const plugin = JSON.parse(await readFile(join(pluginDirectory, "plugin.json"), "utf8"));
assert.equal(
    plugin.$schema,
    "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
);
assert.equal(plugin.name, "fourier-runtime-canvas");
assert.equal(plugin.version, "1.0.0");
assert.equal(plugin.license, "MIT");
assert.equal(plugin.author.name, "Brett Reif");
assert.equal(plugin.author.url, "https://github.com/BrettReifs");
assert.equal(plugin.extensions["com.github.copilot"].logo, "assets/preview.png");
assert.deepEqual(
    plugin.extensions["com.github.awesome-copilot"].extensions,
    ["./extensions/fourier-runtime-canvas"],
);
assert(plugin.keywords.every((keyword) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(keyword)));
assert(plugin.keywords.includes("copilot-canvas"));
assert(plugin.keywords.includes("interactive-canvas"));

const extensionSource = await readFile(join(extensionDirectory, "extension.mjs"), "utf8");
assert.match(extensionSource, /id: "fourier-runtime-canvas"/);
assert.doesNotMatch(extensionSource, /console\.log/);
assert.match(extensionSource, /server\.listen\(0, "127\.0\.0\.1"/);
assert.match(extensionSource, /createCapabilityToken\(\)/);
assert.doesNotMatch(extensionSource, /assetPath/);

const rendererSource = await readFile(join(extensionDirectory, "renderer.mjs"), "utf8");
assert.match(rendererSource, /<script nonce="\$\{nonce\}">/);
assert.doesNotMatch(rendererSource, /instanceId/);

const preview = await readFile(join(extensionDirectory, "assets", "preview.png"));
assert.deepEqual([...preview.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);

async function findForbiddenCanvasJson(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory() && entry.name !== "node_modules") {
            await findForbiddenCanvasJson(path);
        } else if (entry.isFile() && entry.name === "canvas.json") {
            throw new Error(`Forbidden canvas.json found at ${path}`);
        }
    }
}

await findForbiddenCanvasJson(".");

const pluginFiles = await readdir(pluginDirectory);
assert.deepEqual(pluginFiles.sort(), ["README.md", "plugin.json"]);

process.stdout.write("Package layout and manifests are valid.\n");
