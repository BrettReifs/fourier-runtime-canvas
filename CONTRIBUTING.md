# Contributing

Thank you for improving Fourier Runtime Canvas. Changes should preserve its
core invariant: source pointer paths are temporary and persisted runtime assets
contain Fourier coefficients, not raster data or raw drawing points.

## Development

Use Node.js `^20.19.0` or `>=22.12.0`.

```powershell
npm ci --prefix extensions/fourier-runtime-canvas
npm run validate
```

Keep reusable source under `extensions/fourier-runtime-canvas/`. The plugin
directory contains only `plugin.json` and its README because Awesome Copilot
materializes referenced extension source during packaging. Do not add
`canvas.json` or duplicate the extension modules in the plugin.

Tests use Node's built-in test runner. Add focused coverage for pure logic and
compile the renderer's inline client script when changing browser code. New
runtime inputs need explicit schemas and limits. HTTP listeners must remain bound to `127.0.0.1`. Capability, Host, Origin,
content-type, CSP, body-size, storage, and complexity checks must not be
weakened. Persistent mutations must use the workspace queue and atomic writer.
Extension stdout must stay free of diagnostic logging because it participates
in the Copilot protocol.

## Pull requests

Describe the behavior change, its storage implications, and the validation
performed. Keep unrelated refactors separate. Use conventional commit
subjects such as `feat:`, `fix:`, `docs:`, `refactor:`, and `test:`.

By contributing, you agree that your contribution is licensed under the MIT
License.
