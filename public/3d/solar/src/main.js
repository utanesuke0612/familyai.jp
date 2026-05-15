const canvas = document.getElementById("scene");
// Rev40 (M1 Chrome / Safari 対策): preserveDrawingBuffer: true で前フレームの
// drawing buffer を保持する。これで Metal GPU の compositing で「未初期化
// メモリ (灰色矩形タイルゴミ)」が露出する症状を防ぐ。
// 軽微なメモリ帯域コストはあるが、9 天体の小規模シーンでは無視可能。
const gl = canvas.getContext("webgl", {
  antialias:              true,
  alpha:                  false,
  preserveDrawingBuffer:  true,
  premultipliedAlpha:     true,
  powerPreference:        "default",
});
const labelLayer = document.getElementById("labels");

if (!gl) {
  throw new Error("WebGL is not available in this browser.");
}

const TAU = Math.PI * 2;
const textureRoot = "./assets/textures/";

const bodies = [
  {
    key: "sun",
    name: "太陽",
    english: "Sun",
    radius: 1.35,
    orbit: 0,
    texture: "sun_surface.png",
    spin: 0.08,
    orbitSpeed: 0,
    emissive: 1.0,
    copy: "太陽系の中心にある恒星です。明るい炎のようなテクスチャで、表面活動の印象を表現しています。",
  },
  {
    key: "mercury",
    name: "水星",
    english: "Mercury",
    radius: 0.16,
    orbit: 2.25,
    texture: "mercury_surface.png",
    spin: 0.8,
    orbitSpeed: 0.62,
    copy: "太陽に最も近い小型の岩石惑星です。灰色のクレーター模様で表面の特徴を見分けやすくしています。",
  },
  {
    key: "venus",
    name: "金星",
    english: "Venus",
    radius: 0.27,
    orbit: 3.25,
    texture: "venus_surface.png",
    spin: -0.35,
    orbitSpeed: 0.45,
    copy: "厚い大気と黄色い雲のテクスチャで、地球に近い大きさでも環境が大きく異なることを比較できます。",
  },
  {
    key: "earth",
    name: "地球",
    english: "Earth",
    radius: 0.3,
    orbit: 4.45,
    texture: "earth_surface.png",
    spin: 1.0,
    orbitSpeed: 0.36,
    copy: "青い海、緑の陸地、雲のテクスチャにより、生命を育む惑星の基本的な特徴を説明しやすくしています。",
    moon: true,
  },
  {
    key: "mars",
    name: "火星",
    english: "Mars",
    radius: 0.22,
    orbit: 5.65,
    texture: "mars_surface.png",
    spin: 0.95,
    orbitSpeed: 0.28,
    copy: "赤い砂塵と暗い地形模様により、岩石惑星としての火星の特徴を強調しています。",
  },
  {
    key: "jupiter",
    name: "木星",
    english: "Jupiter",
    radius: 0.78,
    orbit: 7.55,
    texture: "jupiter_surface.png",
    spin: 1.75,
    orbitSpeed: 0.18,
    copy: "太陽系で最大の惑星です。しま模様の雲帯と大赤斑が、授業で説明しやすい代表的な特徴です。",
  },
  {
    key: "saturn",
    name: "土星",
    english: "Saturn",
    radius: 0.66,
    orbit: 9.55,
    texture: "saturn_surface.png",
    ringTexture: "saturn_ring.png",
    spin: 1.45,
    orbitSpeed: 0.14,
    copy: "はっきりした環を持つ巨大ガス惑星です。透明テクスチャで環の重なりと薄さを表現しています。",
  },
  {
    key: "uranus",
    name: "天王星",
    english: "Uranus",
    radius: 0.44,
    orbit: 11.25,
    texture: "uranus_surface.png",
    spin: 0.7,
    orbitSpeed: 0.105,
    copy: "淡い青緑色の氷巨大惑星です。傾いた環を加え、自転軸の傾きを説明しやすくしています。",
    faintRing: true,
  },
  {
    key: "neptune",
    name: "海王星",
    english: "Neptune",
    radius: 0.42,
    orbit: 12.85,
    texture: "neptune_surface.png",
    spin: 0.78,
    orbitSpeed: 0.085,
    copy: "深い青色の氷巨大惑星です。暗い嵐の模様により、天王星との違いを見分けやすくしています。",
  },
];

const labelElements = new Map();
for (const body of bodies) {
  const el = document.createElement("div");
  el.className = "planet-label";
  el.textContent = body.name;
  labelLayer.appendChild(el);
  labelElements.set(body.key, el);
}

const mat4 = {
  identity() {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  },
  multiply(a, b) {
    const out = new Array(16);
    for (let col = 0; col < 4; col += 1) {
      for (let row = 0; row < 4; row += 1) {
        out[col * 4 + row] =
          a[0 * 4 + row] * b[col * 4 + 0] +
          a[1 * 4 + row] * b[col * 4 + 1] +
          a[2 * 4 + row] * b[col * 4 + 2] +
          a[3 * 4 + row] * b[col * 4 + 3];
      }
    }
    return out;
  },
  perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  },
  lookAt(eye, center, up) {
    const z = normalize(sub(eye, center));
    const x = normalize(cross(up, z));
    const y = cross(z, x);
    return [
      x[0],
      y[0],
      z[0],
      0,
      x[1],
      y[1],
      z[1],
      0,
      x[2],
      y[2],
      z[2],
      0,
      -dot(x, eye),
      -dot(y, eye),
      -dot(z, eye),
      1,
    ];
  },
  translate(m, v) {
    const t = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, v[0], v[1], v[2], 1];
    return mat4.multiply(m, t);
  },
  rotateY(m, r) {
    const c = Math.cos(r);
    const s = Math.sin(r);
    return mat4.multiply(m, [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
  },
  rotateX(m, r) {
    const c = Math.cos(r);
    const s = Math.sin(r);
    return mat4.multiply(m, [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
  },
  scale(m, v) {
    return mat4.multiply(m, [v[0], 0, 0, 0, 0, v[1], 0, 0, 0, 0, v[2], 0, 0, 0, 0, 1]);
  },
};

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(v) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function transformPoint(m, p) {
  const x = p[0];
  const y = p[1];
  const z = p[2];
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  return [
    (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
    (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
    (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
    w,
  ];
}

function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

function createProgram(vertex, fragment) {
  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }
  return program;
}

const texturedProgram = createProgram(
  `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec2 aUv;
  uniform mat4 uMvp;
  uniform mat4 uModel;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vec4 world = uModel * vec4(aPosition, 1.0);
    vWorld = world.xyz;
    vNormal = mat3(uModel) * aNormal;
    vUv = aUv;
    gl_Position = uMvp * vec4(aPosition, 1.0);
  }
`,
  `
  precision mediump float;
  uniform sampler2D uTexture;
  uniform vec3 uLight;
  uniform float uEmissive;
  uniform float uAlpha;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vec3 normal = normalize(vNormal);
    float diffuse = max(dot(normal, normalize(uLight)), 0.0);
    float rim = pow(1.0 - max(dot(normal, normalize(vec3(0.0, 0.35, 1.0))), 0.0), 2.0);
    vec4 tex = texture2D(uTexture, vUv);
    vec3 lit = tex.rgb * (0.28 + diffuse * 0.82) + rim * 0.12;
    vec3 color = mix(lit, tex.rgb * (1.15 + uEmissive * 0.45), uEmissive);
    gl_FragColor = vec4(color, tex.a * uAlpha);
  }
`,
);

const lineProgram = createProgram(
  `
  attribute vec3 aPosition;
  uniform mat4 uMvp;
  void main() {
    gl_Position = uMvp * vec4(aPosition, 1.0);
    // Rev40 (M1 Mac 灰色矩形フリッカ修正・真因):
    // gl_PointSize 未設定だと Apple Silicon の Metal バックエンドで
    // 未定義動作となり、POINTS 描画が巨大矩形になる。明示することで
    // 軌道線 (LINE_STRIP) では無視され、星 (POINTS) では 1.5px の点になる。
    gl_PointSize = 1.5;
  }
`,
  `
  precision mediump float;
  uniform vec4 uColor;
  void main() {
    gl_FragColor = uColor;
  }
`,
);

function programLocations(program, names) {
  const result = {};
  for (const name of names.attributes) result[name] = gl.getAttribLocation(program, name);
  for (const name of names.uniforms) result[name] = gl.getUniformLocation(program, name);
  return result;
}

const texLoc = programLocations(texturedProgram, {
  attributes: ["aPosition", "aNormal", "aUv"],
  uniforms: ["uMvp", "uModel", "uTexture", "uLight", "uEmissive", "uAlpha"],
});
const lineLoc = programLocations(lineProgram, {
  attributes: ["aPosition"],
  uniforms: ["uMvp", "uColor"],
});

function createBuffer(data, itemSize, target = gl.ARRAY_BUFFER) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(target, buffer);
  gl.bufferData(target, data, gl.STATIC_DRAW);
  return { buffer, itemSize, count: data.length / itemSize };
}

function createSphere(segments = 64, rings = 32) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (let y = 0; y <= rings; y += 1) {
    const v = y / rings;
    const theta = v * Math.PI;
    for (let x = 0; x <= segments; x += 1) {
      const u = x / segments;
      const phi = u * TAU;
      const sx = Math.sin(theta) * Math.cos(phi);
      const sy = Math.cos(theta);
      const sz = Math.sin(theta) * Math.sin(phi);
      positions.push(sx, sy, sz);
      normals.push(sx, sy, sz);
      uvs.push(u, v);
    }
  }
  for (let y = 0; y < rings; y += 1) {
    for (let x = 0; x < segments; x += 1) {
      const a = y * (segments + 1) + x;
      const b = a + 1;
      const c = (y + 1) * (segments + 1) + x;
      const d = c + 1;
      if (y !== 0) indices.push(a, c, b);
      if (y !== rings - 1) indices.push(b, c, d);
    }
  }
  return {
    position: createBuffer(new Float32Array(positions), 3),
    normal: createBuffer(new Float32Array(normals), 3),
    uv: createBuffer(new Float32Array(uvs), 2),
    index: createBuffer(new Uint16Array(indices), 1, gl.ELEMENT_ARRAY_BUFFER),
    indexCount: indices.length,
  };
}

function createRing(inner = 1, outer = 1.55, segments = 160) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segments; i += 1) {
    const u = i / segments;
    const a = u * TAU;
    const c = Math.cos(a);
    const s = Math.sin(a);
    positions.push(inner * c, 0, inner * s, outer * c, 0, outer * s);
    normals.push(0, 1, 0, 0, 1, 0);
    uvs.push(u, 0, u, 1);
  }
  for (let i = 0; i < segments; i += 1) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  return {
    position: createBuffer(new Float32Array(positions), 3),
    normal: createBuffer(new Float32Array(normals), 3),
    uv: createBuffer(new Float32Array(uvs), 2),
    index: createBuffer(new Uint16Array(indices), 1, gl.ELEMENT_ARRAY_BUFFER),
    indexCount: indices.length,
  };
}

function createOrbit(radius, segments = 256) {
  const positions = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * TAU;
    positions.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
  }
  return createBuffer(new Float32Array(positions), 3);
}

function loadTexture(url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([80, 95, 120, 255]));
  const image = new Image();
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    if (isPowerOfTwo(image.width) && isPowerOfTwo(image.height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  };
  image.src = url;
  return texture;
}

function isPowerOfTwo(value) {
  return (value & (value - 1)) === 0;
}

const sphere = createSphere(72, 36);
const lowSphere = createSphere(40, 20);
const saturnRing = createRing(1.22, 2.05);
const uranusRing = createRing(1.16, 1.5);
const orbitBuffers = bodies.filter((b) => b.orbit > 0).map((b) => [b.key, createOrbit(b.orbit)]);
const textures = new Map();
for (const body of bodies) textures.set(body.key, loadTexture(textureRoot + body.texture));
textures.set("saturnRing", loadTexture(textureRoot + "saturn_ring.png"));

// Rev40: 背景色 (gl.clearColor) を可変にし、親フレームから postMessage で変更できるようにする
let clearColor = [0.012, 0.022, 0.042];  // 既定: 深い宇宙ネイビー

function hexToGlColor(hex) {
  const h = String(hex).replace('#', '');
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return null;
  return [r / 255, g / 255, b / 255];
}

// 親フレームからの背景色変更指示を受け取る (同一オリジン限定)
window.addEventListener('message', (event) => {
  if (event.origin !== location.origin) return;
  const data = event.data;
  if (!data || data.type !== 'solar:setBg') return;
  const next = hexToGlColor(data.color);
  if (!next) return;
  clearColor = next;
});

let paused = false;
let showLabels = true;
let showOrbits = true;
let speed = 1.2;
let selected = bodies.find((b) => b.key === "earth");
let yaw = -0.34;
let pitch = 0.58;
let distance = 23.5;
let dragging = false;
let lastPointer = [0, 0];
let simTime = 0;
let lastTime = performance.now();
let projection = mat4.identity();
let view = mat4.identity();
let viewProjection = mat4.identity();
const positions = new Map();

// Rev40: info-panel を撤去したため null になりうる。後方互換のため guard 付きで参照する。
const selectedName = document.getElementById("selectedName");
const selectedCopy = document.getElementById("selectedCopy");

function setSelected(body) {
  selected = body;
  if (selectedName) selectedName.textContent = body.name;
  if (selectedCopy) selectedCopy.textContent = body.copy;

  // 親フレーム (Next.js / ModelDetailClient) に通知する。
  // 同一オリジンのみ受信させるため、targetOrigin に明示的に location.origin を渡す。
  // (location.origin はこの iframe を配信した familyai.jp となる)
  if (window.parent && window.parent !== window) {
    try {
      window.parent.postMessage(
        {
          type: 'solar:select',
          body: {
            key:     body.key,
            name:    body.name,
            english: body.english,
            copy:    body.copy,
          },
        },
        location.origin,
      );
    } catch (err) {
      // postMessage 失敗 (sandbox 等) は致命ではないので握りつぶす
    }
  }
}

document.getElementById("toggleMotion").addEventListener("click", (event) => {
  paused = !paused;
  event.currentTarget.textContent = paused ? "再生" : "一時停止";
});
document.getElementById("toggleLabels").addEventListener("click", () => {
  showLabels = !showLabels;
  labelLayer.style.display = showLabels ? "block" : "none";
});
document.getElementById("toggleOrbits").addEventListener("click", () => {
  showOrbits = !showOrbits;
});
document.getElementById("resetView").addEventListener("click", () => {
  yaw = -0.34;
  pitch = 0.58;
  distance = 23.5;
});
document.getElementById("speed").addEventListener("input", (event) => {
  speed = Number(event.target.value);
});

canvas.addEventListener("pointerdown", (event) => {
  dragging = true;
  lastPointer = [event.clientX, event.clientY];
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  const dx = event.clientX - lastPointer[0];
  const dy = event.clientY - lastPointer[1];
  yaw += dx * 0.006;
  pitch = Math.max(0.16, Math.min(1.35, pitch + dy * 0.004));
  lastPointer = [event.clientX, event.clientY];
});
canvas.addEventListener("pointerup", () => {
  dragging = false;
});
canvas.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    distance = Math.max(5.5, Math.min(28, distance + event.deltaY * 0.012));
  },
  { passive: false },
);

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const pointer = [event.clientX - rect.left, event.clientY - rect.top];
  let closest = null;
  let closestDistance = 42;
  for (const body of bodies) {
    const pos = positions.get(body.key);
    if (!pos) continue;
    const screen = worldToScreen([pos[0], pos[1], pos[2]]);
    if (!screen.visible) continue;
    const d = Math.hypot(screen.x - pointer[0], screen.y - pointer[1]);
    const threshold = Math.max(20, body.radius * 34);
    if (d < threshold && d < closestDistance) {
      closest = body;
      closestDistance = d;
    }
  }
  if (closest) setSelected(closest);
});

function resize() {
  // Rev40 (M1 対策): DPR 上限を 2 → 1.5 に下げる。
  // Retina (DPR=2) で 2x スケールするとフレームバッファサイズが 4 倍になり、
  // M1 GPU の Metal タイルバジェットを圧迫してタイルゴミ (灰色矩形) が
  // 発生しやすくなるため、視覚的にほぼ違いの分からない 1.5x に抑える。
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
}

function bindMesh(mesh) {
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.position.buffer);
  gl.enableVertexAttribArray(texLoc.aPosition);
  gl.vertexAttribPointer(texLoc.aPosition, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normal.buffer);
  gl.enableVertexAttribArray(texLoc.aNormal);
  gl.vertexAttribPointer(texLoc.aNormal, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uv.buffer);
  gl.enableVertexAttribArray(texLoc.aUv);
  gl.vertexAttribPointer(texLoc.aUv, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.index.buffer);
}

function drawMesh(mesh, model, texture, emissive = 0, alpha = 1) {
  const mvp = mat4.multiply(viewProjection, model);
  gl.useProgram(texturedProgram);
  bindMesh(mesh);
  gl.uniformMatrix4fv(texLoc.uMvp, false, new Float32Array(mvp));
  gl.uniformMatrix4fv(texLoc.uModel, false, new Float32Array(model));
  gl.uniform3f(texLoc.uLight, -0.4, 0.55, 0.72);
  gl.uniform1f(texLoc.uEmissive, emissive);
  gl.uniform1f(texLoc.uAlpha, alpha);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(texLoc.uTexture, 0);
  gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
}

// Rev40: 軌道線の視認性を強化。
// 旧 [0.56, 0.72, 1.0, 0.28] は淡い水色 + alpha 28% で暗背景にほぼ溶け込んでいた。
// 新 [0.96, 0.78, 0.42, 0.65] は温かいゴールド + alpha 65% で
// 太陽系の明るい雰囲気にも馴染み、暗背景でも明確に弧が見える。
function drawOrbit(buffer, color = [0.96, 0.78, 0.42, 0.65]) {
  gl.useProgram(lineProgram);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer.buffer);
  gl.enableVertexAttribArray(lineLoc.aPosition);
  gl.vertexAttribPointer(lineLoc.aPosition, 3, gl.FLOAT, false, 0, 0);
  gl.uniformMatrix4fv(lineLoc.uMvp, false, new Float32Array(viewProjection));
  gl.uniform4fv(lineLoc.uColor, new Float32Array(color));
  gl.drawArrays(gl.LINE_STRIP, 0, buffer.count);
}

function updateCamera() {
  const target = [6.25, 0.05, 0];
  const eye = [
    target[0] + Math.cos(yaw) * Math.cos(pitch) * distance,
    target[1] + Math.sin(pitch) * distance,
    target[2] + Math.sin(yaw) * Math.cos(pitch) * distance,
  ];
  projection = mat4.perspective((42 * Math.PI) / 180, canvas.width / canvas.height, 0.05, 80);
  view = mat4.lookAt(eye, target, [0, 1, 0]);
  viewProjection = mat4.multiply(projection, view);
}

function bodyPosition(body) {
  if (body.orbit === 0) return [0, 0, 0];
  const angle = simTime * body.orbitSpeed + bodies.indexOf(body) * 0.72;
  return [Math.cos(angle) * body.orbit, 0, Math.sin(angle) * body.orbit];
}

function worldToScreen(point) {
  const clip = transformPoint(viewProjection, point);
  const visible = clip[3] > 0 && clip[0] > -1.25 && clip[0] < 1.25 && clip[1] > -1.25 && clip[1] < 1.25;
  return {
    x: (clip[0] * 0.5 + 0.5) * canvas.clientWidth,
    y: (-clip[1] * 0.5 + 0.5) * canvas.clientHeight,
    z: clip[2],
    visible,
  };
}

function updateLabels() {
  const placed = [];
  for (const body of bodies) {
    const el = labelElements.get(body.key);
    const pos = positions.get(body.key);
    const lift = body.key === "sun" ? 1.15 : 0.42;
    const screen = worldToScreen([pos[0], pos[1] + body.radius + lift, pos[2]]);
    if (!showLabels || !screen.visible) {
      el.classList.add("hidden");
      continue;
    }
    el.classList.remove("hidden");
    let x = Math.max(38, Math.min(canvas.clientWidth - 38, screen.x));
    let y = Math.max(104, Math.min(canvas.clientHeight - 58, screen.y));
    const width = body.key === "uranus" || body.key === "neptune" ? 68 : 54;
    const height = 22;
    for (const box of placed) {
      const overlapX = Math.abs(x - box.x) < (width + box.width) * 0.52;
      const overlapY = Math.abs(y - box.y) < (height + box.height) * 0.8;
      if (overlapX && overlapY) y -= 26;
    }
    placed.push({ x, y, width, height });
    // Rev40 (M1 Chrome 対策): top/left は毎フレーム layout + paint を起こし、
    // WebGL canvas 上の DOM 反復更新で Metal GPU の合成タイル境界に
    // グレー矩形のフリッカリングが発生する (Apple Silicon 既知のバグ)。
    // transform: translate(...) なら composite-only で済むので回避できる。
    // CSS 側の transform: translate(-50%, -50%) は left/top: 0 で代替済み。
    el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  }
}

function drawStars(now) {
  gl.useProgram(lineProgram);
  const stars = drawStars.buffer;
  if (!stars) {
    const data = [];
    const rng = mulberry32(42);
    for (let i = 0; i < 260; i += 1) {
      const x = (rng() - 0.5) * 46;
      const y = rng() * 16 - 2;
      const z = (rng() - 0.5) * 32;
      data.push(x, y, z);
    }
    drawStars.buffer = createBuffer(new Float32Array(data), 3);
  }
  const buffer = drawStars.buffer;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer.buffer);
  gl.enableVertexAttribArray(lineLoc.aPosition);
  gl.vertexAttribPointer(lineLoc.aPosition, 3, gl.FLOAT, false, 0, 0);
  gl.uniformMatrix4fv(lineLoc.uMvp, false, new Float32Array(viewProjection));
  const twinkle = 0.38 + 0.12 * Math.sin(now * 0.001);
  gl.uniform4f(lineLoc.uColor, 0.78, 0.9, 1.0, twinkle);
  gl.drawArrays(gl.POINTS, 0, buffer.count);
}

function mulberry32(seed) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function render(now) {
  resize();
  updateCamera();

  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (!paused) simTime += dt * speed;

  // Rev40 (M1 対策): scissor test を必ず無効化し、ビューポート全域を確実にクリアする。
  // タイルゴミ (灰色矩形) は Metal ドライバが部分クリアと判断して
  // 古いタイル内容を残すパターンが原因のため、明示的に全面クリアを強制。
  gl.disable(gl.SCISSOR_TEST);
  gl.colorMask(true, true, true, true);
  gl.clearColor(clearColor[0], clearColor[1], clearColor[2], 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  drawStars(now);

  if (showOrbits) {
    for (const [, buffer] of orbitBuffers) drawOrbit(buffer);
  }

  positions.clear();
  for (const body of bodies) {
    const pos = bodyPosition(body);
    positions.set(body.key, pos);
    const mesh = body.radius > 0.5 ? sphere : lowSphere;
    let model = mat4.identity();
    model = mat4.translate(model, pos);
    model = mat4.rotateY(model, simTime * body.spin);
    model = mat4.scale(model, [body.radius, body.radius, body.radius]);
    drawMesh(mesh, model, textures.get(body.key), body.emissive || 0, 1);

    if (body.key === "earth") {
      const moonAngle = simTime * 1.9;
      const moonPos = [pos[0] + Math.cos(moonAngle) * 0.62, 0, pos[2] + Math.sin(moonAngle) * 0.62];
      let moonModel = mat4.identity();
      moonModel = mat4.translate(moonModel, moonPos);
      moonModel = mat4.rotateY(moonAngle);
      moonModel = mat4.scale(moonModel, [0.085, 0.085, 0.085]);
      drawMesh(lowSphere, moonModel, textures.get("mercury"), 0, 1);
    }

    if (body.key === "saturn") {
      let ringModel = mat4.identity();
      ringModel = mat4.translate(ringModel, pos);
      ringModel = mat4.rotateX(ringModel, 1.18);
      ringModel = mat4.scale(ringModel, [body.radius, body.radius, body.radius]);
      gl.disable(gl.CULL_FACE);
      drawMesh(saturnRing, ringModel, textures.get("saturnRing"), 0, 0.88);
      gl.enable(gl.CULL_FACE);
    }

    if (body.faintRing) {
      let ringModel = mat4.identity();
      ringModel = mat4.translate(ringModel, pos);
      ringModel = mat4.rotateX(ringModel, 0.8);
      ringModel = mat4.scale(ringModel, [body.radius, body.radius, body.radius]);
      gl.disable(gl.CULL_FACE);
      drawMesh(uranusRing, ringModel, textures.get("saturnRing"), 0, 0.28);
      gl.enable(gl.CULL_FACE);
    }
  }

  updateLabels();
  requestAnimationFrame(render);
}

gl.enable(gl.DEPTH_TEST);
requestAnimationFrame(render);
