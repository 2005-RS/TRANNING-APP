/**
 * WebGL renderer for the ambient trace field on the public home and login
 * heroes (docs/frontend/motion-and-3d.md#ambient-trace-field).
 *
 * A stack of hairline traces rises into soft ridges around a focus point; each
 * ridge hides the traces behind it. Colors come from design tokens, so nothing
 * here hardcodes the palette.
 */

export type Rgb = readonly [number, number, number];

export type TraceFieldPalette = {
  background: Rgb;
  line: Rgb;
  accent: Rgb;
};

/** A box in CSS px, relative to the canvas: left, top, right, bottom. */
export type TraceFieldBox = readonly [number, number, number, number];

/** Far outside any canvas, so nothing is cleared. */
export const NO_CLEAR_BOX: TraceFieldBox = [-10000, -10000, -9999, -9999];

export type TraceFieldScene = {
  focusX: number;
  focusY: number;
  intensity: number;
  /** Ridge height multiplier; lower on narrow screens. */
  heightScale: number;
  /** Where text sits; traces fade out around it. */
  clear: TraceFieldBox;
};

export type TraceFieldPhases = readonly [number, number, number, number];

export type TraceFieldRenderer = {
  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void;
  draw(phases: TraceFieldPhases, palette: TraceFieldPalette, scene: TraceFieldScene): void;
  dispose(releaseContext: boolean): void;
};

const TAU = Math.PI * 2;

/** Angular speeds in rad/s: three ridge harmonics, then the cadence wave. */
const PHASE_SPEEDS = [0.21, -0.33, 0.52, 0.6] as const;

/** Seconds into the animation used for the reduced-motion still frame. */
export const STILL_FRAME_SECONDS = 37;

/**
 * Phases are wrapped in JS so the shader only sees values in [0, 2π). That
 * keeps the motion smooth on GPUs that only offer mediump floats.
 */
export function phasesAt(seconds: number): TraceFieldPhases {
  const wrap = (speed: number) => {
    const angle = (seconds * speed) % TAU;
    return angle < 0 ? angle + TAU : angle;
  };
  return [
    wrap(PHASE_SPEEDS[0]),
    wrap(PHASE_SPEEDS[1]),
    wrap(PHASE_SPEEDS[2]),
    wrap(PHASE_SPEEDS[3]),
  ];
}

/** Hairlines need a sharp canvas, but not at any GPU cost. */
export function capDevicePixelRatio(cssWidth: number, devicePixelRatio: number): number {
  const cap = cssWidth < 768 ? 1.5 : 2;
  const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(Math.max(ratio, 1), cap);
}

export function parseCssRgb(value: string): Rgb | null {
  const text = value.trim();

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text)?.[1];
  if (hex) {
    const full = hex.length === 3 ? hex.replace(/./g, (digit) => digit + digit) : hex;
    const hexChannel = (start: number) => parseInt(full.slice(start, start + 2), 16) / 255;
    return [hexChannel(0), hexChannel(2), hexChannel(4)];
  }

  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(text);
  if (rgb) {
    const unit = (channel: string | undefined) => Math.min(Math.max(Number(channel) / 255, 0), 1);
    const color: Rgb = [unit(rgb[1]), unit(rgb[2]), unit(rgb[3])];
    if (color.every(Number.isFinite)) {
      return color;
    }
  }

  return null;
}

/** Relative luminance, used to soften the traces on light backgrounds. */
export function luminance([r, g, b]: Rgb): number {
  const linear = (channel: number) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

let rasterCanvas: HTMLCanvasElement | null = null;

/** Any CSS color (oklch, color-mix, …) becomes sRGB by painting one pixel. */
function rasterizeColor(value: string): Rgb | null {
  rasterCanvas ??= document.createElement('canvas');
  rasterCanvas.width = 1;
  rasterCanvas.height = 1;
  const context = rasterCanvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return null;
  }
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = '#000';
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const pixel = context.getImageData(0, 0, 1, 1).data;
  return [(pixel[0] ?? 0) / 255, (pixel[1] ?? 0) / 255, (pixel[2] ?? 0) / 255];
}

function readTokenRgb(token: string, scope: Element = document.body): Rgb | null {
  const probe = document.createElement('span');
  probe.style.display = 'none';
  probe.style.color = `var(${token})`;
  // Probe inside the field's own container so scoped token overrides apply.
  scope.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  return parseCssRgb(computed) ?? rasterizeColor(computed);
}

export function readTraceFieldPalette(scope?: Element | null): TraceFieldPalette | null {
  const root = scope ?? document.body;
  const background = readTokenRgb('--background', root);
  const line = readTokenRgb('--muted-foreground', root);
  const accent = readTokenRgb('--primary', root);
  if (!background || !line || !accent) {
    return null;
  }
  return { background, line, accent };
}

const VERTEX_SOURCE = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SOURCE = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_dpr;
uniform vec4 u_phase;
uniform vec3 u_background;
uniform vec3 u_line;
uniform vec3 u_accent;
uniform vec2 u_focus;
uniform float u_intensity;
uniform float u_height_scale;
uniform vec4 u_clear;

const float SPACING = 13.0;
const float MAX_HEIGHT = 132.0;
const int LOOKAHEAD = 11;
const float HALF_WIDTH = 0.55;
const float CLEAR_MARGIN = 20.0;
const float CLEAR_FADE = 96.0;

float hash(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float envelope(vec2 point) {
  vec2 d = (point - u_focus) / vec2(0.3, 0.46);
  return exp(-dot(d, d));
}

float ridge(float x, float line) {
  float a = hash(line + 1.0) * 6.2831853;
  float b = hash(line + 17.0) * 6.2831853;
  float c = hash(line + 43.0) * 6.2831853;
  float n = 0.55 * sin(x * 6.5 + u_phase.x + a)
          + 0.30 * sin(x * 13.0 + u_phase.y + b)
          + 0.15 * sin(x * 27.0 + u_phase.z + c);
  return pow(0.5 + 0.5 * n, 3.0);
}

void main() {
  vec2 size = u_resolution / u_dpr;
  vec2 px = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) / u_dpr;
  vec2 uv = px / size;
  float feather = 1.0 / u_dpr;
  float first = floor(px.y / SPACING);

  float maxHeight = MAX_HEIGHT * u_height_scale;

  // Tallest ridge this column can reach; lines further below cannot cover it.
  float dx = (uv.x - u_focus.x) / 0.3;
  float reach = maxHeight * exp(-dx * dx) + SPACING;

  // Traces step aside around the text box so copy stays readable.
  vec2 outside = max(max(u_clear.xy - px, px - u_clear.zw), 0.0);
  float clearMask = smoothstep(CLEAR_MARGIN, CLEAR_MARGIN + CLEAR_FADE, length(outside));

  vec3 color = u_background;
  for (int k = LOOKAHEAD; k >= 0; k--) {
    if (float(k) * SPACING > reach) {
      continue;
    }
    float line = first + float(k);
    float base = line * SPACING;
    float env = envelope(vec2(uv.x, base / size.y));
    float height = 0.0;
    if (env > 0.01) {
      float cadence = 0.72 + 0.28 * sin(u_phase.w - line * 0.34);
      height = maxHeight * env * cadence * ridge(uv.x, line);
    }
    float curve = base - height;
    if (px.y >= curve - (HALF_WIDTH + feather)) {
      float stroke = 1.0 - smoothstep(HALF_WIDTH, HALF_WIDTH + feather, abs(px.y - curve));
      float presence = smoothstep(0.04, 0.55, env) * clearMask;
      float crest = smoothstep(0.3, 1.0, height / (maxHeight * 0.62));
      vec3 ink = mix(u_line, u_accent, crest);
      float alpha = stroke * presence * u_intensity * mix(0.35, 1.0, crest);
      color = mix(u_background, ink, alpha);
      break;
    }
  }

  float fade = smoothstep(0.0, 0.08, uv.y) * (1.0 - smoothstep(0.9, 1.0, uv.y));
  gl_FragColor = vec4(mix(u_background, color, fade), 1.0);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Returns null when WebGL is unavailable or the shader cannot compile. Callers
 * keep the CSS atmosphere in that case; nothing depends on the canvas.
 */
export function createTraceFieldRenderer(canvas: HTMLCanvasElement): TraceFieldRenderer | null {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: 'low-power',
  });
  if (!gl || gl.isContextLost()) {
    return null;
  }

  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SOURCE);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) {
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return null;
  }

  // One triangle that covers the whole viewport.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const locations = {
    resolution: uniform('u_resolution'),
    dpr: uniform('u_dpr'),
    phase: uniform('u_phase'),
    background: uniform('u_background'),
    line: uniform('u_line'),
    accent: uniform('u_accent'),
    focus: uniform('u_focus'),
    intensity: uniform('u_intensity'),
    heightScale: uniform('u_height_scale'),
    clear: uniform('u_clear'),
  };

  let effectiveDpr = 1;

  return {
    resize(cssWidth, cssHeight, devicePixelRatio) {
      const width = Math.max(1, Math.round(cssWidth * devicePixelRatio));
      const height = Math.max(1, Math.round(cssHeight * devicePixelRatio));
      if (canvas.width !== width) {
        canvas.width = width;
      }
      if (canvas.height !== height) {
        canvas.height = height;
      }
      effectiveDpr = cssWidth > 0 ? width / cssWidth : devicePixelRatio;
    },
    draw(phases, palette, scene) {
      if (gl.isContextLost()) {
        return;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.uniform2f(locations.resolution, canvas.width, canvas.height);
      gl.uniform1f(locations.dpr, effectiveDpr);
      gl.uniform4f(locations.phase, phases[0], phases[1], phases[2], phases[3]);
      gl.uniform3f(locations.background, ...palette.background);
      gl.uniform3f(locations.line, ...palette.line);
      gl.uniform3f(locations.accent, ...palette.accent);
      gl.uniform2f(locations.focus, scene.focusX, scene.focusY);
      gl.uniform1f(locations.intensity, scene.intensity);
      gl.uniform1f(locations.heightScale, scene.heightScale);
      gl.uniform4f(locations.clear, ...scene.clear);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose(releaseContext) {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (releaseContext) {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    },
  };
}
