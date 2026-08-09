# Architecture evolution explainer

Use this prompt unchanged for every candidate. Supply
`benchmarks/datasets/vscode-arch-benchmark-v1.json` as the only data input.

## Fixed prompt

```text
Create a self-contained 12-second visual explainer titled "VS Code Architecture Evolution - 12-Second Explainer" from the supplied vscode-arch-benchmark-v1 dataset.

Decode tuple-v1 records with _meta.schemas and retain the dataset's direct/inferred derivation markers and indexed citations. Build a stable group-clustered scene containing all 20 nodes and 38 directed edges. Use the exact six-color group palette. Direct edges are solid arrows; inferred edges are dashed arrows.

Animate these beats:
0-2 seconds: establish Workbench, Platform Services, and Status Bar, then draw workbench composition edges.
2-5 seconds: reveal Extension Management and Extension Host, fan out extension-provided capabilities, and show the dashed remote-host relationship.
5-8 seconds: trace Settings Sync and Authentication flows, then show SCM, Tasks, Remote, and Update writing to Status Bar.
8-12 seconds: replay all 10 change events in sequence. Show version and description, preserve each derivation marker, and end with Chat / Copilot, Editor, and Extension Host highlighted beside the label "AI-augmented core".

Provide pause, replay, timeline scrub, and a reduced-motion presentation that replaces travel animation with staged fades. Keep labels upright, use one shared scene coordinate system, and fit the complete scene at 16:9, 4:3, and narrow mobile widths. Do not alter runtime source.
```

## Acceptance criteria

- The explainer includes the exact title, all 20 nodes, all 38 edges, all
  10 events in sequence, citation access, and direct/inferred markers.
- The four beats contain the named nodes, relationships, and final
  `AI-augmented core` label with no factual substitutions.
- No text or geometry is clipped, inverted, or unintentionally overlapping.
- The whole scene and controls fit 1440x810, 1024x768, and 390x844. Labels,
  versions, event descriptions, and relationship states remain legible.
- Total duration is 12.0 seconds +/-0.25 seconds. Beat boundaries are within
  +/-0.20 seconds of 2, 5, and 8 seconds; each evolution event appears in the
  8-12 second interval in sequence.
- Pause, replay, scrub, and reduced-motion presentation work.
- A human evaluator scores presentation quality at least 4/5. Any
  clipping, inversion, overlap, incorrect content, illegibility, timing miss,
  or responsive failure is an automatic quality-gate failure.

## Measurement boundary

Measure from prompt submission until the runnable artifact is reported ready.
Record the standard telemetry, total retained artifact inventory, active
portable payload, and gate result.
