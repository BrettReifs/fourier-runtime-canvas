# Fourier Runtime Canvas Plugin

A GitHub Copilot canvas for compact semantic KPI presentations and
frequency-domain path animation. Native Canvas 2D text, bars, axes, and
thresholds can coexist with coefficient-only Fourier path layers. Fourier
layers can use animated, padded silhouette assets to occlude selected
lower-depth layers. Timeline keyframes support pointer drag retiming, grouped
cross-layer movement, grid snapping, and keyboard steps.

## Installation

After publication in Awesome Copilot:

```text
copilot plugin install fourier-runtime-canvas@awesome-copilot
```

Open `fourier-runtime-canvas` in Copilot. Use `create_kpi_presentation` and
`patch_kpi_presentation` for compact responsive presentation work. Use Create
and the low-level composition actions when a scene needs Fourier path assets.
If low-level composition editing changes an owned KPI layer, compact patches
return `semantic_drift` until `sync_kpi_presentation` explicitly reconciles the
supported edits through history.

Compact semantic actions return revision and artifact summaries, not full
composition state or coefficient arrays.

## Storage model

Raw pointer points are temporary. The extension stores `fourier-path/v1`
coefficient assets and hybrid `fourier-composition/v1` timeline data in the
active workspace. Semantic-only patches update the atomic composition state
without creating asset files. Runtime HTTP endpoints bind to `127.0.0.1`.

## Source

Source, limits, API examples, and development instructions are available in
the [standalone repository](https://github.com/BrettReifs/fourier-runtime-canvas).
This plugin is structured for contribution to
[Awesome Copilot](https://github.com/github/awesome-copilot).

## License

MIT
