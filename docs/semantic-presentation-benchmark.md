# Semantic presentation benchmark

## Hypothesis

Compact semantic presentation actions should preserve the revision efficiency of
the runtime while avoiding the payload and rendering penalties of encoding
ordinary presentation content as Fourier paths. Text, chart geometry, labels,
axes, and thresholds should remain semantic data rendered natively by Canvas 2D.
Fourier coefficients remain appropriate for authored or procedural path layers.

The benchmark question is not whether semantic scenes are universally smaller
than every alternative. It is whether an agent can create and revise a
responsive KPI presentation with less active context and fewer repair steps than
the low-level coefficient workflow, while retaining atomic revisions, history,
and hybrid composition.

## Pilot observation

An initial low-level Fourier benchmark produced upside-down or clipped text,
normalized each bar independently, omitted responsive layout and an explicit
palette, used 21 times the active payload of a one-file HTML/SVG result, and used
58 percent more model compute. The useful signal was a 35 percent reduction in
revision tool calls.

These values describe one pilot workload. They do not establish general storage,
quality, latency, token, or compute advantages. The comparison also predates the
semantic actions described below, so it is a baseline rather than a result for
the current implementation.

## Product response

`create_kpi_presentation` compiles a typed KPI specification into native text,
bar-chart, and threshold layers. `patch_kpi_presentation` applies revision-bound
semantic deltas without creating frequency assets. `get_scene_summary` reports
only semantic metadata, active layer identities, artifact counts and bytes, and
warnings. None of these compact actions return coefficients or full composition
state.

Compact patches fingerprint their owned semantic layers. A low-level edit to
those layers produces a `semantic_drift` conflict rather than a silent rebuild.
The explicit `sync_kpi_presentation` action reconciles supported edits and
records the pre-reconciliation state in history. Fourier overlays remain outside
that ownership boundary.

The renderer uses one maximum value for every bar and the threshold, preserves
the selected aspect ratio through letterboxing, applies an explicit persisted
palette, and keeps content inside a proportional safe area. Existing Fourier
layers can remain in the same composition for shapes that benefit from spectral
reconstruction.

## Next benchmark

The next run should execute the same authored brief through three paths: compact
semantic actions, low-level Fourier composition, and one-file HTML/SVG. Record
model input and output tokens, tool calls by category, active payload bytes,
persisted bytes, wall time, revision conflicts, and a fixed visual-quality
check at 16:9, 4:3, and narrow viewport sizes. Report the semantic path as a
product result only after that controlled comparison is repeatable.
