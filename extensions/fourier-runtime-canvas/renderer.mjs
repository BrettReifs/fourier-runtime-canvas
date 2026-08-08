export function renderHtml(nonce) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Fourier Runtime Visualizer</title>
  <style>
    :root {
      color-scheme: light dark;
      --panel: color-mix(in srgb, var(--background-color-default, #0d1117) 92%, var(--true-color-blue, #2f81f7));
      --accent: var(--true-color-blue, #2f81f7);
      --accent-muted: var(--true-color-blue-muted, #388bfd33);
      --grid: color-mix(in srgb, var(--border-color-default, #30363d) 56%, transparent);
      --success: #3fb950;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-width: 320px;
      background: var(--background-color-default, #0d1117);
      color: var(--text-color-default, #e6edf3);
      font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
      font-size: var(--text-body-medium, 14px);
      line-height: var(--leading-body-medium, 20px);
    }
    button, input, select { font: inherit; }
    .shell { display: grid; gap: 14px; min-height: 100vh; padding: 18px; }
    .topbar, .status-row, .controls, .endpoint-row, .mode-tabs {
      display: flex;
      align-items: center;
      gap: 9px;
      flex-wrap: wrap;
    }
    .topbar { justify-content: space-between; }
    h1 {
      margin: 0;
      font-family: var(--font-sans-display, var(--font-sans, sans-serif));
      font-size: var(--text-title-medium, 20px);
      line-height: var(--leading-title-medium, 26px);
      font-weight: var(--font-weight-semibold, 600);
    }
    .eyebrow {
      color: var(--text-color-muted, #8b949e);
      font-family: var(--font-mono, Consolas, monospace);
      font-size: 11px;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 4px 9px;
      border: 1px solid var(--border-color-default, #30363d);
      border-radius: 999px;
      color: var(--text-color-muted, #8b949e);
      font-size: 12px;
    }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--true-color-red, #f85149);
      box-shadow: 0 0 0 4px var(--true-color-red-muted, #f8514933);
    }
    .dot.live {
      background: var(--success);
      box-shadow: 0 0 0 4px #3fb9502e;
    }
    .panel {
      overflow: hidden;
      border: 1px solid var(--border-color-default, #30363d);
      border-radius: 10px;
      background: var(--panel);
    }
    .view[hidden] { display: none; }
    .mode-tabs {
      width: fit-content;
      padding: 3px;
      border: 1px solid var(--border-color-default, #30363d);
      border-radius: 8px;
      background: var(--panel);
    }
    .mode-tab {
      min-height: 30px;
      border: 0;
      background: transparent;
      color: var(--text-color-muted, #8b949e);
    }
    .mode-tab.active {
      background: var(--accent-muted);
      color: var(--text-color-default, #e6edf3);
    }
    .plot-wrap { position: relative; min-height: 280px; }
    canvas { display: block; width: 100%; height: 100%; }
    #waveform, #drawing, #asset-canvas { height: 410px; }
    #spectrum, #asset-spectrum { height: 180px; }
    #drawing {
      cursor: crosshair;
      touch-action: none;
      background:
        radial-gradient(circle at 50% 50%, var(--accent-muted), transparent 58%),
        var(--background-color-default, #0d1117);
    }
    #asset-canvas {
      cursor: default;
      touch-action: none;
    }
    #asset-canvas.layer-target { cursor: grab; }
    #asset-canvas.layer-dragging { cursor: grabbing; }
    .plot-label {
      position: absolute;
      z-index: 1;
      top: 12px;
      left: 14px;
      color: var(--text-color-muted, #8b949e);
      font-size: 12px;
      pointer-events: none;
    }
    .grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(270px, 1fr); gap: 14px; }
    .side { display: grid; align-content: start; gap: 14px; }
    .section { padding: 14px; }
    .section h2 {
      margin: 0 0 10px;
      font-size: 13px;
      font-weight: var(--font-weight-semibold, 600);
    }
    .section p {
      margin: 8px 0;
      color: var(--text-color-muted, #8b949e);
      font-size: 12px;
    }
    .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .metric {
      min-width: 0;
      padding: 9px;
      border-radius: 7px;
      background: var(--accent-muted);
    }
    .metric strong {
      display: block;
      overflow: hidden;
      font-size: 16px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .metric span { color: var(--text-color-muted, #8b949e); font-size: 11px; }
    .formula {
      min-height: 45px;
      overflow: auto;
      color: var(--text-color-muted, #8b949e);
      font-family: var(--font-mono, Consolas, monospace);
      font-size: 12px;
      white-space: nowrap;
    }
    button, select, input[type="text"], input[type="number"] {
      min-height: 32px;
      border: 1px solid var(--border-color-default, #30363d);
      border-radius: 6px;
      background: var(--background-color-default, #0d1117);
      color: var(--text-color-default, #e6edf3);
      padding: 5px 10px;
    }
    button { cursor: pointer; }
    button:hover { border-color: var(--accent); }
    button.primary {
      border-color: var(--accent);
      background: var(--accent);
      color: var(--color-white, #fff);
      font-weight: var(--font-weight-semibold, 600);
    }
    button:disabled { cursor: not-allowed; opacity: .5; }
    button:focus-visible, select:focus-visible, input:focus-visible {
      outline: 2px solid var(--color-focus-outline, #2f81f7);
      outline-offset: 2px;
    }
    input[type="text"] { width: 100%; }
    input[type="number"] { width: 76px; }
    label { color: var(--text-color-muted, #8b949e); font-size: 12px; }
    .field { display: grid; gap: 5px; }
    .field-row { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px; }
    input[type="range"] { accent-color: var(--accent); width: 100%; }
    input[type="checkbox"] { accent-color: var(--accent); }
    .bridge { display: grid; gap: 10px; }
    .endpoint {
      flex: 1;
      min-width: 180px;
      overflow: hidden;
      padding: 7px 9px;
      border: 1px solid var(--border-color-default, #30363d);
      border-radius: 6px;
      background: var(--background-color-default, #0d1117);
      color: var(--text-color-muted, #8b949e);
      font-family: var(--font-mono, Consolas, monospace);
      font-size: 11px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .privacy-note {
      padding: 10px;
      border: 1px solid color-mix(in srgb, var(--success) 45%, transparent);
      border-radius: 7px;
      background: color-mix(in srgb, var(--success) 10%, transparent);
      color: var(--text-color-muted, #8b949e);
      font-size: 12px;
    }
    .privacy-note strong { color: var(--text-color-default, #e6edf3); }
    .timeline {
      display: grid;
      gap: 8px;
      padding: 12px;
    }
    .timeline-ruler {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 8px;
      color: var(--text-color-muted, #8b949e);
      font-size: 11px;
    }
    .timeline-track {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 8px;
      align-items: center;
      min-height: 34px;
      cursor: pointer;
    }
    .timeline-track.selected .track-name { color: var(--text-color-default, #e6edf3); }
    .track-name {
      overflow: hidden;
      color: var(--text-color-muted, #8b949e);
      font-size: 12px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .track-lane {
      position: relative;
      height: 24px;
      border-radius: 5px;
      background: color-mix(in srgb, var(--border-color-default, #30363d) 42%, transparent);
    }
    .track-block {
      position: absolute;
      top: 3px;
      bottom: 3px;
      border: 1px solid var(--accent);
      border-radius: 4px;
      background: var(--accent-muted);
    }
    .keyframe-dot {
      position: absolute;
      top: 50%;
      width: 8px;
      height: 8px;
      border: 1px solid var(--background-color-default, #0d1117);
      background: var(--accent);
      transform: translate(-50%, -50%) rotate(45deg);
    }
    .audio-cue-dot {
      position: absolute;
      bottom: 2px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #f0b429;
      box-shadow: 0 0 8px #f0b42988;
      transform: translateX(-50%);
    }
    .playhead {
      position: absolute;
      z-index: 2;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--true-color-red, #f85149);
      pointer-events: none;
    }
    .editor-fields {
      display: grid;
      grid-template-columns: repeat(3, minmax(80px, 1fr));
      gap: 9px;
    }
    .editor-fields label { display: grid; gap: 4px; }
    .editor-fields input, .editor-fields select { width: 100%; }
    details {
      border-top: 1px solid var(--border-color-default, #30363d);
      padding-top: 10px;
    }
    summary { cursor: pointer; color: var(--text-color-muted, #8b949e); font-size: 12px; }
    pre {
      overflow: auto;
      margin: 10px 0 0;
      padding: 10px;
      border-radius: 6px;
      background: var(--background-color-default, #0d1117);
      color: var(--text-color-muted, #8b949e);
      font-family: var(--font-mono, Consolas, monospace);
      font-size: 11px;
      line-height: 17px;
    }
    .error { color: var(--true-color-red, #f85149); font-size: 12px; }
    .flash { color: var(--success); }
    .tour-launch {
      border-color: color-mix(in srgb, var(--accent) 55%, var(--border-color-default, #30363d));
      background: var(--accent-muted);
    }
    .tour-overlay {
      position: fixed;
      z-index: 1000;
      inset: 0;
      pointer-events: none;
    }
    .tour-overlay.intro {
      background: color-mix(in srgb, var(--background-color-default, #0d1117) 84%, transparent);
      backdrop-filter: blur(3px);
    }
    .tour-spotlight {
      position: fixed;
      border: 2px solid color-mix(in srgb, var(--accent) 72%, var(--color-white, #fff));
      border-radius: 12px;
      box-shadow:
        0 0 0 9999px color-mix(in srgb, var(--background-color-default, #0d1117) 78%, transparent),
        0 0 36px var(--accent-muted);
      transition:
        left 260ms ease,
        top 260ms ease,
        width 260ms ease,
        height 260ms ease;
    }
    .tour-spotlight::before,
    .tour-spotlight::after {
      position: absolute;
      content: "";
      border-radius: 50%;
      pointer-events: none;
    }
    .tour-spotlight::before {
      width: 12px;
      height: 12px;
      top: -7px;
      left: 22%;
      background: var(--accent);
      box-shadow: 0 0 14px var(--accent);
      transform-origin: calc(50% + 52px) calc(50% + 7px);
      animation: tour-orbit 4s linear infinite;
    }
    .tour-spotlight::after {
      width: 7px;
      height: 7px;
      right: 18%;
      bottom: -5px;
      background: #a371f7;
      box-shadow: 0 0 12px #a371f7;
    }
    .tour-card {
      position: fixed;
      width: min(370px, calc(100vw - 28px));
      max-height: calc(100vh - 28px);
      overflow: auto;
      border: 1px solid color-mix(in srgb, var(--accent) 45%, var(--border-color-default, #30363d));
      border-radius: 12px;
      background: color-mix(in srgb, var(--background-color-default, #0d1117) 96%, var(--accent));
      box-shadow: 0 18px 60px #0008;
      padding: 18px;
      pointer-events: auto;
    }
    .tour-overlay.intro .tour-card {
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    .tour-step {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      color: var(--text-color-muted, #8b949e);
      font-family: var(--font-mono, Consolas, monospace);
      font-size: 11px;
      letter-spacing: .07em;
      text-transform: uppercase;
    }
    .tour-card h2 {
      margin: 14px 0 8px;
      font-family: var(--font-sans-display, var(--font-sans, sans-serif));
      font-size: 22px;
      line-height: 28px;
    }
    .tour-card p {
      margin: 0;
      color: var(--text-color-muted, #8b949e);
      line-height: 21px;
    }
    .tour-card .tour-action {
      margin-top: 12px;
      padding: 10px;
      border-left: 2px solid var(--accent);
      background: var(--accent-muted);
      color: var(--text-color-default, #e6edf3);
      font-size: 12px;
    }
    .tour-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-top: 18px;
    }
    .tour-footer div { display: flex; gap: 8px; }
    @keyframes tour-orbit {
      to { transform: rotate(360deg); }
    }
    @media (prefers-reduced-motion: reduce) {
      .tour-spotlight { transition: none; }
      .tour-spotlight::before { animation: none; }
    }
    @media (max-width: 780px) {
      .grid { grid-template-columns: 1fr; }
      .timeline-track, .timeline-ruler { grid-template-columns: 96px 1fr; }
      .editor-fields { grid-template-columns: repeat(2, 1fr); }
      .tour-card {
        right: 14px !important;
        bottom: 14px !important;
        left: 14px !important;
        top: auto !important;
        width: auto;
        transform: none !important;
      }
      #waveform, #drawing, #asset-canvas { height: 320px; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header class="topbar">
      <div>
        <div class="eyebrow">Sine-series runtime bridge</div>
        <h1 id="title">Fourier Runtime Visualizer</h1>
      </div>
      <div class="status-row">
        <button id="start-tour" class="tour-launch" type="button">Walkthrough</button>
        <span class="badge"><span id="live-dot" class="dot"></span><span id="connection">Connecting</span></span>
        <span id="updated" class="badge">Waiting for data</span>
      </div>
    </header>

    <nav class="mode-tabs" role="tablist" aria-label="Visualizer mode">
      <button class="mode-tab" data-mode="create" type="button" role="tab" aria-selected="false" aria-controls="create-view">Create</button>
      <button class="mode-tab" data-mode="asset" type="button" role="tab" aria-selected="false" aria-controls="asset-view">Compose & animate</button>
      <button class="mode-tab active" data-mode="series" type="button" role="tab" aria-selected="true" aria-controls="series-view">Signal runtime</button>
    </nav>

    <section id="create-view" class="view" role="tabpanel" hidden>
      <div class="grid">
        <section class="panel plot-wrap" aria-label="Drawing input">
          <span class="plot-label">Draw one or more strokes</span>
          <canvas id="drawing">Draw temporary vector strokes to create a Fourier coefficient asset.</canvas>
        </section>
        <aside class="side">
          <section class="panel section bridge">
            <h2>Create frequency asset</h2>
            <label class="field">Asset name
              <input id="asset-name" type="text" maxlength="120" value="Untitled Fourier drawing">
            </label>
            <label class="field">Sine components
              <span class="field-row">
                <input id="term-limit" type="range" min="8" max="128" step="4" value="64">
                <output id="term-limit-value">64</output>
              </span>
            </label>
            <label><input id="close-strokes" type="checkbox"> Close each stroke</label>
            <div class="controls">
              <button id="undo-stroke" type="button">Undo stroke</button>
              <button id="clear-drawing" type="button">Clear</button>
              <button id="transform-drawing" class="primary" type="button" disabled>Transform</button>
            </div>
            <div id="create-error" class="error" role="alert"></div>
            <div class="privacy-note">
              <strong>Frequency-only output.</strong> Pointer points exist only during this edit. After transformation, the canvas clears them and retains only Fourier coefficients.
            </div>
          </section>
        </aside>
      </div>
    </section>

    <section id="asset-view" class="view" role="tabpanel" hidden>
      <section class="panel plot-wrap" aria-label="Layered Fourier composition">
        <span class="plot-label">Layered inverse Fourier composition</span>
        <canvas id="asset-canvas">Preview the layered Fourier composition and its animation timeline.</canvas>
      </section>
      <section class="panel timeline" style="margin-top:14px">
        <div class="controls">
          <button id="asset-play" class="primary" type="button">Play</button>
          <button id="sound-toggle" type="button" aria-pressed="true">Sound on</button>
          <button id="undo-composition" type="button" title="Undo (Ctrl/Cmd+Z)" disabled>Undo</button>
          <button id="redo-composition" type="button" title="Redo (Ctrl/Cmd+Shift+Z)" disabled>Redo</button>
          <button id="static-final" type="button">Static final</button>
          <label>Time <input id="composition-time" type="range" min="0" max="8" step="0.01" value="0"></label>
          <output id="composition-time-value">0.00 / 8.00s</output>
          <label>Speed <input id="asset-speed" type="range" min="0.25" max="3" step="0.25" value="1"></label>
          <label><input id="show-epicycles" type="checkbox"> Epicycles</label>
        </div>
        <div class="timeline-ruler"><span>Layers</span><span>0s</span></div>
        <div id="timeline-tracks"></div>
      </section>
      <div class="grid" style="margin-top:14px">
        <section class="panel section">
          <h2>Layer and keyframe editor</h2>
          <div class="controls">
            <select id="asset-library" aria-label="Frequency asset"></select>
            <button id="add-layer" type="button">Add layer at playhead</button>
          </div>
          <div id="composition-error" class="error" role="alert"></div>
          <div id="layer-empty"><p>Select a layer track to edit its keyframed state.</p></div>
          <div id="layer-editor" hidden>
            <p id="selected-layer-status"></p>
            <div class="editor-fields">
              <label>Start <input id="layer-start" type="number" min="0" step="0.01"></label>
              <label>End <input id="layer-end" type="number" min="0" step="0.01"></label>
              <label>Shape <select id="key-shape" aria-label="Shape at keyframe"></select></label>
              <label>X <input id="key-x" type="number" min="-2" max="2" step="0.05"></label>
              <label>Y <input id="key-y" type="number" min="-2" max="2" step="0.05"></label>
              <label>Scale <input id="key-scale" type="number" min="0" max="10" step="0.05"></label>
              <label>Rotation <input id="key-rotation" type="number" step="1"></label>
              <label>Opacity <input id="key-opacity" type="number" min="0" max="1" step="0.05"></label>
              <label>Reveal <input id="key-reveal" type="number" min="0" max="1" step="0.05"></label>
              <label>Easing
                <select id="key-easing">
                  <option value="ease-in-out">Ease in/out</option>
                  <option value="linear">Linear</option>
                  <option value="ease-in">Ease in</option>
                  <option value="ease-out">Ease out</option>
                </select>
              </label>
            </div>
            <div class="controls" style="margin-top:10px">
              <button id="save-keyframe" class="primary" type="button">Set keyframe</button>
              <button id="remove-keyframe" type="button">Remove keyframe</button>
              <button id="delete-layer" type="button">Delete layer</button>
            </div>
            <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-color-default, #30363d)">
              <h2>Procedural line life</h2>
              <div class="editor-fields">
                <label><span><input id="motion-enabled" type="checkbox"> Enabled</span></label>
                <label>Amount <input id="motion-amount" type="number" min="0" max="0.08" step="0.001"></label>
                <label>Speed <input id="motion-speed" type="number" min="0" max="5" step="0.05"></label>
                <label>Detail <input id="motion-detail" type="number" min="0.25" max="20" step="0.25"></label>
              </div>
              <p id="motion-status">Changes preview live without changing the stored asset.</p>
              <button id="save-motion" type="button">Save line life</button>
            </div>
            <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-color-default, #30363d)">
              <h2>Spectral sound cue</h2>
              <div class="editor-fields">
                <label><span><input id="audio-enabled" type="checkbox"> Enabled</span></label>
                <label>Trigger <input id="audio-trigger" type="number" min="0" max="300" step="0.01"></label>
                <label>Pitch (Hz) <input id="audio-frequency" type="number" min="40" max="1200" step="1"></label>
                <label>Volume <input id="audio-gain" type="number" min="0" max="0.2" step="0.005"></label>
                <label>Duration <input id="audio-duration" type="number" min="0.03" max="2" step="0.01"></label>
                <label>Partials <input id="audio-partials" type="number" min="1" max="8" step="1"></label>
              </div>
              <p id="audio-status">The strongest stored frequencies shape a short sine-based cue.</p>
              <div class="controls">
                <button id="preview-audio" type="button">Preview cue</button>
                <button id="save-audio" type="button">Save cue</button>
              </div>
            </div>
          </div>
        </section>
        <aside class="side">
          <section class="panel section">
            <h2 id="asset-title">No composition yet</h2>
            <div class="metric-grid">
              <div class="metric"><strong id="asset-strokes">0</strong><span>layers</span></div>
              <div class="metric"><strong id="asset-terms">0</strong><span>components</span></div>
              <div class="metric"><strong id="asset-size">0 B</strong><span>timeline JSON</span></div>
            </div>
            <div class="controls" style="margin-top:10px">
              <button id="copy-asset" type="button" disabled>Copy JSON</button>
              <button id="download-asset" type="button" disabled>Download JSON</button>
            </div>
            <p>Layers reference coefficient assets. Keyframes morph transforms, opacity, and ink reveal over time.</p>
          </section>
        </aside>
      </div>
    </section>

    <section id="series-view" class="view" role="tabpanel">
      <section class="panel plot-wrap" aria-label="Fourier waveform">
        <span class="plot-label">Time-domain output</span>
        <canvas id="waveform">Preview the reconstructed time-domain waveform.</canvas>
      </section>
      <div class="grid" style="margin-top:14px">
        <section class="panel plot-wrap" aria-label="Harmonic spectrum">
          <span class="plot-label">Harmonic amplitudes</span>
          <canvas id="spectrum">Preview harmonic amplitudes in the current Fourier series.</canvas>
        </section>
        <aside class="side">
          <section class="panel section">
            <h2>Runtime</h2>
            <div class="metric-grid">
              <div class="metric"><strong id="term-count">0</strong><span>terms</span></div>
              <div class="metric"><strong id="frequency">0</strong><span>fundamental</span></div>
              <div class="metric"><strong id="peak">0</strong><span>peak</span></div>
            </div>
            <div class="formula" id="formula"></div>
            <div class="controls">
              <button id="play" type="button">Pause</button>
              <label>Speed <input id="speed" type="range" min="0" max="2" step="0.05" value="0.35"></label>
              <select id="preset" aria-label="Preset">
                <option value="">Load preset</option>
                <option value="sine">Sine</option>
                <option value="square">Square</option>
                <option value="sawtooth">Sawtooth</option>
                <option value="triangle">Triangle</option>
              </select>
            </div>
          </section>
          <section class="panel section bridge">
            <h2>Script bridge</h2>
            <div class="endpoint-row">
              <div class="endpoint" id="endpoint">Resolving endpoint...</div>
              <button id="copy-endpoint" type="button">Copy URL</button>
            </div>
            <details>
              <summary>Payload and PowerShell example</summary>
              <pre id="example"></pre>
            </details>
          </section>
        </aside>
      </div>
    </section>
  </main>

  <div id="tour-overlay" class="tour-overlay" hidden>
    <div id="tour-spotlight" class="tour-spotlight" hidden></div>
    <section id="tour-card" class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div class="tour-step">
        <span id="tour-section">Walkthrough</span>
        <span id="tour-progress">1 / 9</span>
      </div>
      <h2 id="tour-title"></h2>
      <p id="tour-body"></p>
      <div id="tour-action" class="tour-action"></div>
      <footer class="tour-footer">
        <button id="tour-exit" type="button">Exit</button>
        <div>
          <button id="tour-back" type="button">Back</button>
          <button id="tour-next" class="primary" type="button">Next</button>
        </div>
      </footer>
    </section>
  </div>

  <script nonce="${nonce}">
   const capabilityToken = new URLSearchParams(location.search).get("token");
   if (!capabilityToken) throw new Error("Canvas capability is missing.");
   history.replaceState(null, "", location.pathname);
   const state = {
      mode: "series",
      series: null,
      asset: null,
      assets: new Map(),
      assetSummaries: [],
      composition: null,
      history: { canUndo: false, canRedo: false, undoCount: 0, redoCount: 0 },
      selectedLayerId: null,
      layerGeometry: new Map(),
      dragLayer: null,
      strokes: [],
      activeStroke: null,
      seriesPhase: 0,
      compositionTime: 0,
      compositionPlaying: false,
      staticFinal: false,
      assetSpeed: 1,
      soundEnabled: true,
      audioContext: null,
      ambientTime: 0,
      lastFrame: performance.now(),
      tourStep: 0,
      limits: { maxStrokes: 32, maxPointsPerStroke: 4096, maxTotalPoints: 16384 },
      motionPreviews: new Map(),
      audioPreviews: new Map(),
      saveChain: Promise.resolve(),
      localSaveRevision: null,
      localSaveSequence: 0,
      tourReturnFocus: null,
      userEnabledMotion: false,
    };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coefficientCache = new WeakMap();

    const TOUR_STEPS = [
      {
        section: "From stroke to scene",
        title: "Build motion from sine waves",
        body: "This walkthrough follows one scene from a freehand mark to a layered animation. The original drawing is temporary. The reusable result is frequency, amplitude, and phase.",
        action: "You will draw an object, turn it into a Fourier asset, layer it, animate keyframes, and inspect the final frame.",
      },
      {
        section: "Capture",
        title: "Start in Create mode",
        body: "Create mode is the only place raw pointer coordinates exist. Use it for one independent scene object at a time, such as a bubble outline or a line of handwriting.",
        action: "Choose Create whenever you need another object for the asset library.",
        mode: "create",
        target: '[data-mode="create"]',
      },
      {
        section: "Capture",
        title: "Draw one or more strokes",
        body: "Each pen-down gesture becomes a stroke. Multiple strokes stay grouped as one asset, so dotted letters or disconnected shapes can still move as a unit.",
        action: "Draw naturally. Undo removes the last stroke without clearing the rest.",
        mode: "create",
        target: "#drawing",
      },
      {
        section: "Transform",
        title: "Keep the frequencies, discard the drawing",
        body: "Sine components controls fidelity. Closed strokes suit outlines. Transform resamples the path, computes complex Fourier coefficients, clears the pointer data, and stores only the frequency asset.",
        action: "Use 32–64 components for simple shapes. Increase the count when handwriting loses important turns.",
        mode: "create",
        target: "#transform-drawing",
      },
      {
        section: "Compose",
        title: "Move from an asset to a scene",
        body: "Compose & animate reconstructs every visible line from its coefficients. A scene can contain many independent Fourier assets without storing a raster image.",
        action: "Open this mode after transforming an object or when revisiting a saved scene.",
        mode: "asset",
        target: '[data-mode="asset"]',
      },
      {
        section: "Compose",
        title: "Add assets as layers",
        body: "The asset library contains every transformed object from this session. Adding one at the playhead creates a layer that can overlap, enter later, or remain visible behind another layer.",
        action: "Add the thought bubble first. Move the playhead later, then add the handwriting.",
        mode: "asset",
        target: "#asset-library",
      },
      {
        section: "Timing",
        title: "Arrange entrances on the timeline",
        body: "Each track has a visible start and end. Diamonds mark keyframes and gold dots mark spectral sound cues. Click a track to move the playhead and select its layer.",
        action: "Click Play once to unlock sound. Each cue uses the selected layer’s strongest stored sine frequencies.",
        mode: "asset",
        target: ".timeline",
      },
      {
        section: "Keyframes",
        title: "Morph the layer state",
        body: "Click a visible layer to select it, then drag it into place. Choose a different Shape on another keyframe to morph by interpolating the assets’ complex frequency coefficients.",
        action: "Movement creates position keyframes. Shape changes create spectral morphs. Arrow keys provide precise nudging.",
        mode: "asset",
        target: "#layer-editor:not([hidden]), #layer-empty:not([hidden])",
      },
      {
        section: "Review",
        title: "Inspect the completed sine object",
        body: "Static final jumps to the composition endpoint and pauses playback. It shows every layer at its final keyframed state without replaying the drawing animation.",
        action: "Use Static final to check framing, overlaps, and whether every stroke finishes.",
        mode: "asset",
        target: "#static-final",
      },
      {
        section: "Scene recipe",
        title: "Bubble first, thought second",
        body: "Build an 8-second scene. Keep the bubble visible from 0–8s. Scale it from 0.25 to 1 between 0–2s with reveal fixed at 1. Start the text at 2s and animate reveal from 0 to 1 by 6s.",
        action: "Replay this walkthrough from the Walkthrough button whenever you add a new kind of scene.",
      },
    ];

    const canvases = {
      waveform: document.querySelector("#waveform"),
      spectrum: document.querySelector("#spectrum"),
      drawing: document.querySelector("#drawing"),
      asset: document.querySelector("#asset-canvas"),
    };
    const contexts = Object.fromEntries(
      Object.entries(canvases).map(([key, canvas]) => [key, canvas.getContext("2d")])
    );
    const css = () => getComputedStyle(document.documentElement);
    const token = (name, fallback) => css().getPropertyValue(name).trim() || fallback;

    function fitCanvas(canvas, context) {
      const ratio = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width * ratio));
      const height = Math.max(1, Math.floor(rect.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      return rect;
    }

    function drawGrid(context, width, height) {
      context.strokeStyle = token("--grid", "#30363d");
      context.lineWidth = 1;
      context.beginPath();
      for (let x = 0; x <= width; x += width / 8) {
        context.moveTo(x, 0);
        context.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += height / 4) {
        context.moveTo(0, y);
        context.lineTo(width, y);
      }
      context.stroke();
    }

    function setMode(mode) {
      state.mode = mode;
      document.querySelectorAll(".view").forEach((view) => {
        view.hidden = view.id !== mode + "-view";
      });
      document.querySelectorAll(".mode-tab").forEach((button) => {
        const selected = button.dataset.mode === mode;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-selected", String(selected));
        button.tabIndex = selected ? 0 : -1;
      });
      document.querySelector("#title").textContent = mode === "asset"
        ? (state.asset?.name ?? "Fourier asset playback")
        : mode === "create"
          ? "Create Fourier asset"
          : (state.series?.name ?? "Fourier Runtime Visualizer");
      if (mode === "asset") renderTimeline();
      if (mode === "create") drawInput();
      if (mode === "series") drawSeriesSpectrum();
    }

    function positionTour() {
      const overlay = document.querySelector("#tour-overlay");
      if (overlay.hidden) return;
      const step = TOUR_STEPS[state.tourStep];
      const spotlight = document.querySelector("#tour-spotlight");
      const card = document.querySelector("#tour-card");
      const target = step.target ? document.querySelector(step.target) : null;

      card.style.inset = "";
      card.style.transform = "";
      if (!target || target.hidden) {
        overlay.classList.add("intro");
        spotlight.hidden = true;
        card.style.left = "50%";
        card.style.top = "50%";
        card.style.transform = "translate(-50%, -50%)";
        return;
      }

      overlay.classList.remove("intro");
      const rect = target.getBoundingClientRect();
      const padding = 8;
      spotlight.hidden = false;
      spotlight.style.left = Math.max(6, rect.left - padding) + "px";
      spotlight.style.top = Math.max(6, rect.top - padding) + "px";
      spotlight.style.width =
        Math.min(window.innerWidth - 12, rect.width + padding * 2) + "px";
      spotlight.style.height =
        Math.min(window.innerHeight - 12, rect.height + padding * 2) + "px";

      const cardWidth = Math.min(370, window.innerWidth - 28);
      const cardHeight = card.offsetHeight;
      let left;
      let top;
      if (rect.right + cardWidth + 28 <= window.innerWidth) {
        left = rect.right + 18;
        top = rect.top;
      } else if (rect.left - cardWidth - 28 >= 0) {
        left = rect.left - cardWidth - 18;
        top = rect.top;
      } else {
        left = Math.max(14, Math.min(
          window.innerWidth - cardWidth - 14,
          rect.left + rect.width / 2 - cardWidth / 2
        ));
        top = rect.bottom + cardHeight + 28 <= window.innerHeight
          ? rect.bottom + 14
          : rect.top - cardHeight - 14;
      }
      card.style.left = left + "px";
      card.style.top = Math.max(14, Math.min(
        window.innerHeight - cardHeight - 14,
        top
      )) + "px";
    }

    function showTourStep(index) {
      state.tourStep = Math.max(0, Math.min(TOUR_STEPS.length - 1, index));
      const step = TOUR_STEPS[state.tourStep];
      if (step.mode) setMode(step.mode);
      document.querySelector("#tour-section").textContent = step.section;
      document.querySelector("#tour-progress").textContent =
        (state.tourStep + 1) + " / " + TOUR_STEPS.length;
      document.querySelector("#tour-title").textContent = step.title;
      document.querySelector("#tour-body").textContent = step.body;
      document.querySelector("#tour-action").textContent = step.action;
      document.querySelector("#tour-back").disabled = state.tourStep === 0;
      document.querySelector("#tour-next").textContent =
        state.tourStep === TOUR_STEPS.length - 1 ? "Finish" : "Next";

      const target = step.target ? document.querySelector(step.target) : null;
      target?.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
      requestAnimationFrame(() => requestAnimationFrame(positionTour));
    }

    function startTour() {
      state.tourReturnFocus = document.activeElement;
      document.querySelector("#tour-overlay").hidden = false;
      showTourStep(0);
      document.querySelector("#tour-next").focus();
    }

    function closeTour(completed = false) {
      document.querySelector("#tour-overlay").hidden = true;
      if (completed) sessionStorage.setItem("fourier-walkthrough-v1", "complete");
      const returnFocus = state.tourReturnFocus;
      state.tourReturnFocus = null;
      if (returnFocus instanceof HTMLElement && returnFocus.isConnected) {
        returnFocus.focus();
      } else {
        document.querySelector("#start-tour").focus();
      }
    }

    function sampleSeries(x, phase) {
      if (!state.series) return 0;
      return state.series.amplitudeScale * state.series.terms.reduce((sum, term) => {
        return sum + term.amplitude * Math.sin(
          Math.PI * 2 * term.harmonic * x + term.phase + phase * term.harmonic
        );
      }, 0);
    }

    function drawWaveform() {
      if (state.mode !== "series") return;
      const rect = fitCanvas(canvases.waveform, contexts.waveform);
      const width = rect.width;
      const height = rect.height;
      contexts.waveform.clearRect(0, 0, width, height);
      drawGrid(contexts.waveform, width, height);
      if (!state.series) return;

      let peak = 0;
      const samples = Math.max(320, Math.floor(width * 1.5));
      const values = [];
      for (let index = 0; index <= samples; index++) {
        const value = sampleSeries(
          (index / samples) * state.series.runtime.cycles,
          state.seriesPhase
        );
        peak = Math.max(peak, Math.abs(value));
        values.push(value);
      }
      const range = Math.max(1.05, peak * 1.15);
      const gradient = contexts.waveform.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, token("--true-color-blue", "#2f81f7"));
      gradient.addColorStop(1, "#a371f7");
      contexts.waveform.strokeStyle = gradient;
      contexts.waveform.lineWidth = 2;
      contexts.waveform.beginPath();
      values.forEach((value, index) => {
        const x = (index / samples) * width;
        const y = height / 2 - (value / range) * height * 0.42;
        if (index === 0) contexts.waveform.moveTo(x, y);
        else contexts.waveform.lineTo(x, y);
      });
      contexts.waveform.stroke();
      document.querySelector("#peak").textContent = peak.toFixed(2);
    }

    function drawBars(canvas, context, values, labelFor) {
      const rect = fitCanvas(canvas, context);
      const width = rect.width;
      const height = rect.height;
      context.clearRect(0, 0, width, height);
      drawGrid(context, width, height);
      if (!values.length) return;

      const max = Math.max(...values.map((value) => Math.abs(value.amplitude)), 0.001);
      const gap = Math.min(4, width / Math.max(1, values.length * 4));
      const barWidth = Math.max(0.5, (width - gap * (values.length + 1)) / values.length);
      const accent = token("--true-color-blue", "#2f81f7");
      context.fillStyle = accent;
      values.forEach((value, index) => {
        const barHeight = (Math.abs(value.amplitude) / max) * (height - 38);
        const x = gap + index * (barWidth + gap);
        context.globalAlpha = value.amplitude < 0 ? 0.45 : 0.9;
        context.fillRect(x, height - barHeight - 16, barWidth, barHeight);
        if (barWidth >= 15 || index % Math.ceil(15 / Math.max(1, barWidth)) === 0) {
          context.globalAlpha = 0.8;
          context.fillStyle = token("--text-color-muted", "#8b949e");
          context.font = "10px " + token("--font-mono", "monospace");
          context.fillText(labelFor(value), x, height - 3);
          context.fillStyle = accent;
        }
      });
      context.globalAlpha = 1;
    }

    function drawSeriesSpectrum() {
      if (state.mode !== "series") return;
      drawBars(
        canvases.spectrum,
        contexts.spectrum,
        state.series?.terms ?? [],
        (term) => String(term.harmonic)
      );
    }

    function pointFromCoefficients(stroke, time) {
      return stroke.coefficients.reduce((point, coefficient) => {
        const angle = Math.PI * 2 * coefficient.frequency * time + coefficient.phase;
        point.x += coefficient.amplitude * Math.cos(angle);
        point.y += coefficient.amplitude * Math.sin(angle);
        return point;
      }, { x: 0, y: 0 });
    }

    function complexCoefficientMap(stroke) {
      if (!stroke) return new Map();
      let cached = coefficientCache.get(stroke);
      if (cached) return cached;
      cached = new Map(stroke.coefficients.map((coefficient) => [
        coefficient.frequency,
        {
          real: coefficient.amplitude * Math.cos(coefficient.phase),
          imaginary: coefficient.amplitude * Math.sin(coefficient.phase),
        },
      ]));
      coefficientCache.set(stroke, cached);
      return cached;
    }

    function morphedCoefficientTerms(sourceStroke, targetStroke, amount) {
      const source = complexCoefficientMap(sourceStroke);
      const target = complexCoefficientMap(targetStroke);
      const frequencies = new Set([...source.keys(), ...target.keys()]);
      return [...frequencies].map((frequency) => {
        const from = source.get(frequency) ?? { real: 0, imaginary: 0 };
        const to = target.get(frequency) ?? { real: 0, imaginary: 0 };
        return {
          frequency,
          real: from.real + (to.real - from.real) * amount,
          imaginary: from.imaginary + (to.imaginary - from.imaginary) * amount,
        };
      });
    }

    function pointFromComplexTerms(terms, time) {
      const point = { x: 0, y: 0 };
      for (const term of terms) {
        const angle = Math.PI * 2 * term.frequency * time;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        point.x += term.real * cosine - term.imaginary * sine;
        point.y += term.real * sine + term.imaginary * cosine;
      }
      return point;
    }

    function applyLineLife(point, pathTime, elapsed, motion, strokeIndex) {
      if (!motion?.enabled || motion.amount <= 0 || reduceMotion) return point;
      const phase = elapsed * motion.speed * Math.PI * 2 +
        motion.seed + strokeIndex * 1.618;
      const detail = motion.detail;
      return {
        x: point.x + motion.amount * (
          Math.sin(Math.PI * 2 * detail * pathTime + phase) +
          0.35 * Math.sin(Math.PI * 2 * (detail * 2.17) * pathTime - phase * 0.63)
        ),
        y: point.y + motion.amount * (
          Math.cos(Math.PI * 2 * (detail * 0.83) * pathTime - phase * 0.71) +
          0.3 * Math.sin(Math.PI * 2 * (detail * 1.61) * pathTime + phase * 0.47)
        ),
      };
    }

    function easeValue(value, easing) {
      if (easing === "ease-in") return value * value;
      if (easing === "ease-out") return 1 - (1 - value) * (1 - value);
      if (easing === "ease-in-out") {
        return value < 0.5
          ? 2 * value * value
          : 1 - Math.pow(-2 * value + 2, 2) / 2;
      }
      return value;
    }

    function evaluateLayer(layer, time) {
      const defaults = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, reveal: 1 };
      if (!layer.keyframes.length) return defaults;
      const resolved = (keyframe) => {
        const assetId = keyframe.assetId ?? layer.assetId;
        return {
          ...defaults,
          ...keyframe,
          assetId,
          morph: { fromAssetId: assetId, toAssetId: assetId, amount: 0 },
        };
      };
      if (time <= layer.keyframes[0].time) return resolved(layer.keyframes[0]);
      if (time >= layer.keyframes.at(-1).time) return resolved(layer.keyframes.at(-1));
      const rightIndex = layer.keyframes.findIndex((keyframe) => keyframe.time >= time);
      const left = resolved(layer.keyframes[rightIndex - 1]);
      const right = resolved(layer.keyframes[rightIndex]);
      const span = Math.max(0.0001, right.time - left.time);
      const amount = easeValue((time - left.time) / span, right.easing);
      return {
        time,
        x: left.x + (right.x - left.x) * amount,
        y: left.y + (right.y - left.y) * amount,
        scale: left.scale + (right.scale - left.scale) * amount,
        rotation: left.rotation + (right.rotation - left.rotation) * amount,
        opacity: left.opacity + (right.opacity - left.opacity) * amount,
        reveal: left.reveal + (right.reveal - left.reveal) * amount,
        assetId: amount < 0.5 ? left.assetId : right.assetId,
        morph: {
          fromAssetId: left.assetId,
          toAssetId: right.assetId,
          amount,
        },
        easing: right.easing,
      };
    }

    function mapAssetPoint(point, width, height, transform) {
      const angle = transform.rotation * Math.PI / 180;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const rotated = {
        x: (point.x * cosine - point.y * sine) * transform.scale,
        y: (point.x * sine + point.y * cosine) * transform.scale,
      };
      const scale = Math.min(width, height) * 0.31;
      return {
        x: width / 2 + transform.x * width * 0.35 + rotated.x * scale,
        y: height / 2 + transform.y * height * 0.35 + rotated.y * scale,
      };
    }

    function drawEpicycles(context, stroke, time, width, height, transform) {
      if (!document.querySelector("#show-epicycles").checked) return;
      let point = { x: 0, y: 0 };
      context.lineWidth = 1;
      for (const coefficient of stroke.coefficients) {
        const angle = Math.PI * 2 * coefficient.frequency * time + coefficient.phase;
        const next = {
          x: point.x + coefficient.amplitude * Math.cos(angle),
          y: point.y + coefficient.amplitude * Math.sin(angle),
        };
        const mapped = mapAssetPoint(point, width, height, transform);
        const mappedNext = mapAssetPoint(next, width, height, transform);
        context.strokeStyle = token("--grid", "#30363d");
        context.beginPath();
        context.arc(
          mapped.x,
          mapped.y,
          coefficient.amplitude * Math.min(width, height) * 0.31 * transform.scale,
          0,
          Math.PI * 2
        );
        context.stroke();
        context.strokeStyle = token("--text-color-muted", "#8b949e");
        context.beginPath();
        context.moveTo(mapped.x, mapped.y);
        context.lineTo(mappedNext.x, mappedNext.y);
        context.stroke();
        point = next;
      }
    }

    function buildLayerGeometry(
      layer,
      sourceAsset,
      targetAsset,
      width,
      height,
      transform,
      sampleBudget,
      operationBudget
    ) {
      const morphAmount = transform.morph?.amount ?? 0;
      const strokeCount = Math.max(sourceAsset.strokes.length, targetAsset.strokes.length);
      const perStrokeBudget = Math.max(2, Math.floor(sampleBudget / strokeCount));
      const perStrokeOperationBudget = Math.max(
        2,
        Math.floor(operationBudget / strokeCount)
      );
      const motion = state.motionPreviews.get(layer.id) ?? layer.motion;
      const polylines = Array.from({ length: strokeCount }, (_, strokeIndex) => {
        const sourceStroke = sourceAsset.strokes[strokeIndex];
        const targetStroke = targetAsset.strokes[strokeIndex];
        const terms = morphedCoefficientTerms(sourceStroke, targetStroke, morphAmount);
        const sourceExtent = sourceStroke?.closed ? 1 : 0.5;
        const targetExtent = targetStroke?.closed ? 1 : 0.5;
        const fullTime = sourceExtent + (targetExtent - sourceExtent) * morphAmount;
        const visibleTime = fullTime * transform.reveal;
        const desiredSamples = Math.max(48, Math.min(480, terms.length * 3));
        const operationLimitedSamples = Math.max(
          2,
          Math.floor(perStrokeOperationBudget / Math.max(1, terms.length))
        );
        const sampleCount = Math.max(
          2,
          Math.min(
            perStrokeBudget,
            operationLimitedSamples,
            Math.floor(desiredSamples * transform.reveal)
          )
        );
        const points = [];
        for (let index = 0; index <= sampleCount; index++) {
          const time = visibleTime * (index / sampleCount);
          points.push(mapAssetPoint(
            applyLineLife(
              pointFromComplexTerms(terms, time),
              time,
              state.ambientTime,
              motion,
              strokeIndex
            ),
            width,
            height,
            transform
          ));
        }
        return points;
      });
      const points = polylines.flat();
      return {
        polylines,
        hasClosedStroke: (
          morphAmount < 0.5
            ? sourceAsset.strokes
            : targetAsset.strokes
        ).some((stroke) => stroke.closed),
        bounds: {
          left: Math.min(...points.map((point) => point.x)),
          right: Math.max(...points.map((point) => point.x)),
          top: Math.min(...points.map((point) => point.y)),
          bottom: Math.max(...points.map((point) => point.y)),
        },
      };
    }

    function distanceToSegment(point, start, end) {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
      const amount = Math.max(0, Math.min(
        1,
        ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)
      ));
      return Math.hypot(
        point.x - (start.x + amount * dx),
        point.y - (start.y + amount * dy)
      );
    }

    function hitTestLayer(point) {
      if (!state.composition) return null;
      const layers = [...state.composition.layers].sort(
        (left, right) => right.zIndex - left.zIndex
      );
      for (const layer of layers) {
        const geometry = state.layerGeometry.get(layer.id);
        if (!geometry) continue;
        for (const polyline of geometry.polylines) {
          for (let index = 1; index < polyline.length; index++) {
            if (distanceToSegment(point, polyline[index - 1], polyline[index]) <= 10) {
              return layer;
            }
          }
        }
      }
      return layers.find((layer) => {
        const geometry = state.layerGeometry.get(layer.id);
        if (!geometry?.hasClosedStroke) return false;
        return point.x >= geometry.bounds.left
          && point.x <= geometry.bounds.right
          && point.y >= geometry.bounds.top
          && point.y <= geometry.bounds.bottom;
      }) ?? null;
    }

    function drawLayerSelection(context) {
      const layer = selectedLayer();
      const geometry = layer ? state.layerGeometry.get(layer.id) : null;
      if (!layer || !geometry) return;
      const padding = 7;
      const width = geometry.bounds.right - geometry.bounds.left + padding * 2;
      const height = geometry.bounds.bottom - geometry.bounds.top + padding * 2;
      context.save();
      context.globalAlpha = 1;
      context.strokeStyle = token("--true-color-blue", "#2f81f7");
      context.fillStyle = token("--background-color-default", "#0d1117");
      context.lineWidth = 1;
      context.setLineDash([5, 4]);
      context.strokeRect(
        geometry.bounds.left - padding,
        geometry.bounds.top - padding,
        width,
        height
      );
      context.setLineDash([]);
      context.font = "11px " + token("--font-sans", "sans-serif");
      const labelWidth = context.measureText(layer.name).width + 12;
      context.fillRect(
        geometry.bounds.left - padding,
        geometry.bounds.top - padding - 22,
        labelWidth,
        18
      );
      context.fillStyle = token("--text-color-default", "#e6edf3");
      context.fillText(
        layer.name,
        geometry.bounds.left - padding + 6,
        geometry.bounds.top - padding - 9
      );
      context.restore();
    }

    function drawAsset() {
      if (state.mode !== "asset") return;
      const rect = fitCanvas(canvases.asset, contexts.asset);
      const width = rect.width;
      const height = rect.height;
      contexts.asset.clearRect(0, 0, width, height);
      drawGrid(contexts.asset, width, height);
      state.layerGeometry.clear();
      if (!state.composition || !state.composition.layers.length) {
        contexts.asset.fillStyle = token("--text-color-muted", "#8b949e");
        contexts.asset.font = "14px " + token("--font-sans", "sans-serif");
        contexts.asset.textAlign = "center";
        contexts.asset.fillText("Add a frequency asset layer to begin.", width / 2, height / 2);
        contexts.asset.textAlign = "start";
        return;
      }

      const layers = [...state.composition.layers]
        .sort((left, right) => left.zIndex - right.zIndex)
        .filter((layer) => (
          state.compositionTime >= layer.start
          && state.compositionTime <= layer.end
        ));
      const perLayerSampleBudget = Math.max(
        64,
        Math.floor(12000 / Math.max(1, layers.length))
      );
      const perLayerOperationBudget = Math.max(
        4096,
        Math.floor(500000 / Math.max(1, layers.length))
      );
      layers.forEach((layer, layerIndex) => {
        const transform = evaluateLayer(layer, state.compositionTime);
        const sourceAsset = state.assets.get(
          transform.morph?.fromAssetId ?? layer.assetId
        );
        const targetAsset = state.assets.get(
          transform.morph?.toAssetId ?? layer.assetId
        );
        if (!sourceAsset || !targetAsset) return;
        if (transform.opacity <= 0 || transform.scale <= 0 || transform.reveal <= 0) return;

        const hue = (210 + layerIndex * 47) % 360;
        contexts.asset.save();
        contexts.asset.globalAlpha = transform.opacity;
        contexts.asset.strokeStyle = "hsl(" + hue + " 80% 65%)";
        contexts.asset.lineWidth = 2.2;
        contexts.asset.lineCap = "round";
        contexts.asset.lineJoin = "round";
        const geometry = buildLayerGeometry(
          layer,
          sourceAsset,
          targetAsset,
          width,
          height,
          transform,
          perLayerSampleBudget,
          perLayerOperationBudget
        );
        state.layerGeometry.set(layer.id, geometry);
        for (const polyline of geometry.polylines) {
          contexts.asset.beginPath();
          polyline.forEach((point, index) => {
            if (index === 0) contexts.asset.moveTo(point.x, point.y);
            else contexts.asset.lineTo(point.x, point.y);
          });
          contexts.asset.stroke();
        }
        const epicycleAsset = (transform.morph?.amount ?? 0) < 0.5
          ? sourceAsset
          : targetAsset;
        if (layer.id === state.selectedLayerId && epicycleAsset.strokes[0]) {
          const stroke = epicycleAsset.strokes[0];
          drawEpicycles(
            contexts.asset,
            stroke,
            (stroke.closed ? 1 : 0.5) * transform.reveal,
            width,
            height,
            transform
          );
        }
        contexts.asset.restore();
      });
      drawLayerSelection(contexts.asset);
    }

    function drawInput() {
      if (state.mode !== "create") return;
      const rect = fitCanvas(canvases.drawing, contexts.drawing);
      const width = rect.width;
      const height = rect.height;
      contexts.drawing.clearRect(0, 0, width, height);
      drawGrid(contexts.drawing, width, height);
      const allStrokes = state.activeStroke
        ? [...state.strokes, state.activeStroke]
        : state.strokes;
      contexts.drawing.strokeStyle = token("--true-color-blue", "#2f81f7");
      contexts.drawing.lineWidth = 3;
      contexts.drawing.lineCap = "round";
      contexts.drawing.lineJoin = "round";
      for (const stroke of allStrokes) {
        if (stroke.length < 2) continue;
        contexts.drawing.beginPath();
        stroke.forEach((point, index) => {
          if (index === 0) contexts.drawing.moveTo(point.x, point.y);
          else contexts.drawing.lineTo(point.x, point.y);
        });
        contexts.drawing.stroke();
      }
      document.querySelector("#transform-drawing").disabled = state.strokes.length === 0;
    }

    function pointerPoint(event) {
      const rect = canvases.drawing.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function capturedPointCount() {
      return state.strokes.reduce((sum, stroke) => sum + stroke.length, 0)
        + (state.activeStroke?.length ?? 0);
    }

    function addPointerPoint(event) {
      if (!state.activeStroke) return;
      if (
        state.activeStroke.length >= state.limits.maxPointsPerStroke
        || capturedPointCount() >= state.limits.maxTotalPoints
      ) {
        document.querySelector("#create-error").textContent =
          "Drawing reached the safe point limit. Transform or clear it before continuing.";
        return;
      }
      const point = pointerPoint(event);
      const previous = state.activeStroke.at(-1);
      if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) >= 1.5) {
        state.activeStroke.push(point);
      }
    }

    async function requestJson(url, options) {
      const requestOptions = { ...(options ?? {}) };
      requestOptions.headers = {
        ...(requestOptions.headers ?? {}),
        "X-Fourier-Capability": capabilityToken,
      };
      if (requestOptions.method === "POST") {
        requestOptions.headers["Content-Type"] = "application/json";
        requestOptions.body ??= "{}";
      }
      const response = await fetch(url, requestOptions);
      const value = await response.json();
      if (!response.ok) {
        const error = new Error(value.message || "Request failed.");
        error.status = response.status;
        error.payload = value;
        throw error;
      }
      return value;
    }

    async function transformDrawing() {
      const errorElement = document.querySelector("#create-error");
      errorElement.textContent = "";
      const button = document.querySelector("#transform-drawing");
      button.disabled = true;
      button.textContent = "Transforming...";
      try {
        const closed = document.querySelector("#close-strokes").checked;
        const asset = await requestJson("/api/transform", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: document.querySelector("#asset-name").value,
            termLimit: Number(document.querySelector("#term-limit").value),
            strokes: state.strokes.map((points) => ({ closed, points })),
            runtime: { duration: 4, showEpicycles: true },
          }),
        });
        state.strokes = [];
        state.activeStroke = null;
        applyAsset(asset);
        if (!state.assetSummaries.some((summary) => summary.id === asset.id)) {
          applyAssetSummaries([{
            id: asset.id,
            name: asset.name,
            createdAt: asset.createdAt,
            strokeCount: asset.strokeCount,
            termCount: asset.strokes.reduce(
              (sum, stroke) => sum + stroke.coefficients.length,
              0
            ),
          }, ...state.assetSummaries]);
        }
        await addLayer(asset.id, state.compositionTime);
        setMode("asset");
      } catch (error) {
        errorElement.textContent = error.message;
      } finally {
        button.textContent = "Transform";
        button.disabled = state.strokes.length === 0;
      }
    }

    function termText(term, index) {
      const amplitude = Number(term.amplitude.toFixed(4));
      const phase = term.phase ? " + " + Number(term.phase.toFixed(3)) : "";
      return (index ? (amplitude >= 0 ? " + " : " - ") : (amplitude < 0 ? "-" : "")) +
        Math.abs(amplitude) + "sin(" + term.harmonic + "ωt" + phase + ")";
    }

    function applySeries(series) {
      state.series = series;
      if (!state.asset || state.mode === "series") {
        document.querySelector("#title").textContent = series.name;
      }
      document.querySelector("#term-count").textContent = series.terms.length;
      document.querySelector("#frequency").textContent = series.fundamentalFrequency.toFixed(2) + " Hz";
      document.querySelector("#formula").textContent =
        "f(t) = " + (series.terms.length ? series.terms.slice(0, 8).map(termText).join("") : "0") +
        (series.terms.length > 8 ? " + …" : "");
      document.querySelector("#speed").value = series.runtime.speed;
      document.querySelector("#play").textContent = series.runtime.playing ? "Pause" : "Play";
      document.querySelector("#updated").textContent =
        "Updated " + new Date(series.updatedAt).toLocaleTimeString();
      drawSeriesSpectrum();
    }

    function formatBytes(bytes) {
      if (bytes < 1024) return bytes + " B";
      return (bytes / 1024).toFixed(1) + " KB";
    }

    function spectralPartials(asset, limit) {
      const amplitudes = new Map();
      for (const stroke of asset.strokes) {
        for (const coefficient of stroke.coefficients) {
          const frequency = Math.abs(coefficient.frequency);
          if (frequency === 0 || coefficient.amplitude <= 0) continue;
          amplitudes.set(
            frequency,
            (amplitudes.get(frequency) ?? 0) + coefficient.amplitude
          );
        }
      }
      const selected = [...amplitudes.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, limit);
      if (!selected.length) return [{ ratio: 1, weight: 1 }];
      const total = selected.reduce((sum, entry) => sum + entry[1], 0);
      return selected.map(([frequency, amplitude]) => ({
        ratio: Math.max(1, frequency),
        weight: amplitude / total,
      }));
    }

    async function ensureAudio() {
      if (!state.audioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          document.querySelector("#audio-status").textContent =
            "This browser does not provide Web Audio.";
          return null;
        }
        state.audioContext = new AudioContextClass();
      }
      if (state.audioContext.state === "suspended") {
        await state.audioContext.resume();
      }
      return state.audioContext;
    }

    function playLayerCue(layer, force = false, audioOverride = null) {
      const context = state.audioContext;
      const audio = audioOverride ?? layer.audio;
      if (
        !state.soundEnabled
        || !context
        || context.state !== "running"
        || (!force && !audio?.enabled)
        || audio?.gain <= 0
      ) {
        return;
      }
      const transform = evaluateLayer(layer, audio.triggerTime);
      const asset = state.assets.get(transform.assetId ?? layer.assetId);
      if (!asset) return;
      const now = context.currentTime;
      const duration = audio.duration;
      for (const partial of spectralPartials(asset, audio.partialCount)) {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        const frequency = Math.min(4000, audio.baseFrequency * partial.ratio);
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency * 0.94, now);
        oscillator.frequency.exponentialRampToValueAtTime(
          frequency,
          now + Math.min(0.08, duration * 0.45)
        );
        envelope.gain.setValueAtTime(0.0001, now);
        envelope.gain.linearRampToValueAtTime(
          Math.max(0.0001, audio.gain * partial.weight),
          now + Math.min(0.015, duration * 0.2)
        );
        envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.connect(envelope).connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + duration + 0.02);
      }
    }

    function triggerAudioCues(previousTime, nextTime, wrapped) {
      if (!state.soundEnabled || !state.audioContext) return;
      const layers = state.composition?.layers ?? [];
      for (const layer of layers) {
        if (!layer.audio?.enabled) continue;
        const trigger = layer.audio.triggerTime;
        const crossed = wrapped
          ? trigger > previousTime || trigger <= nextTime
          : trigger > previousTime && trigger <= nextTime;
        if (crossed) playLayerCue(layer);
      }
    }

    function applyAsset(asset) {
      state.asset = asset;
      state.assets.set(asset.id, asset);
      if (state.mode === "asset") {
        document.querySelector("#title").textContent = asset.name;
      }
      document.querySelector("#updated").textContent =
        "Asset " + new Date(asset.createdAt).toLocaleTimeString();
    }

    async function loadAssetById(assetId) {
      if (state.assets.has(assetId)) return state.assets.get(assetId);
      const asset = await requestJson("/api/assets/" + encodeURIComponent(assetId));
      state.assets.set(asset.id, asset);
      return asset;
    }

    function applyAssetSummaries(summaries) {
      state.assetSummaries = summaries;
      for (const id of ["asset-library", "key-shape"]) {
        const select = document.querySelector("#" + id);
        const selected = select.value;
        select.replaceChildren();
        for (const summary of summaries) {
          const option = document.createElement("option");
          option.value = summary.id;
          option.textContent = summary.name + " · " + summary.termCount + " terms";
          select.append(option);
        }
        if (summaries.some((summary) => summary.id === selected)) {
          select.value = selected;
        }
      }
      document.querySelector("#add-layer").disabled = summaries.length === 0;
    }

    async function applyComposition(composition) {
      state.composition = composition;
      state.motionPreviews.clear();
      state.audioPreviews.clear();
      state.compositionTime = Math.min(state.compositionTime, composition.duration);
      const assetIds = new Set(composition.layers.flatMap((layer) => [
        layer.assetId,
        ...layer.keyframes.map((keyframe) => keyframe.assetId ?? layer.assetId),
      ]));
      await Promise.all([...assetIds].map(loadAssetById));
      if (
        !state.selectedLayerId
        || !composition.layers.some((layer) => layer.id === state.selectedLayerId)
      ) {
        state.selectedLayerId = composition.layers[0]?.id ?? null;
      }
      document.querySelector("#asset-title").textContent = composition.name;
      document.querySelector("#asset-strokes").textContent = composition.layers.length;
      document.querySelector("#asset-terms").textContent = composition.layers.reduce(
        (sum, layer) => {
          const asset = state.assets.get(layer.assetId);
          return sum + (asset?.strokes.reduce(
            (assetSum, stroke) => assetSum + stroke.coefficients.length,
            0
          ) ?? 0);
        },
        0
      );
      document.querySelector("#asset-size").textContent =
        formatBytes(new TextEncoder().encode(JSON.stringify(composition)).length);
      document.querySelector("#copy-asset").disabled = false;
      document.querySelector("#download-asset").disabled = false;
      const timeInput = document.querySelector("#composition-time");
      timeInput.max = composition.duration;
      timeInput.value = state.compositionTime;
      renderTimeline();
      syncLayerEditor();
      updateTimelinePlayhead();
    }

    function applyHistory(history) {
      state.history = history;
      const undo = document.querySelector("#undo-composition");
      const redo = document.querySelector("#redo-composition");
      undo.disabled = !history.canUndo;
      redo.disabled = !history.canRedo;
      undo.title = "Undo " + history.undoCount + " saved change" +
        (history.undoCount === 1 ? "" : "s") + " (Ctrl/Cmd+Z)";
      redo.title = "Redo " + history.redoCount + " saved change" +
        (history.redoCount === 1 ? "" : "s") + " (Ctrl/Cmd+Shift+Z)";
    }

    async function undoCompositionChange() {
      if (!state.history.canUndo) return;
      try {
        await applyComposition(await requestJson("/api/history/undo", { method: "POST" }));
        document.querySelector("#composition-error").textContent = "";
      } catch (error) {
        document.querySelector("#composition-error").textContent = error.message;
      }
    }

    async function redoCompositionChange() {
      if (!state.history.canRedo) return;
      try {
        await applyComposition(await requestJson("/api/history/redo", { method: "POST" }));
        document.querySelector("#composition-error").textContent = "";
      } catch (error) {
        document.querySelector("#composition-error").textContent = error.message;
      }
    }

    async function saveComposition() {
      const draft = structuredClone(state.composition);
      const baseRevision = draft.revision;
      const queuedAfterSequence = state.localSaveSequence;
      const operation = state.saveChain.then(async () => {
        draft.revision = state.localSaveSequence !== queuedAfterSequence
          ? state.localSaveRevision
          : baseRevision;
        try {
          const saved = await requestJson("/api/composition", {
            method: "POST",
            body: JSON.stringify(draft),
          });
          await applyComposition(saved);
          state.localSaveRevision = saved.revision;
          state.localSaveSequence += 1;
        } catch (error) {
          const canonical = error.payload?.current
            ?? await requestJson("/api/composition");
          await applyComposition(canonical);
          throw error;
        }
      });
      state.saveChain = operation.catch(() => undefined);
      try {
        await operation;
        document.querySelector("#composition-error").textContent = "";
        return true;
      } catch (error) {
        document.querySelector("#composition-error").textContent = error.message;
        return false;
      }
    }

    function selectedLayer() {
      return state.composition?.layers.find(
        (layer) => layer.id === state.selectedLayerId
      ) ?? null;
    }

    function setCompositionTime(time, syncEditor = true) {
      if (!state.composition) return;
      state.compositionTime = Math.max(0, Math.min(state.composition.duration, time));
      document.querySelector("#composition-time").value = state.compositionTime;
      updateTimelinePlayhead();
      if (syncEditor) syncLayerEditor();
    }

    function updateTimelinePlayhead() {
      if (!state.composition) return;
      const ratio = state.compositionTime / state.composition.duration;
      document.querySelector("#composition-time-value").textContent =
        state.compositionTime.toFixed(2) + " / " +
        state.composition.duration.toFixed(2) + "s";
      document.querySelectorAll(".playhead").forEach((playhead) => {
        playhead.style.left = (ratio * 100) + "%";
      });
    }

    function renderTimeline() {
      const container = document.querySelector("#timeline-tracks");
      container.replaceChildren();
      if (!state.composition) return;
      for (const layer of [...state.composition.layers].sort(
        (left, right) => right.zIndex - left.zIndex
      )) {
        const track = document.createElement("div");
        track.className = "timeline-track" +
          (layer.id === state.selectedLayerId ? " selected" : "");
        track.tabIndex = 0;
        track.setAttribute("role", "button");
        track.setAttribute(
          "aria-label",
          layer.name + ", visible from " + layer.start.toFixed(2) +
            " to " + layer.end.toFixed(2) + " seconds"
        );
        const name = document.createElement("span");
        name.className = "track-name";
        name.textContent = layer.name;
        const lane = document.createElement("div");
        lane.className = "track-lane";
        const block = document.createElement("div");
        block.className = "track-block";
        block.style.left = (layer.start / state.composition.duration * 100) + "%";
        block.style.width =
          ((layer.end - layer.start) / state.composition.duration * 100) + "%";
        lane.append(block);
        for (const keyframe of layer.keyframes) {
          const dot = document.createElement("span");
          dot.className = "keyframe-dot";
          dot.style.left = (keyframe.time / state.composition.duration * 100) + "%";
          dot.title = keyframe.time.toFixed(2) + "s";
          lane.append(dot);
        }
        if (layer.audio?.enabled) {
          const cue = document.createElement("span");
          cue.className = "audio-cue-dot";
          cue.style.left =
            (layer.audio.triggerTime / state.composition.duration * 100) + "%";
          cue.title = "Sound cue at " + layer.audio.triggerTime.toFixed(2) + "s";
          lane.append(cue);
        }
        const playhead = document.createElement("span");
        playhead.className = "playhead";
        lane.append(playhead);
        track.append(name, lane);
        track.addEventListener("click", (event) => {
          state.selectedLayerId = layer.id;
          const rect = lane.getBoundingClientRect();
          setCompositionTime(
            ((event.clientX - rect.left) / rect.width) * state.composition.duration
          );
          renderTimeline();
        });
        track.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          state.selectedLayerId = layer.id;
          if (state.compositionTime < layer.start || state.compositionTime > layer.end) {
            setCompositionTime(layer.start);
          }
          renderTimeline();
        });
        container.append(track);
      }
      updateTimelinePlayhead();
    }

    function syncLayerEditor() {
      const layer = selectedLayer();
      document.querySelector("#layer-empty").hidden = Boolean(layer);
      document.querySelector("#layer-editor").hidden = !layer;
      if (!layer) return;
      const value = evaluateLayer(layer, state.compositionTime);
      const sourceName = state.assetSummaries.find(
        (summary) => summary.id === value.morph?.fromAssetId
      )?.name;
      const targetName = state.assetSummaries.find(
        (summary) => summary.id === value.morph?.toAssetId
      )?.name;
      const morphLabel = sourceName && targetName && sourceName !== targetName
        ? " · morph " + sourceName + " → " + targetName + " " +
          Math.round(value.morph.amount * 100) + "%"
        : "";
      document.querySelector("#selected-layer-status").textContent =
        "Editing " + layer.name + " · visible " +
        layer.start.toFixed(2) + "–" + layer.end.toFixed(2) + "s" + morphLabel;
      document.querySelector("#layer-start").value = layer.start;
      document.querySelector("#layer-end").value = layer.end;
      document.querySelector("#key-x").value = value.x.toFixed(3);
      document.querySelector("#key-y").value = value.y.toFixed(3);
      document.querySelector("#key-scale").value = value.scale.toFixed(3);
      document.querySelector("#key-rotation").value = value.rotation.toFixed(2);
      document.querySelector("#key-opacity").value = value.opacity.toFixed(3);
      document.querySelector("#key-reveal").value = value.reveal.toFixed(3);
      document.querySelector("#key-easing").value = value.easing ?? "ease-in-out";
      document.querySelector("#key-shape").value = value.assetId ?? layer.assetId;
      const motion = state.motionPreviews.get(layer.id) ?? layer.motion;
      const audio = state.audioPreviews.get(layer.id) ?? layer.audio;
      document.querySelector("#motion-enabled").checked = motion?.enabled === true;
      document.querySelector("#motion-amount").value = motion?.amount ?? 0;
      document.querySelector("#motion-speed").value = motion?.speed ?? 0.35;
      document.querySelector("#motion-detail").value = motion?.detail ?? 3;
      document.querySelector("#motion-status").textContent = reduceMotion
        ? "System reduced motion is active, so procedural motion is disabled."
        : "Changes preview live on " + layer.name + "; save to keep them.";
      document.querySelector("#audio-enabled").checked = audio?.enabled === true;
      document.querySelector("#audio-trigger").value = audio?.triggerTime ?? layer.start;
      document.querySelector("#audio-frequency").value = audio?.baseFrequency ?? 220;
      document.querySelector("#audio-gain").value = audio?.gain ?? 0.045;
      document.querySelector("#audio-duration").value = audio?.duration ?? 0.18;
      document.querySelector("#audio-partials").value = audio?.partialCount ?? 5;
      document.querySelector("#audio-status").textContent =
        "The strongest stored frequencies shape " + layer.name + "’s sine cue.";
      const hasKeyframe = layer.keyframes.some(
        (keyframe) => Math.abs(keyframe.time - state.compositionTime) < 0.005
      );
      document.querySelector("#save-keyframe").textContent =
        hasKeyframe ? "Update keyframe" : "Set keyframe";
      document.querySelector("#remove-keyframe").disabled = !hasKeyframe;
    }

    async function addLayer(assetId, requestedStart = state.compositionTime) {
      if (!state.composition || !assetId) return;
      const asset = await loadAssetById(assetId);
      const start = Math.min(
        requestedStart,
        Math.max(0, state.composition.duration - 0.1)
      );
      const end = state.composition.duration;
      const revealEnd = Math.min(
        end,
        start + Math.max(0.5, asset.runtime?.duration ?? 4)
      );
      const layer = {
        id: crypto.randomUUID(),
        name: asset.name,
        assetId,
        start,
        end,
        zIndex: state.composition.layers.reduce(
          (highest, item) => Math.max(highest, item.zIndex),
          -1
        ) + 1,
        keyframes: [
          {
            time: start,
            assetId,
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            opacity: 1,
            reveal: 0,
            easing: "ease-in-out",
          },
          {
            time: revealEnd,
            assetId,
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            opacity: 1,
            reveal: 1,
            easing: "ease-in-out",
          },
        ],
      };
      state.composition.layers.push(layer);
      state.selectedLayerId = layer.id;
      await saveComposition();
    }

    function editorKeyframe() {
      return {
        time: state.compositionTime,
        assetId: document.querySelector("#key-shape").value,
        x: Number(document.querySelector("#key-x").value),
        y: Number(document.querySelector("#key-y").value),
        scale: Number(document.querySelector("#key-scale").value),
        rotation: Number(document.querySelector("#key-rotation").value),
        opacity: Number(document.querySelector("#key-opacity").value),
        reveal: Number(document.querySelector("#key-reveal").value),
        easing: document.querySelector("#key-easing").value,
      };
    }

    function positionKeyframeAtPlayhead(layer) {
      let keyframe = layer.keyframes.find(
        (item) => Math.abs(item.time - state.compositionTime) < 0.005
      );
      if (keyframe) return keyframe;
      const value = evaluateLayer(layer, state.compositionTime);
      keyframe = {
        time: state.compositionTime,
        assetId: value.assetId ?? layer.assetId,
        x: value.x,
        y: value.y,
        scale: value.scale,
        rotation: value.rotation,
        opacity: value.opacity,
        reveal: value.reveal,
        easing: value.easing ?? "ease-in-out",
      };
      layer.keyframes.push(keyframe);
      layer.keyframes.sort((left, right) => left.time - right.time);
      return keyframe;
    }

    function assetPointerPoint(event) {
      const rect = canvases.asset.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }

    async function finishLayerDrag() {
      const drag = state.dragLayer;
      state.dragLayer = null;
      canvases.asset.classList.remove("layer-dragging");
      if (!drag?.moved) return;
      const saved = await saveComposition();
      const layer = selectedLayer();
      if (saved && layer) {
        document.querySelector("#selected-layer-status").textContent =
          "Moved " + layer.name + " at " + state.compositionTime.toFixed(2) + "s";
      }
    }

    function bestMotionPreviewTime(layer) {
      return layer.keyframes.reduce((best, keyframe) => {
        const bestScore = best.reveal * 2 + Math.min(best.scale, 2);
        const score = keyframe.reveal * 2 + Math.min(keyframe.scale, 2);
        return score > bestScore ? keyframe : best;
      }, layer.keyframes[0]).time;
    }

    function previewMotionFromEditor() {
      const layer = selectedLayer();
      if (!layer) return;
      const amount = Number(document.querySelector("#motion-amount").value);
      const speed = Number(document.querySelector("#motion-speed").value);
      const detail = Number(document.querySelector("#motion-detail").value);
      if (![amount, speed, detail].every(Number.isFinite)) return;

      state.motionPreviews.set(layer.id, {
        enabled: document.querySelector("#motion-enabled").checked,
        amount: Math.max(0, Math.min(0.08, amount)),
        speed: Math.max(0, Math.min(5, speed)),
        detail: Math.max(0.25, Math.min(20, detail)),
        seed: layer.motion?.seed ?? Math.random() * Math.PI * 2,
      });
      state.compositionPlaying = false;
      state.staticFinal = false;
      document.querySelector("#asset-play").textContent = "Play";

      const current = evaluateLayer(layer, state.compositionTime);
      if (
        state.compositionTime < layer.start
        || state.compositionTime > layer.end
        || current.reveal < 0.2
        || current.scale < 0.35
      ) {
        setCompositionTime(bestMotionPreviewTime(layer), false);
      }
      document.querySelector("#motion-status").textContent = reduceMotion
        ? "System reduced motion is active, so procedural motion is disabled."
        : "Live preview on " + layer.name + " at " +
          state.compositionTime.toFixed(2) + "s; save to keep it.";
    }

    function audioFromEditor(layer) {
      const triggerTime = Number(document.querySelector("#audio-trigger").value);
      const baseFrequency = Number(document.querySelector("#audio-frequency").value);
      const gain = Number(document.querySelector("#audio-gain").value);
      const duration = Number(document.querySelector("#audio-duration").value);
      const partialCount = Number(document.querySelector("#audio-partials").value);
      if (![triggerTime, baseFrequency, gain, duration, partialCount].every(Number.isFinite)) {
        return null;
      }
      return {
        enabled: document.querySelector("#audio-enabled").checked,
        triggerTime: Math.max(layer.start, Math.min(layer.end, triggerTime)),
        baseFrequency: Math.max(40, Math.min(1200, baseFrequency)),
        gain: Math.max(0, Math.min(0.2, gain)),
        duration: Math.max(0.03, Math.min(2, duration)),
        partialCount: Math.round(Math.max(1, Math.min(8, partialCount))),
      };
    }

    async function previewAudioFromEditor() {
      const layer = selectedLayer();
      if (!layer) return;
      const audio = audioFromEditor(layer);
      if (!audio) return;
      state.audioPreviews.set(layer.id, audio);
      await ensureAudio();
      playLayerCue(layer, true, audio);
      document.querySelector("#audio-status").textContent =
        "Previewing " + layer.name + " from " + audio.partialCount +
        " stored frequency bins.";
    }

    async function patchSeries(patch) {
      applySeries(await requestJson("/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }));
    }

    function setConnection(connected) {
      document.querySelector("#connection").textContent = connected ? "Live" : "Reconnecting";
      document.querySelector("#live-dot").classList.toggle("live", connected);
    }

    async function copyText(button, text) {
      await navigator.clipboard.writeText(text);
      const original = button.textContent;
      button.textContent = "Copied";
      button.classList.add("flash");
      setTimeout(() => {
        button.textContent = original;
        button.classList.remove("flash");
      }, 1200);
    }

    function downloadAsset() {
      if (!state.composition) return;
      const blob = new Blob([JSON.stringify(state.composition, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        state.composition.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
        ".fourier-composition.json";
      anchor.click();
      URL.revokeObjectURL(url);
    }

    async function initialize() {
      const [series, info, summaries, composition, history] = await Promise.all([
        requestJson("/api/state"),
        requestJson("/api/info"),
        requestJson("/api/assets"),
        requestJson("/api/composition"),
        requestJson("/api/history"),
      ]);
      applySeries(series);
      state.limits = {
        ...state.limits,
        ...info.fourierLimits,
      };
      applyAssetSummaries(summaries);
      await applyComposition(composition);
      applyHistory(history);
      document.querySelector("#endpoint").textContent = info.updateEndpoint;
      document.querySelector("#example").textContent =
        "$body = @{\\n" +
        "  name = \\"Runtime output\\"\\n" +
        "  fundamentalFrequency = 1\\n" +
        "  coefficients = @(1, 0, 0.333, 0, 0.2)\\n" +
        "} | ConvertTo-Json\\n\\n" +
        "$headers = @{ \\"X-Fourier-Capability\\" = \\"<from get_bridge_info>\\" }\\n" +
        "Invoke-RestMethod -Method Post -Uri \\"" + info.updateEndpoint +
        "\\" -Headers $headers -ContentType \\"application/json\\" -Body $body";

      try {
        applyAsset(await requestJson("/api/asset"));
      } catch (error) {
        if (!error.message.includes("No frequency-domain")) throw error;
      }

      const events = new EventSource(
        "/events?token=" + encodeURIComponent(capabilityToken)
      );
      events.addEventListener("open", () => setConnection(true));
      events.addEventListener("error", () => setConnection(false));
      events.addEventListener("series", (event) => applySeries(JSON.parse(event.data)));
      events.addEventListener("asset", (event) => applyAsset(JSON.parse(event.data)));
      events.addEventListener("assets", (event) => {
        applyAssetSummaries(JSON.parse(event.data));
      });
      events.addEventListener("composition", (event) => {
        applyComposition(JSON.parse(event.data));
      });
      events.addEventListener("history", (event) => {
        applyHistory(JSON.parse(event.data));
      });
    }

    document.querySelectorAll(".mode-tab").forEach((button) => {
      button.addEventListener("click", () => setMode(button.dataset.mode));
      button.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const tabs = [...document.querySelectorAll(".mode-tab")];
        const current = tabs.indexOf(event.currentTarget);
        const next = event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length)
                % tabs.length;
        setMode(tabs[next].dataset.mode);
        tabs[next].focus();
      });
    });
    document.querySelector("#start-tour").addEventListener("click", startTour);
    document.querySelector("#tour-exit").addEventListener("click", () => closeTour());
    document.querySelector("#tour-back").addEventListener("click", () => {
      showTourStep(state.tourStep - 1);
    });
    document.querySelector("#tour-next").addEventListener("click", () => {
      if (state.tourStep === TOUR_STEPS.length - 1) {
        closeTour(true);
      } else {
        showTourStep(state.tourStep + 1);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (document.querySelector("#tour-overlay").hidden) return;
      if (event.key === "Tab") {
        const focusable = [
          ...document.querySelector("#tour-card").querySelectorAll("button:not(:disabled)")
        ];
        const current = focusable.indexOf(document.activeElement);
        const next = event.shiftKey
          ? (current - 1 + focusable.length) % focusable.length
          : (current + 1) % focusable.length;
        event.preventDefault();
        focusable[next].focus();
        return;
      }
      if (event.key === "Escape") closeTour();
      if (event.key === "ArrowLeft") showTourStep(state.tourStep - 1);
      if (event.key === "ArrowRight") {
        if (state.tourStep === TOUR_STEPS.length - 1) closeTour(true);
        else showTourStep(state.tourStep + 1);
      }
    });
    document.addEventListener("keydown", async (event) => {
      if (!document.querySelector("#tour-overlay").hidden) return;
      if (state.mode !== "asset") return;
      if (["INPUT", "SELECT", "BUTTON", "TEXTAREA"].includes(event.target.tagName)) return;
      const commandKey = event.ctrlKey || event.metaKey;
      if (
        commandKey
        && (
          event.key.toLowerCase() === "y"
          || (event.key.toLowerCase() === "z" && event.shiftKey)
        )
      ) {
        event.preventDefault();
        await redoCompositionChange();
        return;
      }
      if (commandKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        await undoCompositionChange();
        return;
      }
      if (event.repeat) return;
      const offsets = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const offset = offsets[event.key];
      const layer = selectedLayer();
      if (!offset || !layer) return;
      event.preventDefault();
      const step = event.shiftKey ? 0.05 : 0.01;
      const keyframe = positionKeyframeAtPlayhead(layer);
      keyframe.x = Math.max(-2, Math.min(2, keyframe.x + offset[0] * step));
      keyframe.y = Math.max(-2, Math.min(2, keyframe.y + offset[1] * step));
      document.querySelector("#key-x").value = keyframe.x.toFixed(3);
      document.querySelector("#key-y").value = keyframe.y.toFixed(3);
      drawAsset();
      await saveComposition();
    });

    canvases.drawing.addEventListener("pointerdown", (event) => {
      if (state.strokes.length >= state.limits.maxStrokes) {
        document.querySelector("#create-error").textContent =
          "Drawing reached the safe stroke limit. Transform or clear it before continuing.";
        return;
      }
      canvases.drawing.setPointerCapture(event.pointerId);
      state.activeStroke = [];
      addPointerPoint(event);
      drawInput();
    });
    canvases.drawing.addEventListener("pointermove", (event) => {
      if (!state.activeStroke) return;
      const events = event.getCoalescedEvents ? event.getCoalescedEvents() : [event];
      events.forEach(addPointerPoint);
      drawInput();
    });
    canvases.drawing.addEventListener("pointerup", (event) => {
      addPointerPoint(event);
      if (state.activeStroke.length >= 2) state.strokes.push(state.activeStroke);
      state.activeStroke = null;
      drawInput();
    });
    canvases.drawing.addEventListener("pointercancel", () => {
      state.activeStroke = null;
      drawInput();
    });

    canvases.asset.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || state.mode !== "asset") return;
      const point = assetPointerPoint(event);
      const layer = hitTestLayer(point);
      state.selectedLayerId = layer?.id ?? null;
      renderTimeline();
      syncLayerEditor();
      drawAsset();
      if (!layer) return;

      state.compositionPlaying = false;
      document.querySelector("#asset-play").textContent = "Play";
      canvases.asset.setPointerCapture(event.pointerId);
      const value = evaluateLayer(layer, state.compositionTime);
      state.dragLayer = {
        pointerId: event.pointerId,
        layerId: layer.id,
        start: point,
        startX: value.x,
        startY: value.y,
        keyframe: null,
        moved: false,
      };
    });
    canvases.asset.addEventListener("pointermove", (event) => {
      const point = assetPointerPoint(event);
      if (!state.dragLayer) {
        canvases.asset.classList.toggle("layer-target", Boolean(hitTestLayer(point)));
        return;
      }
      const drag = state.dragLayer;
      const distance = Math.hypot(point.x - drag.start.x, point.y - drag.start.y);
      if (!drag.moved && distance < 2) return;
      const layer = state.composition.layers.find((item) => item.id === drag.layerId);
      if (!layer) return;
      if (!drag.keyframe) drag.keyframe = positionKeyframeAtPlayhead(layer);
      drag.moved = true;
      canvases.asset.classList.add("layer-dragging");
      const rect = canvases.asset.getBoundingClientRect();
      drag.keyframe.x = Math.max(-2, Math.min(
        2,
        drag.startX + (point.x - drag.start.x) / (rect.width * 0.35)
      ));
      drag.keyframe.y = Math.max(-2, Math.min(
        2,
        drag.startY + (point.y - drag.start.y) / (rect.height * 0.35)
      ));
      document.querySelector("#key-x").value = drag.keyframe.x.toFixed(3);
      document.querySelector("#key-y").value = drag.keyframe.y.toFixed(3);
      drawAsset();
    });
    canvases.asset.addEventListener("pointerup", async (event) => {
      if (state.dragLayer?.pointerId !== event.pointerId) return;
      canvases.asset.releasePointerCapture(event.pointerId);
      await finishLayerDrag();
    });
    canvases.asset.addEventListener("pointercancel", finishLayerDrag);
    canvases.asset.addEventListener("pointerleave", () => {
      if (!state.dragLayer) canvases.asset.classList.remove("layer-target");
    });

    document.querySelector("#undo-stroke").addEventListener("click", () => {
      state.strokes.pop();
      drawInput();
    });
    document.querySelector("#clear-drawing").addEventListener("click", () => {
      state.strokes = [];
      state.activeStroke = null;
      drawInput();
    });
    document.querySelector("#term-limit").addEventListener("input", (event) => {
      document.querySelector("#term-limit-value").textContent = event.target.value;
    });
    document.querySelector("#transform-drawing").addEventListener("click", transformDrawing);

    document.querySelector("#play").addEventListener("click", () => {
      state.userEnabledMotion = true;
      patchSeries({ runtime: { playing: !state.series.runtime.playing } });
    });
    document.querySelector("#speed").addEventListener("input", (event) => {
      state.series.runtime.speed = Number(event.target.value);
    });
    document.querySelector("#speed").addEventListener("change", (event) => {
      patchSeries({ runtime: { speed: Number(event.target.value) } });
    });
    document.querySelector("#preset").addEventListener("change", (event) => {
      if (event.target.value) patchSeries({ preset: event.target.value });
      event.target.value = "";
    });
    document.querySelector("#copy-endpoint").addEventListener("click", (event) => {
      copyText(event.currentTarget, document.querySelector("#endpoint").textContent);
    });

    document.querySelector("#asset-play").addEventListener("click", async (event) => {
      state.compositionPlaying = !state.compositionPlaying;
      state.staticFinal = false;
      if (state.compositionPlaying && state.soundEnabled) {
        await ensureAudio();
      }
      if (
        state.compositionPlaying
        && state.composition
        && state.compositionTime >= state.composition.duration
      ) {
        setCompositionTime(0);
      }
      event.currentTarget.textContent = state.compositionPlaying ? "Pause" : "Play";
    });
    document.querySelector("#sound-toggle").addEventListener("click", async (event) => {
      state.soundEnabled = !state.soundEnabled;
      event.currentTarget.textContent = state.soundEnabled ? "Sound on" : "Sound off";
      event.currentTarget.setAttribute("aria-pressed", String(state.soundEnabled));
      if (state.soundEnabled) await ensureAudio();
    });
    document.querySelector("#undo-composition").addEventListener(
      "click",
      undoCompositionChange
    );
    document.querySelector("#redo-composition").addEventListener(
      "click",
      redoCompositionChange
    );
    document.querySelector("#static-final").addEventListener("click", () => {
      if (!state.composition) return;
      state.compositionPlaying = false;
      state.staticFinal = true;
      document.querySelector("#asset-play").textContent = "Play";
      setCompositionTime(state.composition.duration);
    });
    document.querySelector("#composition-time").addEventListener("input", (event) => {
      state.compositionPlaying = false;
      state.staticFinal = false;
      document.querySelector("#asset-play").textContent = "Play";
      setCompositionTime(Number(event.target.value));
    });
    document.querySelector("#asset-speed").addEventListener("input", (event) => {
      state.assetSpeed = Number(event.target.value);
    });
    document.querySelector("#add-layer").addEventListener("click", async () => {
      try {
        await addLayer(document.querySelector("#asset-library").value);
      } catch (error) {
        document.querySelector("#composition-error").textContent = error.message;
      }
    });
    document.querySelector("#save-keyframe").addEventListener("click", async () => {
      const layer = selectedLayer();
      if (!layer) return;
      layer.keyframes = layer.keyframes.filter(
        (keyframe) => Math.abs(keyframe.time - state.compositionTime) >= 0.005
      );
      layer.keyframes.push(editorKeyframe());
      layer.keyframes.sort((left, right) => left.time - right.time);
      await saveComposition();
    });
    document.querySelector("#remove-keyframe").addEventListener("click", async () => {
      const layer = selectedLayer();
      if (!layer) return;
      layer.keyframes = layer.keyframes.filter(
        (keyframe) => Math.abs(keyframe.time - state.compositionTime) >= 0.005
      );
      await saveComposition();
    });
    for (const id of [
      "motion-enabled",
      "motion-amount",
      "motion-speed",
      "motion-detail",
    ]) {
      document.querySelector("#" + id).addEventListener("input", previewMotionFromEditor);
    }
    document.querySelector("#save-motion").addEventListener("click", async () => {
      previewMotionFromEditor();
      const layer = selectedLayer();
      const preview = layer ? state.motionPreviews.get(layer.id) : null;
      if (!layer || !preview) return;
      layer.motion = preview;
      state.motionPreviews.delete(layer.id);
      if (await saveComposition()) {
        document.querySelector("#motion-status").textContent =
          "Saved line life on " + layer.name + ".";
      }
    });
    document.querySelector("#preview-audio").addEventListener(
      "click",
      previewAudioFromEditor
    );
    document.querySelector("#save-audio").addEventListener("click", async () => {
      const layer = selectedLayer();
      if (!layer) return;
      const audio = audioFromEditor(layer);
      if (!audio) return;
      layer.audio = audio;
      state.audioPreviews.delete(layer.id);
      if (await saveComposition()) {
        document.querySelector("#audio-status").textContent =
          "Saved spectral cue on " + layer.name + ".";
        renderTimeline();
      }
    });
    document.querySelector("#delete-layer").addEventListener("click", async () => {
      if (!state.composition || !state.selectedLayerId) return;
      state.composition.layers = state.composition.layers.filter(
        (layer) => layer.id !== state.selectedLayerId
      );
      state.selectedLayerId = state.composition.layers[0]?.id ?? null;
      await saveComposition();
    });
    for (const id of ["layer-start", "layer-end"]) {
      document.querySelector("#" + id).addEventListener("change", async () => {
        const layer = selectedLayer();
        if (!layer) return;
        const start = Number(document.querySelector("#layer-start").value);
        const end = Number(document.querySelector("#layer-end").value);
        layer.start = Math.max(0, Math.min(start, state.composition.duration));
        layer.end = Math.max(layer.start, Math.min(end, state.composition.duration));
        await saveComposition();
      });
    }
    document.querySelector("#copy-asset").addEventListener("click", (event) => {
      if (state.composition) {
        copyText(event.currentTarget, JSON.stringify(state.composition, null, 2));
      }
    });
    document.querySelector("#download-asset").addEventListener("click", downloadAsset);

    window.addEventListener("resize", () => {
      drawInput();
      renderTimeline();
      drawSeriesSpectrum();
      positionTour();
    });
    window.addEventListener("scroll", positionTour, true);

    function animate(now) {
      const delta = Math.min(0.1, (now - state.lastFrame) / 1000);
      state.lastFrame = now;
      if (
        state.series?.runtime.playing
        && (!reduceMotion || state.userEnabledMotion)
      ) {
        state.seriesPhase += delta * state.series.runtime.speed * Math.PI * 2;
      }
      if (!state.staticFinal && !reduceMotion) {
        state.ambientTime += delta;
      }
      if (state.composition && state.compositionPlaying) {
        const previousTime = state.compositionTime;
        const nextTime = state.compositionTime + delta * state.assetSpeed;
        const wrapped = nextTime >= state.composition.duration;
        const resolvedTime = wrapped
          ? nextTime - state.composition.duration
          : nextTime;
        setCompositionTime(resolvedTime, false);
        triggerAudioCues(previousTime, resolvedTime, wrapped);
      }
      drawWaveform();
      drawAsset();
      requestAnimationFrame(animate);
    }

    initialize().catch((error) => {
      document.querySelector("#connection").textContent = error.message;
    });
    requestAnimationFrame(animate);
  </script>
</body>
</html>`;
}
