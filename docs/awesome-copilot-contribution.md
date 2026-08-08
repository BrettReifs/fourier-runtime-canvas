# Awesome Copilot contribution notes

This repository is intentionally laid out as a ready-to-copy canvas
contribution for `github/awesome-copilot`. These notes record the upstream
requirements checked on 2026-08-08 and the authoritative sources used.

## Copy boundary

Copy these two directories into the root of an Awesome Copilot checkout:

```text
extensions/fourier-runtime-canvas/
plugins/fourier-runtime-canvas/
```

The extension directory contains `extension.mjs`, its imported sibling
modules, npm manifests, and `assets/preview.png`. The plugin directory contains
only `plugin.json` and `README.md`. The plugin manifest references
`./extensions/fourier-runtime-canvas`, so extension source must not be copied
into the plugin directory. Do not add `canvas.json`.

The canvas declaration ID, extension folder, package name, and plugin name are
all `fourier-runtime-canvas`. The plugin targets Agent Plugins schema 1.0.0,
uses `assets/preview.png` as its Copilot logo, and declares the reusable source
through `extensions.com.github.awesome-copilot.extensions`.

## Upstream validation

After copying into an up-to-date Awesome Copilot checkout, install repository
dependencies and run:

```text
npm run plugin:validate
npm run build
```

The standalone repository's `npm run validate` checks JavaScript syntax, pure
logic tests, renderer client-script syntax, required files, the PNG signature,
manifest invariants, loopback binding, and the absence of `canvas.json`. It
does not replace Awesome Copilot's own validator or generated-site build.

An upstream pull request should target `main` and should not be opened as a
draft. This repository does not create or submit that pull request.

## Authoritative references

The contribution layout and workflow were checked against the following
primary sources:

| Source | Relevance |
| --- | --- |
| [github/awesome-copilot](https://github.com/github/awesome-copilot) | Canonical upstream repository and target layout |
| [CONTRIBUTING.md](https://raw.githubusercontent.com/github/awesome-copilot/main/CONTRIBUTING.md) | Canvas and plugin contribution rules |
| [AGENTS.md](https://raw.githubusercontent.com/github/awesome-copilot/main/AGENTS.md) | Repository conventions and validation commands |
| [Plugin documentation](https://raw.githubusercontent.com/github/awesome-copilot/main/docs/README.plugins.md) | Marketplace installation and plugin discovery |
| [Color Orb extension](https://raw.githubusercontent.com/github/awesome-copilot/main/extensions/color-orb/extension.mjs) | Maintained canvas extension example |
| [Color Orb package](https://raw.githubusercontent.com/github/awesome-copilot/main/extensions/color-orb/package.json) | Maintained extension package example |
| [Color Orb plugin manifest](https://raw.githubusercontent.com/github/awesome-copilot/main/plugins/color-orb/plugin.json) | Maintained canvas plugin example |
| [Color Orb plugin README](https://raw.githubusercontent.com/github/awesome-copilot/main/plugins/color-orb/README.md) | Maintained plugin documentation example |
| [Agent Plugins 1.0.0 schema](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json) | `plugin.json` schema |
| [`@github/copilot-sdk` on npm](https://www.npmjs.com/package/@github/copilot-sdk) | SDK package and supported Node versions |

Requirements can change after the recorded date. Recheck these sources and
rerun upstream validation immediately before submission.
