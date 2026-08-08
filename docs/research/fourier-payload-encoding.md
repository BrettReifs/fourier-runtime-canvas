# Fourier payload encoding and parameterization

Research artifact for issue
[#19 Define Fourier payload encoding and parameterization](https://github.com/BrettReifs/fourier-runtime-canvas/issues/19).
Research only. No production source, manifest, test, script, or parent map was
changed.

- Date: 2026-08-08
- Authority: issue
  [#2 Chart the Agent Visual Runtime reference implementation](https://github.com/BrettReifs/fourier-runtime-canvas/issues/2)
  and the resolved
  [scene representation contract](https://github.com/BrettReifs/fourier-runtime-canvas/blob/250f2f2/docs/research/scene-representation-contract.md)
  at commit `250f2f2`
- Scope: `agent-scene/v1` remains semantic and renderer-agnostic. This report
  defines only an optional Fourier geometry payload referenced by asset ID.
- Evidence status: no new harness ran. Numeric results are reused from the
  scene representation report or are arithmetic derived from cited sources.

## Decision

Introduce `fourier-path/v2` as the compact successor to the existing
`fourier-path/v1`. A scene element references the asset by ID and never embeds
coefficients. The v2 payload uses canonical flat integer triples and makes
parameterization, closure, coefficient selection, source sample count, and
achieved fidelity explicit.

Use JSON integers as the only v2 wire encoding. Reserve packed base64 for a
later version if a multi-tokenizer benchmark proves a material benefit. Base64
is smaller in bytes, but its token cost, patchability loss, endianness, and
second decoding path are not justified by current evidence.

The contract has five controlling rules:

1. `uniform-t` is used whenever the source has an intrinsic parameter.
   `arc-length` is used only for freehand or imported contours without one.
2. Frequencies are exact signed integer keys. Amplitude and phase are
   quantized integers with explicit decimal scales.
3. Terms have one canonical order: DC first, then descending quantized
   amplitude, ascending frequency, and ascending phase.
4. A renderer that cannot afford the payload's band limit drops high-frequency
   terms. It never aliases them.
5. Fidelity is measured after quantization against the producer reference and
   travels with each stroke. A term count is a work limit, not a quality claim.

## 1. Boundary with `agent-scene/v1`

All meaning stays in the semantic scene: accessible text, style, layout,
transform, timing, and narrative role. The Fourier asset stores normalized
geometry and spectrum only.

```json
{
  "id": "sig1",
  "type": "signal",
  "bbox": { "x": 520, "y": 240, "w": 320, "h": 90 },
  "geometry": { "kind": "fourier-ref", "assetId": "trace-a" },
  "style": "signal.trace",
  "a11y": { "label": "Retry latency trace, three peaks" }
}
```

A scene must remain understandable without resolving the payload. It owns the
element bounds and may carry a semantic fallback. The asset declares its own
format, so the scene does not depend on a Fourier payload version.

## 2. Why the four Fourier capabilities constrain the encoding

| Capability | Runtime operation | Contract consequence |
| --- | --- | --- |
| Reconstruction | Sum `a*cos(2*pi*f*t+phase)` and `a*sin(2*pi*f*t+phase)` (`renderer.mjs` L1019-L1026) | Preserve polar amplitude and phase; bound their quantization error. |
| Correspondence-free morph | Join rectangular coefficients by frequency, with an absent key equal to zero (`renderer.mjs` L1028-L1056) | Frequency is an exact signed integer join key, never a positional index. |
| Epicycle explanation | Chain terms as rotating vectors, with radius equal to amplitude (`renderer.mjs` L1150-L1179) | Canonical DC-first, amplitude-descending order makes the explanation stable and legible. |
| Spectral sonification | Rank amplitude by absolute frequency (`renderer.mjs` L1565-L1586) | Phase needs no extra audio precision; oscillator output still needs an audio Nyquist bound. |

The merged source exposes four hidden assumptions:

- `selectCoefficients` emits DC followed by descending amplitude, but the asset
  schema does not declare order and imported array order is preserved
  (`fourier.mjs` L196-L231, L418-L491).
- Equal-amplitude terms retain DFT emission order. Symmetric shapes therefore
  depend on an incidental sort tie rather than a format rule.
- Mirrored open strokes retain `+f/-f` pairs, while sonification sums both into
  one `abs(f)` bin. Open assets can sound louder than closed assets with
  comparable energy. This is a source reading, not an acoustic measurement.
- Morphing does not check parameterization, so equal frequency integers can be
  blended even when they refer to different parameter domains.

## 3. Parameterization

Arc length is appropriate when a contour has no intrinsic parameter. Fourier
descriptor literature uses normalized arc length for shape recognition
invariance (Zahn and Roskies; Granlund; Kuhl and Giardina; Persoon and Fu).
That objective is not spectral sparsity.

When an intrinsic parameter exists, reparameterizing by arc length generally
destroys sparsity. Arc-length reparameterization is not generally rational
(Farouki and Sakkalis); a circle is a special case because angle and arc length
are proportional. The scene representation report measured a uniform-`t`
two-term curve requiring as many as 192 terms after arc-length
reparameterization. The runtime's live sine-series input is already uniform
`t` by construction (`extension.mjs` L115-L136).

Normative rules:

- `parameterization` is required: `uniform-t` or `arc-length`.
- `uniform-t` is required for signals, waveforms, spectra, procedural
  geometry, and any source with an intrinsic parameter.
- `arc-length` is permitted for captured pointer strokes and imported contours
  without an intrinsic parameter.
- Coefficient morph, spectral comparison, and coefficient interpolation across
  different parameterizations are invalid. A consumer may reconstruct both
  paths and perform a separate geometric blend.
- `closure` is required: `closed` or `mirrored-open`. A closed stroke uses
  `t in [0,1)`. The current mirrored-open construction doubles the period, so
  its visible source extent is `t in [0,0.5]` (`fourier.mjs` L125-L134;
  `renderer.mjs` L1203-L1206).
- `selection` is required: `top-amplitude` or `paired`. The paired selector
  skips a frequency group that does not fit rather than stopping, so retained
  terms alone do not reveal the selection rule (`fourier.mjs` L203-L219).

## 4. Encoding and tokenizer behavior

The resolved scene report measured the current per-term objects at 70.3 bytes
per term and flat four-decimal arrays at 15.2 bytes per term, a 4.6x reduction.
Integer triples are approximately byte-neutral with those flat decimals. Their
benefits are exact JSON numeric interoperability, canonicalization, and a
better token shape, not another claimed byte multiplier.

OpenAI's first-party `tiktoken` patterns establish the family difference before
BPE merges:

| Encoding family | Digit pretoken rule |
| --- | --- |
| `o200k_base`, `o200k_harmony` | `\p{N}{1,3}` |
| `cl100k_base` | `\p{N}{1,3}+` |
| `r50k_base`, `p50k_base`, `p50k_edit`, `gpt2` | unbounded ` ?\p{N}++` |

Modern encodings split long digit runs at three digits before BPE. BPE cannot
merge across those boundaries, so a run of `d` digits costs at least
`ceil(d/3)` tokens. Applying the published regexes, not running a tokenizer,
gives these pretoken upper bounds:

| Serialized term | Pretoken pieces |
| --- | ---: |
| `{"frequency":-5,"amplitude":0.847213456789,"phase":-1.23456789012}` | 26 |
| `-5,0.8472,-1.2346` | 12 |
| `-5,84721,-123457` | 8 |

These are regex-derived pieces, not measured token counts. The direction of
the digit-reduction result is safe for modern encodings; magnitude across
tokenizer families remains a follow-on measurement.

Packed alternatives were considered:

- An `int16` triple stream is six bytes per term, or eight base64 characters
  before JSON framing. That is arithmetic, not a serialization or token
  benchmark.
- Base64 makes term-level JSON Patch impossible and requires a second,
  endianness-sensitive decoder. It is deferred.
- CBOR plus typed arrays (RFC 8949 and RFC 8746) is compact but conflicts with
  the existing JSON-only transport policy.
- Rectangular real/imaginary storage makes epicycle radius and sonification
  strength indirect. The runtime can derive rectangular values once for a
  morph cache, as it does today.

## 5. `fourier-path/v2`

```json
{
  "format": "fourier-path/v2",
  "id": "trace-a",
  "coordinateSystem": "normalized-complex",
  "parameterization": "uniform-t",
  "strokes": [
    {
      "closure": "mirrored-open",
      "selection": "paired",
      "sampleCount": 256,
      "scale": { "amplitude": 100000, "phase": 100000 },
      "terms": [0, 4096, 0, 1, 100000, -78540, -1, 100000, 78540, 3, 33333, 15708],
      "fidelity": {
        "referenceSamples": 256,
        "maxError": 0.00312,
        "rmsError": 0.00061
      }
    }
  ]
}
```

For term `i`:

```text
frequency = terms[3*i]
amplitude = terms[3*i+1] / scale.amplitude
phase     = terms[3*i+2] / scale.phase
```

Fields and constraints:

| Field | Constraint |
| --- | --- |
| `format` | Exact string `fourier-path/v2`; reject unknown formats. |
| `id` | Existing asset identifier rule: `^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$`. |
| `coordinateSystem` | Exact string `normalized-complex`; scene layout owns placement and scale. |
| `parameterization` | `uniform-t` or `arc-length`; applies to every stroke in the asset. |
| `closure` | `closed` or `mirrored-open`. |
| `selection` | `top-amplitude` or `paired`. |
| `sampleCount` | Power of two from 8 through 4096. |
| `scale.amplitude`, `scale.phase` | Powers of ten from `1e2` through `1e7`. |
| `terms` | Flat integer array of length `3K`; at most 256 terms per stroke and 2048 per asset. |
| `fidelity.referenceSamples` | Integer at least `sampleCount`; comparison points are uniform in the declared parameter. |
| `fidelity.maxError`, `rmsError` | Finite nonnegative errors after quantization, in normalized half-extent units, measured against the producer reference. |

Names, timestamps, runtime duration, epicycle visibility, styling, transforms,
and accessibility do not belong in this payload. They remain scene or asset
registry metadata.

Canonical serialization uses UTF-8 JSON, the key order shown above, no
insignificant whitespace, and integer spellings without leading zeroes.
Strokes retain semantic stroke order. Terms are ordered DC first if present,
then descending `amplitudeQ`, ascending `frequency`, and ascending `phaseQ`.
Zero-amplitude terms use `phaseQ = 0`. Phase is wrapped to `[-pi, pi)` before
quantization so equivalent `+pi/-pi` values have one representation.

A producer should publish `contentHash` as SHA-256 over these canonical bytes in
the containing asset registry, not inside the hashed payload. This optional
registry metadata supports deduplication and optimistic asset preconditions
without recursive hashing.

## 6. Fidelity, numeric, sampling, and work constraints

### Fidelity and quantization

Fourier geometry cannot preserve load-bearing corners efficiently. DLMF
section 1.8 states that convergence is non-uniform at jumps, and DLMF section
6.16 identifies the approximately 18% Gibbs overshoot for piecewise continuous
functions. The scene report still measured maximum error `3.76e-3` at 256 terms
for an L-shaped connector. Straight segments, corners, boxes, and arrows remain
semantic scene primitives.

Every producer:

1. reconstructs the final quantized terms at
   `fidelity.referenceSamples` points uniform in the declared parameter;
2. compares those points with its normalized pre-transform reference;
3. stores maximum Euclidean error and RMS Euclidean error; and
4. refuses non-finite results.

The protocol deliberately does not declare a universal perceptual pass
threshold without a user study. Consumers set a task-specific tolerance and
may reject the asset or use its semantic fallback. They must surface maximum
error rather than infer quality from term count.

For round-to-nearest quantization, let
`epsilonA = 1/(2*scale.amplitude)` and
`epsilonP = 1/(2*scale.phase)`. Since
`abs(exp(i*delta)-1) <= abs(delta)`, a conservative bound is:

```text
E_quant <= K*epsilonA + (sum(amplitude) + K*epsilonA)*epsilonP
```

With normalized coordinates, Parseval bounds the energy and makes the phase
contribution small at the allowed scales. Producers choose the smallest allowed
scale that meets their final measured fidelity; consumers validate the measured
fields rather than assuming a fixed precision. All stored integers remain far
inside JSON's interoperable `+/- (2^53-1)` range from RFC 8259 section 6.

### Nyquist and reconstruction

For signed integer harmonics, one period needs at least
`2*max(abs(frequency))+1` samples. Therefore:

- A payload rejects any `abs(frequency) > floor(sampleCount/2)`. For even
  `sampleCount`, only the producer's canonical positive Nyquist bin is valid;
  `-sampleCount/2` is rejected as its duplicate.
- A renderer with an effective budget of `S` samples uses only terms where
  `abs(frequency) <= floor((S-1)/2)`.
- A renderer reports the applied band limit. Once terms are removed, the
  payload's fidelity figures no longer describe that rendering.
- Under-sampling is forbidden. Dropping terms degrades predictably; aliasing
  creates geometry absent from the payload.

The current renderer instead chooses roughly three samples per retained term
and clamps to 480 (`renderer.mjs` L1207-L1211), then shares 12,000 samples and
500,000 coefficient operations across visible layers (L1355-L1362). The scene
report measured 150 allocated samples where 254 were required at 128 terms and
26 layers. The band-limit rule fixes correctness without raising those budgets.

### Existing hard budgets

The payload records, but does not raise, the merged implementation limits:

| Budget | Limit |
| --- | ---: |
| Terms per stroke | 256 |
| Terms per asset | 2048 |
| Strokes per asset | 32 |
| Transform samples | 4096 |
| Estimated DFT operations | 1,000,000 |
| Assets per workspace library | 128 |
| Coefficient library storage | 64 MB |
| Active scene coefficients | 8192 |
| Active scene strokes | 256 |
| Request body | 1 MB |
| Renderer samples across visible layers | 12,000 |
| Renderer coefficient operations across visible layers | 500,000 |

The producer algorithm is not part of the payload. The current DFT is
`O(N^2)`; replacing it with a Cooley-Tukey FFT is a non-breaking implementation
change because v2 records the source sample count and selection rule.

## 7. Determinism

Three guarantees are distinct:

- **Payload determinism is required.** Canonical JSON and integer terms produce
  byte-identical payloads from the same quantized data.
- **Content addressing is recommended at the registry boundary.** SHA-256 over
  canonical bytes gives stable deduplication and equality checks without
  becoming part of the geometry payload.
- **Reconstruction is deterministic to a declared tolerance, not bit-exact
  across engines.** Trigonometric implementations and floating-point summation
  can differ. Deterministic export rounds reconstructed coordinates to an
  export-contract precision before serialization. Issue #14 owns that
  precision and deterministic SVG rules.

Payload equality implies equivalent reconstructed geometry within tolerance.
Equivalent geometry does not imply payload equality because parameterization,
sampling, and retained spectra may differ.

## 8. Morph, epicycle, and sonification rules

### Correspondence-free morph

SVG 2 section 9.3.2 requires the same number, type, and order of path commands
for smooth `d` interpolation. A Fourier morph instead joins the union of exact
frequency keys and treats a missing key as zero. A term can fade in or out
without source vertex correspondence. The scene report measured coefficient
morph and arc-length polyline interpolation differing by 0.9% at 32 terms and
0.24% at 128 terms.

Morphs require equal parameterization. Consumers dequantize before
interpolation. Closure may differ only if the visible parameter extent is
interpolated deliberately; otherwise reconstruct to paths and use a separate
geometric transition. Stored array order has no effect on the frequency join.

### Epicycles

The zero-frequency term is a translation, not a circle. Remaining terms are
drawn in canonical order, with radius equal to amplitude. Renderers cap the
number of displayed epicycles independently from the retained coefficient
count. This matters because the scene report measured reconstruction alone at
54% of a 60 fps frame budget for 26 elements at 64 terms.

### Spectral sonification

Web Audio defines oscillator frequency relative to the audio Nyquist frequency
and warns that out-of-range content folds back. A sonifier clamps mapped
frequencies below `0.5 * AudioContext.sampleRate`, rather than relying on the
current fixed 4000 Hz cap. It ranks dequantized amplitude and does not use
phase. The existing `+f/-f` loudness doubling for paired mirrored-open strokes
must either be normalized by contributor count or explicitly documented before
open and closed assets are compared acoustically.

## 9. Validator invariants

1. Reject unknown keys at every object level and unknown `format` values.
2. Require finite numbers and exact integers for every term entry.
3. Require unique frequencies within each stroke.
4. Require `amplitudeQ >= 0`; canonicalize zero amplitude to zero phase.
5. Require frequencies inside the producer Nyquist bound, including the
   single-bin even-sample rule.
6. Require scales to be allowed powers of ten and all decoded values to remain
   inside existing magnitude ceilings.
7. Require canonical term order and canonical phase range.
8. Require finite fidelity metrics with `rmsError <= maxError`.
9. Require the sum of squared decoded amplitudes to be at most 2 plus a small
   quantization tolerance for normalized complex coordinates.
10. Enforce per-stroke, per-asset, active-scene, request, and storage budgets
    before allocating reconstruction buffers.

Degenerate zero-length strokes remain invalid. A one-term stroke is valid. A
captured open stroke whose endpoints coincide should be emitted as closed.
Missing referenced assets fail explicitly; consumers do not synthesize a
success-shaped substitute.

## 10. Versioning

`fourier-path/v1` remains readable as the merged legacy format. Readers dispatch
on exact `format` and do not best-effort parse unknown versions.

There is no truthful general v1-to-v2 migration. V1 implies the current
arc-length pipeline but does not store achieved fidelity, canonical order,
selection semantics in all cases, or a source reference. Raw points are
discarded by design. A producer may create v2 only by re-transforming an
available source/reference and measuring the quantized result. Otherwise the
asset remains v1. This avoids inventing quality metadata during migration.

Future packed storage, a new coordinate space, or incompatible canonicalization
requires a new format version. Additive registry metadata does not.

## 11. Precise follow-ons and remaining fog

Follow-ons:

1. Benchmark flat decimals, flat integers, and packed base64 on representative
   coefficient assets across `o200k_base`, `cl100k_base`, and `r50k_base`.
2. Implement renderer band-limiting with regression cases at 128 and 256 terms
   under a 26-layer budget. This routes to issue #3.
3. Add parameterization to produced assets and reject cross-parameterization
   coefficient morphs before the rest of v2 is implemented.
4. Define the `agent-scene/v1` Fourier reference and fallback shape in issue
   #17 without importing payload semantics into the scene contract.
5. Let issue #14 define export rounding and missing-asset behavior for portable
   deterministic scenes.
6. Derive the audio clamp from `AudioContext.sampleRate` and measure whether
   conjugate-pair normalization improves explanatory sonification.

Fog:

- Base64 token cost remains unmeasured. If it does not materially beat flat
  integers after transport framing, packed JSON should never be added.
- Mirroring guarantees positional continuity for open strokes but creates
  endpoint corners, the case most exposed to Gibbs ringing. A windowed closure
  has not been compared.
- Fidelity currently compares with the producer's normalized reference after
  sampling. It does not quantify error already introduced while sampling an
  original continuous or pointer path.
- A user-facing fidelity threshold needs perceptual evidence. The format can
  carry measurements now without pretending the threshold is known.
- Epicycle order is justified only if epicycles prove explanatory value. If
  they do not, a future format can prefer frequency order.
- Bit-exact cross-machine exports require issue #14 to designate rounding or a
  reference engine; this payload only guarantees tolerance.

## 12. Authoritative references

| Source | Use |
| --- | --- |
| [RFC 8259 section 6](https://www.rfc-editor.org/rfc/rfc8259.html#section-6) | Exact numeric interoperability for integers in `+/- (2^53-1)` and allowed implementation precision limits |
| [RFC 4648 section 4](https://www.rfc-editor.org/rfc/rfc4648.html#section-4) | Base64 considered but deferred |
| [RFC 6902](https://www.rfc-editor.org/rfc/rfc6902.html) | Term-addressable patchability |
| [RFC 8949](https://www.rfc-editor.org/rfc/rfc8949.html) and [RFC 8746](https://www.rfc-editor.org/rfc/rfc8746.html) | Binary alternatives considered but rejected for the JSON transport |
| [OpenAI `tiktoken` encoding definitions](https://github.com/openai/tiktoken/blob/main/tiktoken_ext/openai_public.py) | First-party pretoken regexes |
| [W3C SVG 2 section 9.3.2](https://www.w3.org/TR/SVG2/paths.html#TheDProperty) | Smooth path interpolation structure requirement |
| [W3C Web Audio API, `OscillatorNode`](https://www.w3.org/TR/webaudio-1.1/#OscillatorNode) | Audio Nyquist range and fold-back warning |
| [NIST DLMF section 1.8](https://dlmf.nist.gov/1.8) and [section 6.16](https://dlmf.nist.gov/6.16#i) | Fourier convergence and Gibbs behavior |
| [Khronos `KHR_mesh_quantization`](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_mesh_quantization/README.md) | Ratified precedent for integer geometry with explicit dequantization |
| Shannon, "Communication in the Presence of Noise", 1949, [doi:10.1109/JRPROC.1949.232969](https://doi.org/10.1109/JRPROC.1949.232969) | Sampling theorem |
| Cooley and Tukey, "An Algorithm for the Machine Calculation of Complex Fourier Series", 1965, [doi:10.1090/S0025-5718-1965-0178586-1](https://doi.org/10.1090/S0025-5718-1965-0178586-1) | FFT producer alternative |
| Zahn and Roskies, "Fourier Descriptors for Plane Closed Curves", 1972, [doi:10.1109/TC.1972.5008949](https://doi.org/10.1109/TC.1972.5008949) | Normalized arc-length parameterization |
| Granlund, "Fourier Preprocessing for Hand Print Character Recognition", 1972, [doi:10.1109/TC.1972.5008926](https://doi.org/10.1109/TC.1972.5008926) | Complex Fourier descriptors |
| Kuhl and Giardina, "Elliptic Fourier Features of a Closed Contour", 1982, [doi:10.1016/0146-664X(82)90034-X](https://doi.org/10.1016/0146-664X(82)90034-X) | Arc-length contour descriptors |
| Persoon and Fu, "Shape Discrimination Using Fourier Descriptors", 1977, [doi:10.1109/TSMC.1977.4309681](https://doi.org/10.1109/TSMC.1977.4309681) | Arc-length descriptor discrimination |
| Farouki and Sakkalis, "Pythagorean Hodographs", 1990, [doi:10.1147/rd.345.0736](https://doi.org/10.1147/rd.345.0736) | Limits of arc-length reparameterization |
| Sederberg and Greenwood, "A Physically Based Approach to 2-D Shape Blending", 1992, [doi:10.1145/133994.134030](https://doi.org/10.1145/133994.134030) | Vertex-correspondence problem |
| Repository `fourier.mjs`, `renderer.mjs`, `extension.mjs`, `composition.mjs`, `README.md`, `CONTRIBUTING.md` | Merged pipeline, renderer, limits, and invariant claims |
| [Scene representation contract at `250f2f2`](https://github.com/BrettReifs/fourier-runtime-canvas/blob/250f2f2/docs/research/scene-representation-contract.md) | All reused byte, token, fidelity, morph, and frame-cost measurements |

## Evidence qualifications

- All byte, token, fidelity, morph-error, and frame-cost numbers are reused from
  the issue #13 report.
- Pretoken counts are derived from published first-party regexes. They are not
  measured BPE token counts.
- Base64 size is arithmetic; its token cost is unknown.
- Quantization bounds and Nyquist tables are mathematical derivations, not
  runtime measurements.
- Hidden pipeline assumptions and sonification asymmetry are static source
  readings, not executed tests.
- The Lottie vertex-correspondence constraint from issue #13 was not needed for
  this decision; SVG 2 provides the normative comparison used here.
