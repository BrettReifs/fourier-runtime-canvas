# Comparative evaluation method

This note resolves [issue #4](https://github.com/BrettReifs/fourier-runtime-canvas/issues/4)
under the authoritative [Agent Visual Runtime map](https://github.com/BrettReifs/fourier-runtime-canvas/issues/2).
It specifies the study that issue #6 will run. It does not execute the
benchmark or set the product success thresholds owned by issue #8.

## Decision

Use a randomized complete-block authoring study with eight replicate blocks.
Each block runs the same Benchmark Scene and revisions once in each of four
conditions:

| ID | Condition | Frozen implementation |
| --- | --- | --- |
| C1 | Agent Visual Runtime | The qualified Lighthouse-capable repository extension at the benchmark commit |
| C2 | Agent-authored web visual | One self-contained SVG document with local JavaScript and native browser rendering |
| C3 | Animation format | Lottie JSON rendered by a pinned local `lottie-web` SVG renderer |
| C4 | Static presentation | A self-contained HTML slide sequence with hard cuts and no interpolated motion |

SVG is the primary C2 implementation because selecting between SVG and Canvas
inside a run would add an uncontrolled factor. An HTML Canvas sensitivity run
may be reported separately, but must not be pooled with C2. Lottie is selected
instead of an unspecified equivalent because `lottie-web` provides a
first-party player with explicit SVG, Canvas, and HTML renderer choices
([Airbnb `lottie-web`](https://github.com/airbnb/lottie-web)). C4 keeps native
PowerPoint animation out of scope, as required by the parent map, while still
representing a conventional static deck workflow.

The study compares the four integrated workflows. It does not isolate the
causal effect of file format, renderer, agent tool surface, or motion
individually.

C1 cannot be frozen from the current merged baseline. Benchmark execution must
wait until [issue #3](https://github.com/BrettReifs/fourier-runtime-canvas/issues/3)
qualifies the package baseline and
[issue #11](https://github.com/BrettReifs/fourier-runtime-canvas/issues/11)
promotes the accepted Lighthouse Workflow. Record the first commit that
satisfies both tickets. This protocol does not presume that the current
extension already implements the semantic scene.

## Benchmark Scene dataset

Issue #2 defines the Lighthouse Workflow as a multi-agent explanation with
handoffs, retries, failures, and state changes. The benchmark freezes that idea
as the following scene contract before any run:

- Logical viewport: 1600 by 900 CSS pixels, device scale factor 1.
- Agents: Router, Worker, and Reviewer, left to right.
- State sequence:
  - 0-1 s: Router receives `Analyze request`.
  - 1-2 s: Router hands the task to Worker.
  - 2-3 s: Worker processes it.
  - 3-4 s: Worker enters `Failed: dependency timeout`.
  - 4-5 s: Worker retries.
  - 5-6 s: Worker succeeds and hands the result to Reviewer.
  - 6-7 s: Reviewer reviews the result.
  - 7-8 s: Reviewer enters `Approved`.
- Required visible semantics: every agent label, current state, handoff
  direction, failure, retry, and final state.
- Required non-visual semantics: an ordered text timeline containing the same
  information and a programmatically determinable current-state description.
- Reference frames: the midpoint of every state, initially 0.5, 1.5, 2.5,
  3.5, 4.5, 5.5, 6.5, and 7.5 seconds. Revision fixtures add or shift frames
  with the state schedule.
- Visual fixture: `#F8FAFC` background; `#FFFFFF` cards; `#111827` text;
  `#475569` neutral, `#1D4ED8` active, `#B91C1C` failure, `#B45309` retry,
  and `#15803D` success strokes; a versioned Inter font at 32 px for agent
  labels, 24 px for state, and 20 px for captions; four 270 by 160 px card
  slots centered at x=215, 605, 995, and 1385 on y=380; 4 px directional
  connectors between adjacent cards; and a state caption centered at y=650.
  The Auditor slot is hidden until T1.
- Motion fixture: active cards use the active stroke; failure, retry, and
  success use their named strokes. During a handoff state, a 24 px marker
  travels linearly from the source-card edge to the destination-card edge.
  Reduced motion removes the moving marker and emphasizes the destination
  connector and caption at the state boundary. C4 depicts each midpoint as a
  hard-cut slide. These values must be stored as shared data, not copied from
  one condition's output.

The execution repository must version these inputs as immutable fixtures:

```text
benchmark/
  protocol.json
  scene.json
  visual-fixture.json
  prompts/
    author.md
    revise-branch.md
    revise-timing.md
    revise-accessibility.md
  oracle/
    semantic-assertions.json
    reference-frames/
```

The fixture files, prompt bytes, dependency lockfiles, repository commit,
Copilot CLI and SDK versions, model identifier, reasoning effort, browser
build, OS, hardware, locale, time zone, and installed fonts form the dataset
manifest. Hash every input with SHA-256 before the first run.

## Task scripts and revision rounds

Every condition gets a condition-neutral outcome prompt plus a short frozen
adapter that names the permitted implementation. Do not pretend the complete
prompt can be byte-identical when the tool and output contracts differ. Hash
and report both the shared prompt and each adapter.

1. **T0, author:** Produce the fixed Lighthouse Scene. It must satisfy the
   visual, timing, semantic, playback, save, reopen, and deterministic replay
   checks in the scene contract.
2. **T1, branch revision:** Add an Auditor after Reviewer. After `Approved`,
   Reviewer hands the output to Auditor, which ends in `Logged`. Preserve all
   prior behavior. Extend the schedule with an 8-9 second Auditor handoff and
   a 9-10 second `Logged` state, with reference frames at 8.5 and 9.5 seconds.
3. **T2, timing revision:** Hold both the failed state and the retry state for
   1.5 seconds, extend the total presentation to 11 seconds, and make replay
   return cleanly to the initial state. C4 implements the same schedule as
   hard-cut slides. The resulting schedule is 0-1 receive, 1-2 handoff, 2-3
   process, 3-4.5 failed, 4.5-6 retry, 6-7 succeed/handoff, 7-8 review, 8-9
   approved, 9-10 Auditor handoff, and 10-11 logged. Its reference frames are
   0.5, 1.5, 2.5, 3.75, 5.25, 6.5, 7.5, 8.5, 9.5, and 10.5 seconds.
4. **T3, accessibility revision:** Set the retry description to `Worker
   failed because the dependency timed out, then retried successfully`.
   Provide an equivalent ordered text timeline. With reduced motion enabled,
   replace interpolated movement with instant state changes while preserving
   state order and timing.

T0 has a 30-minute cap. Each revision has a 15-minute cap. A round ends when
the agent declares completion and the harness passes it, or when the cap is
reached. After a failed check, return only the machine-generated failure
report and allow at most two repair attempts inside the same cap. Timeouts are
right-censored failures, not successful runs with long durations.

T0-T3 remain in one session because retaining and revising prior work is part
of the workflow being evaluated. Every condition starts in a fresh workspace
and fresh agent session with memory and cross-session retrieval disabled.
Humans do not repair artifacts during a run.

## Controls and run order

One replicate block contains C1-C4 under the same environment snapshot.
Use eight blocks, giving 32 condition sessions and two repetitions of each
sequence in this carryover-balanced Latin square:

```text
C1 C2 C4 C3
C2 C3 C1 C4
C3 C4 C2 C1
C4 C1 C3 C2
```

Randomly assign the two replicate blocks to each sequence and randomize block
order. By inspection, every condition occupies every position once and every
ordered pair of distinct conditions occurs once across the four sequences.
This balances position and first-order carryover while preserving pairing
within a block. NIST identifies operator, time, and environment as
nuisance factors suited to blocking, and recommends randomizing treatment
units and run order where a design permits it
([NIST randomized block designs](https://www.itl.nist.gov/div898/handbook/pri/section3/pri332.htm),
[NIST multi-level designs](https://www.itl.nist.gov/div898/handbook/pri/section3/pri3323.htm)).

Freeze these controls:

- One Copilot CLI and `@github/copilot-sdk` version, model, reasoning effort,
  context tier, system instruction, permission policy, and locale.
- One machine, power profile, OS build, pinned Chromium build, 1600 by 900
  viewport, device scale factor 1, font set, and empty browser profile.
- Local dependencies only. Block outbound network requests during authoring
  and rendering after dependencies are prefetched.
- One empty scaffold per condition. C1 may use only the runtime's supported
  actions; C2-C4 may use the same minimal file and preview tools. Record
  condition-specific tool definitions because their context cost is part of
  the workflow.
- The same agent configuration authors all four conditions. Scaffolds contain
  only the pinned renderer or player and measurement hooks, never a partial
  scene or condition-specific design help.
- Cold authoring state for T0, warm state for T1-T3, and a fresh browser
  context for every measured playback.
- Every presentation loads paused at its initial state and starts only from an
  explicit Play action. Record the action timestamp as playback time zero.
- No unrecorded retries, manual prompt changes, artifact hand-tuning, or
  condition-specific optimization.

If the model, runtime, browser, fixture, or prompts change, start a new study
version. Do not pool versions.

## Gates

Security, deterministic correctness, and accessibility are gates, not weighted
scores. A failed gate remains visible in the results and excludes that artifact
from claims of product readiness; it does not erase its time, token, or failure
measurements.

### Security

For every condition, require no secrets, no external requests, no remote
assets, no executable URLs, no writes outside the trial workspace, and a
locked dependency graph. Capture browser requests and filesystem writes.
C1 must also pass the repository validation suite and its loopback capability,
Host, Origin, content-type, CSP, body-size, storage, and complexity checks
described in [SECURITY.md](../SECURITY.md). This is a proportional local-tool
gate, not a cloud-service audit.

### Deterministic correctness

Run the semantic oracle after every round. It checks required entities,
labels, state order, transition times, save/reopen behavior, and final state.
After T3, reload and replay three times from clean browser contexts. Hash the
serialized scene and fixed-time screenshots. Any state mismatch, changed scene
hash, or unexplained screenshot mismatch is a deterministic-correctness
failure.

### Accessibility

Test the complete presentation, not only its controls:

- Run pinned `axe-core` rules for WCAG 2.2 A and AA at every reference frame.
  Axe documents that automated checks find only a portion of WCAG issues and
  return uncertain cases for manual review
  ([Deque `axe-core`](https://github.com/dequelabs/axe-core)).
- Manually verify keyboard operation, visible focus, name/role/value, reading
  order, text contrast, zoom/reflow where applicable, and that the ordered text
  timeline communicates all information without the graphic.
- Inspect the browser accessibility tree at every reference frame. Graphics
  semantics apply to SVG, Canvas, and CSS/HTML graphics
  ([W3C Graphics-ARIA 1.0](https://www.w3.org/TR/graphics-aria-1.0/)).
- Verify that playback starts only from the explicit Play action and can be
  paused and restarted. WCAG 2.2.2 applies to moving content that starts
  automatically and lasts more than five seconds; under this protocol it is
  therefore recorded as not applicable, unless a condition unexpectedly
  autoplays, which is both a protocol failure and subject to the criterion
  ([W3C understanding SC 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)).
- Emulate `prefers-reduced-motion: reduce` and verify T3's instant-transition
  behavior. The preference is standardized by Media Queries Level 5, while
  WCAG SC 2.3.3 addresses disabling non-essential interaction-triggered
  animation
  ([W3C Media Queries 5](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion),
  [W3C understanding SC 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)).

Report each applicable success criterion as pass, fail, or not applicable,
with defects. Do not collapse accessibility into a numeric score. WCAG expects
automated and human evaluation, and recommends usability testing with disabled
users in addition to conformance testing
([W3C understanding conformance](https://www.w3.org/WAI/WCAG22/Understanding/conformance)).

## Measurements

Write one append-only JSON Lines event stream per session. Each event contains
study version, block, condition, task, attempt, monotonic timestamp, status,
and relevant measurements. Store raw data, manifests, transcripts, traces,
screenshots, accessibility results, and derived tables separately.

### Completion and revision time

Start the timer when the frozen task prompt is queued. Stop it when the
artifact first passes the harness, or at the cap. Record wall time, active
agent time, validation time, repair time, attempts, and censored status for T0
and each revision separately. Use monotonic `performance.now()` marks; High
Resolution Time defines a monotonic clock for measurement
([W3C High Resolution Time 3](https://www.w3.org/TR/hr-time-3/)).

### Tokens and context

Subscribe to the SDK event stream and sum `assistant.usage` input, output,
reasoning, cache-read, and cache-write tokens per task. Also retain
`session.usage_info` values for system, tool-definition, conversation, current,
and limit tokens. These fields are defined by the official
[`SessionEvent` schema](https://github.com/github/copilot-sdk/blob/main/nodejs/src/generated/session-events.ts).
Both event types are ephemeral and are not persisted to the SDK session log,
so a crash-tolerant harness listener must append and flush each event to the
benchmark JSONL as it arrives. Reconcile the final captured totals against the
`session.shutdown` aggregate and mark the session's token data incomplete if
they disagree or the shutdown event is absent.

Attribute an `assistant.usage` event to the task whose prompt-queued timestamp
most recently precedes the event and whose terminal harness result follows it.
Include retries, sub-agent work, background work, and compaction calls initiated
inside that interval because they are costs of completing the round. Preserve
the event's model, interaction type, and initiator so those costs can also be
reported separately. Events outside T0-T3 are session overhead.

Report:

1. model input/output tokens;
2. cache and reasoning tokens;
3. system and tool-definition context overhead;
4. serialized mutable scene tokens.

The first three are provider/runtime measurements. For the fourth, use one
pinned tokenizer only as a reproducible text-size proxy and label it as such;
do not claim it equals Copilot billing or context tokens. Compaction events are
diagnostics, not a substitute for per-call usage.

### Files and bytes

After every round, inventory paths, raw bytes, SHA-256 hashes, and MIME types.
Assign every inventoried path to exactly one of three non-overlapping buckets:

- **Mutable scene state:** files the revision must read or change.
- **Condition deliverable:** immutable wrappers or vendor assets copied beside
  the scene and required to play it, excluding the benchmark harness.
- **External runtime:** required installed files outside the deliverable, such
  as the C1 extension or the common browser, never silently treated as zero.

Report file count and bytes for each bucket, plus the first two buckets
combined as the portable artifact and all three combined as total footprint.
Also report compressed portable bytes with one pinned compression command,
but keep raw bytes primary.

### Failures

Record every failed attempt, including recovered failures, under one taxonomy:

- agent/tool invocation or permission failure;
- schema or validation rejection;
- semantic-oracle mismatch;
- render exception, crash, or blank frame;
- visual/timing mismatch;
- accessibility or security gate failure;
- timeout;
- nondeterministic replay.

Record the originating task, detector, error code, repair attempts, recovered
status, and time/tokens consumed. Report counts and trial incidence. Do not
reduce unlike failure classes to one severity-weighted score.

### Render cost

Measure a cold load and five warm playbacks after T3 in the pinned browser.
Record:

- navigation-to-first-correct-frame time;
- per-frame callback duration and frame interval distribution;
- median and 95th-percentile frame interval;
- count and total blocking duration of long animation frames;
- browser process peak resident memory during playback;
- serialized resource bytes loaded;
- C1 transform/update latency separately from playback.

Use Playwright for browser isolation, tracing, and screenshots
([Playwright tracing](https://playwright.dev/docs/api/class-tracing),
[Playwright screenshots](https://playwright.dev/docs/api/class-page#page-screenshot)).
Observe `long-animation-frame` entries where supported; the draft API defines
entries exceeding 50 ms and exposes render and blocking timing
([W3C Long Animation Frames](https://w3c.github.io/long-animation-frames/)).
Retain raw frame timestamps as the cross-condition fallback because the API is
a draft. Sample the pinned browser process's resident memory at 100 ms using
the same OS-level collector in every condition. C4 reports load, hard-cut
paint, and memory cost; animation-only fields are not applicable, not zero.

### Visual and temporal fidelity

Fidelity has three reported components:

1. **Semantic fidelity:** percentage of oracle assertions satisfied.
2. **Temporal fidelity:** absolute transition-time error at every specified
   state boundary.
3. **Raster fidelity:** mismatched-pixel count and ratio against the neutral
   reference frame at each fixed timestamp, using pinned `pixelmatch` settings.

`pixelmatch` operates on equal-sized image arrays and supports anti-alias
detection and perceptual color difference
([Mapbox `pixelmatch`](https://github.com/mapbox/pixelmatch)). Preserve the
diff images. Do not use raster difference as a proxy for explanatory value.
C4 is compared at its specified hard-cut frames and is not penalized for
having no interpolation.

### Explanatory usefulness

Use the final T3 recordings, anonymized and stripped of product chrome. Each
recording uses the same viewport and 11-second schedule; C4 uses hard cuts.
Recruit 16 independent evaluators per condition, 64 total, randomly assigned
so each person sees only one condition and cannot learn the scene from
another. Assign exactly two evaluators to each of the eight trial artifacts.
Record prior animation and multi-agent-system familiarity. This is a
descriptive feasibility sample, not a power-justified population estimate.

Allow one replay and up to 60 seconds total viewing. Then ask six fixed,
scored questions:

1. Which agent received the request first?
2. Which agent failed?
3. Why did it fail?
4. What happened immediately after the failure?
5. Which agent approved the work?
6. What was the final logged state?

Primary usefulness outputs are comprehension accuracy, unanswered items, and
answer time. Secondary outputs are bounded ordinal ratings for handoff
clarity, retry clarity, final-state clarity, and confidence. Preserve item-level
responses. Raters are blind to condition labels, but visible implementation
differences may reveal a condition, so blinding is incomplete.

## Analysis and claims

Pre-register the fixtures, run order, exclusions, metric calculations, and
analysis script before the first measured block. Publish all completed and
failed runs.

For authoring measures, report every block, condition medians and interquartile
ranges, and within-block paired differences with 95% percentile-bootstrap
uncertainty intervals from 10,000 paired-block resamples using the seed stored
in the protocol. For explanatory usefulness, report condition-level item
accuracy and ordinal-response distributions with 95% intervals from 10,000
artifact-clustered resamples, preserving the two ratings for each artifact.
These intervals describe uncertainty in this sample; they are not population
or causal guarantees. Do not use null-hypothesis significance tests in the
primary report. Issue #8, not this method, owns acceptance thresholds.

Allowed descriptive language:

> Under protocol version X, on the pinned machine and model, C1 used a median
> Y fewer mutable-scene bytes than C2 across eight blocks.

Disallowed causal or general language:

> Fourier storage causes lower context cost.

> Animation makes explanations easier to understand.

The study can describe this implementation, scene, model, and environment.
It cannot identify the independent effect of representation or motion, and it
cannot generalize to other scenes, models, users, or production hardware.

## Confounders and limitations

| Confounder | Control or disclosure |
| --- | --- |
| Model training familiarity favors common SVG, HTML, and Lottie idioms over this repository's runtime | Pin the model, repeat runs, and disclose; the protocol cannot remove this confounder |
| Condition-specific tools and schemas change both capability and prompt context | Minimize tools and report tool-definition tokens separately |
| Renderer maturity differs | Pin and identify every renderer; claims apply to integrated workflows |
| T0-T3 session carryover improves later revisions | Keep carryover because persistent revision is part of the product, but compare only matching rounds |
| Run order, fatigue, service drift, and machine temperature | Williams order, blocked runs, random block order, and environment logs |
| Stochastic model output | Eight blocks, complete reporting, no cherry-picked reruns |
| Static and animated outputs expose information differently | Freeze content, schedule, viewport, and viewing rules; do not claim motion alone caused a difference |
| Pixel diff rewards literal fixture matching, not communication | Report semantic, temporal, and raster fidelity separately |
| Automated accessibility checks miss issues | Pair axe with manual, accessibility-tree, keyboard, and reduced-motion checks |
| Human evaluators may infer a condition from its appearance | Strip chrome and labels, record suspected condition, and state that blinding is incomplete |
| One scene and one model limit external validity | Restrict all conclusions to the benchmark configuration |

## Evidence package handoff

Issue #6 should implement this protocol without changing it after seeing
results. Any necessary change creates a new protocol version and restarts the
affected blocks. The Evidence Package must link the protocol commit, input
manifest, raw JSONL, transcripts, failure logs, traces, screenshots, diffs,
accessibility reports, analysis code, derived tables, and a clear record of
deviations. The visualization of findings is a presentation of that evidence,
not the evidence itself.
