# Scene representation contract: coefficient-only, Fourier-first hybrid, or renderer-agnostic scene model

Research artifact for issue
[#13 Choose the scene representation contract](https://github.com/BrettReifs/fourier-runtime-canvas/issues/13).
Research only. This Markdown note is the one repository file this work writes. No production source, manifest, test, script, or parent map was changed, and the measurement harness ran entirely outside the working tree.

- Date: 2026-08-08
- Local authority: issue [#2 Chart the Agent Visual Runtime reference implementation](https://github.com/BrettReifs/fourier-runtime-canvas/issues/2)
  and the merged package baseline from [PR #1](https://github.com/BrettReifs/fourier-runtime-canvas/pull/1)
  (commit `686df4d`, tree at `extensions/fourier-runtime-canvas/`).
- Repository gate at time of writing: `npm test` passes, 35 of 35 tests.
- Location choice: the repository has no prior research or notes convention. `docs/` held one
  flat topic note (`docs/awesome-copilot-contribution.md`). Research tickets #4, #10, #13, and #14
  will each produce one artifact, so this note starts `docs/research/` and keeps that file's
  house style, including its authoritative-references table.

## Decision

**Adopt a renderer-agnostic semantic scene model as the persisted scene contract. Demote
frequency-domain geometry from universal substrate to an opt-in payload for a narrow set of roles.**

1. The persisted contract becomes a typed, declarative scene: shape primitives with parameters,
   first-class text, named style tokens, accessibility names and descriptions, a semantic timeline,
   and provenance. Geometry that is not a primitive travels as an ordinary sampled or Bezier path.
2. `fourier-path/v1` survives as an addressable, optional geometry payload, referenced by id from a
   scene element. It is the right encoding for a short list, set out in section 7.1: content that is genuinely
   band-limited in a **uniform** parameter (the live sine series, waveform and signal traces), and
   captured freehand strokes where the retained frequency band *is* the authoring intent, including
   the epicycle visual, coefficient morph, and spectral sonification built on it.
3. The full-document replace action protocol is changed independently of the representation. It is
   responsible for the large majority of measured agent revision cost and that cost does not depend
   on which of the three contracts is chosen.

Measured basis, one representative Benchmark Scene, 26 drawable elements, 20 s, 6 narrative steps:
the merged contract at its default 64-term limit serialises to **140,449 bytes / 51,331 tokens**;
the semantic scene carrying strictly more meaning serialises to **4,598 bytes / 1,336 tokens**.
That is **30.6x bytes and 38.4x tokens**, and the semantic scene additionally carries text, colour,
and accessible names that the merged contract cannot express at all.

## 1. What the merged implementation actually persists

The parent map states the working hypothesis as a Fourier-first hybrid: "Fourier paths for continuous
geometry; semantic structures for text, charts, timing, accessibility, and provenance." The merged
implementation delivers the first half and, for scene content, not the second half. This distinction
is load-bearing for the whole comparison, so it is established from source before anything is measured.

Two persisted contracts exist.

`fourier-path/v1` (`extensions/fourier-runtime-canvas/fourier.mjs` L331-L346, L500-L517). Fields:
`id`, `name`, `createdAt`, `coordinateSystem`, `strokeCount`, `termLimit`, `strokes[]`,
`runtime.duration`, `runtime.showEpicycles`. Each stroke is `{ closed, sampleCount, coefficients[] }`
and each coefficient is `{ frequency, amplitude, phase }`. Unknown keys are rejected
(`assertAllowedKeys`, `fourier.mjs` L34-L43, L359-L373, L428-L432, L449-L453).

`fourier-composition/v1` (`extensions/fourier-runtime-canvas/composition.mjs` L316-L380). Allowed
top-level keys are `id`, the contract tag, `revision`, `name`, `duration`, `updatedAt`, `layers`
(L320-L324). Allowed layer keys are `id`, `name`, `assetId`, `start`, `end`, `zIndex`, `motion`,
`audio`, `keyframes` (L117-L131). Allowed keyframe keys are `time`, `assetId`, `x`, `y`, `scale`,
`rotation`, `opacity`, `reveal`, `easing` (L67-L81).

What follows from those closed key sets:

| Semantic capability the parent map calls for | Present in the merged persisted contract? | Evidence |
| --- | --- | --- |
| Text | No. There is no text primitive and no string field other than human names. | `composition.mjs` L67-L81, L117-L131; `fourier.mjs` L359-L373 |
| Colour, stroke weight, fill | No. No stroke, fill, or weight is stored. Stroke hue is derived at draw time from the layer's index in the z-sorted layer array, `hue = (210 + layerIndex * 47) % 360`, and line width is the constant `2.2`. | `renderer.mjs` L1374, L1378 |
| Charts, axes, data binding | No. | as above |
| Timing | Yes. Layer `start`/`end`, keyframe `time`, four easing curves, composition `duration`. | `composition.mjs` L93-L110, L142-L166 |
| Accessibility of scene content | Partial and derived only from layer names. Timeline tracks get an `aria-label` built from `layer.name` (`renderer.mjs` L1835-L1839); the drawing surface itself carries fixed fallback text that never reflects scene content (`renderer.mjs` L490). Layer names default to `Layer N` (`composition.mjs` L204-L206). | as cited |
| Provenance | Partial. `createdAt` on assets, `updatedAt` and `revision` on compositions. No generator, source, or authoring-intent record. | `fourier.mjs` L337; `composition.mjs` L364-L377 |

Colour is therefore derived from a layer's index in the z-sorted layer array rather than owned by an
explicit stored style. Reordering layers does of course change the persisted document; the problem is
narrower and sharper than that. First, edits that are semantically neutral about appearance, such as
changing `zIndex`, inserting a layer, or removing one, silently reassign hues across unrelated layers,
because a layer's colour depends only on how many layers sort before it. Second, and independently, no
field anywhere in the document names the colour that was rendered, so there is no representation-owned
colour for a deterministic export to serialise. Both block the deterministic SVG export required by
issue #14.

**Finding 1. The merged baseline is not the hybrid the parent map describes. For scene content it is
coefficient-only geometry plus a timing and layering envelope.** Candidates (1) and (2) in the ticket
are therefore closer to each other than the ticket wording implies: (2) is (1) plus timing, layering,
procedural motion, and audio-cue settings. All measurements below report them separately so the
timing envelope's cost is visible on its own.

The action protocol is also fixed by the merged code and is measured separately from the
representation. `update_composition` and `POST /api/composition` accept and store a whole document,
guarded by an optimistic `revision` precondition; there is no partial-update action
(`extension.mjs` L1068-L1095, schema at L297-L306). `transform_drawing` accepts source points and
returns coefficients (L1535-L1549). No action can modify a stored asset in place.

Storage and threat surface, for later reference: assets under `fourier-assets/` and compositions plus
history under `fourier-compositions/` inside the Copilot workspace (`extension.mjs` L707, L717);
1 MB request cap, 128 assets, 64 MB coefficient budget, 2 MB composition, 8 MB history
(`extension.mjs` L49-L64); loopback-only binding with per-instance capability, exact Host, same-origin
Origin, strict JSON content type, and a nonce Content Security Policy with `default-src 'none'`
(`security.mjs` L23-L93).

## 2. The three candidates, stated precisely

**A. Coefficient-only geometry.** Persist `fourier-path/v1` assets and nothing else. Every visible
element is a set of complex Fourier coefficients over a closed or mirrored-open path.

**B. The merged working hybrid.** A plus `fourier-composition/v1`: layers referencing assets by id,
keyframed transform, opacity, reveal, easing, per-layer procedural motion, per-layer audio cue.
This is exactly what commit `686df4d` persists.

**C. Renderer-agnostic semantic scene model.** A typed declarative document in the family of SVG and
Lottie: elements carry their own kind and parameters, text is text, style is referenced by token,
accessible names and descriptions are stored, timing is expressed as narrative steps, and freeform
geometry travels as a path payload. For measurement, candidate C is instantiated as `agent-scene/v1`,
a minimal model with `viewport`, `styles`, `nodes`, `edges`, `timeline`, `provenance`, and per-element
`a11y`. Its structural precedents are cited, not invented: SVG 2 defines `path` data plus `title` and
`desc` for accessible naming, and the Lottie specification stores an ellipse as the typed element
`ty: 'el'` with a position and a size rather than as sampled geometry.

A fourth row, **C-SVG**, is measured as a deterministic SVG serialisation of the same scene, to keep
the comparison honest about what an off-the-shelf renderer-agnostic encoding costs.

## 3. Method

Everything below is reproducible from the appendix. No production source file was modified and the
harness wrote nothing into the repository; this note is the only repository file the work produces. The
two pure modules `fourier.mjs` and `composition.mjs` were copied unchanged into a scratch directory
outside the working tree and imported from there, so all coefficient production and composition
validation still runs through repository code rather than a reimplementation.

- Environment: Node.js v25.2.1, win32 x64, AMD Ryzen 9 8945HS.
- Benchmark Scene: the Lighthouse Workflow subject from issue #2, rendered as a multi-agent diagram.
  6 agent nodes, 7 directed edges including one retry arc, 6 status badges, 7 arrowheads,
  26 drawable elements, 6 narrative steps over 20 s, with a handoff, a retry, and a failure.
- Byte counts are UTF-8 lengths of `JSON.stringify` output. Compressed counts use Node `zlib`
  gzip level 9 and Brotli quality 11.
- Token counts use `gpt-tokenizer` with its default `o200k_base` encoding. Absolute counts differ by
  model family; the ratios between rows are the durable result, not the absolute numbers.
- Geometric error is reported in the runtime's own normalised space. `normalizePoints`
  (`fourier.mjs` L106-L123) maps the larger extent to the range -1..1, so an error of 0.01 is 1 percent
  of the shape's half-extent. Reconstruction mirrors `renderer.mjs` L1019-L1026 exactly.
- The SVG polyline baseline decimates the same arc-length-resampled reference curve with
  Ramer-Douglas-Peucker, binary-searching the tolerance until the measured maximum deviation meets the
  target, then serialises `d` with 3 decimal places. This is a deliberately conservative baseline:
  a cubic Bezier fit would be smaller still, so every SVG number below is an upper bound.

## 4. Results

### 4.1 Serialised size and tokens for the whole Benchmark Scene

| Contract | termLimit | bytes | gzip | brotli | tokens |
| --- | --- | --- | --- | --- | --- |
| A coefficient-only assets | 16 | 36,230 | 3,830 | 3,059 | 13,048 |
| B merged hybrid (assets + composition) | 16 | 52,636 | 5,103 | 3,952 | 19,024 |
| A coefficient-only assets | 32 | 65,372 | 7,417 | 5,789 | 23,807 |
| B merged hybrid | 32 | 81,778 | 8,767 | 6,686 | 29,783 |
| A coefficient-only assets | **64 (default)** | 124,043 | 14,778 | 11,138 | 45,355 |
| **B merged hybrid** | **64 (default)** | **140,449** | **16,202** | **12,007** | **51,331** |
| A coefficient-only assets | 128 | 210,352 | 29,571 | 20,407 | 77,263 |
| B merged hybrid | 128 | 226,758 | 31,004 | 21,283 | 83,239 |
| B composition envelope alone | any | 16,380 | 1,308 | 978 | 5,972 |
| **C semantic scene** | n/a | **4,598** | **1,108** | **934** | **1,336** |
| C-SVG deterministic export | n/a | 2,564 | 715 | 583 | 963 |

The default term limit is 64 (`fourier.mjs` L271).

**Finding 2. At the merged default, candidate B costs 30.6x the bytes and 38.4x the tokens of a
semantic scene that carries strictly more meaning.** Compression narrows but does not close the gap:
14.6x on gzip, 12.9x on Brotli. The gap scales with the term limit, from 11.4x bytes at 16 terms to
49.3x at 128 terms, because coefficient volume is the dominant term and the semantic scene is constant.

**Finding 3. The timing envelope is cheap; the geometry is not.** The composition document is
16,380 bytes and 5,972 tokens regardless of term limit, 11.7 percent of B at 64 terms. Layering,
keyframes, easing, motion, and audio settings are not what makes the merged contract large.

### 4.2 Geometric fidelity against term count

Maximum and RMS deviation in normalised half-extents, for primitives that actually occur in an agent
explainer diagram.

| Primitive | 8 terms | 16 | 32 | 64 | 128 | 256 |
| --- | --- | --- | --- | --- | --- | --- |
| Circle badge, closed | 2.96e-4 | 2.41e-5 | 4.8e-13 | 4.8e-13 | 4.8e-13 | 4.8e-13 |
| Rounded rect, r=12, closed | 1.66e-2 | 2.37e-3 | 4.59e-4 | 5.60e-5 | 3.10e-8 | 8.1e-13 |
| Straight connector, open | 6.68e-2 | 2.86e-2 | 1.29e-2 | 5.22e-3 | 1.22e-4 | 6.0e-13 |
| Arrowhead triangle, closed | 1.23e-1 | 4.72e-2 | 2.30e-2 | 1.13e-2 | 4.35e-3 | 3.4e-12 |
| Quadratic retry arc, open | 1.47e-1 | 6.66e-2 | 3.15e-2 | 1.49e-2 | 6.10e-3 | 1.9e-12 |
| L-shaped connector, one right angle, open | 1.99e-1 | 7.59e-2 | 3.52e-2 | 1.72e-2 | 8.94e-3 | **3.76e-3** |

Two cautions on reading this table. First, the runtime resamples to a power-of-two sample count
between 64 and 512 (`fourier.mjs` L285-L293), and when the term limit reaches that sample count the
transform is a lossless interpolation of the resampled polyline rather than a compression, which is
why several rows collapse to machine epsilon at 256. Second, the L-shaped connector resamples to 512,
so its 256-term column is a genuine half-spectrum result and still carries 0.38 percent maximum error.

**Finding 4. Straight lines and hard corners are the worst case, and an agent explainer diagram is
mostly straight lines and hard corners.** A single straight connector, the most common element in the
Lighthouse Workflow subject, needs 64 terms and roughly 4.4 KB of stored JSON to reach 0.5 percent
maximum error. The same segment is two coordinate pairs in any path encoding. Smooth closed curves are
where the transform behaves well; the rounded rect reaches 5.6e-5 at 64 terms.

### 4.3 Where frequency-domain geometry pays, at matched accuracy

The previous table compares term counts, not contracts. This one holds accuracy constant and compares
stored bytes against a decimated SVG polyline of the same curve. The ratio column is
`svg_bytes / fourier_bytes`; a value below 1 means the coefficient encoding is larger.

| Curve class | target max error | Fourier terms | Fourier bytes | SVG vertices | SVG bytes | ratio |
| --- | --- | --- | --- | --- | --- | --- |
| Rounded rect node, closed | 0.010 | 12 | 814 | 18 | 235 | 0.29 |
| Rounded rect node, closed | 0.002 | 20 | 1,369 | 32 | 417 | 0.30 |
| Straight connector, open | 0.010 | 48 | 3,324 | 2 | 25 | 0.01 |
| Straight connector, open | 0.002 | 192 | 13,590 | 2 | 25 | 0.00 |
| Retry arc, open | 0.010 | 128 | 8,935 | 9 | 115 | 0.01 |
| Organic band-limited blob, closed | 0.010 | 48 | 3,292 | 45 | 581 | 0.18 |
| Organic blob with texture, closed | 0.010 | 128 | 8,935 | 158 | 2,049 | 0.23 |
| Oscilloscope trace, 3+7+13 Hz, open | 0.010 | 192 | 13,338 | 48 | 624 | 0.05 |

**Finding 5. As currently encoded, `fourier-path/v1` is larger than a decimated polyline for every
curve class tested, including the organic and the purely harmonic ones, by 3.2x to more than 500x.**
The best case for the transform, a smooth closed curve, is still 3.4x larger than the polyline; the
worst case, a straight line, is between 66x and 544x larger.

This result is surprising enough that it needs to be decomposed before it is trusted. Two mechanisms
are responsible and only one of them is inherent to Fourier geometry.

### 4.4 How much of the gap is the encoding rather than the representation

Serialised cost of one 64-term stroke under different encodings of exactly the same coefficients.

| Encoding | total bytes | bytes per term |
| --- | --- | --- |
| Repository: JSON objects, `toPrecision(12)` (`fourier.mjs` L228-L229) | 4,499 | **70.3** |
| JSON objects, 4 decimal places | 3,151 | 49.2 |
| JSON array of triples, 4 decimal places | 1,103 | 17.2 |
| JSON flat number array, 4 decimal places | 975 | **15.2** |
| Base64 of int16 frequencies plus float32 amplitude and phase | 856 | 13.4 |

**Finding 6. About 4.6x of the current per-term cost is the serialisation choice, not the transform.**
Twelve significant digits are stored for values that the renderer converts straight to `Math.cos` and
`Math.sin` inputs, and each term repeats its three key names.

Rerunning 4.3 at 15.2 bytes per term changes the verdict for exactly one class. A rounded rect at
1 percent error becomes about 182 bytes of coefficients against 235 bytes of polyline, so
compactly-encoded Fourier wins by roughly 1.3x. Every other class stays behind: the signal trace is
still about 2,918 bytes against 624. And a typed primitive beats both by a wide margin. The same
rounded rect as a semantic element, `{"id":"n1","shape":"rect","x":60,"y":40,"w":150,"h":64,"r":12}`,
is 58 bytes, exactly, at exact fidelity.

### 4.5 The pipeline destroys spectral sparsity before the transform runs

`resamplePath` (`fourier.mjs` L136-L169) resamples by cumulative arc length. Arc-length parameterisation
is not the parameter in which a curve's own harmonic structure is defined, except for the circle. The
consequence is measurable on shapes that are exactly two complex terms in a uniform parameter `t`.

| Shape, exact in uniform `t` | terms needed for max error <= 0.01 | for <= 0.002 |
| --- | --- | --- |
| `z = e^(it)` (circle) | 4 | 4 |
| `z = e^(it) + 0.45 e^(-5it)` | 8 | 12 |
| `z = e^(it) + 0.60 e^(-3it)` | 12 | 24 |
| `z = e^(it) + 0.25 e^(-4it)` | 32 | 192 |

**Finding 7. A shape that carries two terms of information can cost up to 192 stored terms after the
runtime's arc-length resampling.** This is a pipeline property, not a property of Fourier geometry, and
it is the second mechanism behind Finding 5. It also explains the oscilloscope trace row in 4.3: a
signal that is trivially sparse in uniform `t` becomes broadband once reparameterised by arc length.

Note the contrast with the live sine-series contract in the same extension, whose terms are
`{ harmonic, amplitude, phase }` over a uniform parameter (`extension.mjs` L118-L135). That contract
*is* sparse, semantically meaningful, and directly editable. It is the part of this runtime where
frequency-domain representation is unambiguously correct.

### 4.6 Continuity, morph, motion, and sonification

The renderer's morph interpolates complex coefficients frequency by frequency and reconstructs
(`renderer.mjs` L1028-L1068). The claim to test is whether that produces something a renderer-agnostic
model cannot.

Comparison of the coefficient morph against a plain linear interpolation of the two curves after
arc-length resampling, best rotational alignment, max deviation in normalised half-extents.

| Pair | terms | amount 0.25 | 0.50 | 0.75 |
| --- | --- | --- | --- | --- |
| Rounded rect to circle | 32 | 0.0004 | 0.0005 | 0.0007 |
| Rounded rect to circle | 128 | 0.0002 | 0.0004 | 0.0006 |
| Triangle to 5-point star | 32 | 0.0087 | 0.0058 | 0.0029 |
| Triangle to 5-point star | 128 | 0.0024 | 0.0016 | 0.0008 |

Perimeter and enclosed area agree to three decimal places in every row.

**Finding 8. Coefficient morph is numerically equivalent to arc-length-correspondence polyline
interpolation, to within 0.9 percent at 32 terms and 0.24 percent at 128 terms, converging as terms
rise.** It is a very good morph. It is not a morph that a renderer-agnostic model is unable to
reproduce, provided that model stores or derives an arc-length correspondence.

The comparison that *does* favour coefficients is against SVG's own animation model. SVG 2 requires
that two `d` values "contain have the same structure, (i.e. exactly the same number and types of path
data commands which are in the same order)" to interpolate smoothly, and specifies discrete animation
otherwise. That is a normative requirement, quoted from the specification. A comparable constraint
appears to apply to Lottie, whose Bezier shape stores parallel vertex and tangent arrays, but this is
**inference from the data structure and is not a normative claim**: the specification does not state a
correspondence rule for shape morph in those words, and the behaviour was not tested here.

Coefficient morph has no correspondence precondition at all: it is defined for any two strokes
regardless of vertex counts or command structure, and it is inherently band-limited, so intermediate
frames cannot develop detail that neither endpoint contained.

Procedural motion is not a representation benefit. `applyLineLife` (`renderer.mjs` L1070-L1085) perturbs
reconstructed points with a fixed sine expression and, by the README's own statement, does not alter
stored coefficients. The same displacement applies to any sampled polyline.

Sonification **is** a representation benefit and the clearest one found. `spectralPartials`
(`renderer.mjs` L1565-L1586) reads stored frequency bins directly, sums amplitude per absolute
frequency, ranks them, and drives Web Audio oscillator ratios and weights from that spectrum
(L1604-L1641). A semantic scene model has no spectrum to read. Any equivalent would have to derive one,
which means running a transform at play time on geometry that was never stored in the frequency domain.

### 4.7 Reconstruction cost and a latent correctness defect

Reconstruction is O(strokes x terms x samples). The renderer allocates a 12,000-sample and
500,000-operation frame budget across visible layers (`renderer.mjs` L1355-L1362) and clamps per-stroke
samples to `max(48, min(480, terms * 3))` (L1207). Replaying those exact budgets in Node:

| termLimit | visible layers | samples per layer | sin/cos pairs per frame | ms per frame | share of a 60 fps budget |
| --- | --- | --- | --- | --- | --- |
| 32 | 26 | 96 | 80,704 | 2.12 | 13% |
| 64 | 26 | 192 | 321,152 | 8.97 | 54% |
| 128 | 26 | 150 | 502,528 | 13.41 | 80% |
| 256 | 26 | 75 | 505,856 | 10.42 | 63% |
| 64 | 64 | 122 | 503,808 | 14.18 | 85% |

**Finding 9. On a current high-end laptop CPU, a 26-element scene at the default 64-term limit spends
54 percent of a 60 fps frame budget on reconstruction alone, and reaches 80 to 85 percent at higher term
or layer counts.** This is single-threaded main-thread work repeated every frame. The comparison this
supports is narrow and is the only one asserted: a contract that stores paths has no reconstruction step,
so this measured cost is zero for candidate C. Rasterisation cost was not measured for any candidate, is
paid by all of them, and no claim is made here about how it is executed.

The clamps also introduce a correctness problem. Reconstruction needs at least two samples per period
of the highest retained frequency.

| termLimit | max retained \|frequency\| | samples needed | samples the renderer allocates at 26 layers | aliased |
| --- | --- | --- | --- | --- |
| 16 | 17 | 34 | 48 | no |
| 32 | 43 | 86 | 96 | no |
| 64 | 85 | 170 | 192 | no |
| 128 | 127 | 254 | 150 | **yes** |
| 256 | 128 | 256 | 75 | **yes** |

**Finding 10. At 128 terms or more in a scene of this size, the renderer under-samples its own stored
coefficients and aliases.** Storing more terms makes the picture worse, not better, and the sampling
clamp means visual output depends on how many layers happen to be visible. This is a defect in the
merged baseline independent of which contract is chosen; it belongs with issue #3.

### 4.8 Agent revision cost, with representation and protocol separated

Four revisions a user would plausibly ask for during the Lighthouse Workflow. Read cost is what the
agent must pull into context to act correctly; write cost is the payload it must emit.

| Revision | Scenario | read bytes | read tokens | write bytes | write tokens |
| --- | --- | --- | --- | --- | --- |
| Rename a node label | B, merged protocol | 16,380 | 5,972 | not expressible | not expressible |
| Rename a node label | C, semantic + JSON Patch | 68 | 21 | 68 | 21 |
| Widen a node by 20% | B, merged protocol | 16,380 | 5,972 | 21,208 | 7,725 |
| Widen a node by 20% | C, semantic + JSON Patch | 48 | 17 | 48 | 17 |
| Recolour the retry edge | B, merged protocol | 16,380 | 5,972 | not expressible | not expressible |
| Recolour the retry edge | C, semantic + JSON Patch | 61 | 18 | 61 | 18 |
| Delay one narrative step by 2 s | B, merged protocol | 16,380 | 5,972 | 16,380 | 5,972 |
| Delay one narrative step by 2 s | B representation + a patch protocol | 64 | 21 | 64 | 21 |
| Delay one narrative step by 2 s | C, semantic + JSON Patch | 57 | 20 | 57 | 20 |

Three separate causes are visible and they must not be conflated.

**Finding 11, protocol.** For the one revision expressible in all three rows, moving from
whole-document replace to a patch operation removes 99.6 percent of the write payload while leaving
the representation untouched. This is a pure action-protocol gain, available to candidates A, B, and C
alike, and it is the single largest lever measured anywhere in this study.

**Finding 12, representation, expressiveness.** Two of the four revisions cannot be performed at all
under candidates A or B. There is no text to rename and no colour to change; the retry edge's hue is
not a stored field at all but a value derived from its index in the z-sorted layer array,
`(210 + layerIndex * 47) % 360`. An agent asked to "make the failing path red" has no legal action.

**Finding 13, representation, irreversibility.** Widening a node is the interesting case. The runtime
discards source pointer coordinates by design after a successful transform, and the persisted asset
contains coefficients only. Coefficients are not editable in the terms a user speaks: there is no
"width". The agent must therefore re-synthesise a full point set, call `transform_drawing` again, and
replace the asset, 21,208 bytes and 7,725 tokens for a request whose semantic content is a single
number. This is inherent to a coefficient-only contract, not to the protocol, and no patch action
fixes it.

## 5. Assessment against each criterion the ticket names

| Criterion | A coefficient-only | B merged hybrid | C renderer-agnostic |
| --- | --- | --- | --- |
| Serialised bytes and tokens | 124 KB / 45.4k tokens | 140 KB / 51.3k tokens | **4.6 KB / 1.3k tokens** |
| Semantic meaning | none beyond stroke identity | timing, layering, names | typed elements, text, style, relations, narrative steps |
| Agent revision cost | many revisions inexpressible; geometry edits require full re-synthesis | same, plus a full-document write per change | single-field patches; every tested revision expressible |
| Continuity and morph | coefficient morph, no correspondence needed, inherently band-limited | same | equivalent quality via arc-length correspondence; needs an explicit correspondence rule; SVG `d` animation alone is insufficient |
| Motion | procedural displacement applied post-reconstruction; not representation-dependent | same | same |
| Sonification | **spectrum is stored and directly playable** | same | no spectrum; would need a transform at play time |
| Portability | no consumer outside this runtime | no consumer outside this runtime | maps onto SVG, Lottie, and Canvas 2D; deterministic SVG export is a serialisation, not a rebuild |
| Accessibility | nothing to expose; a screen reader gets nothing but a canvas | layer names only, defaulting to `Layer N` | text, per-element accessible name and description, ordered narrative captions; aligns with SVG `title`/`desc` and Graphics-ARIA roles |
| Security surface | small: numeric arrays with magnitude ceilings | same, plus id references and bounded strings | larger: strings, style tokens, and text must be length-capped and assigned with `textContent`; the current renderer already does the latter |
| Reliability | fixed reconstruction cost per frame; fidelity degrades under budget clamps | same, plus the sampling defect of Finding 10 | no reconstruction step, so neither cost applies; rasterisation cost unmeasured for all three |
| Implementation complexity | already built | already built; 972 lines across `fourier.mjs` and `composition.mjs` | new schema, new renderer paths for text and typed primitives, style resolution, layout for text; the largest single cost of this decision |

Two notes on the security row. Nothing in candidate C requires relaxing any existing control. The
loopback binding, capability token, Host and Origin checks, JSON content-type requirement, body cap,
and `default-src 'none'` policy (`security.mjs` L23-L93) are transport concerns and are orthogonal to
the scene contract. What candidate C adds is untrusted-string surface: element text, accessible names,
and style token identifiers. The mitigations are already established practice in this codebase, per
the README's statement that user-controlled labels are assigned with `textContent` and not interpreted
as HTML, and the same closed-key-set validation that `composition.mjs` L52-L61 applies today.

## 6. Representation-specific versus protocol-specific benefits

The ticket asks for these to be separated. They are.

**Attributable to the representation only**

| Effect | Direction | Evidence |
| --- | --- | --- |
| Stored bytes and tokens for the same picture | C is 30.6x smaller in bytes, 38.4x in tokens, than B | 4.1 |
| Whether a revision is expressible at all | text and colour edits are impossible under A and B | 4.8, Finding 12 |
| Whether a geometry edit is local or a rebuild | A and B require full re-synthesis; source points are discarded by design | 4.8, Finding 13 |
| Playable spectrum for sonification | only A and B carry one | 4.6 |
| Morph without a correspondence precondition | only A and B; SVG `d` animation requires identical command structure | 4.6, SVG 2 section 9.3.2 |
| Per-frame reconstruction cost | only A and B pay O(strokes x terms x samples) | 4.7 |
| Aliasing under sample-budget clamps | only A and B | 4.7, Finding 10 |
| Accessible content available to assistive technology | only C stores any | 4.8, section 5 |
| Whether appearance is owned by the element or derived from array position | only C owns it; under A and B hue follows layer index, so appearance-neutral edits reassign it and no stored field names the rendered colour | section 1, `renderer.mjs` L1374 |

**Attributable to the action protocol only, and available to all three representations**

| Effect | Magnitude | Evidence |
| --- | --- | --- |
| Whole-document replace instead of a patch operation | 99.6 percent of the write payload for a one-field change | 4.8, Finding 11 |
| Whole-document read before any change | 5,972 tokens per revision regardless of edit size | 4.8 |
| Optimistic `revision` precondition | correctness benefit, negligible cost, keep it | `extension.mjs` L1070-L1078 |
| No in-place asset mutation action | forces asset replacement even for metadata edits | `extension.mjs` L1550-L1590 |

**Attributable to the serialisation, and independent of both**

| Effect | Magnitude | Evidence |
| --- | --- | --- |
| `toPrecision(12)` objects instead of compact numeric arrays | 4.6x per-term cost | 4.4, Finding 6 |
| Arc-length rather than uniform parameterisation | up to 96x more terms for the same curve | 4.5, Finding 7 |

The practical consequence: **if the merged hybrid were kept and only the protocol and serialisation
were fixed, revision cost would fall by roughly two orders of magnitude and storage by about 4.6x,
without touching the representation.** The remaining gap to candidate C would be expressiveness,
portability, accessibility, and render cost, none of which a protocol change can supply.

## 7. Recommendation

Adopt **candidate C** as the persisted scene contract, and keep `fourier-path/v1` as a referenced,
optional payload rather than the substrate. The parent map allows this: it names the Fourier-first
hybrid as a working hypothesis and states that evidence may overturn the boundary. The evidence moves
the boundary rather than erasing it.

### 7.1 Where the boundary now sits

Semantic primitives stay first-class for: nodes and shapes with named parameters, connectors and their
routing, all text, all colour and stroke style, charts and data-bound elements, narrative timing,
accessible names and descriptions, and provenance.

Frequency-domain geometry earns its place in exactly three roles, each with a stated reason:

1. **Signal and waveform content parameterised in uniform `t`.** The existing sine-series contract
   (`extension.mjs` L118-L135) is already this and is already correct. Waveform and spectrum views are
   the runtime's strongest visual argument for the frequency domain.
2. **Captured freehand strokes**, where the retained band is the authoring intent rather than an
   approximation error. The Create workspace produces these and nothing else can.
3. **Any element whose scene node opts in**, via an explicit reference to a `fourier-path/v1` asset,
   to obtain the three things only coefficients give: correspondence-free morph between arbitrary
   strokes, the epicycle explanation visual, and spectral sonification.

### 7.2 Contract sketch

Illustrative, not a schema proposal; the schema belongs to the follow-on ticket.

```json
{
  "kind": "agent-scene/v1",
  "id": "lighthouse-multi-agent",
  "title": "Multi-agent handoff, retry and failure",
  "description": "Six agents exchange work; the test agent fails and the broker retries three times.",
  "viewport": { "width": 960, "height": 320, "units": "px" },
  "styles": { "edge.retry": { "stroke": "state.warn", "strokeWidth": 1.5, "dash": [6, 4] } },
  "elements": [
    {
      "id": "n3", "type": "node", "shape": "rect",
      "x": 280, "y": 160, "w": 170, "h": 64, "style": "node.default",
      "label": { "text": "Tool Broker", "style": "label.node" },
      "a11y": { "role": "img", "label": "Tool Broker agent, state retry" }
    },
    {
      "id": "sig1", "type": "signal", "geometry": { "ref": "fourier-path/v1", "assetId": "trace-a" },
      "a11y": { "label": "Retry latency trace, three peaks" }
    }
  ],
  "timeline": {
    "duration": 20,
    "steps": [{ "at": 10, "focus": "n5", "caption": "Test Agent fails on a flaky suite." }]
  },
  "provenance": { "generator": "agent-visual-runtime", "createdAt": "2026-03-08T00:00:00.000Z" }
}
```

Three properties matter more than the field names. Every element declares its kind, so an agent can
reason about "the retry edge" instead of "layer 23". Every visual property that affects the rendered
picture is stored on the element that owns it rather than derived from its position in an array, so
serialisation is deterministic and appearance-neutral edits cannot reassign appearance. And the
Fourier payload is reachable by reference, so nothing built on coefficients is lost.

### 7.3 What is deliberately given up

- **The coefficient-only storage invariant as a universal rule.** `CONTRIBUTING.md` L3-L5 states the
  core invariant as: source pointer paths are temporary and persisted assets contain coefficients, not
  raster data or raw drawing points. The privacy half of that invariant should be kept exactly as it
  is and applies to captured pointer input. The geometry half should not be extended to agent-authored
  diagram content that was never drawn by a pointer in the first place.
- **A single uniform rendering path.** Two paths must now exist: typed primitives and text, plus
  coefficient reconstruction. This is the real cost of the recommendation.
- **The simplicity of a numbers-only threat surface.** Text and style tokens require length caps and
  the existing closed-key validation extended to strings.

### 7.4 What would overturn this recommendation

Stated in advance so the decision stays falsifiable.

1. If the Lighthouse Workflow's real content turns out to be dominated by freehand organic strokes
   rather than boxes, arrows, and text, the byte and token results in 4.1 shift sharply toward B.
2. If a compact coefficient encoding plus uniform-`t` parameterisation reduced a representative scene
   to within about 2x of the semantic model, the portability and accessibility arguments would still
   stand but the storage argument would not. Findings 6 and 7 bound the achievable gain at roughly
   4.6x from encoding; the parameterisation gain is unmeasured for real content.
3. If user testing shows spectral sonification and epicycle explanation carry most of the explanatory
   value in issue #2's hypothesis 2, the case for keeping coefficients as the default strengthens.
4. If deterministic SVG export under issue #14 proves cheaper from coefficients than from primitives,
   which this study did not test.

## 8. Follow-on tickets

Each is newly precise because of a specific finding above.

1. **Specify `agent-scene/v1`.** Typed elements, text, style tokens, `a11y` name and description,
   narrative timeline, provenance, and two escape hatches: a sampled or Bezier `path`, and a
   `fourier-path/v1` reference. Include a stated morph correspondence rule, since Finding 8 shows
   arc-length correspondence reproduces coefficient morph quality and SVG 2 section 9.3.2 shows the
   naive `d` interpolation route does not. Blocks issue #14.
2. **Replace whole-document composition writes with a patch action.** RFC 6902 JSON Patch, keeping the
   existing optimistic `revision` precondition (`extension.mjs` L1070-L1078), with a bounded operation
   count and a bounded path depth. Justified by Finding 11: 99.6 percent of write payload for a
   one-field edit, and it applies whichever representation wins. This is the highest
   value-to-effort item in the study and it is independent of ticket 1.
3. **Fix coefficient serialisation.** Replace `toPrecision(12)` (`fourier.mjs` L228-L229) with
   precision derived from the target reconstruction error, and store terms as flat numeric arrays.
   Measured: 70.3 to 15.2 bytes per term, 4.6x. Requires a versioned migration.
4. **Fix the reconstruction sampling defect.** At 128 terms or more with a realistic layer count, the
   renderer's clamps under-sample its own coefficients and alias (Finding 10). Either derive the term
   ceiling from the available sample budget, or raise the budget by moving reconstruction off the main
   thread. Route to issue #3 as a qualification finding, with the reproduction in this note's appendix.
5. **Add an explicit parameterisation field to `fourier-path/v1`.** `arc-length` or `uniform-t`.
   Finding 7 shows arc-length resampling can cost up to 96x more terms for a curve that is sparse in
   uniform `t`, which is precisely the signal and waveform content the runtime is best at.
6. **Give appearance a representation-owned home.** Stroke colour is currently derived from a layer's
   index in the z-sorted layer array (`renderer.mjs` L1374) rather than stored. Appearance-neutral edits
   such as changing `zIndex` or inserting a layer therefore reassign hues across unrelated layers, and no
   field names the colour that was rendered, so a deterministic export has nothing representation-owned
   to serialise. Prerequisite for issue #14.
7. **Give the scene an accessible representation.** The drawing surface's fallback text is a fixed
   string (`renderer.mjs` L490) and the only content-derived accessible text is layer names that
   default to `Layer N` (`composition.mjs` L204-L206). Target SVG 2 `title` and `desc` semantics and
   Graphics-ARIA roles, plus an ordered text alternative built from the narrative steps. Accessibility
   is a hard gate in issue #2.
8. **Fold this harness into issue #4's comparative evaluation method.** The Benchmark Scene, the
   matched-accuracy sweep, the revision-payload measurement, and the frame-cost replay are all reusable
   as instrumentation. The appendix is the starting point.

## 9. Remaining fog

- Whether the Create workspace's freehand capture carries enough product value to justify keeping the
  synchronous DFT at all, once diagram content moves to primitives. Only the Lighthouse Workflow trial
  can answer this.
- Whether spectral sonification is explanatory or decorative. It is the one clear representation-only
  benefit found, and it is entirely untested with users.
- Whether text must be layout-resolved, with font metrics baked in, for deterministic SVG export to be
  reproducible across machines. This belongs to issue #14 and materially affects the schema in ticket 1.
- Whether morph between two *different* typed primitives, a rect to an ellipse, needs a correspondence
  rule beyond arc length, and whether users ever ask for it.
- Whether the token ratios in 4.1 hold across tokenizer families. Only `o200k_base` was measured;
  coefficient JSON is dense in digits and punctuation, which tokenizes differently from prose-like
  semantic scenes, so the direction is robust but the magnitude is not.
- What a realistic upper bound on scene size is. All measurements use one 26-element scene; the
  composition contract allows 64 layers and 8,192 scene coefficients (`composition.mjs` L382-L391).

## 10. Authoritative references

External claims use primary sources only: specifications, first-party documentation, and source code.
Repository claims cite paths and line anchors at commit `686df4d`.

| Source | Trust | Used for |
| --- | --- | --- |
| [W3C SVG 2, section 9.3, Path data](https://www.w3.org/TR/SVG2/paths.html) | Specification | Path data grammar and its explicit size-minimisation design |
| [W3C SVG 2, section 9.3.2, the `d` property](https://www.w3.org/TR/SVG2/paths.html#TheDProperty) | Specification | Smooth `d` interpolation requires identical command structure, otherwise discrete animation |
| [W3C SVG 2, section 5.8, `desc` and `title`](https://www.w3.org/TR/SVG2/struct.html#DescriptionAndTitleElements) | Specification | Accessible naming and description in a renderer-agnostic vector contract |
| [W3C WAI-ARIA Graphics Module 1.0](https://www.w3.org/TR/graphics-aria-1.0/) | Recommendation | Roles that let a graphic expose logical structure to assistive technology |
| [Lottie specification, Shapes](https://lottie.github.io/lottie-spec/latest/specs/shapes/) | Specification | Renderer-agnostic models store typed primitives; an ellipse is `ty: 'el'` with position and size, not sampled geometry |
| [Lottie specification, Layers](https://lottie.github.io/lottie-spec/latest/specs/layers/) | Specification | Typed layers with in and out points, parenting, and transforms |
| [IETF RFC 6902, JSON Patch](https://www.rfc-editor.org/rfc/rfc6902.html) | Standards Track | The patch contract proposed in follow-on ticket 2 |
| [openai/tiktoken](https://github.com/openai/tiktoken) | First-party source | Origin of the `o200k_base` encoding used for token counts |
| [`gpt-tokenizer`](https://www.npmjs.com/package/gpt-tokenizer) | First-party package | Tokenizer implementation used in the harness |
| [Node.js `zlib` API](https://nodejs.org/api/zlib.html) | First-party documentation | gzip level 9 and Brotli quality 11 compressed sizes |
| Repository `extensions/fourier-runtime-canvas/fourier.mjs` | Local canonical source | Transform, resampling, term selection, asset contract, limits |
| Repository `extensions/fourier-runtime-canvas/composition.mjs` | Local canonical source | Composition contract, closed key sets, complexity budgets |
| Repository `extensions/fourier-runtime-canvas/renderer.mjs` | Local canonical source | Reconstruction, morph, motion, sonification, frame budgets, colour derivation, accessibility markup |
| Repository `extensions/fourier-runtime-canvas/extension.mjs` | Local canonical source | Agent actions, schemas, series contract, storage, limits |
| Repository `extensions/fourier-runtime-canvas/security.mjs` | Local canonical source | Loopback authorisation and Content Security Policy |
| Repository `README.md`, `CONTRIBUTING.md` | Local canonical source | Stated invariants, privacy and storage behaviour, current limits |
| Issues [#2](https://github.com/BrettReifs/fourier-runtime-canvas/issues/2), [#3](https://github.com/BrettReifs/fourier-runtime-canvas/issues/3), [#4](https://github.com/BrettReifs/fourier-runtime-canvas/issues/4), [#13](https://github.com/BrettReifs/fourier-runtime-canvas/issues/13), [#14](https://github.com/BrettReifs/fourier-runtime-canvas/issues/14) | Local authority | Destination, hypotheses, hard gates, scope boundaries |

Claims that are inference rather than measurement, marked at their point of use and repeated here so
they are not mistaken for evidence:

- The projected 182 bytes for a compactly encoded 12-term rounded rect in 4.4 is arithmetic from the
  measured 15.2 bytes per term, not a measured serialisation.
- The statement in 4.6 that Lottie shape morph carries a practical vertex-correspondence constraint is
  read from its Bezier vertex and tangent structure, not from a normative sentence in the specification,
  and was not tested. The parallel SVG 2 statement in the same paragraph is a direct quotation and is
  not inference.
- The reconstruction timings in 4.7 were measured in Node on one machine, not in a browser. Their
  absolute values will vary; the ratios between rows are the durable result.

Rasterisation cost is deliberately absent from every comparison above. It is paid by all three
candidates, it was not measured here, and no claim is made about how any renderer executes it. The only
render-cost claim in this note is the measured Fourier reconstruction step and its absence from a
path-storing contract.

## Appendix. Reproduction

No step writes into the repository. Every file below is created in a scratch directory outside the
working tree, and the only repository files the harness touches are two pure modules it copies out of
the tree and imports read-only, so all coefficient production and composition validation still runs
through repository code rather than a reimplementation. Functions that mirror repository internals for
the purpose of computing a reference curve are marked in the source and cite the lines they mirror.

### A.1 Setup

```powershell
$lab = Join-Path $env:TEMP "frc-scene-contract-lab"
New-Item -ItemType Directory -Force $lab | Out-Null
Set-Location $lab
npm init -y | Out-Null
npm install gpt-tokenizer
$src = "<path to this repository>\extensions\fourier-runtime-canvas"
Copy-Item (Join-Path $src "fourier.mjs")     (Join-Path $lab "repo-fourier.mjs")     -Force
Copy-Item (Join-Path $src "composition.mjs") (Join-Path $lab "repo-composition.mjs") -Force
```

Then create the nine files in A.2 to A.10 below, all inside `$lab`, and run:

```powershell
node fidelity.mjs                    # section 4.2
foreach ($t in 16,32,64,128) { node sizes.mjs $t }   # section 4.1
node organic.mjs                     # section 4.3
node encoding.mjs                    # sections 4.4 and 4.5
node morph.mjs                       # section 4.6
node cost.mjs                        # section 4.7
node revision.mjs                    # section 4.8
```

Recorded environment: Node.js v25.2.1, win32 x64, AMD Ryzen 9 8945HS. Frame timings are the mean of
30 to 40 iterations after one warm-up call, measured in Node rather than in a browser. They will vary by
machine; the ratios between rows are the durable result. Nothing in this appendix writes to the
repository, and `repo-fourier.mjs` and `repo-composition.mjs` are read-only copies.

### A.2 `scene.mjs`, the Benchmark Scene

```js
export const NODES = [
  { id: "n1", label: "Intake",      x: 60,  y: 40,  w: 150, h: 64, state: "ok" },
  { id: "n2", label: "Planner",     x: 60,  y: 160, w: 150, h: 64, state: "ok" },
  { id: "n3", label: "Tool Broker", x: 280, y: 160, w: 170, h: 64, state: "retry" },
  { id: "n4", label: "Code Agent",  x: 520, y: 100, w: 160, h: 64, state: "ok" },
  { id: "n5", label: "Test Agent",  x: 520, y: 220, w: 160, h: 64, state: "failed" },
  { id: "n6", label: "Reporter",    x: 760, y: 160, w: 150, h: 64, state: "ok" },
];
export const EDGES = [
  { id: "e1", from: "n1", to: "n2", label: "handoff",  kind: "orthogonal" },
  { id: "e2", from: "n2", to: "n3", label: "dispatch", kind: "straight" },
  { id: "e3", from: "n3", to: "n4", label: "invoke",   kind: "straight" },
  { id: "e4", from: "n3", to: "n5", label: "invoke",   kind: "straight" },
  { id: "e5", from: "n5", to: "n3", label: "retry x3", kind: "arc" },
  { id: "e6", from: "n4", to: "n6", label: "result",   kind: "straight" },
  { id: "e7", from: "n5", to: "n6", label: "failure",  kind: "straight" },
];
export const STEPS = [
  { t: 0,  focus: "n1", caption: "Request arrives at Intake." },
  { t: 3,  focus: "n2", caption: "Planner decomposes the request." },
  { t: 6,  focus: "n3", caption: "Tool Broker dispatches two agents." },
  { t: 10, focus: "n5", caption: "Test Agent fails on a flaky suite." },
  { t: 14, focus: "e5", caption: "Broker retries three times." },
  { t: 18, focus: "n6", caption: "Reporter summarises the outcome." },
];
const centre = (n) => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 });
export const nodeById = (id) => NODES.find((n) => n.id === id);

export function roundedRectPoints(n, radius = 12, per = 24) {
  const pts = []; const { x, y, w, h } = n;
  const corners = [
    { cx: x + w - radius, cy: y + radius,     a0: -Math.PI / 2, a1: 0 },
    { cx: x + w - radius, cy: y + h - radius, a0: 0,            a1: Math.PI / 2 },
    { cx: x + radius,     cy: y + h - radius, a0: Math.PI / 2,  a1: Math.PI },
    { cx: x + radius,     cy: y + radius,     a0: Math.PI,      a1: 1.5 * Math.PI },
  ];
  for (const c of corners) for (let i = 0; i <= per; i++) {
    const a = c.a0 + (c.a1 - c.a0) * (i / per);
    pts.push({ x: c.cx + radius * Math.cos(a), y: c.cy + radius * Math.sin(a) });
  }
  return pts;
}
export function edgePoints(e, per = 40) {
  const a = centre(nodeById(e.from)), b = centre(nodeById(e.to)), pts = [];
  if (e.kind === "straight") {
    for (let i = 0; i <= per; i++) { const t = i / per;
      pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); }
    return pts;
  }
  if (e.kind === "orthogonal") {
    const mid = { x: a.x, y: b.y };
    for (let i = 0; i <= per / 2; i++) { const t = i / (per / 2);
      pts.push({ x: a.x + (mid.x - a.x) * t, y: a.y + (mid.y - a.y) * t }); }
    for (let i = 1; i <= per / 2; i++) { const t = i / (per / 2);
      pts.push({ x: mid.x + (b.x - mid.x) * t, y: mid.y + (b.y - mid.y) * t }); }
    return pts;
  }
  const c = { x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) + 110 };
  for (let i = 0; i <= per; i++) { const t = i / per, u = 1 - t;
    pts.push({ x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
               y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }); }
  return pts;
}
export function arrowHeadPoints(e) {
  const a = centre(nodeById(e.from)), b = centre(nodeById(e.to));
  const ang = Math.atan2(b.y - a.y, b.x - a.x), s = 11;
  return [{ x: b.x, y: b.y },
    { x: b.x - s * Math.cos(ang - 0.42), y: b.y - s * Math.sin(ang - 0.42) },
    { x: b.x - s * Math.cos(ang + 0.42), y: b.y - s * Math.sin(ang + 0.42) }];
}
export function badgePoints(n, per = 40) {
  const cx = n.x + n.w - 10, cy = n.y + 10, pts = [];
  for (let i = 0; i <= per; i++) { const a = (i / per) * Math.PI * 2;
    pts.push({ x: cx + 7 * Math.cos(a), y: cy + 7 * Math.sin(a) }); }
  return pts;
}
```

### A.3 `shared.mjs`, reference geometry mirroring repository internals

Imported by the harnesses below. Each function names the repository lines it mirrors, so drift is
detectable.

```js
// mirrors fourier.mjs normalizePoints L106-L123
export function normalize(p) {
  const xs = p.map(q => q.x), ys = p.map(q => q.y);
  const a = Math.min(...xs), b = Math.max(...xs), c = Math.min(...ys), d = Math.max(...ys);
  const cx = (a + b) / 2, cy = (c + d) / 2, s = Math.max(b - a, d - c, 1) / 2;
  return p.map(q => ({ x: (q.x - cx) / s, y: (q.y - cy) / s }));
}
// mirrors fourier.mjs makePeriodic L125-L134
export const periodic = (p, closed) =>
  closed ? [...p, p[0]] : [...p, ...p.slice(1, -1).reverse(), p[0]];
// mirrors fourier.mjs resamplePath L136-L169
export function resample(pts, n) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++)
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const T = cum.at(-1), out = []; let s = 1;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * T;
    while (s < cum.length - 1 && cum[s] < t) s += 1;
    const d0 = cum[s - 1], d1 = cum[s], r = d1 === d0 ? 0 : (t - d0) / (d1 - d0);
    out.push({ x: pts[s - 1].x + (pts[s].x - pts[s - 1].x) * r,
               y: pts[s - 1].y + (pts[s].y - pts[s - 1].y) * r });
  }
  return out;
}
// mirrors renderer.mjs pointFromCoefficients L1019-L1026
export function reconstruct(cs, t) {
  let x = 0, y = 0;
  for (const c of cs) { const a = Math.PI * 2 * c.frequency * t + c.phase;
    x += c.amplitude * Math.cos(a); y += c.amplitude * Math.sin(a); }
  return { x, y };
}
// mirrors renderer.mjs complexCoefficientMap L1028 and morphedCoefficientTerms L1043
export const cmap = (st) => new Map(st.coefficients.map(c =>
  [c.frequency, { re: c.amplitude * Math.cos(c.phase), im: c.amplitude * Math.sin(c.phase) }]));
export function morphTerms(a, b, amt) {
  const A = cmap(a), B = cmap(b), fs = new Set([...A.keys(), ...B.keys()]);
  return [...fs].map(f => {
    const x = A.get(f) ?? { re: 0, im: 0 }, y = B.get(f) ?? { re: 0, im: 0 };
    return { f, re: x.re + (y.re - x.re) * amt, im: x.im + (y.im - x.im) * amt };
  });
}
// mirrors renderer.mjs pointFromComplexTerms L1058-L1068
export function ptTerms(ts, t) {
  let x = 0, y = 0;
  for (const q of ts) { const a = Math.PI * 2 * q.f * t;
    x += q.re * Math.cos(a) - q.im * Math.sin(a);
    y += q.re * Math.sin(a) + q.im * Math.cos(a); }
  return { x, y };
}
```

### A.4 `fidelity.mjs`, section 4.2

```js
import { transformDrawing } from "./repo-fourier.mjs";
import { normalize, periodic, resample, reconstruct } from "./shared.mjs";
import { roundedRectPoints, edgePoints, badgePoints, NODES, EDGES } from "./scene.mjs";

function errorFor(points, closed, termLimit) {
  const s = transformDrawing({ name: "probe", termLimit, strokes: [{ closed, points }] }).strokes[0];
  const ref = resample(periodic(normalize(points), closed), s.sampleCount);
  let sq = 0, max = 0;
  for (let i = 0; i < s.sampleCount; i++) {
    const p = reconstruct(s.coefficients, i / s.sampleCount);
    const d = Math.hypot(p.x - ref[i].x, p.y - ref[i].y);
    sq += d * d; if (d > max) max = d;
  }
  return { terms: s.coefficients.length, sampleCount: s.sampleCount,
           rms: Math.sqrt(sq / s.sampleCount), max,
           bytes: Buffer.byteLength(JSON.stringify(s.coefficients)) };
}
const line = (pts, per) => resample(pts, per);
const PRIMS = [
  { n: "straight connector (open)", pts: edgePoints(EDGES[1]), closed: false },
  { n: "L-shaped connector, one right angle (open)",
    pts: line([{x:0,y:0},{x:0,y:120},{x:235,y:120}], 120), closed: false },
  { n: "arrowhead triangle, 3 hard corners (closed)",
    pts: line([{x:0,y:0},{x:22,y:8},{x:0,y:16},{x:0,y:0}], 120), closed: true },
  { n: "rounded-rect node r=12 (closed)", pts: roundedRectPoints(NODES[0]), closed: true },
  { n: "circle status badge (closed)", pts: badgePoints(NODES[0]), closed: true },
  { n: "quadratic retry arc (open)", pts: edgePoints(EDGES[4]), closed: false },
];
console.log("primitive\tlimit\tterms\tsamples\trms\tmax\tbytes");
for (const p of PRIMS) for (const L of [8, 16, 32, 64, 128, 256]) {
  const r = errorFor(p.pts, p.closed, L);
  console.log([p.n, L, r.terms, r.sampleCount, r.rms.toExponential(3),
               r.max.toExponential(3), r.bytes].join("\t"));
}
```

The L-shaped connector replaces a first attempt that routed edge `e1` orthogonally. That edge is
vertical, so its computed corner coincided with its endpoint and the probe silently degenerated into a
straight line. The two rows were identical to twelve digits, which is what exposed the mistake.

### A.5 `sizes.mjs`, section 4.1

Builds all three candidates over the same 26 elements and measures them. `KIND` is the literal string
`"format"`, held in a variable only so this file can be pasted into any shell without quoting issues.

```js
import { gzipSync, brotliCompressSync, constants } from "node:zlib";
import { encode } from "gpt-tokenizer";
import { transformDrawing } from "./repo-fourier.mjs";
import { normalizeComposition, validateCompositionComplexity } from "./repo-composition.mjs";
import { NODES, EDGES, STEPS, roundedRectPoints, edgePoints, badgePoints,
         arrowHeadPoints, nodeById } from "./scene.mjs";

const KIND = "format";
const TERM_LIMIT = Number(process.argv[2] ?? 64);
const g  = (b) => gzipSync(b, { level: 9 }).length;
const br = (b) => brotliCompressSync(b,
  { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
const m  = (label, text) => { const b = Buffer.from(text);
  return { label, bytes: b.length, gzip: g(b), brotli: br(b), tokens: encode(text).length }; };
const mj = (label, obj) => m(label, JSON.stringify(obj));

const ELEMENTS = [];
for (const n of NODES) ELEMENTS.push({ key: n.id + "-box",   name: n.label + " box",
  pts: roundedRectPoints(n), closed: true });
for (const n of NODES) ELEMENTS.push({ key: n.id + "-badge", name: n.label + " state badge",
  pts: badgePoints(n), closed: true });
for (const e of EDGES) ELEMENTS.push({ key: e.id + "-line",  name: e.id + " connector",
  pts: edgePoints(e), closed: false });
for (const e of EDGES) ELEMENTS.push({ key: e.id + "-head",  name: e.id + " arrowhead",
  pts: arrowHeadPoints(e), closed: true });

const assets = ELEMENTS.map((el) => {
  const a = transformDrawing({ name: el.name, termLimit: TERM_LIMIT,
    strokes: [{ closed: el.closed, points: el.pts }] });
  a.id = el.key; a.createdAt = "2026-03-08T00:00:00.000Z";
  return a;
});
const layers = ELEMENTS.map((el, i) => {
  const id = el.key;
  const st = STEPS.find((s) => el.key.startsWith(s.focus + "-"));
  const start = st ? st.t : 0;
  return { id: "L-" + id, name: el.name, assetId: id, start, end: 20, zIndex: i,
    motion: { enabled: false, amount: 0, speed: 0.35, detail: 3, seed: i * 1.618 },
    audio: { enabled: el.key.endsWith("-badge"), triggerTime: start, baseFrequency: 220,
             gain: 0.045, duration: 0.18, partialCount: 5 },
    keyframes: [
      { time: start, assetId: id, x: 0, y: 0, scale: 1, rotation: 0,
        opacity: 0, reveal: 0, easing: "ease-out" },
      { time: Math.min(20, start + 1.2), assetId: id, x: 0, y: 0, scale: 1, rotation: 0,
        opacity: 1, reveal: 1, easing: "ease-out" },
      { time: 20, assetId: id, x: 0, y: 0, scale: 1, rotation: 0,
        opacity: 1, reveal: 1, easing: "linear" },
    ] };
});
const compIn = { id: "bench-scene", revision: 0,
  name: "Multi-agent handoff, retry and failure", duration: 20, layers };
compIn[KIND] = "fourier-composition/v1";
const composition = normalizeComposition(compIn, new Set(assets.map((a) => a.id)));
validateCompositionComplexity(composition, new Map(assets.map((a) => [a.id, a])));

const SS = { ok: "state.ok", retry: "state.warn", failed: "state.error" };
const C = {
  id: "bench-scene",
  title: "Multi-agent handoff, retry and failure",
  description: "Six agents exchange work; the test agent fails and the broker retries three times.",
  viewport: { width: 960, height: 320, units: "px" },
  styles: {
    "node.default": { fill: "surface.raised", stroke: "border.default",
                      strokeWidth: 1.5, radius: 12 },
    "edge.default": { stroke: "border.default", strokeWidth: 1.5, marker: "arrow" },
    "edge.retry":   { stroke: "state.warn", strokeWidth: 1.5, marker: "arrow", dash: [6, 4] },
    "state.ok": { fill: "state.ok" }, "state.warn": { fill: "state.warn" },
    "state.error": { fill: "state.error" },
    "label.node": { font: "sans.500", size: 14, align: "center" },
    "label.edge": { font: "sans.400", size: 11, align: "center" },
  },
  nodes: NODES.map((n) => ({ id: n.id, type: "node", shape: "rect",
    x: n.x, y: n.y, w: n.w, h: n.h, style: "node.default",
    label: { text: n.label, style: "label.node" },
    badge: { shape: "circle", r: 7, anchor: "top-right", style: SS[n.state], state: n.state },
    a11y: { role: "img", label: n.label + " agent, state " + n.state } })),
  edges: EDGES.map((e) => ({ id: e.id, type: "edge", from: e.from, to: e.to, route: e.kind,
    style: e.id === "e5" ? "edge.retry" : "edge.default",
    label: { text: e.label, style: "label.edge" },
    a11y: { label: nodeById(e.from).label + " " + e.label + " " + nodeById(e.to).label } })),
  timeline: { duration: 20, fps: 60, steps: STEPS.map((s) => ({ at: s.t, focus: s.focus,
    caption: s.caption, transition: { enter: "fade-up", ms: 400 } })) },
  provenance: { generator: "agent-visual-runtime", sourceIssue: 13,
                createdAt: "2026-03-08T00:00:00.000Z" },
};
C[KIND] = "agent-scene/v1";

const d = (pts, closed) => "M" + pts.map((p) => p.x.toFixed(2) + " " + p.y.toFixed(2)).join("L")
  + (closed ? "Z" : "");
const svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 320" role="img"'
  + ' aria-labelledby="t d">',
  '<title id="t">Multi-agent handoff, retry and failure</title>',
  '<desc id="d">Six agents exchange work; the test agent fails and the broker retries'
  + ' three times.</desc>',
  ...NODES.map((n) => '<g role="img" aria-label="' + n.label + ' agent, state ' + n.state
    + '"><rect x="' + n.x + '" y="' + n.y + '" width="' + n.w + '" height="' + n.h
    + '" rx="12" class="node"/><text x="' + (n.x + n.w / 2) + '" y="' + (n.y + n.h / 2 + 5)
    + '" class="ln">' + n.label + '</text><circle cx="' + (n.x + n.w - 10) + '" cy="'
    + (n.y + 10) + '" r="7" class="s-' + n.state + '"/></g>'),
  ...EDGES.map((e) => '<path d="' + d(edgePoints(e, 4), false) + '" class="'
    + (e.id === "e5" ? "edge retry" : "edge") + '" aria-label="' + nodeById(e.from).label
    + ' ' + e.label + ' ' + nodeById(e.to).label + '"/>'),
  "</svg>"].join("\n");

console.log("termLimit=" + TERM_LIMIT + " elements=" + ELEMENTS.length
  + " layers=" + composition.layers.length);
console.log("label\tbytes\tgzip\tbrotli\ttokens");
for (const r of [
  mj("A  coefficient-only asset set", assets),
  mj("B  merged hybrid", { assets, composition }),
  mj("B2   composition envelope only", composition),
  mj("C  renderer-agnostic semantic scene", C),
  m ("C2 deterministic SVG export", svg),
]) console.log([r.label, r.bytes, r.gzip, r.brotli, r.tokens].join("\t"));
```

### A.6 `organic.mjs`, section 4.3

Sweeps the term limit until a target maximum error is met, then binary-searches a
Ramer-Douglas-Peucker tolerance until a decimated polyline meets the same target, and compares stored
bytes. The polyline is a conservative baseline; a cubic Bezier fit would be smaller.

```js
import { transformDrawing } from "./repo-fourier.mjs";
import { normalize, periodic, resample, reconstruct } from "./shared.mjs";
import { roundedRectPoints, edgePoints, NODES, EDGES } from "./scene.mjs";

function segDist(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (!dx && !dy) return Math.hypot(p.x - a.x, p.y - a.y);
  const u = Math.max(0, Math.min(1,
    ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - (a.x + dx * u), p.y - (a.y + dy * u));
}
function rdp(pts, eps) {
  if (pts.length < 3) return pts.slice();
  let mi = 0, md = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = segDist(pts[i], pts[0], pts.at(-1));
    if (d > md) { md = d; mi = i; }
  }
  if (md <= eps) return [pts[0], pts.at(-1)];
  return [...rdp(pts.slice(0, mi + 1), eps).slice(0, -1), ...rdp(pts.slice(mi), eps)];
}
const dAttr = (pts, closed, dec) =>
  "M" + pts.map(p => p.x.toFixed(dec) + " " + p.y.toFixed(dec)).join("L") + (closed ? "Z" : "");
function polyMaxErr(poly, ref) {
  let m = 0;
  for (const p of ref) { let best = Infinity;
    for (let i = 1; i < poly.length; i++) best = Math.min(best, segDist(p, poly[i - 1], poly[i]));
    if (best > m) m = best; }
  return m;
}
function fourierSweep(points, closed, targets) {
  const out = {};
  for (const L of [4,6,8,10,12,16,20,24,32,48,64,96,128,192,256]) {
    let a; try { a = transformDrawing({ name: "p", termLimit: L,
      strokes: [{ closed, points }] }); } catch { continue; }
    const s = a.strokes[0];
    const ref = resample(periodic(normalize(points), closed), s.sampleCount);
    let max = 0;
    for (let i = 0; i < s.sampleCount; i++) {
      const q = reconstruct(s.coefficients, i / s.sampleCount);
      max = Math.max(max, Math.hypot(q.x - ref[i].x, q.y - ref[i].y));
    }
    const bytes = Buffer.byteLength(JSON.stringify(s.coefficients));
    for (const t of targets)
      if (out[t] === undefined && max <= t) out[t] = { terms: s.coefficients.length, bytes };
  }
  return out;
}
function svgSweep(points, closed, targets) {
  const ref = resample(periodic(normalize(points), closed), 512);
  const dense = closed ? [...ref, ref[0]] : ref.slice(0, Math.ceil(ref.length / 2) + 1);
  const out = {};
  for (const t of targets) {
    let lo = t / 40, hi = t, best = null;
    for (let it = 0; it < 24; it++) {
      const mid = (lo + hi) / 2, s = rdp(dense, mid);
      if (polyMaxErr(s, dense) <= t) { best = s; lo = mid; } else { hi = mid; }
    }
    const s = best ?? rdp(dense, t / 40);
    out[t] = { vertices: s.length, bytes: Buffer.byteLength(dAttr(s, closed, 3)) };
  }
  return out;
}
const organic = (h, n = 512, jitter = 0) => {
  const p = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2; let r = 1;
    for (const [k, amp, ph] of h) r += amp * Math.sin(k * th + ph);
    if (jitter) r += jitter * Math.sin(37 * th) * Math.cos(53 * th + 1.1);
    p.push({ x: 100 * r * Math.cos(th), y: 100 * r * Math.sin(th) });
  }
  return p;
};
const trace = (n = 512) => Array.from({ length: n }, (_, i) => {
  const t = i / (n - 1);
  return { x: t * 600, y: 80 * (Math.sin(2*Math.PI*3*t) + 0.45*Math.sin(2*Math.PI*7*t + 0.8)
                               + 0.22*Math.sin(2*Math.PI*13*t + 2.1)) };
});
const CASES = [
  { n: "rounded rect (closed)", pts: roundedRectPoints(NODES[0]), closed: true },
  { n: "straight connector (open)", pts: edgePoints(EDGES[1], 200), closed: false },
  { n: "retry arc (open)", pts: edgePoints(EDGES[4], 200), closed: false },
  { n: "organic blob k=3,7,11 (closed)",
    pts: organic([[3,.25,.4],[7,.12,1.2],[11,.06,2.3]]), closed: true },
  { n: "organic blob + texture (closed)",
    pts: organic([[3,.25,.4],[7,.12,1.2],[11,.06,2.3]], 512, 0.035), closed: true },
  { n: "signal trace 3+7+13 (open)", pts: trace(), closed: false },
];
const T = [0.02, 0.01, 0.005, 0.002];
console.log("case\ttarget\tf_terms\tf_bytes\tsvg_vertices\tsvg_bytes\tsvg_over_fourier");
for (const c of CASES) {
  const f = fourierSweep(c.pts, c.closed, T), s = svgSweep(c.pts, c.closed, T);
  for (const t of T) console.log([c.n, t, f[t]?.terms ?? ">256", f[t]?.bytes ?? "-",
    s[t].vertices, s[t].bytes, f[t] ? (s[t].bytes / f[t].bytes).toFixed(2) : "-"].join("\t"));
}
```

### A.7 `encoding.mjs`, sections 4.4 and 4.5

```js
import { transformDrawing } from "./repo-fourier.mjs";
import { normalize, periodic, resample, reconstruct } from "./shared.mjs";
import { roundedRectPoints, NODES } from "./scene.mjs";

const cs = transformDrawing({ name: "p", termLimit: 64,
  strokes: [{ closed: true, points: roundedRectPoints(NODES[0]) }] }).strokes[0].coefficients;
const enc = {
  "repo JSON objects, toPrecision(12)": JSON.stringify(cs),
  "JSON objects, 4 decimals": JSON.stringify(cs.map(c =>
    ({ frequency: c.frequency, amplitude: +c.amplitude.toFixed(4), phase: +c.phase.toFixed(4) }))),
  "JSON triples, 4 decimals": JSON.stringify(cs.map(c =>
    [c.frequency, +c.amplitude.toFixed(4), +c.phase.toFixed(4)])),
  "JSON flat array, 4 decimals": JSON.stringify(cs.flatMap(c =>
    [c.frequency, +c.amplitude.toFixed(4), +c.phase.toFixed(4)])),
  "base64 int16 freq + float32 pairs": Buffer.concat([
    Buffer.from(new Int16Array(cs.map(c => c.frequency)).buffer),
    Buffer.from(new Float32Array(cs.flatMap(c => [c.amplitude, c.phase])).buffer),
  ]).toString("base64"),
};
console.log("encoding\ttotal_bytes\tbytes_per_term");
for (const [k, v] of Object.entries(enc))
  console.log([k, Buffer.byteLength(v), (Buffer.byteLength(v) / cs.length).toFixed(1)].join("\t"));

// shapes that are exactly two complex terms in uniform t
const epi = (k, a, n = 512) => Array.from({ length: n }, (_, i) => {
  const t = i / n;
  return { x: 120 * (Math.cos(2*Math.PI*t) + a * Math.cos(-2*Math.PI*k*t)),
           y: 120 * (Math.sin(2*Math.PI*t) + a * Math.sin(-2*Math.PI*k*t)) };
});
console.log("\nshape\tterms@0.01\tterms@0.002");
for (const [k, a, label] of [[4,0.25,"e(it)+0.25e(-4it)"], [5,0.45,"e(it)+0.45e(-5it)"],
                             [3,0.60,"e(it)+0.60e(-3it)"], [1,0,"circle e(it)"]]) {
  const pts = epi(k, a); let r1 = ">256", r2 = ">256";
  for (const L of [2,3,4,6,8,12,16,24,32,48,64,96,128,192,256]) {
    let asset; try { asset = transformDrawing({ name: "p", termLimit: L,
      strokes: [{ closed: true, points: pts }] }); } catch { continue; }
    const s = asset.strokes[0];
    const ref = resample(periodic(normalize(pts), true), s.sampleCount);
    let max = 0;
    for (let i = 0; i < s.sampleCount; i++) {
      const q = reconstruct(s.coefficients, i / s.sampleCount);
      max = Math.max(max, Math.hypot(q.x - ref[i].x, q.y - ref[i].y));
    }
    if (r1 === ">256" && max <= 0.01)  r1 = s.coefficients.length;
    if (r2 === ">256" && max <= 0.002) { r2 = s.coefficients.length; break; }
  }
  console.log([label, r1, r2].join("\t"));
}
```

### A.8 `morph.mjs`, section 4.6

Compares the renderer's coefficient morph against a plain linear interpolation of the two curves after
arc-length resampling. The rotational offset is searched exhaustively because arc-length
parameterisation fixes correspondence only up to a starting point.

```js
import { transformDrawing } from "./repo-fourier.mjs";
import { normalize, resample, morphTerms, ptTerms } from "./shared.mjs";
import { roundedRectPoints, badgePoints, NODES } from "./scene.mjs";

const perim = p => { let s = 0;
  for (let i = 1; i < p.length; i++) s += Math.hypot(p[i].x - p[i-1].x, p[i].y - p[i-1].y);
  return s + Math.hypot(p[0].x - p.at(-1).x, p[0].y - p.at(-1).y); };
const area = p => { let s = 0;
  for (let i = 0; i < p.length; i++) { const q = p[(i+1) % p.length];
    s += p[i].x * q.y - q.x * p[i].y; }
  return Math.abs(s) / 2; };
const star = (n=512,k=5,amp=0.45) => Array.from({length:n}, (_,i) => {
  const th = (i/n)*Math.PI*2, r = 100*(1+amp*Math.cos(k*th));
  return { x: r*Math.cos(th), y: r*Math.sin(th) }; });
const tri = (n=300) => resample(
  [{x:0,y:-110},{x:95,y:55},{x:-95,y:55},{x:0,y:-110}], n);

const N = 512;
console.log("pair\tterms\tamount\tmax_dev\tperim_f\tperim_lerp\tarea_f\tarea_lerp");
for (const [label, PA, PB] of [
  ["rounded rect -> circle", roundedRectPoints(NODES[0]), badgePoints(NODES[0])],
  ["triangle -> 5-point star", tri(), star()],
]) for (const L of [32, 128]) {
  const a = transformDrawing({ name:"a", termLimit:L,
    strokes:[{ closed:true, points:PA }] }).strokes[0];
  const b = transformDrawing({ name:"b", termLimit:L,
    strokes:[{ closed:true, points:PB }] }).strokes[0];
  const RA = resample([...normalize(PA), normalize(PA)[0]], N);
  const RB = resample([...normalize(PB), normalize(PB)[0]], N);
  for (const amt of [0.25, 0.5, 0.75]) {
    const ts = morphTerms(a, b, amt);
    const F  = Array.from({ length: N }, (_, i) => ptTerms(ts, i / N));
    const Lp = Array.from({ length: N }, (_, i) =>
      ({ x: RA[i].x + (RB[i].x - RA[i].x) * amt, y: RA[i].y + (RB[i].y - RA[i].y) * amt }));
    let best = Infinity;
    for (let off = 0; off < N; off++) { let m = 0;
      for (let i = 0; i < N; i++) { const j = (i + off) % N;
        m = Math.max(m, Math.hypot(F[i].x - Lp[j].x, F[i].y - Lp[j].y));
        if (m >= best) break; }
      best = Math.min(best, m); }
    console.log([label, L, amt, best.toFixed(4), perim(F).toFixed(3), perim(Lp).toFixed(3),
                 area(F).toFixed(3), area(Lp).toFixed(3)].join("\t"));
  }
}
```

### A.9 `cost.mjs`, section 4.7

Replays the renderer's own budget arithmetic from `renderer.mjs` L1355-L1362 and L1193-L1219, then
times the reconstruction inner loop. It also reports whether the resulting sample count satisfies the
sampling requirement for the highest retained frequency.

```js
import { transformDrawing } from "./repo-fourier.mjs";
import { NODES, EDGES, roundedRectPoints, edgePoints, badgePoints,
         arrowHeadPoints } from "./scene.mjs";

const EL = [];
for (const n of NODES) EL.push({ pts: roundedRectPoints(n), closed: true });
for (const n of NODES) EL.push({ pts: badgePoints(n),       closed: true });
for (const e of EDGES) EL.push({ pts: edgePoints(e),        closed: false });
for (const e of EDGES) EL.push({ pts: arrowHeadPoints(e),   closed: true });

function run(termLimit, layers) {
  const sub = Array.from({ length: layers }, (_, i) => EL[i % EL.length]);
  const terms = sub.map(el => transformDrawing({ name: "x", termLimit,
      strokes: [{ closed: el.closed, points: el.pts }] }).strokes[0]
    .coefficients.map(c => ({ f: c.frequency,
      re: c.amplitude * Math.cos(c.phase), im: c.amplitude * Math.sin(c.phase) })));
  const perLayerSample = Math.max(64,   Math.floor(12000  / layers));   // renderer.mjs L1355
  const perLayerOp     = Math.max(4096, Math.floor(500000 / layers));   // renderer.mjs L1359
  const n = terms[0].length;
  const sampleCount = Math.max(2, Math.min(perLayerSample,
    Math.max(2, Math.floor(perLayerOp / Math.max(1, n))),
    Math.max(48, Math.min(480, n * 3))));                               // renderer.mjs L1207-L1219
  const f = () => { let acc = 0;
    for (const ts of terms) for (let i = 0; i <= sampleCount; i++) {
      const t = i / sampleCount; let x = 0, y = 0;
      for (const q of ts) { const a = Math.PI * 2 * q.f * t;
        x += q.re * Math.cos(a) - q.im * Math.sin(a);
        y += q.re * Math.sin(a) + q.im * Math.cos(a); }
      acc += x + y; }
    return acc; };
  f();
  const t0 = process.hrtime.bigint();
  for (let k = 0; k < 40; k++) f();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / 40;
  return { termLimit, layers, sampleCount, ops: layers * n * (sampleCount + 1), ms };
}
console.log(process.version + " " + process.platform + " " + process.arch);
console.log("termLimit\tlayers\tsamples\tpairs_per_frame\tms_per_frame\tshare_of_60fps");
for (const [L, n] of [[32,26],[64,26],[128,26],[256,26],[64,12],[64,64]]) {
  const r = run(L, n);
  console.log([r.termLimit, r.layers, r.sampleCount, r.ops, r.ms.toFixed(2),
               (r.ms / 16.67 * 100).toFixed(0) + "%"].join("\t"));
}
console.log("\ntermLimit\tmax_abs_freq\tsamples_needed\tsamples_allocated\taliased");
for (const L of [16, 32, 64, 128, 256]) {
  const s = transformDrawing({ name: "x", termLimit: L,
    strokes: [{ closed: true, points: roundedRectPoints(NODES[0]) }] }).strokes[0];
  const maxF = Math.max(...s.coefficients.map(c => Math.abs(c.frequency)));
  const n = s.coefficients.length;
  const samples = Math.max(2, Math.min(Math.max(64, Math.floor(12000 / 26)),
    Math.max(2, Math.floor(Math.max(4096, Math.floor(500000 / 26)) / Math.max(1, n))),
    Math.max(48, Math.min(480, n * 3))));
  console.log([L, maxF, 2 * maxF, samples, samples < 2 * maxF ? "yes" : "no"].join("\t"));
}
```

### A.10 `revision.mjs`, section 4.8

Reuses the element and layer construction from `sizes.mjs`, then measures four revisions. The merged
rows use the real protocol: a full `get_composition` read followed by a full `update_composition`
write. The patch rows use the smallest RFC 6902 operation that expresses the intent.

```js
// after building `assets` and `composition` exactly as in sizes.mjs:
import { encode } from "gpt-tokenizer";
const tok = s => encode(typeof s === "string" ? s : JSON.stringify(s)).length;
const byt = s => Buffer.byteLength(typeof s === "string" ? s : JSON.stringify(s));

const widened = transformDrawing({ name: "Tool Broker box", termLimit: 64,
  strokes: [{ closed: true, points: roundedRectPoints({ ...NODES[2], w: 204 }) }] });

const PATCHES = {
  rename:   { op: "replace", path: "/nodes/1/label/text", value: "Orchestrator" },
  widen:    { op: "replace", path: "/nodes/2/w",          value: 204 },
  recolour: { op: "replace", path: "/edges/4/style",      value: "edge.error" },
  retime:   { op: "replace", path: "/timeline/steps/3/at", value: 12 },
};
const retimeB = { op: "replace", path: "/layers/22/keyframes/0/time", value: 12 };

console.log("scenario\tread_bytes\tread_tokens\twrite_bytes\twrite_tokens");
const row = (n, r, w) => console.log([n, byt(r), tok(r),
  w === null ? "n/a" : byt(w), w === null ? "n/a" : tok(w)].join("\t"));
row("rename, B actual protocol",       composition, null);     // no text field exists
row("rename, C patch",                 PATCHES.rename,   PATCHES.rename);
row("widen, B actual protocol",        composition, { asset: widened, composition });
row("widen, C patch",                  PATCHES.widen,    PATCHES.widen);
row("recolour, B actual protocol",     composition, null);     // no colour field exists
row("recolour, C patch",               PATCHES.recolour, PATCHES.recolour);
row("retime, B actual protocol",       composition, composition);
row("retime, B repr + patch protocol", retimeB,          retimeB);
row("retime, C patch",                 PATCHES.retime,   PATCHES.retime);
```

The two `n/a` write cells are the finding, not a gap in the harness. `fourier-composition/v1` has a
closed key set (`composition.mjs` L117-L131, L67-L81) with no text and no colour, so there is no legal
document an agent could write to satisfy those two requests.
