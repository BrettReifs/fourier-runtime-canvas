# Fourier Runtime Canvas Plugin

An experimental frequency-domain GitHub Copilot canvas for drawing temporary
vector paths, retaining Fourier coefficients, and using those coefficients to
compose, animate, morph, and sonify runtime visuals.

## Installation

After publication in Awesome Copilot:

```text
copilot plugin install fourier-runtime-canvas@awesome-copilot
```

Open `fourier-runtime-canvas` in Copilot, draw a path in Create, transform it,
then use Compose & animate to layer and keyframe coefficient-only assets.

## Storage model

Raw pointer points are temporary. The extension stores `fourier-path/v1`
coefficient assets and `fourier-composition/v1` timeline data in the active
workspace. Runtime HTTP endpoints bind to `127.0.0.1`.

## Source

Source, limits, API examples, and development instructions are available in
the [standalone repository](https://github.com/BrettReifs/fourier-runtime-canvas).
This plugin is structured for contribution to
[Awesome Copilot](https://github.com/github/awesome-copilot).

## License

MIT
