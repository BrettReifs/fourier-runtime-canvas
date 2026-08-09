# Organic morph

Use this prompt unchanged for every candidate. The coordinate lists below are
the fixed input; do not substitute generated paths.

## Fixed prompt

```text
Create a self-contained 10-second looping visual titled "Signal to Bloom".

Use these three closed paths in a shared 1000x600 coordinate system:
seed = [[500,330],[470,300],[475,255],[500,220],[525,255],[530,300]]
leaf = [[500,330],[410,290],[360,220],[420,205],[485,265],[500,330]]
bloom = [[500,165],[535,225],[605,205],[565,270],[620,325],[545,315],[500,380],[455,315],[380,325],[435,270],[395,205],[465,225]]

Use a dark navy background (#08111F), warm white labels (#F4F1E8), signal cyan (#4DD7E8), leaf green (#72D572), bloom coral (#FF6B6B), and accent gold (#F4C95D).

At 0-2 seconds, draw a thin cyan signal traveling left to right into the seed. At 2-5 seconds, morph the seed into the leaf while a short caption reads "frequency becomes form". At 5-8 seconds, morph the leaf into the bloom and reveal three subtle gold orbital accents. At 8-10 seconds, settle the bloom, fade the caption to "stored as motion", and return to the seed without a visible jump at the loop boundary.

Keep all shapes centered and consistently scaled in one scene coordinate system. Preserve recognizable correspondence through each morph rather than cross-fading unrelated drawings. Include pause, replay, timeline scrub, and reduced-motion behavior. Fit the complete composition at 16:9, 4:3, and narrow mobile widths. Do not alter runtime source.
```

## Acceptance criteria

- The exact three coordinate lists, title, captions, palette, and four timing
  beats are present.
- The seed, leaf, and bloom remain recognizable during continuous morphs; the
  loop boundary has no visible jump.
- No text or geometry is clipped, inverted, or unintentionally overlapping.
  Every path uses the same scene-level scale.
- The full composition and controls fit 1440x810, 1024x768, and 390x844.
  Labels and path silhouettes remain legible.
- Total duration is 10.0 seconds +/-0.25 seconds. Beat boundaries occur within
  +/-0.20 seconds of 2, 5, and 8 seconds.
- Pause, replay, scrub, and reduced-motion presentation work.
- A human evaluator scores presentation quality at least 4/5. Any
  clipping, inversion, overlap, incorrect content, illegibility, timing miss,
  or responsive failure is an automatic quality-gate failure.

## Measurement boundary

Measure from prompt submission until the runnable artifact is reported ready.
Record the standard telemetry, total retained artifact inventory, active
portable payload, and gate result.
