# Dashboard revision

Apply this prompt unchanged to each completed dashboard-build candidate without
resetting its conversation or workspace.

## Fixed prompt

```text
Revise the existing "VS Code Architecture Evolution" dashboard in place. Preserve correct data and interaction behavior; do not start a separate alternative.

Make every title, label, tooltip, and legend entry upright and fully visible. Remove unintended clipping and overlap. Normalize every node and connector in one shared scene coordinate system so related elements have consistent scale. Fit the whole scene responsively with safe margins at 16:9, 4:3, and narrow mobile widths.

Apply the exact dataset palette: shell #4A90D9, core #7ED321, platform #F5A623, extensibility #9B59B6, foundation #34495E, and AI #E74C3C. Preserve all 20 nodes, 38 directed edges, 10 change events, direct/inferred styling, the four timeline phases, selection details, pause, replay, and scrub controls.

Keep the 12-second timing and phase boundaries unchanged. Remove superseded files only when the target workflow supports safe deletion; otherwise report them separately from the active portable payload. Do not alter runtime source. Save the revised artifact and report exactly what changed.
```

## Acceptance criteria

- The revision retains the exact title and all required dataset content:
  20 nodes, 38 edges, 10 events, six groups, and four phases.
- No text or geometry is clipped, inverted, or unintentionally overlapping.
  All geometry shares one consistent scene normalization.
- The complete scene fits 1440x810, 1024x768, and 390x844 without horizontal
  page scrolling or hidden required controls.
- Text, controls, event descriptions, relationship semantics, and palette
  distinctions remain legible.
- The loop duration is 12.0 seconds with a tolerance of +/-0.25 seconds. Phase
  boundaries occur within +/-0.20 seconds of 2, 5, and 8 seconds.
- Existing pause, replay, scrub, selection, and reduced-motion behavior works.
- A human evaluator scores presentation quality at least 4/5. Any
  clipping, inversion, overlap, incorrect content, illegibility, timing miss,
  or responsive failure is an automatic quality-gate failure.

## Measurement boundary

Start elapsed time immediately before submitting the revision prompt. Stop
when the candidate reports completion and the revised artifact is ready for
review. Measure both the active portable payload and every retained artifact,
including superseded drafts.
