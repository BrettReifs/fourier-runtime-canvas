# Fourier coefficient encoding benchmark

Research artifact for issue
[#20 Benchmark Fourier coefficient encodings across tokenizers](https://github.com/BrettReifs/fourier-runtime-canvas/issues/20).
Research only. No production source, manifest, schema, test, or parent map was
changed.

- Date: 2026-08-08
- Authority: the resolved
  [`fourier-path/v2` payload contract](https://github.com/BrettReifs/fourier-runtime-canvas/blob/df56b47/docs/research/fourier-payload-encoding.md)
  and parent Wayfinder map
  [#2](https://github.com/BrettReifs/fourier-runtime-canvas/issues/2)
- Tokenizer: OpenAI
  [`tiktoken==0.13.0`](https://pypi.org/project/tiktoken/0.13.0/)
  using its first-party
  [`o200k_base`, `cl100k_base`, and `r50k_base` definitions](https://github.com/openai/tiktoken/blob/0.13.0/tiktoken_ext/openai_public.py)
- Runtime: Python 3.13.14 on Windows

## Decision

Keep canonical flat integer JSON as the only coefficient encoding in
`fourier-path/v2`.

Packed base64 reduces complete-payload bytes by 21.7% at 64 terms and 28.5% at
256 terms, but it does not reduce tokens consistently across tokenizer
families. Relative to flat JSON, it saves only 0.9% and 1.9% on `o200k_base`,
while costing 1.8% and 1.2% on `cl100k_base` and 2.9% and 3.5% on `r50k_base`.
It also loses coefficient-level readability and patchability and adds a strict
base64 and binary-layout decoder. A future packed candidate must reduce
complete-payload tokens on every supported tokenizer at both 64 and 256 terms
without losing scalar patchability before its magnitude is considered. Base64
does not pass that directional gate.

Component delta encoding has a real but narrow result. On the dense 256-term
fixture it saves 3.4% of complete-payload bytes and 7.0% to 8.5% of tokens. It
does not consistently win on smaller payloads, and changing the first delta
after DC changed all 255 subsequent decoded records in the executed corruption
probe. The compression does not justify order-dependent decoding and
non-local patches.

Nested tuples never beat flat JSON for a complete payload. Packed JSON byte
arrays are substantially larger in both bytes and tokens. Raw fixed-width
binary is the byte floor among tested forms, but it is not a JSON wire format
and has no tokenizer result.

The result does not change the payload's semantic boundary. Parameterization,
closure, selection, scales, fidelity, and Nyquist constraints remain explicit.
Names, timestamps, runtime behavior, style, accessibility, transforms, and
narrative meaning remain outside `fourier-path/v2`.

## Controlled candidates

Every candidate encodes the same ordered integer records
`(frequency, amplitudeQ, phaseQ)`.

| Candidate | Coefficient representation |
| --- | --- |
| Flat JSON | `[f0,a0,p0,f1,a1,p1,...]` |
| Tuple JSON | `[[f0,a0,p0],[f1,a1,p1],...]` |
| Component delta JSON | First triple absolute; each later triple is `(f[i]-f[i-1],a[i]-a[i-1],p[i]-p[i-1])` |
| Packed byte-array JSON | JSON array of bytes from fixed 10-byte records |
| Packed base64 | RFC 4648 base64 string over the same fixed records |
| Raw packed binary | Concatenated fixed records; bytes only, not JSON or tokenized |

The packed record is big-endian signed `int16` frequency, unsigned `uint32`
amplitude, and signed `int32` phase. Its 10-byte width covers the resolved
contract: `sampleCount <= 4096` bounds frequency magnitude to 2048, normalized
amplitude with scales through `1e7` fits `uint32`, and phase wrapped to
`[-pi, pi)` at scale `1e7` fits `int32`.

The complete-payload benchmark keeps the resolved metadata envelope and key
order constant. Non-flat candidates add a `termEncoding` codec discriminator.
The constant `"format":"fourier-path/v2"` value is a laboratory control, not a
proposal to admit those codecs to v2. The resolved exact v2 schema accepts only
flat integers. Any future packed codec requires a new exact format version.

Serialization uses UTF-8, no insignificant whitespace, and Python's canonical
integer spellings. Token counts are actual BPE results from
`len(tiktoken.get_encoding(name).encode(serialized))`, not regex estimates.

## Fixtures

The fixtures span a favorable case for textual repetition, the current common
64-term work limit, and the 256-term per-stroke maximum.

| Fixture | Terms | `sampleCount` | Distribution |
| --- | ---: | ---: | --- |
| `clean-8` | 8 | 16 | Exact low harmonics, repeated amplitudes, simple phases |
| `typical-64` | 64 | 128 | Canonically ordered decaying amplitudes, seeded frequency order and phases |
| `dense-256` | 256 | 512 | Same deterministic distribution at the v2 per-stroke term limit |

All frequencies are unique and inside the producer Nyquist bound. DC is first.
The remaining terms use descending quantized amplitude, then the resolved
frequency and phase tie-breaks. The generated payloads retain
`parameterization`, `closure`, `selection`, `sampleCount`, decimal scales, and
post-quantization fidelity fields.

These are deterministic synthetic codec fixtures, not a claim about a
production corpus. The clean fixture favors repeated textual values. The
seeded fixtures exercise irregular integer spellings without attaching
semantic meaning to coefficients.

## Complete-payload results

`O`, `C`, and `R` are token counts for `o200k_base`, `cl100k_base`, and
`r50k_base`.

| Fixture | Encoding | UTF-8 bytes | O | C | R |
| --- | --- | ---: | ---: | ---: | ---: |
| clean-8 | Flat JSON | **444** | **155** | **153** | **163** |
| clean-8 | Tuple JSON | 492 | 167 | 162 | 177 |
| clean-8 | Delta JSON | 467 | 160 | 158 | 170 |
| clean-8 | Packed byte JSON | 592 | 266 | 264 | 279 |
| clean-8 | Packed base64 | 474 | 165 | 166 | 183 |
| typical-64 | Flat JSON | 1,567 | 671 | **669** | 733 |
| typical-64 | Tuple JSON | 1,727 | 713 | 678 | 777 |
| typical-64 | Delta JSON | 1,589 | 675 | 673 | **712** |
| typical-64 | Packed byte JSON | 2,399 | 1,387 | 1,385 | 1,400 |
| typical-64 | Packed base64 | **1,227** | **665** | 681 | 754 |
| dense-256 | Flat JSON | 5,294 | 2,389 | 2,387 | 2,550 |
| dense-256 | Tuple JSON | 5,838 | 2,522 | 2,396 | 2,685 |
| dense-256 | Delta JSON | 5,115 | **2,221** | **2,219** | **2,333** |
| dense-256 | Packed byte JSON | 8,401 | 5,226 | 5,224 | 5,240 |
| dense-256 | Packed base64 | **3,786** | 2,343 | 2,415 | 2,640 |

Bold marks the best result in a fixture and column. A lower byte count alone
does not decide the format because this protocol is also authored, inspected,
validated, and revised by agents.

### Coefficient-fragment results

This table removes the shared payload envelope and codec discriminator to show
the intrinsic representation cost.

| Fixture | Encoding | UTF-8 bytes | O | C | R |
| --- | --- | ---: | ---: | ---: | ---: |
| clean-8 | Flat JSON | 122 | 66 | 66 | 65 |
| clean-8 | Tuple JSON | 138 | 69 | 66 | 68 |
| clean-8 | Delta JSON | 112 | 64 | 64 | 63 |
| clean-8 | Packed byte JSON | 224 | 161 | 161 | 161 |
| clean-8 | Packed base64 | 110 | 60 | 63 | 65 |
| typical-64 | Flat JSON | 1,240 | 581 | 581 | 634 |
| typical-64 | Tuple JSON | 1,368 | 614 | 581 | 667 |
| typical-64 | Delta JSON | 1,229 | 578 | 578 | 604 |
| typical-64 | Packed byte JSON | 2,026 | 1,281 | 1,281 | 1,281 |
| typical-64 | Packed base64 | 858 | 559 | 577 | 636 |
| dense-256 | Flat JSON | 4,968 | 2,300 | 2,300 | 2,451 |
| dense-256 | Tuple JSON | 5,480 | 2,424 | 2,300 | 2,575 |
| dense-256 | Delta JSON | 4,756 | 2,125 | 2,125 | 2,225 |
| dense-256 | Packed byte JSON | 8,029 | 5,121 | 5,121 | 5,121 |
| dense-256 | Packed base64 | 3,418 | 2,238 | 2,312 | 2,522 |

Raw packed binary is 80, 640, and 2,560 bytes for the three fixtures. It saves
34.4%, 48.4%, and 48.5% against the flat coefficient fragments before a text
transport is applied. RFC 4648 base64 expansion and the codec discriminator
reduce that byte advantage in the complete JSON payload.

## Decoder, validation, corruption, and revision

All five JSON candidates round-tripped to exactly the original integer triples
in the benchmark. Deterministic decoding is therefore available to every
candidate, but the validation and revision costs differ.

| Candidate | Decoder and validation | Corruption behavior | Agent readability and patchability | v2 compatibility |
| --- | --- | --- | --- | --- |
| Flat JSON | JSON parse, length multiple of 3, integer/range checks, then shared invariants | Structural damage often fails JSON; a valid numeral substitution can affect one scalar and may pass invariants | All values visible; one scalar has one stable JSON Pointer index | Exact resolved encoding |
| Tuple JSON | JSON parse, each tuple length 3, then shared invariants | Damage is normally local to one tuple; valid substitutions can still pass | Best coefficient grouping; paths such as `/strokes/0/terms/4/1`; more delimiters | Requires a future format |
| Delta JSON | JSON parse, length multiple of 3, checked prefix sums, then shared invariants | One changed delta affects that component in the current and all later records | Encoded values are not independently meaningful; earlier patches rewrite downstream decoded values | Requires a future format |
| Packed byte JSON | JSON parse, every byte integer 0-255, byte length multiple of 10, binary decode, then shared invariants | A bit or byte change is record-local but may remain structurally and semantically valid | Coefficients are opaque; byte-level patches are possible but unsafe without external tooling | Requires a future format |
| Packed base64 | Strict RFC 4648 decode, canonical padding, decoded length multiple of 10, binary decode, then shared invariants | Non-alphabet damage is rejected; a valid alphabet substitution can decode successfully | Opaque string; safe revision replaces and revalidates the whole value | Requires a future format |

The executed probes changed the second frequency delta by one. It changed 7 of
8 decoded records, 63 of 64, and 255 of 256. A one-bit change in the second
packed record's phase changed one decoded record. Strict base64 rejected a
non-alphabet character, while a valid alphabet substitution decoded
successfully in every fixture.

RFC 4648 requires decoders to reject non-alphabet characters unless a referring
specification says otherwise, and it defines canonical padding and pad bits
([sections 3.3 through 3.5](https://www.rfc-editor.org/rfc/rfc4648.html#section-3.3)).
It does not provide integrity for valid-character substitutions. None of these
encodings is a checksum. The resolved registry-level SHA-256 `contentHash`
remains the integrity and optimistic-precondition mechanism outside the hashed
payload.

RFC 6902 addresses JSON values with JSON Pointer paths and applies operations
sequentially, stopping when an operation fails
([sections 3 through 5](https://www.rfc-editor.org/rfc/rfc6902.html#section-3)).
Flat and tuple JSON expose coefficient scalars to that mechanism. A base64
string exposes only the encoded string, while an earlier delta patch changes
the decoded meaning of later values without changing their JSON positions.

The readability ranking is an engineering proxy based on visible coefficient
values, grouping, and scalar addressability. No language-model comprehension
or editing trial was run, so this report does not claim a measured model
accuracy difference.

## Shared post-decode contract

An alternative codec cannot weaken the resolved v2 checks. Every decoder must
produce the original ordered integer triples before applying:

1. exact integer and magnitude checks;
2. nonnegative `amplitudeQ` and zero phase for zero amplitude;
3. unique signed frequency keys;
4. DC-first, amplitude-descending canonical order with frequency and phase
   tie-breaks;
5. phase wrapping and allowed decimal scales;
6. the per-stroke and per-asset term limits;
7. producer Nyquist validation, including one canonical positive bin at the
   even-sample Nyquist limit;
8. finite fidelity metadata with `rmsError <= maxError`; and
9. existing request, storage, and reconstruction work budgets.

JSON itself does not guarantee every consumer the same numeric precision.
RFC 8259 identifies integers in `[-(2^53)+1, (2^53)-1]` as interoperable in the
sense that implementations agree exactly on their values
([section 6](https://www.rfc-editor.org/rfc/rfc8259.html#section-6)). The
resolved frequency, amplitude, and phase integers remain well inside that
range.

The codec carries no source meaning. `uniform-t` versus `arc-length`, `closed`
versus `mirrored-open`, coefficient selection, scales, `sampleCount`, and
fidelity remain explicit fields. Semantic scene content remains in
`agent-scene/v1`, and scene elements continue to reference Fourier assets by
ID.

## Reproduction

Install the pinned first-party tokenizer and run the script below:

```powershell
python -m pip install tiktoken==0.13.0
python benchmark.py
```

The script prints the complete-payload measurements. Changing `payload` to
`value` in the measurement call prints the coefficient-fragment table.

```python
import base64
import json
import random
import struct

import tiktoken

NAMES = ("o200k_base", "cl100k_base", "r50k_base")
RECORD = struct.Struct(">hIi")


def dumps(value):
    return json.dumps(value, ensure_ascii=True, separators=(",", ":"))


def fixture(name, count, samples, seed=0, clean=False):
    if clean:
        frequencies = [0, -1, 1, -2, 2, -3, 3, 4][:count]
        amplitudes = [
            1_000_000, 500_000, 500_000, 250_000,
            250_000, 125_000, 125_000, 62_500,
        ][:count]
        phases = [
            0, 0, 0, -785_398, 785_398,
            -1_570_796, 1_570_796, 3_141_592,
        ][:count]
    else:
        rng = random.Random(seed)
        nyquist = samples // 2
        bins = list(range(-nyquist + 1, nyquist + 1))
        bins.remove(0)
        rng.shuffle(bins)
        frequencies = [0, *bins[:count - 1]]
        amplitudes = [10_000_000]
        phases = [0]
        for rank in range(1, count):
            candidate = round(9_700_000 / ((rank + 1) ** 1.13))
            amplitudes.append(min(amplitudes[-1] - 1, max(1, candidate)))
            phases.append(rng.randrange(-31_415_926, 31_415_927))
    return name, samples, list(zip(frequencies, amplitudes, phases, strict=True))


def flat(records):
    return [number for record in records for number in record]


def delta(records):
    result = [records[0]]
    result.extend(
        tuple(current[i] - previous[i] for i in range(3))
        for previous, current in zip(records, records[1:])
    )
    return flat(result)


def variants(records):
    packed = b"".join(RECORD.pack(*record) for record in records)
    return {
        "flat-json": flat(records),
        "tuple-json": [list(record) for record in records],
        "delta-json": delta(records),
        "packed-byte-json": list(packed),
        "packed-base64": base64.b64encode(packed).decode("ascii"),
    }


def payload(name, samples, encoding, terms):
    stroke = {
        "closure": "closed",
        "selection": "top-amplitude",
        "sampleCount": samples,
        "scale": {"amplitude": 10_000_000, "phase": 10_000_000},
    }
    labels = {
        "tuple-json": "integer-tuples",
        "delta-json": "component-delta",
        "packed-byte-json": "i16be-u32be-i32be/byte-array",
        "packed-base64": "i16be-u32be-i32be/base64",
    }
    if encoding != "flat-json":
        stroke["termEncoding"] = labels[encoding]
    stroke["terms"] = terms
    stroke["fidelity"] = {
        "referenceSamples": samples,
        "maxError": 0.00312,
        "rmsError": 0.00061,
    }
    return {
        "format": "fourier-path/v2",
        "id": name,
        "coordinateSystem": "normalized-complex",
        "parameterization": "uniform-t",
        "strokes": [stroke],
    }


encoders = {name: tiktoken.get_encoding(name) for name in NAMES}
fixtures = [
    fixture("clean-8", 8, 16, clean=True),
    fixture("typical-64", 64, 128, seed=20260808),
    fixture("dense-256", 256, 512, seed=20),
]
for fixture_name, samples, records in fixtures:
    for encoding, terms in variants(records).items():
        serialized = dumps(payload(fixture_name, samples, encoding, terms))
        tokens = {name: len(codec.encode(serialized)) for name, codec in encoders.items()}
        print(fixture_name, encoding, len(serialized.encode("utf-8")), tokens)
```

Every candidate in the executed benchmark also passed an exact round-trip
assertion back to the source triples. Full-payload canonical-flat SHA-256
digests were:

- `clean-8`: `a8089f2735a2c170a0fda9234c695ed7aee7060ec3a6f8dfb838b7842ac58f06`
- `typical-64`: `79d608033943a3586281df9cc18ec00887c3ef11d5db35de851c5cbfabb51fb8`
- `dense-256`: `8293b925a29646b55e894cde4d54cb97ad3165c5634b07050e15ece31860e5dc`

## Precise follow-ons and remaining fog

Follow-ons:

1. Implement v2 with flat integers only. Treat any packed codec as a new exact
   format version, not a permissive `termEncoding` addition to v2.
2. Put registry-level `contentHash` preconditions around asset replacement so
   valid-but-corrupt numeric or base64 substitutions cannot silently pass as
   the intended payload.
3. Re-run this pinned harness on a corpus of produced v2 assets after a
   transform implementation exists. Report distribution percentiles rather
   than replacing these boundary fixtures with one average.
4. If request or storage bytes become an observed bottleneck, benchmark
   transport compression over canonical JSON before adding an opaque
   coefficient codec. Keep that transport concern outside the payload format.

Remaining fog:

- Real asset distributions may change BPE merge behavior, especially for
  repeated phases and amplitudes.
- Model editing accuracy by representation remains unmeasured; JSON
  addressability is only a proxy.
- Transport compression can change the byte trade-off but not the
  coefficient-level patchability trade-off.
- A future tokenizer family could alter base64 token cost. Any packed-format
  proposal must rerun all supported tokenizer families rather than extrapolate
  from `o200k_base`.
