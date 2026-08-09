# Pilot 01 findings

## Verdict

HTML/SVG passed the minimum presentation gate. Fourier Runtime Canvas did not,
so Pilot 01 does not support a cost-efficiency win for Fourier. Quality is a
prerequisite, and the resource comparison cannot override that failure.

The screenshot showed Fourier text upside down and clipped. Shapes normalized
independently, which made related elements render at inconsistent sizes. The
scene did not fit responsively, and the requested explicit palette was
unavailable. The screenshot is described here rather than embedded because the
source image is not present in this worktree.

HTML/SVG clearly presented the requested dashboard. Its revised output remained
one 13,515-byte file with 58 SVG elements. The revised Fourier workspace
retained 17 files totaling 515,318 bytes; its active portable payload was nine
files totaling 285,837 bytes.

## Resource signal

Fourier used six fewer revision tool calls, a 35.29% reduction from HTML/SVG's
17 calls. That is the one positive pilot signal. It came with 10.94% more
elapsed time, 57.86% more nano AIU, 73.25% higher peak context, and 76.04% more
output tokens in the revision phase. These are observations from one paired
run, not general runtime claims.

Creation elapsed time was close: Fourier was 4.02 seconds slower, or 1.62%.
Fourier still used 57.07% more nano AIU and reached a 62.99% larger peak
context. Initial Fourier bytes were not recorded, so no creation byte delta is
reported.

## Interpretation limits

Summed input tokens double-count accumulated context on successive model calls.
They indicate total model processing, while peak context is the clearer measure
of context growth. Artifact totals include superseded Fourier drafts because
retention is part of the observed workflow cost.

The pilot used the same GPT-5.6 Sol model at high effort for the dashboard
task, but a single run cannot isolate nondeterminism, serving load, evaluator
variance, or format-specific affordances. Repeat the fixed specs only after the
Fourier output can pass the same responsive presentation gate.
