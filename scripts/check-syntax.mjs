import { readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { spawnSync } from "node:child_process";

function moduleFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory() && entry.name !== "node_modules") {
            return moduleFiles(path);
        }
        return entry.isFile() && extname(entry.name) === ".mjs" ? [path] : [];
    });
}

for (const file of moduleFiles(".")) {
    const result = spawnSync(process.execPath, ["--check", file], {
        encoding: "utf8",
        stdio: "pipe",
    });
    if (result.status !== 0) {
        process.stderr.write(result.stderr);
        process.exit(result.status ?? 1);
    }
}
