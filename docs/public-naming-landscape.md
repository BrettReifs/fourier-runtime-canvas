# Public naming landscape research

Research input for [issue #5, Research the public naming landscape](https://github.com/BrettReifs/fourier-runtime-canvas/issues/5),
under the parent map [issue #2, Chart the Agent Visual Runtime reference implementation](https://github.com/BrettReifs/fourier-runtime-canvas/issues/2).

**Retrieval date for every source and every registry, RDAP, DNS, GitHub API, and
search result in this note: 2026-08-08.**

This note does not choose a name. The choice belongs to the blocked grilling
ticket [issue #10, Choose the public product name](https://github.com/BrettReifs/fourier-runtime-canvas/issues/10).
`fourier-runtime-canvas` stays the technical identifier for the repository, the
npm package, the canvas declaration ID, the extension folder, and the plugin
name, exactly as recorded in
[docs/awesome-copilot-contribution.md](awesome-copilot-contribution.md).

## 1. What the name has to carry

The parent map fixes the substance the name must be honest about:

- A "secure, reliable, project-scoped Agent Visual Runtime for GitHub Copilot"
  ([issue #2](https://github.com/BrettReifs/fourier-runtime-canvas/issues/2)).
- Persistent runtime state, animation for explanation, and one procedural scene
  model, all three treated as separate unproven hypotheses.
- Fourier-first hybrid geometry with semantic structures for text, charts,
  timing, accessibility, and provenance.
- A proportional local-extension threat model, explicitly not cloud-service
  controls.
- Primary user is Brett; AI engineers are the adoption audience second.

Two consequences follow directly. First, a name that promises measured savings
(cost, tokens, context) would contradict the repository's own statement that it
"does not claim token, storage, latency, or cost savings"
([README.md](https://github.com/BrettReifs/fourier-runtime-canvas/blob/main/README.md)).
Second, a name that promises a protocol or a platform would contradict the
scope, which excludes agent hosts beyond GitHub Copilot CLI.

## 2. Method and what the evidence can and cannot prove

Checks performed, all on 2026-08-08:

| Check | Endpoint used | What a result means |
| --- | --- | --- |
| npm name in use | `https://registry.npmjs.org/<name>` | HTTP 200 means published; HTTP 404 means no such package document at that moment |
| PyPI name in use | `https://pypi.org/pypi/<name>/json` | Same interpretation |
| crates.io name in use | `https://crates.io/api/v1/crates/<name>` | Same interpretation |
| GitHub repository name collisions | `GET /search/repositories?q=<name>+in:name` | Count of public repositories with the string in the name |
| GitHub account handle | `GET /users/<name>` | HTTP 404 means no account with that login at that moment |
| Domain registration signal | RDAP: `https://rdap.verisign.com/com/v1/domain/<x>.com`, `https://pubapi.registry.google/rdap/domain/<x>.dev`, `https://rdap.identitydigital.services/rdap/domain/<x>.io` | HTTP 404 means the registry returned no object for that name at that moment |
| Live use signal | `Resolve-DnsName` NS and A records | Delegation and hosting hints, including parking pages |
| Result-page ambiguity | DuckDuckGo HTML endpoint `https://html.duckduckgo.com/html/?q=` | Which entity currently owns the first page of results for the string |

Limits that must not be glossed over:

- **RDAP is not an availability guarantee.** It is a point-in-time registry
  lookup. Premium pricing, registry reserved lists, registrar holds, pending
  registrations, and trademark blocks are all invisible to it. Nothing in this
  note should be read as "this domain is available to buy."
- **The IANA bootstrap file must be used to pick the RDAP base.** The first pass
  of this research used `https://www.registry.google/rdap/` for `.dev` and it
  returned HTTP 404 for `web.dev` and `go.dev`, which are obviously registered.
  The correct `.dev` base from
  [https://data.iana.org/rdap/dns.json](https://data.iana.org/rdap/dns.json) is
  `https://pubapi.registry.google/rdap/`, which correctly returns `web.dev` as
  registered. All `.dev` results below use the corrected base. Positive controls
  were run for every namespace: `github.com` registered and
  `zzq7x9k2free.com` not found on Verisign; `langfuse.io` registered and
  `zzq7x9k2free.io` not found on Identity Digital.
- **Search result pages are a Tier 3 signal.** They show current ambiguity, not
  legal rights and not stable ranking.
- **No trademark clearance was performed.** See section 10.

## 3. Distribution channel constraints

The public name has to survive the channel the product ships through.

The Agent Plugins 1.0.0 manifest schema constrains `name` to 1 to 64 characters
matching `^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$`
([plugin.schema.json](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json)).
Awesome Copilot additionally requires the plugin `name` to match the folder name
and to use "descriptive, lowercase folder names with hyphens"
([awesome-copilot CONTRIBUTING.md](https://raw.githubusercontent.com/github/awesome-copilot/main/CONTRIBUTING.md)).
So any public name has a mandatory lowercase-hyphenated slug form, and that slug
must be pronounceable and typeable.

The channel namespace is already crowded with the obvious compound patterns.
Canvas extension directories currently published upstream
(`GET /repos/github/awesome-copilot/contents/extensions`):

`accessibility-kanban`, `apng-studio`, `arcade-canvas`, `backlog-swipe-triage`,
`backrooms-canvas`, `chromium-control-canvas`, `color-orb`, `daily-focus-board`,
`diagram-viewer`, `feedback-themes`, `flight-map-canvas`, `gesture-review`,
`java-modernization-studio`, `pr-artifact-explorer`, `release-notes-showcase`,
`repo-actions-hub`, `signals-dashboard`, `site-studio`,
`tiny-tool-town-submitter`, `token-pacman`, `where-was-i`, `work-hub`.

Four of twenty-two canvas extensions already end in `-canvas` and three end in
`-studio`. A public name of the form `<thing>-canvas` or `<thing>-studio` is
therefore channel-generic on arrival, and it inherits none of the "secure and
reliable runtime" meaning the map asks for.

GitHub's brand guidance states: "Do not use the GitHub name or any GitHub logo in
a way that suggests you are GitHub, your offering or project is by GitHub, or
that GitHub is endorsing you or your offering or project," and "Do not use any
GitHub logo as the icon or logo for your business/organization, offering,
project, domain name, social media account, or website"
([brand.github.com/foundations/logo](https://brand.github.com/foundations/logo)).
The same page identifies GitHub Copilot as a GitHub product lockup. On that
evidence, this screen excludes "GitHub" as a name element and treats "Copilot"
as a high-risk product-mark element rather than claiming the quoted rule names
Copilot specifically. Descriptive integration language such as "for GitHub
Copilot" remains available as a descriptor, not as the product name.

## 4. Adjacent product and protocol names

| Name | Owner or maintainer | What it is | Collision type |
| --- | --- | --- | --- |
| [MCP, Model Context Protocol](https://modelcontextprotocol.io/docs/2026-07-28/getting-started/intro) | Open standard, originated by Anthropic | Agent to tools and data | Occupies "context" and "protocol" framing; current documented revision `2026-07-28` |
| [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview) | MCP extensions | Interactive apps that run inside AI clients | Occupies the "app inside the agent client" framing |
| [AG-UI, Agent-User Interaction Protocol](https://docs.ag-ui.com/introduction) | Open, CopilotKit-associated | Bi-directional agent to application runtime connection | Occupies "agent UI runtime" framing directly |
| [A2A, Agent to Agent](https://docs.ag-ui.com/introduction) | Open standard, originated by Google | Agent to agent coordination | Occupies `A2*` initialisms |
| [A2UI](https://docs.ag-ui.com/concepts/generative-ui-specs) | Google | Declarative, JSONL-based streaming generative UI spec | Occupies the `*UI` suffix |
| [Open-JSON-UI](https://docs.ag-ui.com/concepts/generative-ui-specs) | OpenAI | Open form of OpenAI's declarative generative UI schema | Occupies "open ... UI" |
| [MCP-UI](https://docs.ag-ui.com/concepts/generative-ui-specs) | Microsoft and Shopify | Iframe-based generative UI standard extending MCP | Nearest structural analogue: iframe UI inside an agent client |
| [Motion Canvas](https://motioncanvas.io/) | motion-canvas | "Visualize Your Ideas With Code", 18,902 stars (`GET /repos/motion-canvas/motion-canvas`) | Direct: programmatic animation authoring, and it already holds "canvas" plus motion |
| [Remotion](https://www.remotion.dev/) | remotion-dev | "Make videos programmatically with React", 55,851 stars (`GET /repos/remotion-dev/remotion`) | Direct: programmatic motion for explainers |
| [AgentScope](https://github.com/agentscope-ai/agentscope) | agentscope-ai | "Build and run agents you can see, understand and trust", 28,721 stars | Semantic: it already publishes the exact outcome sentence this product would reach for |
| [OpenTelemetry GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions-genai) | OpenTelemetry | Standard span, metric, and event names for GenAI | Vocabulary: fixes the meaning of "trace", "span", and "observability" for this audience |

The AG-UI documentation itself flags that the neighbourhood is already suffering
from naming confusion: "Confused about 'A2UI' and 'AG-UI'? That's
understandable! Despite the naming similarities, they are quite different"
([docs.ag-ui.com](https://docs.ag-ui.com/introduction)). Adding another
`*-UI`, `A2*`, or `*-protocol` shaped name into that space creates avoidable
ambiguity and, worse, implies a specification claim this project does not make.

The AgentScope finding is the sharpest in this section. Its published one-line
description is "Build and run agents you can see, understand and trust." That is
almost verbatim the outcome sentence a "see your agents" name would want, backed
by 28,721 stars. Any name that reads as "agent" plus "see", "scope", or
"observe" now competes against an established project with a large corpus
footprint, in both human search and model retrieval.

## 5. Search intent, human and AI

### Vocabulary volume as a proxy for intent

Counts from the GitHub search API on 2026-08-08. These measure how much text
exists using each phrase, which is the substrate both search engines and
retrieval-augmented models draw on.

| Query | Public repositories |
| --- | --- |
| `topic:ai-agents` | 67,102 |
| `topic:data-visualization` | 57,548 |
| `"generative ui"` | 1,113 |
| `"agent observability"` | 640 |
| `topic:llm-observability` | 471 |
| `topic:generative-ui` | 399 |
| `topic:motion-graphics` | 368 |
| `topic:agent-observability` | 270 |
| `topic:svg-animation` | 201 |
| `"agent canvas"` | 193 |
| `"visualize agents"` | 135 |
| `"agent visualization"` | 124 |
| `"animated explainer"` | 110 |
| `topic:agent-ui` | 78 |
| `topic:ai-visualization` | 31 |
| `topic:copilot-canvas` | 2 |

Two readings:

1. **There is no established category term to ride.** `agent-visualization` and
   `ai-visualization` are near-empty, and `copilot-canvas`, the keyword this
   repository's own `plugin.json` already uses, has 2 repositories. Nothing
   external will carry the meaning for the name. The name plus a fixed descriptor
   line has to do all of the work.
2. **The high-volume neighbouring terms are the wrong category.** "Agent
   observability" and "LLM observability" are three to five times denser than any
   visualization phrasing. A name built on `trace`, `observe`, `monitor`, or
   `scope` will be pulled into observability, where the product does not compete
   and where query intent is "why did my agent fail in production", not "help me
   explain this system".

### Zero-result phrases

The DuckDuckGo HTML endpoint returned no organic results for the exact phrases
`"agent visual runtime"` and `"agent scene runtime"` on 2026-08-08. The category
label from the parent map is currently unclaimed as a phrase. That is an
opportunity for a descriptor and a risk for a coined mark, because an unclaimed
phrase also has zero existing corpus for a model to retrieve.

### AI search intent specifically

Model-mediated discovery rewards names whose surrounding text literally contains
the capability words a user would ask for. A coined mark with no corpus presence
cannot be surfaced by an answer engine to a user who does not already know it.
The practical implication is architectural, not cosmetic: whichever mark is
chosen must ship permanently locked to a descriptor sentence containing the
retrievable words, for example "agent scene runtime for GitHub Copilot" or
"animated, editable scenes for explaining agent systems". The mark earns
distinctiveness; the descriptor earns retrieval.

## 6. ASD-STE100 clarity screen

Primary source: [asd-ste100.org/about.html](https://www.asd-ste100.org/about.html).
The specification is owned by ASD, Brussels, maintained by the STEMG, and the
current issue on the retrieval date is **Issue 8, April 2021**. The principles
relevant to naming are stated there directly:

- "In general, there is only one word for one meaning, and one part of speech
  for one word."
- Synonyms are collapsed to one approved choice, and words with several possible
  definitions are narrowed to one.
- "STE permits the use of company-specific or project-specific technical words
  (referred to in STE as technical names and technical verbs)."

STE is a controlled language for maintenance documentation, not a naming
standard, so it is applied here as a clarity screen rather than a rule. The
screen used:

| Test | Derived from | Fails when |
| --- | --- | --- |
| One meaning | "one word - one meaning" | The name element has a second common meaning for this audience, for example `light`, `set`, `plain`, `frame` |
| One part of speech | "one part of speech for one word" | The name reads as both noun and verb, for example `show`, `run`, `trace` |
| Technical name is declarable | STE permits project-specific technical names | The name can be introduced once and then used consistently, for example `scene`, `runtime`, `Fourier path` |
| Spellable from hearing | STE's readability intent | Homophones or unusual orthography, for example `-wright` against `right` and `write`, or `praxinoscope` |

Applied results appear in the exclusion table in section 9.

## 7. Screening data

### Registry and repository screen

npm, PyPI, and crates.io responses plus GitHub repository-name counts on
2026-08-08. "taken" means the registry returned a package document.

| Candidate string | npm | PyPI | crates.io | GitHub repos with string in name |
| --- | --- | --- | --- | --- |
| `scenepane` | free | free | not checked | 3 |
| `plainmotion` | free | free | not checked | 0 |
| `truescene` | free | free | not checked | 0 |
| `kinetoscope` | free | free | not checked | 15 |
| `motionsmith` | free | free | not checked | 9 |
| `scenesmith` | free | free | not checked | 16 |
| `scenewire` | free | free | not checked | 1 |
| `agent-scene-runtime` | free | not checked | not checked | 0 |
| `agentscene` | free | free | free | 0 |
| `sceneproof` | free | free | not checked | 4 |
| `sightframe` | free | free | free | 0 |
| `scenewright` | free | free | free | 3 |
| `showtrace` | free | free | free | 3 |
| `explainframe` | free | free | free | 0 |
| `motionpane` | free | free | free | 3 |
| `glasscanvas` | free | free | free | 0 |
| `showframe` | free | free | not checked | 3 |
| `runwright` | free | free | not checked | 3 |
| `setpiece` | free | free | not checked | 37 |
| `footlight` | free | free | not checked | 28 |
| `praxinoscope` | free | free | not checked | 5 |
| `motionbrief` | free | free | not checked | 2 |
| `storyframe` | taken | free | free | not checked |
| `waveframe` | taken | free | free | not checked |
| `lightframe` | taken | free | free | not checked |
| `scenecast` | taken | taken | free | not checked |
| `showrunner` | taken | taken | free | not checked |
| `framesmith` | taken | taken | free | 15 |
| `sceneforge` | taken | free | not checked | 98 |
| `agentscope` | taken | taken | taken | not checked |
| `zoetrope` | taken | taken | not checked | 218 |
| `flipbook` | taken | taken | not checked | 3,570 |
| `showreel` | taken | free | not checked | 349 |
| `backdrop` | taken | taken | not checked | 2,956 |
| `playhouse` | taken | taken | not checked | 422 |
| `clarion` | taken | taken | not checked | 857 |
| `sightline` | taken | taken | not checked | 269 |
| `epicycle` | free | free | free | 244 |
| `agentcanvas` | free | taken | free | 283 for `agent-canvas` |
| `showwork` | free | taken | free | 26 |
| `clearframe` | free | taken | free | not checked |
| `traceframe` | free | taken | free | not checked |
| `signalframe` | free | taken | free | not checked |
| `runscene` | taken | free | not checked | 1 |
| `agentframe` | free | free | not checked | 228 |
| `scene-studio` | taken | not checked | not checked | 94 |

GitHub account handles: `scenepane`, `plainmotion`, `agentscene`, and
`sceneproof` returned HTTP 404 from `GET /users/<login>`. `kinetoscope` and
`motionsmith` are existing accounts.

### Domain registration signal

RDAP results with the corrected bases, plus DNS cross-checks. Read every
"not found" as "the registry had no object for this name at this moment", not
as availability.

| Label | `.com` | `.dev` | `.io` | DNS cross-check |
| --- | --- | --- | --- | --- |
| `scenepane` | not found | not found | not found | no NS, no A |
| `motionpane` | not found | not found | not found | no NS, no A |
| `plainmotion` | registered | not found | not found | not checked |
| `kinetoscope` | registered | not found | not found | not checked |
| `motionbrief` | registered | not found | not found | not checked |
| `sightframe` | registered | not found | not found | NS `ns1.atom.com`, `ns2.atom.com`, brand-marketplace parking |
| `sceneproof` | registered | not found | not found | NS `ns1.atom.com`, `ns2.atom.com`, brand-marketplace parking |
| `agentscene` | registered | not found | not found | NS `domain-for-sale.hugedomainsdns.com`, resale parking |
| `scenewright` | registered | **registered** | registered | `.dev` resolves via Cloudflare NS; `.com` resolves via `ui-dns` |
| `showtrace` | registered | not found | not found | NS `dns1.registrar-servers.com` |
| `glasscanvas` | registered | not found | registered | not checked |
| `showframe` | registered | not found | not found | not checked |
| `seeframe` | registered | not found | not found | not checked |
| `keyscene` | registered | not found | not found | not checked |
| `explainframe` | registered | not found | not found | not checked |

Three of these deserve emphasis. `scenewright.dev` is not merely registered, it
resolves. `sightframe.com` and `sceneproof.com` both sit on Atom.com
nameservers, and the `sceneproof` result page includes a
"SceneProof.com Premium Domain For Sale | Atom" listing, so the `.com` for those
two marks is a priced brand asset rather than an ordinary registration.

### Result-page ownership

DuckDuckGo HTML endpoint, first page, 2026-08-08.

| Query | Who owns the first page |
| --- | --- |
| `scenewright` | Merriam-Webster dictionary entry, a novel-writing product, `jinjin1/scenewright` (Claude Code to Remotion explainer video pipeline), "Scenewright - The Closed-Loop AI for Unreal Engine 5", and `lyndonkl/claude` agent file |
| `sceneproof` | `ReyJ94/SceneProof` ("Give coding agents sight: source-grounded ..."), a Devpost entry, an "OpenAI Build Week 2026 Demo" video, and an Atom.com premium domain listing |
| `sightframe` | Norco "Sight A Frame" mountain bike frame kits across many retailers, plus a "SightFrame: Vision Simulator" App Store app |
| `motionpane` | Autodesk 3ds Max "Motion Panel" documentation and Motion.page |
| `showframe` | CTAN LaTeX package `showframe` and the ConTeXt `\showframe` command |
| `showtrace` | `YosysHQ/picorv32/showtrace.py`, an R network-detection function, Junos OS `show trace`, and Playwright Trace Viewer |
| `glasscanvas` | Glass Canvas, an existing 3D rendering, CGI animation, and real-time studio |
| `seeframe` | Figma "See Frame" and SEE eyeglasses retail |
| `keyscene` | `scottypate/keyscene` chord detection plus a music album |
| `explainframe` | Instagram, Facebook, and YouTube accounts named Explain Frame |
| `motionbrief` | MotionBrief, a live product ("Turn Vague Ideas Into Precise Briefs") with pricing pages |
| `truescene` | Andersen Windows "TruScene" insect screens, a near-homophone with a large retail footprint |
| `plainmotion` | Plain Motion activewear brand and its social accounts |
| `motionsmith` | Motionsmith, an existing studio site, plus "MotionSmith: A Sketch-Based Design System for Automata Making" |
| `scenewire` | SceneWire, an existing news and media brand across YouTube, Instagram, and X |
| `runwright` | RunWright ("Scheduled jobs with AI diagnosis"), `PramodKumarYadav/runwright` Playwright tooling, and Witcher "Runewright" lore |
| `setpiece software` | SetPiece sports field scheduling software with a Capterra listing |
| `footlight software` | Footlight on the Mac App Store and Footlight CMS |
| `kinetoscope software` | `joeyparrish/kinetoscope` Sega Genesis video streaming cart, the Wikipedia article on the device, and "Kinetiscope", a stochastic kinetics simulator |
| `scenepane` | No owner. Results are generic "scene software" listicles, DMX lighting control, DaVinci Resolve, and an unrelated `scene-pane` commit message |
| `"agent visual runtime"` | No organic results |
| `"agent scene runtime"` | No organic results |

## 8. Ranked candidate set

Ranking weights, in order: technical honesty against the parent map, outcome
legibility to an AI engineer, conflict freedom in the checked namespaces,
ASD-STE100 clarity, and durability. Every candidate is presented in the same
architecture, because the evidence in section 5 says a bare mark cannot carry
retrieval on its own:

> **`Mark`** plus a permanently attached descriptor, for example
> "agent scene runtime for GitHub Copilot".

### Rank 1: `agent-scene-runtime`, used descriptively with no coined mark

- **Form**: "Agent Scene Runtime", slug `agent-scene-runtime`.
- **Evidence**: npm free; `GET /search/repositories?q=agent-scene-runtime+in:name`
  returns 0; the exact phrase `"agent scene runtime"` returns no organic results.
  It satisfies the Agent Plugins slug pattern and the Awesome Copilot
  descriptive-hyphenated convention
  ([CONTRIBUTING.md](https://raw.githubusercontent.com/github/awesome-copilot/main/CONTRIBUTING.md)).
  No same-string domain screen was run because this option is a descriptive
  category phrase and plugin slug, not a proposed owned mark or domain label.
- **Search-query implication**: matches the literal queries an AI engineer or an
  answer engine would form, and matches the parent map's own vocabulary. It is
  the only tested option retrievable on day one with zero corpus behind it.
- **ASD-STE100**: strongest of the set. `agent`, `scene`, and `runtime` are all
  declarable project technical names, each with one meaning in this context, and
  the string is spellable from hearing.
- **Honesty**: high. It claims a runtime and a scene model, both of which exist,
  and claims nothing about cost or savings.
- **Why it ranks first, and why that is uncomfortable**: it is the best
  communication answer and the worst ownership answer. It is descriptive, so it
  is weak as a trademark and trivially copyable by the next entrant. If issue #10
  values clarity and adoption over defensibility, this is the option. If it
  values defensibility, this becomes the descriptor attached to a marked
  candidate below.

### Rank 2: `Plainmotion`

- **Form**: "Plainmotion", slug `plainmotion`, descriptor as above.
- **Evidence**: npm free, PyPI free, GitHub handle 404,
  `GET /search/repositories?q=plainmotion+in:name` returns 0. `plainmotion.dev`
  and `.io` returned RDAP not-found; `plainmotion.com` is registered.
- **Search-query implication**: the result page is currently owned by a "Plain
  Motion" activewear brand and its social accounts. That is a different goods
  class and audience, so a developer-intent query such as "plainmotion copilot"
  would separate quickly, but the unqualified brand query would not.
- **ASD-STE100**: good on simplicity, weaker on one-word-one-meaning. `plain` has
  at least two live senses, "simple and clear" and "unadorned or dull". The
  second is an active liability for a product whose value proposition is visual.
- **Honesty**: high. It promises understandable motion and nothing more, which is
  exactly the unproven-hypothesis posture the parent map requires.
- **Why rank 2**: best outcome legibility of any tested mark and technically
  honest, but the `.com` is gone and the ambiguous adjective is a durable drag.

### Rank 3: `Scenepane`

- **Form**: "Scenepane", slug `scenepane`, descriptor "agent scene runtime for
  GitHub Copilot".
- **Evidence**: the cleanest string tested. npm free, PyPI free, GitHub handle
  `scenepane` returns 404, only 3 low-signal repositories contain the string,
  `scenepane.com`, `.dev`, and `.io` all returned RDAP not-found with no NS and
  no A records, and the result page has no owner at all.
- **Search-query implication**: a brand-name query would land on the product from
  day one. The cost is that nobody will type it without having seen it first, so
  all discovery must come through the descriptor.
- **ASD-STE100**: mixed. `scene` passes cleanly as a technical name. `pane` is UI
  jargon rather than a plain word, and it is a homophone of `pain`, a real
  spellable-from-hearing failure.
- **Honesty**: medium. `scene` is accurate to the scene model. `pane` understates
  a runtime and implies a passive viewport rather than an addressable, persistent,
  mutation-queued runtime.
- **Why rank 3**: it wins every conflict test but loses on the two higher-weighted
  tests: technical honesty and outcome legibility.

### Rank 4: `Kinetoscope`

- **Form**: "Kinetoscope", slug `kinetoscope`, descriptor as above.
- **Evidence**: npm free, PyPI free, `kinetoscope.dev` and `.io` returned RDAP
  not-found, `.com` registered. 15 repositories contain the string and the GitHub
  handle `kinetoscope` already exists. The result page is shared by the Wikipedia
  article on the historical device, `joeyparrish/kinetoscope` (a Sega Genesis
  video streaming cartridge), and "Kinetiscope", a stochastic kinetics simulator
  that is a one-letter near-homograph.
- **Search-query implication**: the historical-device page will outrank a new
  product indefinitely on the unqualified query, and the "Kinetiscope"
  near-homograph will cause both human and model misretrieval.
- **ASD-STE100**: worst of the ranked set. Four syllables, unusual orthography,
  and not spellable from hearing.
- **Honesty**: high and pleasingly literal. A kinetoscope is a device you look
  into to see reconstructed motion, which is what the runtime does.
- **Why rank 4**: the metaphor is the best in the set and the clarity screen is
  the worst. Carried so that the grilling ticket has to argue against the
  distinctive option explicitly rather than by omission.

### Rank 5: `Motionsmith` or `Scenesmith`

- **Form**: "Motionsmith" or "Scenesmith", slug `motionsmith` or `scenesmith`.
- **Evidence**: both free on npm and PyPI. `motionsmith` has 9 repositories and
  an existing GitHub account; `scenesmith` has 16 repositories and was not
  handle-checked. The `motionsmith` result page is owned by an existing
  Motionsmith studio site plus the academic system "MotionSmith: A Sketch-Based
  Design System for Automata Making".
- **Search-query implication**: the `-smith` craft suffix is legible and reads as
  an authoring tool, which matches the product. But the existing studio holds the
  brand query, and the academic system is close enough in domain (sketch-based
  design of motion) to muddy model retrieval.
- **ASD-STE100**: good. Both halves are plain, one-meaning, and spellable from
  hearing.
- **Why rank 5**: acceptable clarity, real prior use. Carried only as a fallback
  shape if the grilling ticket rejects both the descriptive and the low-meaning
  marked options.

### Two options deliberately left on the table

- **Do nothing yet.** `fourier-runtime-canvas` remains a valid public string. It
  is the current npm name, canvas ID, extension folder, and plugin name, so
  keeping it costs zero churn. Its cost is that it is mechanism-led, and the
  parent map explicitly asks for outcome-led. Worth pricing in issue #10 as the
  null option rather than assuming a rename is required.
- **Mark and identifier split across surfaces.** Public name is the mark; the
  Awesome Copilot plugin `name` stays `fourier-runtime-canvas`. The plugin
  `description` field is free text, so this is already permitted by the schema
  and avoids a marketplace-identifier migration entirely. Issue #10 should decide
  this explicitly rather than inherit it.

## 9. Explicit exclusions

| Excluded | Reason | Source |
| --- | --- | --- |
| Anything containing "GitHub"; anything using "Copilot" as a product-mark element | GitHub expressly forbids use of its name in a way that implies affiliation or endorsement. The same guidance identifies GitHub Copilot as a GitHub product lockup; this research therefore treats "Copilot" name elements as a risk to avoid, not as an expressly quoted prohibition | [brand.github.com/foundations/logo](https://brand.github.com/foundations/logo) |
| `*-canvas` compounds | Channel-generic: 4 of 22 upstream canvas extensions already end in `-canvas`; "canvas" is additionally held by Motion Canvas (18,902 stars) and by the Copilot canvas primitive itself | `GET /repos/github/awesome-copilot/contents/extensions`; [motioncanvas.io](https://motioncanvas.io/) |
| `*-studio` compounds | Same channel-genericness: `apng-studio`, `site-studio`, and `java-modernization-studio` already exist upstream; `scene-studio` is taken on npm with 94 GitHub repositories | Same directory listing; npm |
| `*-UI`, `A2*`, `*-protocol` shapes | Reads as a specification claim next to AG-UI, A2UI, MCP-UI, Open-JSON-UI, and A2A. This is an application, not a spec, and the AG-UI docs already record active user confusion between these names | [docs.ag-ui.com/introduction](https://docs.ag-ui.com/introduction); [generative UI specs](https://docs.ag-ui.com/concepts/generative-ui-specs) |
| `trace`, `observe`, `monitor`, `scope`, `telemetry` elements | Pulls the product into agent observability, a category 3 to 5 times denser in the corpus and with different query intent. `showtrace` results are already owned by Playwright Trace Viewer and Junos `show trace` | GitHub topic counts in section 5; [OpenTelemetry GenAI semconv](https://github.com/open-telemetry/semantic-conventions-genai) |
| `agentscene`, `agentscope`, and near neighbours | `agentscope` is taken on npm, PyPI, and crates.io, and `agentscope-ai/agentscope` (28,721 stars) already publishes the exact outcome sentence "agents you can see, understand and trust". `agentscene.com` sits on HugeDomains resale parking | [github.com/agentscope-ai/agentscope](https://github.com/agentscope-ai/agentscope); RDAP and DNS in section 7 |
| `scenewright` | Merriam-Webster dictionary word with an existing meaning, plus at least three live AI-adjacent projects including a Claude Code to Remotion explainer pipeline and an Unreal Engine 5 tool; `.com`, `.dev`, and `.io` all registered and two of them resolve | Result page and DNS in section 7 |
| `sceneproof` | `ReyJ94/SceneProof` is a live, directly adjacent project giving coding agents visual feedback, with an OpenAI Build Week 2026 demo; `.com` is a priced Atom.com listing | Result page in section 7 |
| `sightframe` | Result page is dominated by Norco "Sight A Frame" bike products, plus a "SightFrame" App Store app; `.com` sits on Atom.com nameservers | Result page and DNS in section 7 |
| `showframe` | `showframe` is an established CTAN LaTeX package and a ConTeXt command, so the exact string already means something specific to technical readers | Result page in section 7 |
| `motionpane` | Search engines fold it into Autodesk 3ds Max "Motion Panel". A name that autocorrects to another vendor's UI feature is not recoverable | Result page in section 7 |
| `glasscanvas` | Glass Canvas is an existing 3D rendering, CGI animation, and real-time studio, which is an adjacent industry rather than a distant one | Result page in section 7 |
| `truescene` | Near-homophone of Andersen Windows "TruScene", a heavily marketed retail trademark; also an overclaim ("true") against a project whose own README refuses unproven claims | Result page in section 7; [README.md](https://github.com/BrettReifs/fourier-runtime-canvas/blob/main/README.md) |
| `runwright` and `-wright` suffixes generally | Triple homophone with "right" and "write", failing the spellable-from-hearing screen; also collides with a live "Runwright" scheduled-jobs product and Playwright-adjacent tooling | Result page in section 7; [asd-ste100.org/about.html](https://www.asd-ste100.org/about.html) |
| `praxinoscope`, `phenakistoscope`, and similar | Same pre-cinema metaphor as `kinetoscope` but unspellable from hearing; fails the clarity screen outright despite low conflict (5 repositories) | GitHub search; STE clarity screen in section 6 |
| `scenelight`, `footlight`, and `light` compounds | `light` carries at least three live meanings (illumination, low weight, low intensity), failing one-word-one-meaning; `footlight` additionally collides with a Mac App Store app and Footlight CMS | STE clarity screen; result page in section 7 |
| `setpiece` | "Set piece" already means a football tactic and a film sequence; SetPiece is also live sports-scheduling software with a Capterra listing | Result page in section 7 |
| `motionbrief` | MotionBrief is a live product with pricing pages and social accounts | Result page in section 7 |
| `epicycle` and other Fourier-mechanism names | Mechanism-led rather than outcome-led, contrary to the parent map's explicit instruction, and 244 repositories with the string are almost entirely Fourier epicycle demos. Choosing this would permanently fix the product's search intent as "math toy" | GitHub search; [issue #2](https://github.com/BrettReifs/fourier-runtime-canvas/issues/2) |
| `flipbook`, `zoetrope`, `backdrop`, `playhouse`, `clarion`, `showreel`, `sightline`, `sceneforge`, `framesmith`, `showrunner`, `scenecast`, `storyframe`, `waveframe`, `lightframe` | Registry or corpus saturation: each is taken on npm and/or PyPI, several with hundreds to thousands of same-string repositories | npm, PyPI, and GitHub search in section 7 |
| `agentframe` | The npm and PyPI names were free, but 228 GitHub repositories already contained the string, making it corpus-saturated and generic beside the many existing `agent` compounds | GitHub search in section 7 |
| Any name implying measured savings (`lean`, `thin`, `cheap`, `tiny`, token or cost words) | The repository states it "does not claim token, storage, latency, or cost savings" and that such outcomes "need representative benchmarks". A name making that claim would be dishonest before issue #6 produces the Evidence Package | [README.md](https://github.com/BrettReifs/fourier-runtime-canvas/blob/main/README.md); [issue #2](https://github.com/BrettReifs/fourier-runtime-canvas/issues/2) |

## 10. Likely search-query implications

What each ranked option changes about the queries that can reach the product.

| Option | Query it wins | Query it loses | Net |
| --- | --- | --- | --- |
| `agent-scene-runtime` (descriptive) | "agent scene runtime", "animate agent workflow copilot", "visualize multi agent handoffs" and near paraphrases, plus model-generated answers to those questions | Nothing today, because nothing owns the phrase; it loses defensibility, not traffic | Highest reach, zero moat |
| `Plainmotion` | Developer-qualified brand queries such as "plainmotion copilot" | The unqualified brand query, held by an activewear brand | Workable with qualifiers |
| `Scenepane` | Its own brand query, cleanly and immediately | Every capability query, unless the descriptor is attached everywhere | Needs the descriptor to survive |
| `Kinetoscope` | Nothing reliably; the historical device and a Sega cartridge project hold the term | The unqualified brand query, and it risks mis-retrieval to "Kinetiscope" | Not recommended on search grounds |
| `Motionsmith` / `Scenesmith` | Craft-intent queries such as "motion authoring tool for agents" | The unqualified brand query, held by an existing studio | Middling |

A structural point that applies to all five: because
`topic:copilot-canvas` has only 2 repositories and `"agent visual runtime"` has
no organic results, the product's discoverability in the next twelve months will
be determined mostly by the descriptor sentence and by published, linkable
content, not by the mark. Any name choice made in issue #10 should be paired with
a decision about the fixed descriptor, or the naming work will not change reach.

## 11. Durable naming risks

1. **Trademark is unresolved.** No formal clearance was run. The USPTO
   `tmsearch` API rejected the request method used here and no authenticated
   access was available. Every candidate in section 8 must be run through a real
   trademark search, in the relevant Nice classes (9 and 42), before issue #10
   closes. `Plainmotion` and `Truescene` in particular have live commercial near
   neighbours.
2. **Registry state is a snapshot.** npm, PyPI, and RDAP results change daily.
   Anything relied on in issue #10 must be re-checked on the decision date, using
   the IANA bootstrap file to select RDAP bases.
3. **The identifier migration cost is asymmetric.** Renaming the plugin `name`
   would change the canvas declaration ID, the extension folder, the package
   name, and the documented install command
   `copilot plugin install fourier-runtime-canvas@awesome-copilot`. All four are
   currently required to match
   ([awesome-copilot contribution notes](awesome-copilot-contribution.md)). Doing
   that after an upstream pull request merges is far more expensive than doing it
   before, or than never doing it.
4. **The category term may be named by someone else first.** `copilot-canvas`
   has 2 repositories and `"agent visual runtime"` has no organic results.
   Whoever publishes durable, linkable content using a phrase in this space will
   own the category vocabulary in both search engines and model corpora. That is
   a time-sensitive risk, not a static one.
5. **Protocol drift.** MCP's current documented revision is `2026-07-28` and the
   generative-UI landscape (A2UI, Open-JSON-UI, MCP-UI, MCP Apps) is moving fast.
   A name anchored to today's protocol vocabulary will age badly; a name anchored
   to the user's outcome will not.
6. **Descriptive names are harder to defend as marks.** Rank 1 is the clearest
   and the least distinctive. That trade cannot be engineered away, only decided.

## 12. Unresolved fog

- **Trademark clearance**, as above. This is the largest single gap in this note.
- **Domain price and eligibility.** RDAP not-found does not mean purchasable at
  standard price. `.dev` registry premium tiers were not checked for any
  candidate, and no registrar quote was obtained.
- **Social handle availability** was observed only incidentally through result
  pages. `explainframe` was seen to have taken Instagram, Facebook, and YouTube
  handles; no candidate was checked systematically across platforms.
- **Real query volume.** The GitHub repository counts in section 5 are a corpus
  proxy, not search volume. No keyword-volume tool was consulted, so the relative
  ordering of "agent observability" against "agent visualization" is a corpus
  claim, not a demand claim.
- **Model retrieval behaviour** was reasoned about but not tested. No experiment
  was run to see which phrasing an answer engine actually surfaces for a query
  such as "how do I animate an explanation of my agent system".
- **Whether the plugin identifier must change at all.** Section 8 flags the
  split-surface option, but the Awesome Copilot rules were read for the
  identifier-matching requirement, not for whether a later rename is permitted.
  Confirm against upstream before issue #10 commits to a migration.
- **Registrant identity** behind the registered `glasscanvas` and `scenewright`
  domains was not inspected, so the strength of that prior use is estimated from
  result pages only.
- **crates.io was screened for only part of the candidate set**, because this
  repository publishes no Rust artifact. If a Rust surface is ever planned, the
  finalists need a full crates.io pass.
- **Only `.com`, `.dev`, and `.io` were checked.** No signal was gathered for
  `.ai`, `.app`, `.sh`, or country-code alternatives.
- **Issue #5 had no comments** on the retrieval date, so no additional
  constraints beyond the issue body and the parent map were available.

## 13. Primary sources checked

| Source | Relevance |
| --- | --- |
| [Issue #5, Research the public naming landscape](https://github.com/BrettReifs/fourier-runtime-canvas/issues/5) | The research question, verbatim; no comments existed on the retrieval date |
| [Issue #2, Chart the Agent Visual Runtime reference implementation](https://github.com/BrettReifs/fourier-runtime-canvas/issues/2) | Authoritative parent map: destination, hypotheses, scope, and the instruction to keep `fourier-runtime-canvas` stable |
| [Issue #10, Choose the public product name](https://github.com/BrettReifs/fourier-runtime-canvas/issues/10) | The blocked grilling ticket that owns the decision |
| [README.md](https://github.com/BrettReifs/fourier-runtime-canvas/blob/main/README.md) | Product substance, current limits, and the explicit refusal to claim savings |
| [docs/awesome-copilot-contribution.md](awesome-copilot-contribution.md) | Existing research-note convention and the identifier-matching requirement |
| [Agent Plugins 1.0.0 plugin schema](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json) | `name` length and pattern constraints binding any slug |
| [awesome-copilot CONTRIBUTING.md](https://raw.githubusercontent.com/github/awesome-copilot/main/CONTRIBUTING.md) | Canvas and plugin naming conventions, folder-name matching, and validation |
| `GET /repos/github/awesome-copilot/contents/extensions` and `/plugins` | Current upstream namespace, used for the channel-genericness finding |
| [GitHub brand guidance, logo and legal](https://brand.github.com/foundations/logo) | Express restriction on misleading use of the GitHub name; identification of GitHub Copilot as a GitHub product lockup, used here to screen "Copilot" as a high-risk mark element |
| [About GitHub Copilot CLI](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-copilot-cli) | Host product vocabulary and the local and cloud sandbox framing |
| [Model Context Protocol introduction](https://modelcontextprotocol.io/docs/2026-07-28/getting-started/intro) | Adjacent protocol vocabulary and current documented revision |
| [AG-UI protocol overview](https://docs.ag-ui.com/introduction) | Adjacent protocol layer table and the documented A2UI and AG-UI naming confusion |
| [AG-UI generative UI specs](https://docs.ag-ui.com/concepts/generative-ui-specs) | A2UI, Open-JSON-UI, and MCP-UI owners and purposes |
| [Motion Canvas](https://motioncanvas.io/) and `GET /repos/motion-canvas/motion-canvas` | Nearest authoring-tool name collision, 18,902 stars |
| [Remotion](https://www.remotion.dev/) and `GET /repos/remotion-dev/remotion` | Adjacent programmatic motion tool, 55,851 stars |
| [agentscope-ai/agentscope](https://github.com/agentscope-ai/agentscope) | 28,721 stars and the "see, understand and trust" outcome sentence |
| [open-telemetry/semantic-conventions-genai](https://github.com/open-telemetry/semantic-conventions-genai) | Fixes the meaning of trace and observability vocabulary for this audience |
| [ASD-STE100 about page](https://www.asd-ste100.org/about.html) | Issue 8 (April 2021), one-word-one-meaning, technical names permitted |
| [IANA RDAP bootstrap, dns.json](https://data.iana.org/rdap/dns.json) | Correct RDAP base per TLD, and the source of the `.dev` correction |
| `https://rdap.verisign.com/com/v1/domain/` | `.com` registration signal, positive and negative controls run |
| `https://pubapi.registry.google/rdap/domain/` | `.dev` registration signal, `web.dev` control run |
| `https://rdap.identitydigital.services/rdap/domain/` | `.io` registration signal, `langfuse.io` control run |
| `https://registry.npmjs.org/`, `https://pypi.org/pypi/`, `https://crates.io/api/v1/crates/` | Package name occupancy |
| `GET /search/repositories` and `GET /users/` on `api.github.com` | Repository-name collisions, topic volume, and handle occupancy |
| `https://html.duckduckgo.com/html/?q=` | Current result-page ownership, treated as a Tier 3 signal only |

Registry, RDAP, DNS, and result-page findings are point-in-time. Re-run every
check in sections 7 and 11 immediately before issue #10 records a decision.
