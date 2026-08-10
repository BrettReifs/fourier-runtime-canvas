# Fourier Runtime Canvas Plugin

A GitHub Copilot canvas for compact semantic KPI presentations and
frequency-domain path animation. Native Canvas 2D text, bars, axes, and
thresholds can coexist with coefficient-only Fourier path layers. Fourier
layers can use animated, padded silhouette assets to occlude selected
lower-depth layers. Timeline keyframes support pointer drag retiming, grouped
cross-layer movement, grid snapping, and keyboard steps.

The canvas lands on the active full-bleed scene with playback and scrubbing in
reach. Edit / Compose reveals the timeline in a desktop side panel or narrow
bottom sheet. Create opens a session asset library with coefficient-derived
control geometry beside the live Fourier output. Point and stroke edits save as
revision-bound updates to the existing asset ID, preserving scene and matte
references. Learn keeps sine-series fundamentals out of the primary workflow.
Every editor field gets an accessible info card from one centralized tutorial
registry with deterministic local demos and reduced-motion fallbacks.

## Installation

After publication in Awesome Copilot:

```text
copilot plugin install fourier-runtime-canvas@awesome-copilot
```

Open `fourier-runtime-canvas` in Copilot. The current scene appears first. Use
`create_kpi_presentation` and `patch_kpi_presentation` for compact responsive
presentation work. Use Create for new or in-place Fourier asset edits and
Edit / Compose for layer, matte, and keyframe work.
If low-level composition editing changes an owned KPI layer, compact patches
return `semantic_drift` until `sync_kpi_presentation` explicitly reconciles the
supported edits through history.

Compact semantic actions return revision and artifact summaries, not full
composition state or coefficient arrays.

## Storage model

Raw pointer points and reconstructed control geometry are temporary. Preview
requests never persist. Stable-ID saves store only revised `fourier-path/v1`
coefficients and bounded asset history alongside hybrid
`fourier-composition/v1` timeline data. Semantic-only patches update the atomic
composition state without creating asset files. Runtime HTTP endpoints bind to
`127.0.0.1`.

## Source

Source, limits, API examples, and development instructions are available in
the [standalone repository](https://github.com/BrettReifs/fourier-runtime-canvas).
This plugin is structured for contribution to
[Awesome Copilot](https://github.com/github/awesome-copilot).

## License

MIT
