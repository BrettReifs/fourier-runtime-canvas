# Experiment harness

This directory preserves fixed inputs, prompts, acceptance criteria, raw run
telemetry, and comparison tools for repeatable Fourier Runtime Canvas
experiments. It does not modify or wrap the runtime under test.

The measurements are approximations for engineering decisions, not academic
proof. A comparison is meaningful only when runs use the same model, reasoning
effort, prompt text, input dataset, starting repository state, tool access, and
quality rubric. Record deviations rather than smoothing them away.

Quality is the first gate. A run that clips, inverts, overlaps, misstates the
content, misses required responsive layouts, or falls below the human score
threshold does not win on cost. Resource measurements become decision evidence
only after both candidates pass the same presentation gate.

## Layout

| Path | Purpose |
| --- | --- |
| `datasets/` | Versioned, citation-bearing benchmark inputs |
| `specs/` | Frozen build and revision prompts with acceptance criteria |
| `pilot-01/` | Raw telemetry, computed comparisons, and the pilot verdict |
| `scripts/` | Dependency-free validation and comparison commands |

The VS Code architecture dataset is a lossless tuple encoding of the
authoritative JSON block. Repeated keys and URL prefixes are indexed so the
file remains below 20 KiB without dropping citations, descriptions, notes, or
derivation markers. `_meta.schemas` defines each tuple and
`_meta.extractedBlockSha256` identifies the extracted source block.

## Run protocol

1. Start from the same clean commit and use a new isolated workspace for each
   candidate.
2. Fix model, reasoning effort, prompt, dataset, tool permissions, and time
   measurement boundaries.
3. Run the build prompt, save raw telemetry and artifacts, then apply the
   paired revision prompt without resetting the candidate.
4. Evaluate the quality gate at 16:9, 4:3, and a narrow viewport before
   comparing resource measurements.
5. Preserve failed and superseded artifacts when measuring total experiment
   cost. Report an active portable payload separately when useful.
6. Record raw values. Derive comparisons with the checked-in script.

## Known confounds

Model-serving load, tool latency, cache state, nondeterministic generation,
filesystem performance, evaluator judgment, runtime startup, and accumulated
conversation context can all affect a run. Summed input tokens count the same
accumulated context again on later calls, so they describe model processing,
not unique prompt size. Peak context is the clearer context-growth signal.

Artifact formats also differ. A single HTML file and a multi-file runtime
workspace do not have equivalent editability, portability, or cleanup
behavior. Report total retained artifacts and active payloads separately.

Pilot 01 is evidence for the harness, not a general claim about Fourier,
HTML/SVG, model efficiency, or future runtime behavior. Repeat runs and passing
quality results are required before drawing broader conclusions.

## Commands

```powershell
npm run benchmark:validate
npm run benchmark:compare
node benchmarks/scripts/compare-runs.mjs --baseline html-svg <result.json> [...]
```

Run-result JSON may contain one run object, an array of run objects, or a
top-level `runs` array. Each run needs an `id`, `name`, `creation`, and
`revision` object using the metric shape in `pilot-01/results.json`.
