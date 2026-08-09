# Hybrid incident explainer

Use this prompt unchanged for every candidate. All incident facts and timings
are fixed below.

## Fixed prompt

```text
Create a self-contained 14-second incident explainer titled "Checkout Latency Incident".

Build one shared scene with five service nodes and directed flow:
Gateway -> Checkout API -> Queue -> Worker -> Orders DB.
Show these fixed metrics:
Gateway: 1,240 req/s, p95 180 ms
Checkout API: 980 req/s, p95 2.8 s, error 8.4%
Queue: depth 18,420, oldest 96 s
Worker: 62% saturation, retry 14.1%
Orders DB: p95 74 ms, error 0.2%

Use background #0B1020, panel #141B2D, text #F5F7FA, healthy #42D392, warning #F4C95D, critical #FF5D73, and flow #63B3ED.

At 0-3 seconds, establish healthy flow and the title "14:02 UTC - baseline". At 3-6 seconds, increase Checkout API latency, turn its border critical, and pulse failed requests toward Queue. At 6-10 seconds, grow Queue depth to 18,420, morph its normal flow line into a compressed wave, and highlight Worker retries. At 10-14 seconds, show "Mitigation: disable retry fan-out", drain the queue to 4,200, return Checkout API p95 to 420 ms, and finish with "Recovery underway".

Pair the service topology with a compact p95 sparkline and a queue-depth area trace. The charts must agree with the displayed incident values and current phase. Include pause, replay, timeline scrub, and reduced-motion behavior. Keep text upright, use one shared scene coordinate system, and fit the complete composition at 16:9, 4:3, and narrow mobile widths. Do not alter runtime source.
```

## Acceptance criteria

- The exact title, five services, four directed links, metrics, palette,
  timestamps, mitigation, and recovery values are present.
- Topology, p95 sparkline, and queue-depth trace agree at each beat. The
  compressed-wave transition communicates backlog without obscuring the link.
- No text, chart, or geometry is clipped, inverted, or unintentionally
  overlapping. Service nodes share consistent scale.
- The full scene and controls fit 1440x810, 1024x768, and 390x844. Metrics,
  axes, incident status, and mitigation copy remain legible.
- Total duration is 14.0 seconds +/-0.25 seconds. Beat boundaries occur within
  +/-0.20 seconds of 3, 6, and 10 seconds.
- Pause, replay, scrub, and reduced-motion presentation work.
- A human evaluator scores presentation quality at least 4/5. Any
  clipping, inversion, overlap, incorrect content, illegibility, timing miss,
  or responsive failure is an automatic quality-gate failure.

## Measurement boundary

Measure from prompt submission until the runnable artifact is reported ready.
Record the standard telemetry, total retained artifact inventory, active
portable payload, and gate result.
