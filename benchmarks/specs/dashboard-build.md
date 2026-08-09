# Dashboard build

Use this prompt unchanged for every candidate. Supply
`benchmarks/datasets/vscode-arch-benchmark-v1.json` as the only data input and
start from the same clean repository commit.

## Fixed prompt

```text
Build a polished, self-contained animated dashboard titled "VS Code Architecture Evolution".

Use the supplied vscode-arch-benchmark-v1 dataset without changing its facts. The dataset uses tuple-v1 encoding; decode tuples with _meta.schemas and reconstruct citations by joining citationBases[baseIndex] with each citation suffix.

Show all 20 architecture nodes grouped by shell, core, platform, extensibility, foundation, and AI. Show all 38 directed relationships, with direct edges solid and inferred edges dashed. Include a visible legend, current version, active phase, and a compact detail panel for the selected node or change event.

Create a 12-second looping timeline with four phases: Foundation from 0-2 seconds, Extension Ecosystem from 2-5 seconds, Data & Auth Flows from 5-8 seconds, and Evolution Replay from 8-12 seconds. Follow presentationSpec for highlighted nodes, edges, and event behavior. The user must be able to pause, replay, scrub, and inspect an item without losing the current layout.

Use the exact group palette in presentationSpec.renderingNotes.colorGroups. Keep text upright and size every node in one shared scene coordinate system. Fit the complete scene responsively with safe margins at 16:9, 4:3, and narrow mobile widths. Do not alter runtime source. Save only the files needed to run and inspect the result.
```

## Acceptance criteria

- The artifact contains the exact title, 20 nodes, 38 edges, 10 change events,
  four timeline phases, six group colors, and direct/inferred edge semantics.
- No text or geometry is clipped, inverted, or unintentionally overlapping.
  Nodes use consistent scene-level normalization.
- The entire composition remains visible and operable at 1440x810, 1024x768,
  and 390x844 without horizontal page scrolling.
- Labels, legend, controls, and selected-item detail remain legible at every
  target viewport.
- The loop duration is 12.0 seconds with a tolerance of +/-0.25 seconds. Phase
  boundaries occur within +/-0.20 seconds of 2, 5, and 8 seconds.
- Pause, replay, scrub, selection, and reduced-motion behavior work.
- A human evaluator scores presentation quality at least 4/5. Any
  clipping, inversion, overlap, incorrect content, illegibility, timing miss,
  or responsive failure is an automatic quality-gate failure.

## Measurement boundary

Start elapsed time immediately before submitting the prompt. Stop when the
candidate reports completion and the artifact is ready for review. Record
model calls, summed input tokens, peak context, output tokens, model duration,
nano AIU, tool calls, total retained files/bytes, active files/bytes, and the
quality result.
