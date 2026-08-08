# Security Policy

## Reporting a vulnerability

Please report suspected vulnerabilities through
[GitHub private vulnerability reporting](https://github.com/BrettReifs/fourier-runtime-canvas/security/advisories/new).
Do not open a public issue for an unpatched vulnerability. Include the affected
version, reproduction steps, impact, and any suggested mitigation.

This experimental project does not currently publish a fixed response SLA.
Reports will be acknowledged and triaged as maintainer capacity permits.

## Security model

Each canvas instance starts an HTTP server on an ephemeral port bound only to
`127.0.0.1` and creates a 256-bit random capability. All page, API, and SSE
requests require that capability. Requests must also use the exact
`127.0.0.1:<port>` Host and either omit Origin or send the exact loopback
origin. Mutations require `application/json`. Do not expose or proxy the bridge
to another interface, publish its capability, or place the capability in logs.

The iframe receives a nonce-based Content Security Policy that blocks external
scripts, fonts, media, objects, workers, and network connections. The runtime
has no external CDN, telemetry, upload, or analytics dependency.

JSON request bodies are limited to 1 MB. Stroke, point, coefficient, layer, and
keyframe counts, aggregate scene complexity, transform work, storage size, and
numeric magnitudes are bounded before expensive processing or persistence.
Persisted JSON uses atomic replacement, per-workspace mutation serialization,
and revision checks for compositions. It is written only below the active
Copilot workspace's `fourier-assets/` and `fourier-compositions/` directories.
Invalid asset files are quarantined and reported through `/api/info` rather
than preventing the remaining library from loading.

The extension requires no API keys or application credentials. Never add
secrets to source, examples, screenshots, fixtures, or bug reports. Generated
assets may still reveal the shapes a user created and should be handled as
workspace data.

## Supported versions

Security fixes are applied to the latest release. This repository is currently
pre-release software without long-term support branches.
