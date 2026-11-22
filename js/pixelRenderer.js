// Pixel-art renderer with Sea-of-Stars-style lighting. Each scene is painted in three parallax layers
// (sky and far scenery, middle ground, foreground frame), then lit in real time. Torches, campfires,
// lava and spells carve light out of the darkness. Characters cast long shadows away from the key
// light and get a rim of light on the side facing it. Rain, snow, embers or ash drift through, and
// the camera pushes in on the action.

import { FLYING, OUTLINE, canvas, shade, sprite } from "./sprites.js";
import { TYPE_COLORS, Vfx } from "./vfx.js";
import { HEROES } from "./characters.js";

export { sprite, TYPE_COLORS };

// MARK: Portraits

const portraitCache = new Map();
/** A small portrait (head and shoulders) as a data URL, for dialogue and the turn timeline. */
export function portrait(key, size = 32) {
  const k = `${key}@${size}`;
  if (portraitCache.has(k)) return portraitCache.get(k);
  const f = sprite(key).frames[0];
  const [c, x] = canvas(size, size);
  const hero = !!HEROES[key];
  const crop = hero ? Math.round(f.width * 0.72) : Math.min(f.width, f.height);
  const sx = hero ? Math.round(f.width * 0.16) : Math.max(0, Math.round((f.width - crop) / 2));
  const sy = hero ? 0 : Math.max(0, Math.round((f.height - crop) / 2));
  x.drawImage(f, sx, sy, crop, crop, 0, 0, size, size);
  const url = c.toDataURL();
  portraitCache.set(k, url);
  return url;
}

// MARK: Bitmap font (3×5)

const FONT = {
  0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 3: "111001111001111", 4: "101101111001001",
  5: "111100111001111", 6: "111100111101111", 7: "111001010010010", 8: "111101111101111", 9: "111101111001111",
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
  F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010",
  K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010",
  P: "110101110100100", Q: "010101101111011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010",
  Z: "111001010100111", "+": "000010111010000", "!": "010010010000010", "-": "000000111000000", " ": "000000000000000",
  "¡": "010000010010010", "É": "111100110100111", "Í": "111010010010111", "Ó": "010101101101010", "Ú": "101101101101111", "Ñ": "111000110101101", "▲": "000010111111000", "?": "111001010000010", "▼": "000111111010000",
};

export function drawText(x, text, px, py, color, scale = 1) {
  let cx = Math.round(px - (text.length * 4 * scale) / 2);
  for (const ch of text.toUpperCase()) {
    const g = FONT[ch] ?? FONT[" "];
    for (let pass = 0; pass < 2; pass++) {
      x.fillStyle = pass ? color : OUTLINE;
      for (let k = 0; k < 15; k++) if (g[k] === "1") {
        const gx = cx + (k % 3) * scale, gy = Math.round(py) + Math.floor(k / 3) * scale;
        if (pass) x.fillRect(gx, gy, scale, scale);
        else for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) x.fillRect(gx + dx, gy + dy, scale, scale);
      }
    }
    cx += 4 * scale;
  }
}

// MARK: Scene painting helpers

function seeded(seed) { let t = seed >>> 0; return () => { t = (t * 1664525 + 1013904223) >>> 0; return t / 4294967296; }; }

/** A dithered vertical gradient between colour stops. */
function gradient(x, w, y0, y1, stops) {
  for (let y = y0; y < y1; y++) {
    const t = ((y - y0) / Math.max(1, y1 - y0 - 1)) * (stops.length - 1);
    const k = Math.min(stops.length - 2, Math.floor(t)), f = t - k;
    x.fillStyle = stops[k]; x.fillRect(0, y, w, 1);
    x.fillStyle = stops[k + 1];
    const th = (y % 2) ? 0.66 : 0.33;
    if (f > th) x.fillRect(0, y, w, 1);
    else if (f > th - 0.33) for (let i = y % 2; i < w; i += 2) x.fillRect(i, y, 1, 1);
  }
}
function disc(x, cx, cy, r, col) { x.fillStyle = col; for (let j = -r; j <= r; j++) { const half = Math.floor(Math.sqrt(r * r - j * j)); x.fillRect(cx - half, cy + j, half * 2 + 1, 1); } }
function pine(x, cx, base, h, col, snow) {
  for (let j = 0; j < h; j++) {
    const half = Math.floor((j / h) * (h * 0.32)) + (j % 4 === 0 ? 1 : 0);
    x.fillStyle = snow && j % 4 === 0 ? "#e8eef6" : col; x.fillRect(cx - half, base - h + j, half * 2 + 1, 1);
  }
}
function pines(x, w, base, col, r, minH, maxH, gap, snow) { for (let i = -6; i < w + 8; i += gap + Math.floor(r() * gap * 0.6)) pine(x, i, base, minH + Math.floor(r() * (maxH - minH)), col, snow); }
function mountains(x, w, base, col, snowCol, r, n = 6) {
  for (let k = 0; k < n; k++) {
    const mx = Math.floor((k + r() * 0.6) * (w / (n - 1))), mh = 26 + Math.floor(r() * 26);
    for (let j = 0; j < mh; j++) { x.fillStyle = snowCol && j < mh * 0.25 ? snowCol : col; x.fillRect(mx - Math.round(j * 1.3), base - mh + j, Math.round(j * 2.6) + 1, 1); }
    x.fillStyle = shade(col, -0.18); for (let j = Math.round(mh * 0.3); j < mh; j++) x.fillRect(mx + 1, base - mh + j, Math.round(j * 1.2), 1);
  }
}
function hills(x, w, base, col, amp, r) { const ph = r() * 6; x.fillStyle = col; for (let i = 0; i < w; i++) { const hh = Math.round(amp * (0.6 + 0.4 * Math.sin(i / 23 + ph) + 0.25 * Math.sin(i / 9))); x.fillRect(i, base - hh, 1, hh + 1); } }
function columns(x, w, base, col, cap, r, gap = 30) { for (let i = 8; i < w; i += gap + Math.floor(r() * 16)) { const ch = 20 + Math.floor(r() * 26); x.fillStyle = col; x.fillRect(i, base - ch, 6, ch); x.fillStyle = shade(col, -0.25); x.fillRect(i + 4, base - ch, 2, ch); x.fillStyle = cap; x.fillRect(i - 1, base - ch, 8, 3); if (r() < 0.5) { x.fillStyle = "#4a6a3a"; x.fillRect(i, base - Math.floor(ch / 2), 3, 4); } } }
function walls(x, w, base, col, top, h, crenel = true) {
  x.fillStyle = col; x.fillRect(0, base - h, w, h);
  x.fillStyle = top; x.fillRect(0, base - h, w, 2);
  if (crenel) for (let i = 0; i < w; i += 8) { x.fillStyle = col; x.fillRect(i, base - h - 4, 5, 4); x.fillStyle = top; x.fillRect(i, base - h - 4, 5, 1); }
  x.fillStyle = shade(col, -0.2); for (let j = base - h + 6; j < base; j += 6) { x.fillRect(0, j, w, 1); for (let i = (j / 6) % 2 ? 0 : 6; i < w; i += 12) x.fillRect(i, j, 1, 6); }
}
function houses(x, w, base, r, wall, roof) {
  for (let i = 4; i < w - 20; i += 28 + Math.floor(r() * 18)) {
    const hw = 16 + Math.floor(r() * 8), hh = 12 + Math.floor(r() * 6);
    x.fillStyle = wall; x.fillRect(i, base - hh, hw, hh);
    x.fillStyle = shade(wall, -0.25); x.fillRect(i + hw - 4, base - hh, 4, hh);
    x.fillStyle = roof; for (let j = 0; j < 8; j++) x.fillRect(i - 2 + j, base - hh - 8 + j, hw + 4 - j * 2, 1);
    x.fillStyle = "#ffd070"; x.fillRect(i + 4, base - hh + 4, 3, 3);
  }
}
function trunks(x, w, h, col) {
  x.fillStyle = col; x.fillRect(0, 0, 8, h); x.fillRect(w - 7, 0, 7, h); x.fillRect(4, 0, 16, 10); x.fillRect(w - 20, 0, 16, 9); x.fillRect(0, 10, 12, 4);
  x.fillStyle = shade(col, 0.15); x.fillRect(6, 14, 1, h - 14); x.fillRect(w - 6, 10, 1, h - 10);
  for (let i = 0; i < w; i += 3) { const d = 3 + Math.floor(Math.abs(Math.sin(i / 7)) * 5); x.fillStyle = col; x.fillRect(i, 0, 3, d); }
}
function caveFrame(x, w, h, col, r) {
  x.fillStyle = col;
  for (let i = 0; i < w; i += 3) { const d = 4 + Math.floor(Math.abs(Math.sin(i / 11)) * 10 + r() * 4); x.fillRect(i, 0, 3, d); if (r() < 0.25) x.fillRect(i + 1, d, 1, 4 + Math.floor(r() * 6)); }
  if (!h) return;
  x.fillRect(0, 0, 10, h); x.fillRect(w - 10, 0, 10, h);
  for (let j = 0; j < h; j += 4) { x.fillRect(10, j, Math.floor(Math.abs(Math.sin(j / 9)) * 6), 4); x.fillRect(w - 10 - Math.floor(Math.abs(Math.cos(j / 8)) * 6), j, 6, 4); }
}
function groundNoise(x, w, y0, h, c1, c2, r) { for (let k = 0; k < w * 2; k++) { x.fillStyle = r() > 0.5 ? c1 : c2; x.fillRect(Math.floor(r() * w), y0 + Math.floor(r() * (h - y0)), 1, 1); } }
function path(x, w, h, hz, col) { x.fillStyle = col; for (let y = hz + 18; y < h; y++) { const half = 10 + (y - hz) * 0.55; x.fillRect(Math.round(w * 0.5 - half + Math.sin(y / 6) * 3), y, Math.round(half * 2), 1); } }
function stars(x, w, hz, r, n = 40) { for (let k = 0; k < n; k++) { x.fillStyle = r() > 0.5 ? "#ffffff" : "#a0b0ff"; x.fillRect(Math.floor(r() * w), Math.floor(r() * hz * 0.85), 1, 1); } }
function tiles(x, w, hz, h, col, step = 6) { x.fillStyle = col; for (let j = hz; j < h; j += step) { x.fillRect(0, j, w, 1); for (let i = (j / step) % 2 ? 0 : step; i < w; i += step * 2) x.fillRect(i, j, 1, step); } }

// MARK: Themes
// Each scene: sky, three painted layers, how dark it is, its light sources (x, y as fractions of the
// screen), the key light that shadows point away from, weather, water and colour grading.

const T = {
  bosque: {
    sky: ["#1f2a48", "#3e4a6e", "#c98a6a", "#f2c48a"], sun: "#fff0c0", dark: 0.12, key: 0.8, grade: "255,170,90", flies: true, motes: "#ffe8b0", shafts: true,
    lights: [{ x: 0.78, y: 0.12, r: 150, c: "255,200,140", a: 0.5 }],
    back: (x, w, h, r, hz) => pines(x, w, hz + 8, "#4a5a72", r, 20, 34, 6),
    mid: (x, w, h, r, hz) => { pines(x, w, hz + 16, "#2f4a3c", r, 26, 46, 9); gradient(x, w, hz + 12, h, ["#3a4a2a", "#4a5a30", "#5a4a30"]); groundNoise(x, w, hz + 12, h, "#5a6a3a", "#2a3420", r); path(x, w, h, hz, "#6a5a3a"); },
    front: (x, w, h) => trunks(x, w, h, "#1d2e26"),
  },
  titulo: {
    sky: ["#141a38", "#2a2e5a", "#7a5a7a", "#e8a070"], sun: "#fff0c0", stars: true, dark: 0.1, key: 0.8, grade: "255,180,120", flies: true, motes: "#ffe0a0", shafts: true,
    lights: [{ x: 0.78, y: 0.14, r: 160, c: "255,210,150", a: 0.5 }],
    back: (x, w, h, r, hz) => { mountains(x, w, hz - 6, "#2e3256", "#8a86a8", r, 5); pines(x, w, hz + 8, "#3a3e60", r, 20, 34, 6); },
    mid: (x, w, h, r, hz) => { pines(x, w, hz + 16, "#22303a", r, 26, 46, 9); gradient(x, w, hz + 12, h, ["#1e2a20", "#24301e", "#2a2a1e"]); path(x, w, h, hz, "#3a3424"); },
    front: (x, w, h) => trunks(x, w, h, "#141c22"),
  },
  claro: {
    sky: ["#0e1430", "#1c2450", "#2a3060", "#3a3a6a"], moon: "#f0f0ff", stars: true, dark: 0.5, key: 0.5, keyY: 0.82, grade: "255,150,80", flies: true, motes: "#ffd080",
    lights: [{ x: 0.5, y: 0.8, r: 120, c: "255,150,60", a: 1, flicker: true }, { x: 0.78, y: 0.16, r: 70, c: "200,210,255", a: 0.35 }],
    fire: [0.5, 0.82],
    back: (x, w, h, r, hz) => pines(x, w, hz + 8, "#22304a", r, 20, 34, 6),
    mid: (x, w, h, r, hz) => { pines(x, w, hz + 16, "#1a2a26", r, 26, 46, 9); gradient(x, w, hz + 12, h, ["#2a3420", "#34402a", "#3a3224"]); groundNoise(x, w, hz + 12, h, "#3a4428", "#20281a", r); },
    front: (x, w, h) => trunks(x, w, h, "#121c18"),
  },
  ruinas: {
    sky: ["#2a1e3e", "#4a3260", "#8a5a7a", "#c8907a"], moon: "#fff0c0", dark: 0.28, key: 0.78, grade: "200,170,255", motes: "#e0d0ff",
    lights: [{ x: 0.78, y: 0.14, r: 130, c: "220,200,255", a: 0.5 }],
    back: (x, w, h, r, hz) => pines(x, w, hz + 8, "#4a4060", r, 20, 30, 7),
    mid: (x, w, h, r, hz) => { columns(x, w, hz + 12, "#6a6478", "#7e7890", r); gradient(x, w, hz + 12, h, ["#3a3a30", "#4a4838", "#55503e"]); groundNoise(x, w, hz + 12, h, "#5a5848", "#2a2a22", r); },
    front: (x, w, h) => trunks(x, w, h, "#24281e"),
  },
  hondonada: {
    sky: ["#0e0814", "#1e1028", "#3a1a40", "#5a2050"], moon: "#e070ff", dark: 0.45, key: 0.78, grade: "200,80,255", motes: "#e080ff",
    lights: [{ x: 0.78, y: 0.14, r: 90, c: "220,100,255", a: 0.6 }, { x: 0.2, y: 0.9, r: 50, c: "200,60,255", a: 0.5, flicker: true }, { x: 0.82, y: 0.92, r: 46, c: "200,60,255", a: 0.5, flicker: true }],
    back: (x, w, h, r, hz) => pines(x, w, hz + 8, "#2a1a30", r, 20, 30, 7),
    mid: (x, w, h, r, hz) => {
      x.fillStyle = "#1e1424";
      for (let i = 0; i < w; i += 11 + Math.floor(r() * 7)) { const th = 26 + Math.floor(r() * 18); for (let j = 0; j < th; j++) x.fillRect(i + Math.round(Math.sin(j / 4) * 2), hz + 14 - j, 3, 1); x.fillRect(i - 4, hz + 14 - th, 11, 2); }
      gradient(x, w, hz + 12, h, ["#2a1a24", "#341e2a", "#3e2430"]);
      x.fillStyle = "#b040e0"; for (let k = 0; k < 8; k++) x.fillRect(Math.floor(r() * w), h - 8 - Math.floor(r() * 20), 1, 6);
    },
    front: (x, w, h) => trunks(x, w, h, "#140c18"),
  },
  montana: {
    sky: ["#5a6a8a", "#8a9ab8", "#c0cadc", "#e0e6f0"], sun: "#ffffff", dark: 0.05, key: 0.2, grade: "200,220,255", weather: "snow", shafts: true,
    lights: [{ x: 0.2, y: 0.1, r: 160, c: "255,255,255", a: 0.35 }, { x: 0.5, y: 0.42, r: 34, c: "140,190,255", a: 0.6 }],
    back: (x, w, h, r, hz) => mountains(x, w, hz + 8, "#7a8aa0", "#f0f4fa", r),
    mid: (x, w, h, r, hz) => {
      pines(x, w, hz + 16, "#3a4a50", r, 18, 30, 12, true);
      // The carved stone door in the mountainside, with glowing runes.
      const dx = Math.round(w * 0.5); x.fillStyle = "#5a5a66"; x.fillRect(dx - 22, hz - 26, 44, 40); x.fillStyle = "#2a2a34"; x.fillRect(dx - 12, hz - 14, 24, 28); x.fillStyle = "#8a8a9a"; x.fillRect(dx - 22, hz - 28, 44, 3); x.fillStyle = "#a0c0ff"; for (let k = 0; k < 5; k++) x.fillRect(dx - 10 + k * 5, hz - 22, 2, 2);
      gradient(x, w, hz + 12, h, ["#d8e0ec", "#c4cede", "#b0bccc"]); groundNoise(x, w, hz + 12, h, "#ffffff", "#9aa6b8", r);
    },
    front: (x, w, h, r) => caveFrame(x, w, 0, "#3a3a44", r),
  },
  minas: {
    sky: ["#0c0a10", "#16121c", "#1e1822", "#241e28"], dark: 0.62, key: 0.2, keyY: 0.45, grade: "255,170,90", motes: "#c0a080",
    lights: [{ x: 0.2, y: 0.42, r: 70, c: "255,150,60", a: 1, flicker: true }, { x: 0.8, y: 0.42, r: 70, c: "255,150,60", a: 1, flicker: true }, { x: 0.5, y: 0.3, r: 40, c: "120,200,255", a: 0.6 }],
    torches: [[0.2, 0.42], [0.8, 0.42]],
    back: (x, w, h, r, hz) => { x.fillStyle = "#1a161e"; for (let i = 0; i < w; i += 4) x.fillRect(i, hz - 10 - Math.floor(r() * 30), 4, 60); x.fillStyle = "#4ac0ff"; for (let k = 0; k < 8; k++) x.fillRect(Math.floor(r() * w), hz - Math.floor(r() * 30), 1, 2); },
    mid: (x, w, h, r, hz) => { for (let i = 18; i < w; i += 46) { x.fillStyle = "#2a242e"; x.fillRect(i, 0, 12, hz + 14); x.fillStyle = "#3a3440"; x.fillRect(i + 2, 0, 3, hz + 14); x.fillRect(i - 2, hz + 8, 16, 4); } gradient(x, w, hz + 12, h, ["#2a2428", "#322a2e", "#3a3034"]); groundNoise(x, w, hz + 12, h, "#4a4044", "#1a1418", r); },
    front: (x, w, h, r) => caveFrame(x, w, h, "#100c12", r),
  },
  forja: {
    sky: ["#140a08", "#1e100c", "#2a1610", "#3a1c12"], dark: 0.5, key: 0.5, keyY: 0.95, grade: "255,120,50", weather: "embers",
    lights: [{ x: 0.3, y: 0.95, r: 80, c: "255,110,40", a: 1, flicker: true }, { x: 0.75, y: 0.95, r: 80, c: "255,110,40", a: 1, flicker: true }],
    back: (x, w, h, r, hz) => { x.fillStyle = "#1e1210"; for (let i = 0; i < w; i += 5) x.fillRect(i, hz - 20 - Math.floor(r() * 24), 5, 60); },
    mid: (x, w, h, r, hz) => { for (const ax of [0.2, 0.55, 0.85]) { const cx = Math.round(w * ax); x.fillStyle = "#2a2226"; x.fillRect(cx - 16, hz - 4, 32, 8); x.fillRect(cx - 8, hz + 4, 16, 10); x.fillStyle = "#4a4046"; x.fillRect(cx - 16, hz - 4, 32, 2); } gradient(x, w, hz + 12, h, ["#2a1c18", "#34221c", "#3a2620"]); x.fillStyle = "#ff7a20"; x.fillRect(0, h - 6, w, 2); x.fillStyle = "#ffcc60"; x.fillRect(0, h - 5, w, 1); },
    front: (x, w, h, r) => caveFrame(x, w, h, "#120a08", r),
  },
  pozo: {
    sky: ["#060a10", "#0c121c", "#121a26", "#18202e"], dark: 0.58, key: 0.5, keyY: 0.3, grade: "100,190,255", water: 0.8, motes: "#80d0ff",
    lights: [{ x: 0.3, y: 0.4, r: 50, c: "90,200,255", a: 0.9 }, { x: 0.72, y: 0.35, r: 46, c: "90,200,255", a: 0.9 }, { x: 0.5, y: 0.85, r: 90, c: "60,140,220", a: 0.5 }],
    back: (x, w, h, r, hz) => { x.fillStyle = "#121a24"; for (let i = 0; i < w; i += 4) x.fillRect(i, hz - 14 - Math.floor(r() * 30), 4, 60); for (let k = 0; k < 14; k++) { x.fillStyle = r() < 0.5 ? "#4ac8ff" : "#a0e8ff"; const cx = Math.floor(r() * w), cy = hz - Math.floor(r() * 40); x.fillRect(cx, cy, 2, 3); x.fillRect(cx + 1, cy - 2, 1, 2); } },
    mid: (x, w, h, r, hz) => { gradient(x, w, hz + 12, h, ["#1c2430", "#202a36", "#16202c"]); groundNoise(x, w, hz + 12, Math.round(h * 0.78), "#2a3440", "#101820", r); },
    front: (x, w, h, r) => caveFrame(x, w, h, "#080c12", r),
  },
  puente: {
    sky: ["#0a0406", "#16080a", "#2a0c0c", "#4a1408"], dark: 0.42, key: 0.5, keyY: 1.1, grade: "255,90,30", weather: "embers",
    lights: [{ x: 0.5, y: 1.15, r: 170, c: "255,90,20", a: 1, flicker: true }, { x: 0.15, y: 1.0, r: 60, c: "255,120,30", a: 0.7 }, { x: 0.85, y: 1.0, r: 60, c: "255,120,30", a: 0.7 }],
    lava: 0.8,
    back: (x, w, h, r, hz) => { x.fillStyle = "#1a0c0c"; for (let i = 0; i < w; i += 4) x.fillRect(i, 0, 4, 20 + Math.floor(r() * 30)); x.fillStyle = "#2a1210"; for (let i = 0; i < w; i += 6) x.fillRect(i, hz + 20 + Math.floor(r() * 10), 6, h); },
    mid: (x, w, h, r, hz) => { gradient(x, w, hz + 22, h, ["#3a1408", "#6a2008", "#c84010", "#ff8a20"]); x.fillStyle = "#3a3034"; x.fillRect(0, hz + 10, w, 16); x.fillStyle = "#4a4044"; x.fillRect(0, hz + 10, w, 2); x.fillStyle = "#2a2226"; for (let i = 0; i < w; i += 10) x.fillRect(i, hz + 26, 6, 4); },
    front: () => {},
  },
  llanuras: {
    sky: ["#3a6ab0", "#6a9ad0", "#a8c8e8", "#e8eef0"], sun: "#fffbe0", dark: 0, key: 0.75, grade: "255,220,140", motes: "#fff0a0", windGrass: true, shafts: true, clouds: true,
    lights: [{ x: 0.75, y: 0.1, r: 180, c: "255,250,210", a: 0.4 }],
    back: (x, w, h, r, hz) => { mountains(x, w, hz + 4, "#7a90b8", "#e8eef8", r, 7); hills(x, w, hz + 10, "#8aa060", 8, r); },
    mid: (x, w, h, r, hz) => { gradient(x, w, hz + 10, h, ["#c8a840", "#d8b850", "#b89838", "#a08030"]); for (let k = 0; k < w * 3; k++) { x.fillStyle = r() < 0.5 ? "#e8d070" : "#8a7028"; x.fillRect(Math.floor(r() * w), hz + 10 + Math.floor(r() * (h - hz - 10)), 1, 2); } },
    front: () => {},
  },
  aldea: {
    sky: ["#3a3a6a", "#7a6a8a", "#e0a070", "#f8d090"], sun: "#ffe8b0", dark: 0.18, key: 0.85, grade: "255,170,100", motes: "#ffe0a0", clouds: true,
    lights: [{ x: 0.85, y: 0.2, r: 140, c: "255,190,120", a: 0.5 }, { x: 0.3, y: 0.55, r: 40, c: "255,200,100", a: 0.7, flicker: true }],
    back: (x, w, h, r, hz) => hills(x, w, hz + 6, "#6a6a5a", 10, r),
    mid: (x, w, h, r, hz) => {
      houses(x, w, hz + 12, r, "#c8a878", "#8a4a2a");
      const mx = Math.round(w * 0.78); x.fillStyle = "#d8c8a0"; x.fillRect(mx - 5, hz - 22, 10, 34); x.fillStyle = "#6a4a2a"; for (let k = -12; k <= 12; k++) { x.fillRect(mx + k, hz - 24 + k, 1, 1); x.fillRect(mx + k, hz - 24 - k, 1, 1); }
      gradient(x, w, hz + 12, h, ["#a89040", "#b89848", "#9a7a38"]); path(x, w, h, hz, "#b8a070");
    },
    front: () => {},
  },
  atalaya: {
    sky: ["#2a1a1a", "#5a2a1a", "#a04a20", "#e08a40"], sun: "#ffb060", dark: 0.25, key: 0.3, grade: "255,120,60", weather: "ash",
    lights: [{ x: 0.3, y: 0.42, r: 70, c: "255,120,40", a: 0.9, flicker: true }],
    back: (x, w, h, r, hz) => hills(x, w, hz + 8, "#4a2a20", 12, r),
    mid: (x, w, h, r, hz) => { const tx = Math.round(w * 0.3); x.fillStyle = "#2a1e1a"; x.fillRect(tx - 10, hz - 46, 20, 60); x.fillStyle = "#3a2a24"; for (let k = 0; k < 5; k++) x.fillRect(tx - 12 + k * 6, hz - 50, 4, 4); x.fillStyle = "#ff8030"; x.fillRect(tx - 4, hz - 30, 3, 5); gradient(x, w, hz + 12, h, ["#3a2a1e", "#4a3424", "#3a2a1e"]); groundNoise(x, w, hz + 12, h, "#5a4030", "#201810", r); },
    front: () => {},
  },
  fortaleza: {
    sky: ["#0a0c14", "#141824", "#1e2432", "#283040"], dark: 0.45, key: 0.3, keyY: 0.4, grade: "140,170,255", weather: "rain", lightning: true,
    lights: [{ x: 0.15, y: 0.38, r: 55, c: "255,150,60", a: 1, flicker: true }, { x: 0.5, y: 0.36, r: 55, c: "255,150,60", a: 1, flicker: true }, { x: 0.85, y: 0.38, r: 55, c: "255,150,60", a: 1, flicker: true }],
    torches: [[0.15, 0.38], [0.5, 0.36], [0.85, 0.38]],
    back: (x, w, h, r, hz) => mountains(x, w, hz + 2, "#1e2430", null, r, 5),
    mid: (x, w, h, r, hz) => { walls(x, w, hz + 10, "#3a3c44", "#5a5c66", 34); x.fillStyle = "#2a2c32"; x.fillRect(Math.round(w * 0.45), hz - 40, 22, 50); gradient(x, w, hz + 10, h, ["#2a2c30", "#30333a", "#24262c"]); for (let k = 0; k < 30; k++) { x.fillStyle = "#4a5060"; x.fillRect(Math.floor(r() * w), hz + 12 + Math.floor(r() * (h - hz - 12)), 3, 1); } },
    front: () => {},
  },
  rio: {
    sky: ["#5a6a80", "#8a98a8", "#b8c0c8", "#d8dcdc"], sun: "#f8f4e0", dark: 0.12, key: 0.7, grade: "180,200,220", water: 0.74, mist: 2, clouds: true,
    lights: [{ x: 0.7, y: 0.12, r: 160, c: "255,250,230", a: 0.35 }],
    back: (x, w, h, r, hz) => { for (let i = 0; i < w; i += 14 + Math.floor(r() * 10)) { const th = 16 + Math.floor(r() * 30); x.fillStyle = "#7a8090"; x.fillRect(i, hz + 6 - th, 10, th); if (r() < 0.5) { x.fillStyle = "#6a7080"; x.fillRect(i + 3, hz + 6 - th - 6, 4, 6); } } },
    mid: (x, w, h, r, hz) => { x.fillStyle = "#5a5e68"; x.fillRect(0, hz + 2, Math.round(w * 0.42), 6); x.fillRect(Math.round(w * 0.58), hz + 2, w, 6); for (let i = 6; i < w; i += 24) if (i < w * 0.42 || i > w * 0.58) x.fillRect(i, hz + 8, 4, 10); gradient(x, w, hz + 12, Math.round(h * 0.74), ["#6a6a64", "#7a7a70", "#5a5a54"]); groundNoise(x, w, hz + 12, Math.round(h * 0.74), "#8a8a80", "#3a3a36", r); },
    front: () => {},
  },
  ciudad: {
    sky: ["#3a3050", "#6a5a78", "#b88a80", "#e8c0a0"], sun: "#ffe0c0", dark: 0.22, key: 0.8, grade: "255,190,150", motes: "#ffe0c0", shafts: true,
    lights: [{ x: 0.8, y: 0.16, r: 140, c: "255,200,160", a: 0.45 }],
    back: (x, w, h, r, hz) => { for (let i = 0; i < w; i += 16 + Math.floor(r() * 12)) { const th = 14 + Math.floor(r() * 26); x.fillStyle = "#5a5068"; x.fillRect(i, hz + 6 - th, 12, th); } },
    mid: (x, w, h, r, hz) => { for (const sx of [0.18, 0.4, 0.62, 0.84]) { const cx = Math.round(w * sx); x.fillStyle = "#8a8678"; x.fillRect(cx - 4, hz - 6, 8, 14); x.fillRect(cx - 3, hz - 18, 6, 12); x.fillRect(cx - 6, hz + 8, 12, 4); x.fillStyle = "#6a665a"; x.fillRect(cx + 2, hz - 18, 2, 26); } gradient(x, w, hz + 12, h, ["#6a6458", "#7a7466", "#5a5448"]); tiles(x, w, hz + 14, h, "#5a5448", 5); },
    front: () => {},
  },
  biblioteca: {
    sky: ["#100c10", "#18121a", "#201822", "#281e2a"], dark: 0.5, key: 0.5, keyY: 0.4, grade: "255,200,140", water: 0.8, motes: "#ffe0b0",
    lights: [{ x: 0.25, y: 0.45, r: 40, c: "255,190,110", a: 0.9, flicker: true }, { x: 0.75, y: 0.45, r: 40, c: "255,190,110", a: 0.9, flicker: true }, { x: 0.5, y: 0.1, r: 70, c: "160,180,220", a: 0.4 }],
    torches: [[0.25, 0.45], [0.75, 0.45]],
    back: (x, w, h, r, hz) => { for (let i = 0; i < w; i += 26) { x.fillStyle = "#3a2618"; x.fillRect(i, 10, 24, hz + 4); for (let j = 14; j < hz + 10; j += 8) for (let b = 0; b < 22; b += 3) { x.fillStyle = ["#6a2a2a", "#2a4a6a", "#4a6a2a", "#8a6a2a"][Math.floor(r() * 4)]; x.fillRect(i + 1 + b, j, 2, 6); } } },
    mid: (x, w, h, r, hz) => gradient(x, w, hz + 12, h, ["#2a2026", "#30262c", "#221a20"]),
    front: () => {},
  },
  faro: {
    sky: ["#06080e", "#0e1220", "#161c2e", "#1e2638"], dark: 0.45, key: 0.5, keyY: 0.05, grade: "140,170,230", weather: "rain", sweep: true, lightning: true,
    lights: [{ x: 0.5, y: 0.0, r: 60, c: "255,240,190", a: 0.7 }],
    back: (x, w, h, r, hz) => { x.fillStyle = "#1a2232"; for (let k = 0; k < 6; k++) x.fillRect(Math.floor(r() * w), Math.floor(r() * hz * 0.6), 30 + Math.floor(r() * 40), 6); },
    mid: (x, w, h, r, hz) => { walls(x, w, hz + 14, "#3a3e48", "#5a5e6a", 10); gradient(x, w, hz + 14, h, ["#3a3e46", "#44484f", "#33363c"]); },
    front: () => {},
  },
  campos: {
    sky: ["#1a0e0e", "#3a1a14", "#7a3018", "#c06030"], sun: "#ff9040", dark: 0.25, key: 0.75, grade: "255,120,60", weather: "ash",
    lights: [{ x: 0.2, y: 0.6, r: 46, c: "255,120,40", a: 0.9, flicker: true }, { x: 0.65, y: 0.62, r: 46, c: "255,120,40", a: 0.9, flicker: true }],
    back: (x, w, h, r, hz) => { const cx = Math.round(w * 0.8); for (let t = 0; t < 4; t++) { x.fillStyle = shade("#e8e4dc", -t * 0.06); x.fillRect(cx - 30 + t * 6, hz - 10 - t * 9, 60 - t * 12, 12); } x.fillStyle = "#f0ece4"; x.fillRect(cx - 2, hz - 54, 4, 20); hills(x, w, hz + 8, "#3a2418", 6, r); },
    mid: (x, w, h, r, hz) => { for (let i = 10; i < w; i += 30 + Math.floor(r() * 20)) { x.fillStyle = "#2a1e18"; for (let j = 0; j < 10; j++) x.fillRect(i + j, hz + 8 - j, 20 - j * 2, 1); } gradient(x, w, hz + 12, h, ["#2a2220", "#342a26", "#2a201c"]); groundNoise(x, w, hz + 12, h, "#4a3a30", "#140e0c", r); },
    front: () => {},
  },
  ciudadela: {
    sky: ["#3a3a4a", "#7a6a70", "#d0907a", "#f0c8a0"], sun: "#fff0d0", dark: 0.18, key: 0.8, grade: "255,200,160", weather: "ash",
    lights: [{ x: 0.8, y: 0.16, r: 150, c: "255,220,180", a: 0.45 }, { x: 0.22, y: 0.4, r: 44, c: "255,140,50", a: 0.8, flicker: true }],
    torches: [[0.22, 0.4]],
    back: (x, w, h, r, hz) => { for (let t = 0; t < 4; t++) { x.fillStyle = shade("#ece8e0", -t * 0.05); x.fillRect(10 + t * 14, hz - 6 - t * 12, w - 20 - t * 28, 14); } x.fillStyle = "#ffffff"; x.fillRect(Math.round(w / 2) - 3, hz - 66, 6, 22); },
    mid: (x, w, h, r, hz) => { walls(x, w, hz + 12, "#d8d2c6", "#f0ece4", 22); x.fillStyle = "#4a3a2a"; x.fillRect(Math.round(w / 2) - 14, hz - 10, 28, 22); x.fillStyle = "#6a5a40"; x.fillRect(Math.round(w / 2) - 14, hz - 10, 28, 2); gradient(x, w, hz + 12, h, ["#a8a296", "#b8b2a6", "#989286"]); },
    front: () => {},
  },
  patio: {
    sky: ["#4a5a7a", "#8a9ab0", "#d8c8b0", "#f0e0c8"], sun: "#fffbe8", dark: 0.1, key: 0.75, grade: "255,240,210", motes: "#ffffff", shafts: true,
    lights: [{ x: 0.75, y: 0.12, r: 170, c: "255,250,230", a: 0.45 }],
    back: (x, w, h, r, hz) => walls(x, w, hz + 6, "#e8e4dc", "#ffffff", 40, false),
    mid: (x, w, h, r, hz) => {
      // The dry white tree.
      const tx = Math.round(w * 0.5); x.fillStyle = "#f4f0e8"; x.fillRect(tx - 2, hz - 30, 5, 44);
      for (const [bx, by, bl] of [[-1, -28, -14], [3, -24, 12], [0, -18, -10], [3, -14, 9]]) for (let k = 0; k < Math.abs(bl); k++) x.fillRect(tx + bx + Math.sign(bl) * k, hz + by - Math.floor(k / 2), 1, 1);
      gradient(x, w, hz + 12, h, ["#d0cabe", "#dcd6ca", "#c4beb2"]); tiles(x, w, hz + 14, h, "#b0aa9e");
    },
    front: () => {},
  },
  muralla: {
    sky: ["#2a2a3a", "#5a4a5a", "#9a6a6a", "#d09070"], sun: "#ffd0a0", dark: 0.22, key: 0.85, grade: "255,170,130", weather: "ash", clouds: true,
    lights: [{ x: 0.85, y: 0.15, r: 150, c: "255,200,160", a: 0.45 }],
    back: (x, w, h, r, hz) => { hills(x, w, hz + 6, "#3a2a2a", 8, r); x.fillStyle = "#e8e4dc"; x.fillRect(0, hz - 30, 18, 40); },
    mid: (x, w, h, r, hz) => { walls(x, w, hz + 16, "#cfc8bc", "#e8e2d6", 14); gradient(x, w, hz + 16, h, ["#bcb6aa", "#c8c2b6", "#aaa498"]); },
    front: () => {},
  },
  trono: {
    sky: ["#04020a", "#0e0618", "#1e0a2a", "#3a1040"], moon: "#1a0a20", eclipse: true, dark: 0.55, key: 0.5, keyY: 0.1, grade: "190,90,255", weather: "ash",
    lights: [{ x: 0.5, y: 0.12, r: 110, c: "200,80,255", a: 0.9 }, { x: 0.15, y: 0.5, r: 40, c: "255,140,60", a: 0.7, flicker: true }, { x: 0.85, y: 0.5, r: 40, c: "255,140,60", a: 0.7, flicker: true }],
    torches: [[0.15, 0.5], [0.85, 0.5]],
    back: (x, w, h, r, hz) => { const cx = Math.round(w / 2); x.fillStyle = "#e0dcd4"; x.fillRect(cx - 10, hz - 70, 20, 80); x.fillStyle = "#b8b2a6"; x.fillRect(cx + 4, hz - 70, 6, 80); x.fillStyle = "#e0dcd4"; x.fillRect(cx - 14, hz - 74, 28, 6); for (let k = 0; k < 4; k++) x.fillRect(cx - 14 + k * 9, hz - 80, 4, 6); },
    mid: (x, w, h, r, hz) => { gradient(x, w, hz + 12, h, ["#c8c2b6", "#d8d2c6", "#b8b2a6"]); tiles(x, w, hz + 14, h, "#a8a296"); },
    front: () => {},
  },
};

const layerCache = new Map();
/** A theme's three painted layers (cached). */
export function layers(kind, w, h) {
  const key = `${kind}@${w}x${h}`;
  if (layerCache.has(key)) return layerCache.get(key);
  const t = T[kind] ?? T.bosque;
  let seed = 0; for (const ch of kind) seed = seed * 31 + ch.charCodeAt(0);
  const r = seeded(seed + w);
  const hz = Math.round(h * 0.55);
  const [back, bx] = canvas(w + 24, h);
  gradient(bx, w + 24, 0, hz + 14, t.sky);
  if (t.stars) stars(bx, w + 24, hz, r);
  const cel = t.sun ?? t.moon;
  if (cel) {
    const mx = Math.round((w + 24) * (t.key ?? 0.78)), my = Math.round(h * 0.15);
    if (t.eclipse) { disc(bx, mx, my, 11, "#e080ff"); disc(bx, mx, my, 9, "#08040c"); }
    else { disc(bx, mx, my, 9, shade(cel, -0.1)); disc(bx, mx, my, 7, cel); }
  }
  t.back(bx, w + 24, h, r, hz);
  const [mid, mx] = canvas(w + 16, h);
  t.mid(mx, w + 16, h, r, hz);
  const [front, fx] = canvas(w + 8, h);
  t.front(fx, w + 8, h, r, hz);
  const L = { back, mid, front, theme: t };
  layerCache.set(key, L);
  return L;
}
/** A flattened background (for previews). */
export function background(kind, w, h) { const L = layers(kind, w, h); const [c, x] = canvas(w, h); x.drawImage(L.back, -12, 0); x.drawImage(L.mid, -8, 0); x.drawImage(L.front, -4, 0); return c; }
export const SCENE_KINDS = Object.keys(T);

// MARK: Stage: layers, weather, ambient life, lighting and camera

/** A parallax layer offset, kept within the layer's extra width so no edge ever shows. */
const par = (off, extra) => Math.round(Math.max(-extra, Math.min(0, off)));

class Stage {
  constructor(cv) {
    this.cv = cv; this.x = cv.getContext("2d");
    this.cam = { x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 1 };
    this.view = { sx: 0, sy: 0, z: 1 };
    this.vfx = new Vfx();
    this.shake = 0; this.running = false; this.kind = "bosque"; this.bolt = 0;
    this.resize();
  }
  /** (Re)creates the offscreen buffers when the target canvas changes size. */
  resize() {
    this.W = this.cv.width; this.H = this.cv.height;
    [this.world, this.wx] = canvas(this.W, this.H);
    [this.lightCv, this.lx] = canvas(this.W, this.H);
    if (this.L) this.setScene(this.kind);
  }
  setScene(kind) {
    this.kind = T[kind] ? kind : "bosque";
    this.L = layers(this.kind, this.W, this.H);
    const t = this.L.theme;
    const r = seeded(9);
    this.motes = Array.from({ length: 26 }, () => ({ x: r() * this.W, y: r() * this.H, s: 0.1 + r() * 0.25, p: r() * 6.28 }));
    this.flies = t.flies ? Array.from({ length: 8 }, () => ({ x: r() * this.W, y: this.H * 0.5 + r() * this.H * 0.4, p: r() * 6.28 })) : [];
    this.weather = t.weather ? Array.from({ length: t.weather === "rain" ? 70 : 40 }, () => ({ x: r() * this.W, y: r() * this.H, v: 0.6 + r() * 0.8, p: r() * 6.28 })) : [];
    this.clouds = t.clouds ? Array.from({ length: 4 }, () => ({ x: r() * this.W, y: 6 + r() * this.H * 0.25, w: 20 + r() * 26, v: 0.004 + r() * 0.006 })) : [];
  }
  start() { if (this.running) return; this.running = true; const tick = (t) => { if (!this.running) return; this.frame(t); requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
  stop() { this.running = false; }
  /** Moves the camera toward a point (in world pixels) and zooms in; returns to neutral after `hold` ms. */
  focus(px, py, z = 1.12, hold = 600) {
    this.cam.tx = (px - this.W / 2) * 0.6; this.cam.ty = (py - this.H / 2) * 0.4; this.cam.tz = z;
    clearTimeout(this._camT);
    this._camT = setTimeout(() => { this.cam.tx = 0; this.cam.ty = 0; this.cam.tz = 1; }, hold);
  }
  /** Where the key light is: shadows point away from it. */
  get keyX() { return this.W * (this.L.theme.key ?? 0.8); }
  /** Actor-space offset of the camera pan (actors scroll a little less than the camera). */
  get actorPan() { return -this.cam.x * 0.7; }

  frame(t) {
    if (this.x.canvas !== this.cv) this.x = this.cv.getContext("2d");
    if (this.cv.width !== this.W || this.cv.height !== this.H) this.resize();
    const c = this.cam;
    c.x += (c.tx - c.x) * 0.12; c.y += (c.ty - c.y) * 0.12; c.z += (c.tz - c.z) * 0.12;
    const x = this.wx, { W, H } = this, th = this.L.theme;
    // Parallax layers: the far ones move less.
    x.clearRect(0, 0, W, H);
    x.drawImage(this.L.back, par(-12 - c.x * 0.25, 24), 0);
    this.ambientBack(x, t, th);
    x.drawImage(this.L.mid, par(-8 - c.x * 0.55, 16), 0);
    this.liquid(x, t, th);
    x.save(); x.translate(Math.round(this.actorPan), 0);
    this.drawActors(x, t);
    this.vfx.draw(x, W, H);
    x.restore();
    x.drawImage(this.L.front, par(-4 - c.x * 1.1, 8), 0);
    this.weatherFx(x, t, th);
    this.lighting(x, t, th);
    // Camera zoom and shake onto the screen canvas.
    const z = c.z, sw = W / z, sh = H / z;
    let sx = (W - sw) / 2 + c.x * 0.3, sy = (H - sh) / 2 + c.y * 0.3;
    if (this.shake > 0) { sx += (Math.random() - 0.5) * this.shake; sy += (Math.random() - 0.5) * this.shake; this.shake *= 0.86; if (this.shake < 0.4) this.shake = 0; }
    sx = Math.max(0, Math.min(W - sw, sx)); sy = Math.max(0, Math.min(H - sh, sy));
    this.view = { sx, sy, z };
    this.x.imageSmoothingEnabled = false;
    this.x.drawImage(this.world, sx, sy, sw, sh, 0, 0, W, H);
    this.hud?.(this.x, t);
  }
  /** World (actor-space) point to screen pixels, for sharp text drawn after the zoom. */
  toScreen(px, py) { const v = this.view; return { x: (px + this.actorPan - v.sx) * v.z, y: (py - v.sy) * v.z }; }

  ambientBack(x, t, th) {
    // Drifting clouds.
    for (const cl of this.clouds) {
      const cx = ((cl.x + t * cl.v) % (this.W + 60)) - 30;
      x.fillStyle = "rgba(255,255,255,0.55)"; x.fillRect(Math.round(cx), Math.round(cl.y), Math.round(cl.w), 3); x.fillRect(Math.round(cx + cl.w * 0.2), Math.round(cl.y - 2), Math.round(cl.w * 0.5), 2);
      x.fillStyle = "rgba(200,190,210,0.4)"; x.fillRect(Math.round(cx + 2), Math.round(cl.y + 3), Math.round(cl.w - 4), 1);
    }
    // Light shafts from the key light.
    if (th.shafts) {
      x.fillStyle = `rgba(${th.grade ?? "255,220,160"},0.07)`;
      for (let k = 0; k < 3; k++) { const off = Math.sin(t / 2200 + k) * 6, sx = this.W * (0.25 + k * 0.25) + off; x.beginPath(); x.moveTo(sx, 0); x.lineTo(sx + 14, 0); x.lineTo(sx - 26, this.H); x.lineTo(sx - 48, this.H); x.fill(); }
    }
    // Torches on the walls.
    for (const [fx, fy] of th.torches ?? []) {
      const px = Math.round(fx * this.W - this.cam.x * 0.25), py = Math.round(fy * this.H);
      x.fillStyle = "#4a3020"; x.fillRect(px - 1, py, 2, 6);
      for (let k = 0; k < 3; k++) { const hh = 3 + (((Math.sin(t / 80 + k * 2 + px) + 1) * 1.5) | 0); x.fillStyle = k === 1 ? "#ffe080" : "#ff8a30"; x.fillRect(px - 2 + k, py - hh, 1, hh); }
    }
    // Campfire.
    if (th.fire) {
      const fx = Math.round(th.fire[0] * this.W - this.cam.x * 0.55), fy = Math.round(th.fire[1] * this.H);
      x.fillStyle = "#4a2e1e"; x.fillRect(fx - 8, fy, 16, 3); x.fillRect(fx - 5, fy - 2, 10, 2);
      for (let k = 0; k < 6; k++) { const hh = 4 + (((Math.sin(t / 90 + k * 1.7) + 1) * 3.5) | 0); x.fillStyle = k % 2 ? "#ffd060" : "#ff7a30"; x.fillRect(fx - 6 + k * 2, fy - hh, 2, hh); }
      if (Math.random() < 0.15) this.vfx.add({ kind: "ember", x: fx + (Math.random() - 0.5) * 8 - this.actorPan, y: fy - 6, vx: (Math.random() - 0.5) * 10, vy: -25, color: "#ffb040", life: 900 });
    }
    // Mist bands.
    for (let k = 0; k < (th.mist ?? 1) + 2; k++) {
      x.fillStyle = `rgba(220,225,240,${0.04 + k * 0.02})`;
      const y = this.H * (0.5 + k * 0.1) + Math.sin(t / 1800 + k * 2) * 2, dx = ((t / (60 + k * 30)) % (this.W * 2)) - this.W;
      x.fillRect(Math.round(dx), Math.round(y), this.W, 3); x.fillRect(Math.round(dx - this.W * 1.1), Math.round(y + 2), this.W, 2);
    }
    // Wind over the grass.
    if (th.windGrass) { x.fillStyle = "rgba(255,240,160,0.18)"; for (let k = 0; k < 6; k++) { const wx = ((t / 14 + k * 70) % (this.W + 80)) - 40; x.fillRect(Math.round(wx), Math.round(this.H * 0.68 + k * 9), 30, 1); } }
  }

  /** Water with live reflections, or glowing lava. */
  liquid(x, t, th) {
    if (th.lava) {
      const y0 = Math.round(this.H * th.lava);
      for (let k = 0; k < 10; k++) { const lx = ((k * 53 + t / 30) % (this.W + 10)) - 5, ly = y0 + 3 + ((k * 7) % (this.H - y0 - 3)); const a = (Math.sin(t / 300 + k) + 1) / 2; x.fillStyle = `rgba(255,${200 + Math.round(a * 50)},120,${0.4 + a * 0.5})`; x.fillRect(Math.round(lx), ly, 3, 1); }
      return;
    }
    if (!th.water) return;
    const y0 = Math.round(this.H * th.water), depth = this.H - y0;
    for (let j = 0; j < depth; j++) {
      const sy = Math.round(y0 - 1 - j * 1.4);
      if (sy < 0) break;
      const off = Math.round(Math.sin(t / 300 + j * 0.7) * (1 + j * 0.05));
      x.globalAlpha = 0.38 * (1 - j / depth);
      x.drawImage(this.world, 0, sy, this.W, 1, off, y0 + j, this.W, 1);
    }
    x.globalAlpha = 1;
    x.fillStyle = "rgba(40,90,140,0.45)"; x.fillRect(0, y0, this.W, depth);
    x.fillStyle = "rgba(220,240,255,0.5)";
    for (let k = 0; k < 14; k++) { const wy = y0 + 2 + ((k * 7) % Math.max(1, depth - 2)); const wx = ((t / 40 + k * 37) % (this.W + 20)) - 10; x.fillRect(Math.round(wx), wy, 4 + (k % 3) * 2, 1); }
  }

  weatherFx(x, t, th) {
    const w = th.weather;
    for (const d of this.weather) {
      if (w === "rain") { const yy = (d.y + t * 0.35 * d.v) % this.H, xx = (((d.x - t * 0.08 * d.v) % this.W) + this.W) % this.W; x.fillStyle = "rgba(170,190,230,0.55)"; x.fillRect(Math.round(xx), Math.round(yy), 1, 4); if (yy > this.H - 6 && d.v > 1.2) { x.fillStyle = "rgba(200,215,240,0.5)"; x.fillRect(Math.round(xx) - 1, this.H - 2, 3, 1); } }
      else if (w === "snow") { const yy = (d.y + t * 0.02 * d.v) % this.H, xx = (((d.x + Math.sin(t / 900 + d.p) * 6) % this.W) + this.W) % this.W; x.fillStyle = "rgba(255,255,255,0.9)"; x.fillRect(Math.round(xx), Math.round(yy), d.v > 1 ? 2 : 1, d.v > 1 ? 2 : 1); }
      else if (w === "embers") { const yy = this.H - ((d.y + t * 0.03 * d.v) % this.H), xx = (((d.x + Math.sin(t / 700 + d.p) * 5) % this.W) + this.W) % this.W; const a = (Math.sin(t / 200 + d.p) + 1) / 2; x.fillStyle = `rgba(255,${130 + Math.round(a * 90)},40,${0.4 + a * 0.6})`; x.fillRect(Math.round(xx), Math.round(yy), 1, 1); }
      else if (w === "ash") { const yy = (d.y + t * 0.012 * d.v) % this.H, xx = (((d.x + Math.sin(t / 1100 + d.p) * 8) % this.W) + this.W) % this.W; x.fillStyle = "rgba(200,190,190,0.6)"; x.fillRect(Math.round(xx), Math.round(yy), 1, 1); }
    }
    // Dust motes and fireflies.
    if (th.motes) { x.fillStyle = th.motes; for (const m of this.motes) { const yy = (((m.y - (t * m.s) / 40) % this.H) + this.H) % this.H, xx = m.x + Math.sin(t / 900 + m.p) * 3; if (Math.sin(t / 400 + m.p) > -0.2) x.fillRect(Math.round(xx), Math.round(yy), 1, 1); } }
    for (const f of this.flies) { const a = (Math.sin(t / 500 + f.p) + 1) / 2; x.fillStyle = `rgba(210,255,140,${a})`; x.fillRect(Math.round(f.x + Math.sin(t / 1300 + f.p) * 6), Math.round(f.y + Math.cos(t / 1100 + f.p) * 4), 1, 1); }
    // Lightning.
    if (th.lightning && Math.random() < 0.002) { this.bolt = performance.now(); this.vfx.light(this.W * Math.random() - this.actorPan, 0, 400, "200,210,255", 260, 1); }
  }

  /** The darkness layer with every light carved out of it, then coloured glows, grading and vignette. */
  lighting(x, t, th) {
    const pan = this.actorPan;
    const lights = [
      ...th.lights.map((l) => ({ x: l.x * this.W - this.cam.x * 0.4, y: l.y * this.H, r: l.r * (l.flicker ? 0.92 + Math.sin(t / 70 + l.x * 10) * 0.05 + Math.sin(t / 130) * 0.03 : 1), c: l.c, a: l.a })),
      ...this.vfx.liveLights().map((l) => ({ x: l.x + pan, y: l.y, r: l.r, c: l.color, a: l.a })),
      ...(this.extraLights?.(t) ?? []),
    ];
    if (th.sweep) { const a = t / 1400; lights.push({ x: this.W * 0.5 + Math.cos(a) * this.W * 0.45, y: this.H * 0.25 + Math.sin(a) * 10, r: 90, c: "255,240,190", a: 0.6 }); }
    const dark = th.dark ?? 0;
    if (dark > 0) {
      const lx = this.lx;
      lx.globalCompositeOperation = "source-over";
      lx.clearRect(0, 0, this.W, this.H);
      lx.fillStyle = `rgba(6,4,14,${dark})`; lx.fillRect(0, 0, this.W, this.H);
      lx.globalCompositeOperation = "destination-out";
      for (const l of lights) { if (l.r <= 0) continue; const g = lx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r); g.addColorStop(0, `rgba(0,0,0,${Math.min(1, l.a)})`); g.addColorStop(1, "rgba(0,0,0,0)"); lx.fillStyle = g; lx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2); }
      lx.globalCompositeOperation = "source-over";
      x.drawImage(this.lightCv, 0, 0);
    }
    // Coloured glow of every light.
    x.globalCompositeOperation = "lighter";
    for (const l of lights) { if (l.r <= 0) continue; const g = x.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.8); g.addColorStop(0, `rgba(${l.c},${0.22 * Math.min(1, l.a)})`); g.addColorStop(1, `rgba(${l.c},0)`); x.fillStyle = g; x.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2); }
    if (this.bolt && performance.now() - this.bolt < 140) { x.fillStyle = "rgba(200,210,255,0.35)"; x.fillRect(0, 0, this.W, this.H); }
    x.globalCompositeOperation = "source-over";
    if (th.grade) { x.fillStyle = `rgba(${th.grade},0.06)`; x.fillRect(0, 0, this.W, this.H); }
    const v = x.createRadialGradient(this.W / 2, this.H / 2, this.H * 0.45, this.W / 2, this.H / 2, this.W * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.38)");
    x.fillStyle = v; x.fillRect(0, 0, this.W, this.H);
  }

  /** A character with its long shadow (away from the key light) and a rim of light. */
  drawFigure(x, s, fi, px, py, opts = {}) {
    const alpha = opts.alpha ?? 1, lift = opts.lift ?? 0;
    const feetX = px + s.w / 2, feetY = py + s.h + lift;
    const toLight = this.keyX - this.actorPan - feetX;
    // Shadow: the silhouette flattened onto the ground and skewed away from the light.
    const dir = toLight > 0 ? -1 : 1;
    const skew = dir * (0.4 + Math.min(1, Math.abs(toLight) / this.W) * 0.9);
    x.save();
    x.globalAlpha = 0.34 * alpha * (lift ? 0.6 : 1);
    x.translate(feetX, feetY);
    x.transform(1, 0, skew * 0.32, -0.32, 0, 0);
    x.drawImage(s.dark[fi], -s.w / 2, -s.h);
    x.restore();
    // Rim light on the side facing the key light.
    const side = toLight > 0 ? 1 : -1;
    x.globalCompositeOperation = "lighter"; x.globalAlpha = 0.4 * alpha;
    x.drawImage(s.white[fi], px + side, py - 1);
    x.globalCompositeOperation = "source-over"; x.globalAlpha = alpha;
    x.drawImage(s.frames[fi], px, py);
    if (opts.flash) x.drawImage(s.white[fi], px, py);
    x.globalAlpha = 1;
  }
}

// MARK: Battle view

export function spriteKey(u) { return u.side === "hero" ? u.id : (u.spriteKey ?? u.id); }

/** Screen positions of fighters: enemies on the left facing right, heroes on the right facing left. */
export function battleLayout(b, W, H, keep) {
  const pos = new Map();
  const heroes = b.units.filter((u) => u.side === "hero" && !u.inReserve);
  const foes = b.units.filter((u) => u.side === "enemy" && (u.alive || keep?.has(u.uid)));
  const ground = H * 0.62;
  heroes.forEach((u, k) => pos.set(u.uid, { x: W - 44 + (k % 2 ? 16 : 0), y: ground + 14 + k * 17 }));
  const big = foes.find((u) => u.boss);
  let k = 0;
  for (const u of foes) {
    if (u.boss) { pos.set(u.uid, { x: 54, y: H - 6 }); continue; }
    pos.set(u.uid, { x: (big ? 108 : 40) + (k % 2) * 30, y: ground + 14 + (k % 3) * 15 });
    k++;
  }
  return pos;
}

/** Tiny 5×5 icons for the damage types, drawn under each enemy's health bar. */
const TYPE_GLYPH = {
  cortante: "0000100010001000100010000",
  perforante: "0010001110101010010000100",
  contundente: "1111111111001000010000100",
  fuego: "0010000110011101111101110",
  luz: "0010010101011101010100100",
  sombra: "0111011000100001100001110",
};
export function drawGlyph(x, type, px, py, color) {
  const g = TYPE_GLYPH[type]; if (!g) return;
  x.fillStyle = OUTLINE; x.fillRect(px - 1, py - 1, 7, 7);
  x.fillStyle = color ?? TYPE_COLORS[type]?.[0] ?? "#fff";
  for (let k = 0; k < 25; k++) if (g[k] === "1") x.fillRect(px + (k % 5), py + Math.floor(k / 5), 1, 1);
}
/** Colours of the little status pips over a fighter. */
const STATUS_PIP = { poison: "#8ad050", burn: "#ff8a30", bleed: "#e03040", blind: "#5a4a6a", confuse: "#ff9aff", sleep: "#9ab8ff", silence: "#c0c0c0", fear: "#60c0ff" };

const RANGED = new Set(["theron", "arquero", "trasgo-arquero", "ballestero", "arquero-oscuro"]);

/**
 * The battle scene: lit stage, fighters with shadows, the engine's events played as animations with
 * particle effects, and floating numbers drawn sharp on top.
 */
export class BattleView extends Stage {
  constructor(cv) { super(cv); this.fx = []; this.anims = new Map(); this.dying = new Map(); this.b = null; this.selected = null; this.hintType = null; }
  setBattle(b) { this.b = b; this.setScene(b.bg); this.fx = []; this.anims.clear(); this.dying.clear(); }
  layout() {
    const now = performance.now();
    for (const [uid, t0] of this.dying) if (now - t0 > 750) this.dying.delete(uid);
    return battleLayout(this.b, this.W, this.H, this.dying);
  }
  pos(uid) { return this.layout().get(uid); }
  unit(uid) { return this.b.units.find((u) => u.uid === uid); }
  spriteOf(u) { return sprite(spriteKey(u)); }
  /** Centre of a fighter's body in actor space. */
  center(uid) { const p = this.pos(uid), u = this.unit(uid); if (!p || !u) return null; const s = this.spriteOf(u); return { x: p.x, y: p.y - s.h * 0.55 - (FLYING.has(u.id) ? 10 : 0), h: s.h }; }

  /** The fighter under a point of the (unzoomed) canvas, for tap targeting. */
  hit(px, py) {
    if (!this.b) return null;
    const v = this.view;
    const wx = px / v.z + v.sx - this.actorPan, wy = py / v.z + v.sy;
    const pos = battleLayout(this.b, this.W, this.H);
    for (const u of this.b.units) {
      const p = pos.get(u.uid); if (!p || !u.alive) continue;
      const s = this.spriteOf(u), lift = FLYING.has(u.id) ? 10 : 0;
      if (wx >= p.x - s.w / 2 - 2 && wx <= p.x + s.w / 2 + 2 && wy >= p.y - s.h - lift - 6 && wy <= p.y + 4) return u.uid;
    }
    return null;
  }

  drawActors(x, t) {
    const b = this.b; if (!b) return;
    const pos = this.layout();
    const order = b.units.filter((u) => pos.has(u.uid)).sort((a, c) => pos.get(a.uid).y - pos.get(c.uid).y);
    for (const u of order) this.drawUnit(x, u, pos.get(u.uid), t);
  }

  drawUnit(x, u, p, t) {
    const a = this.anims.get(u.uid) ?? {};
    const s = this.spriteOf(u);
    const fly = FLYING.has(u.id);
    const fi = Math.floor(t / (fly ? 180 : 420) + (u.uid.charCodeAt(u.uid.length - 1) % 2)) % 2;
    const now = performance.now();
    let dx = 0, dy = 0, alpha = 1;
    if (a.lunge) { const k = Math.min(1, (now - a.lunge.t0) / a.lunge.ms); const e = Math.sin(k * Math.PI); dx = a.lunge.dir * e * a.lunge.dist; dy = -e * (a.lunge.hop ?? 0); if (k >= 1) delete a.lunge; }
    if (a.hurt) { const k = (now - a.hurt.t0) / 300; if (k >= 1) delete a.hurt; else dx += (u.side === "hero" ? 1 : -1) * Math.sin(k * 22) * 2 * (1 - k); }
    if (!u.alive) {
      const k = Math.min(1, (now - (a.ko ?? now - 1000)) / 700);
      if (u.side === "enemy") { alpha = 1 - k; dy += k * 4; if (k >= 1) return; }
      else alpha = 0.45;
    }
    const lift = fly ? 10 + Math.sin(t / 300 + p.x) * 2 : 0;
    const px = Math.round(p.x - s.w / 2 + dx), py = Math.round(p.y - s.h + dy - lift);
    if (u.charging && u.alive) {
      const k = (Math.sin(now / 110) + 1) / 2, red = this.tinted(s, fi, "#ff3020");
      x.globalCompositeOperation = "lighter"; x.globalAlpha = 0.25 + k * 0.35; x.drawImage(red, px - 1, py); x.drawImage(red, px + 1, py);
      x.globalCompositeOperation = "source-over"; x.globalAlpha = 1;
      if (Math.random() < 0.3) this.vfx.add({ kind: "gather", x: p.x + (Math.random() - 0.5) * 40, y: py + Math.random() * s.h, tx: p.x, ty: py + s.h / 2, color: "#ff6040", life: 400 });
      drawText(x, "!", p.x, py - 9, "#ff5040");
    }
    // The hero's current attack type hits this enemy's weakness: glow in that element's colour.
    const hint = u.side === "enemy" && u.alive && this.hintType ? (u.weak.includes(this.hintType) ? "weak" : u.resist.includes(this.hintType) ? "resist" : null) : null;
    if (hint === "weak") {
      const k = (Math.sin(now / 120) + 1) / 2, glow = this.tinted(s, fi, TYPE_COLORS[this.hintType]?.[1] ?? "#ffe08a");
      x.globalCompositeOperation = "lighter"; x.globalAlpha = 0.35 + k * 0.45;
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) x.drawImage(glow, px + ox, py + oy);
      x.globalCompositeOperation = "source-over"; x.globalAlpha = 1;
    }
    this.drawFigure(x, s, fi, px, py, { alpha, flash: a.flash && now - a.flash < 110, lift });
    if (hint === "weak") { const bob = Math.round(Math.sin(now / 150) * 1.5); drawGlyph(x, this.hintType, Math.round(p.x) - 2, py - 12 + bob); x.fillStyle = "#ffe08a"; x.fillRect(Math.round(p.x) - 1, py - 4 + bob, 3, 1); x.fillRect(Math.round(p.x), py - 3 + bob, 1, 1); }
    else if (hint === "resist") { x.globalAlpha = 0.85; drawGlyph(x, this.hintType, Math.round(p.x) - 2, py - 11, "#6a6a7a"); x.fillStyle = "#ff5a5a"; for (let k = 0; k < 7; k++) x.fillRect(Math.round(p.x) - 3 + k, py - 12 + k, 1, 1); x.globalAlpha = 1; }
    // Status markers: floating Zs for sleep, a "?" for confusion, coloured pips for the rest.
    if (u.alive) {
      const st = u.statuses ?? {};
      if (st.sleep) for (let k = 0; k < 2; k++) { const ph = ((now / 900 + k * 0.5) % 1); x.globalAlpha = 1 - ph; drawText(x, "Z", px + s.w + 1 + ph * 4, py - 2 - ph * 8, "#9ab8ff"); x.globalAlpha = 1; }
      if (st.confuse) drawText(x, "?", Math.round(p.x + Math.sin(now / 200) * 4), py - 9, "#ff9aff");
      const pips = Object.keys(st).filter((k) => k !== "sleep" && k !== "confuse" && STATUS_PIP[k]);
      pips.forEach((k, i) => { x.fillStyle = OUTLINE; x.fillRect(px - 5, py + 1 + i * 4, 4, 4); x.fillStyle = STATUS_PIP[k]; x.fillRect(px - 4, py + 2 + i * 4, 2, 2); });
    }
    if (u.uid === this.b.turnUid && u.alive) { x.fillStyle = "#ffe08a"; const bob = Math.round(Math.sin(now / 160)); x.fillRect(Math.round(p.x) - 1, py - 6 + bob, 3, 2); x.fillRect(Math.round(p.x), py - 4 + bob, 1, 1); }
    if (u.uid === this.selected) { x.strokeStyle = "#ffe08a"; x.globalAlpha = 0.6 + Math.sin(now / 100) * 0.4; x.strokeRect(px - 1.5, py - 1.5, s.w + 3, s.h + 3); x.globalAlpha = 1; }
    if (u.imbue && u.alive && Math.random() < 0.35) this.vfx.add({ kind: "ember", x: px + s.w / 2 + (Math.random() - 0.5) * 8, y: py + s.h * 0.5, vx: 0, vy: -20, color: TYPE_COLORS[u.imbue.type]?.[0] ?? "#ff8a30", life: 400 });
    if (u.statuses?.poison && u.alive && Math.random() < 0.04) this.vfx.poison(p.x, py + s.h * 0.4);
    if (u.side === "enemy" && u.alive) {
      const bw = Math.max(16, Math.min(34, s.w)), bx = Math.round(p.x - bw / 2), by = Math.round(p.y + 2);
      x.fillStyle = OUTLINE; x.fillRect(bx - 1, by - 1, bw + 2, 4);
      x.fillStyle = "#4a1a1a"; x.fillRect(bx, by, bw, 2);
      x.fillStyle = u.hp / u.hpMax > 0.4 ? "#e04848" : "#ff8a30"; x.fillRect(bx, by, Math.round((bw * u.hp) / u.hpMax), 2);
      // Weaknesses under the health bar.
      (u.weak ?? []).forEach((type, i) => drawGlyph(x, type, bx + i * 8, by + 5));
    }
    this.anims.set(u.uid, a);
  }
  tinted(s, fi, col) {
    s.tints ??= {}; const k = `${col}${fi}`;
    if (!s.tints[k]) { const [c, x] = canvas(s.w, s.h); x.drawImage(s.frames[fi], 0, 0); x.globalCompositeOperation = "source-atop"; x.fillStyle = col; x.fillRect(0, 0, s.w, s.h); s.tints[k] = c; }
    return s.tints[k];
  }

  /** Floating numbers and labels, drawn on the screen canvas: sharp, and above the lighting. */
  hud(x) {
    const now = performance.now();
    this.fx = this.fx.filter((f) => now - f.t0 < f.life);
    for (const f of this.fx) {
      const k = (now - f.t0) / f.life;
      const p = this.toScreen(f.x, f.y);
      const pop = k < 0.12 ? 1 + (0.12 - k) * 6 : 1;
      drawText(x, f.text, p.x, p.y - k * 16 - (pop - 1) * 4, f.color, Math.max(1, Math.round((f.scale ?? 1) * pop)));
    }
  }
  text(uid, text, color, scale = 1, dy = 0) {
    const c = this.center(uid); if (!c || !text) return;
    this.fx.push({ text, color, x: c.x, y: c.y - c.h * 0.5 - 6 + dy, t0: performance.now(), life: 950, scale });
  }

  /** Plays one engine event as an animation; resolves when it's done. */
  async play(e) {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const A = (uid) => { const o = this.anims.get(uid) ?? {}; this.anims.set(uid, o); return o; };
    const u = e.uid && this.unit(e.uid);
    const V = this.vfx;
    switch (e.t) {
      case "attack": {
        if (!u) return;
        const from = this.center(u.uid), to = e.target ? this.center(e.target) : null;
        if (!from) return;
        const magic = ["fuego", "luz", "sombra"].includes(e.type) && !e.imbued;
        const ranged = RANGED.has(u.id) || magic;
        const dir = u.side === "hero" ? -1 : 1;
        if (e.name && e.name !== "Ataque" && e.name.length < 18) this.text(u.uid, e.name, "#ffe08a", 1, -10);
        if (to && (e.big || (e.name && e.name !== "Ataque"))) this.focus((from.x + to.x) / 2, (from.y + to.y) / 2, e.big ? 1.18 : 1.1, 700);
        if (e.big) { this.shake = 4; V.light(from.x, from.y, 90, "255,60,40", 500, 1); }
        if (!ranged || !to) {
          A(u.uid).lunge = { t0: performance.now(), dir, dist: to ? Math.min(60, Math.abs(to.x - from.x) * 0.55) : 14, ms: 340, hop: 4 };
          await wait(200);
          return;
        }
        A(u.uid).lunge = { t0: performance.now(), dir, dist: 4, ms: 260 };
        if (magic) V.circle(from.x, from.y + 14, TYPE_COLORS[e.type]?.[0] ?? "#bfe8ff");
        if (e.type === "fuego") V.fireball(from.x, from.y, to.x, to.y);
        else if (e.type === "sombra") { V.add({ kind: "orb", x0: from.x, y0: from.y, x1: to.x, y1: to.y, color: "#a050ff", core: "#ffffff", life: 300, size: 3, arc: 12 }); V.light(from.x, from.y, 40, "170,80,255", 300, 0.7); }
        else if (e.type === "luz") { V.add({ kind: "orb", x0: from.x, y0: from.y - 8, x1: to.x, y1: to.y, color: "#fff2a0", core: "#ffffff", life: 260, size: 3, arc: 16 }); V.light(from.x, from.y, 50, "255,240,170", 300, 0.8); }
        else V.arrow(from.x, from.y, to.x, to.y);
        await wait(e.type === "fuego" ? 300 : 230);
        return;
      }
      case "cast": {
        if (!u) return;
        const c = this.center(u.uid); if (!c) return;
        if (e.name === "Defender") V.add({ kind: "ring", x: c.x, y: c.y, color: "#a0c8ff", r0: 12, r1: 14, life: 500, width: 2 });
        else { V.circle(c.x, c.y + 14, u.side === "hero" ? "#bfe8ff" : "#ff8070"); if (e.name && e.name.length < 18) this.text(u.uid, e.name, "#bfe8ff", 1, -10); }
        await wait(300);
        return;
      }
      case "damage": {
        if (!u) return;
        const c = this.center(u.uid); if (!c) return;
        A(u.uid).hurt = { t0: performance.now() }; A(u.uid).flash = performance.now();
        if (e.crit || e.combo) { await wait(70); this.shake = e.combo ? 7 : 4; }
        if (e.dot) V.add({ kind: "burst", x: c.x, y: c.y, color: "#c080ff", r: 6, life: 200 });
        else V.hit(c.x, c.y, e.type ?? "contundente", !!(e.crit || e.combo), u.side === "enemy" ? 1 : -1);
        if (!e.dot) V.light(c.x, c.y, e.crit ? 60 : 36, hexToRgb((TYPE_COLORS[e.type] ?? TYPE_COLORS.contundente)[0]), 220, 0.7);
        this.text(u.uid, String(e.amount), e.dot ? "#c0a0ff" : e.crit ? "#ffd84a" : "#ffffff", e.crit ? 2 : 1);
        if (e.weak) this.text(u.uid, "¡DEBIL!", "#ff9a40", 1, -12);
        if (e.resist) this.text(u.uid, "RESISTE", "#9aa0b0", 1, -12);
        await wait(e.dot ? 260 : 340);
        return;
      }
      case "heal": if (u) { const c = this.center(u.uid); if (c) { V.heal(c.x, c.y + 6); V.light(c.x, c.y, 44, "120,255,160", 500, 0.7); } this.text(u.uid, `+${e.amount}`, "#7aff9a"); } await wait(300); return;
      case "ap": if (u) this.text(u.uid, `+${e.amount} AP`, "#7ac8ff", 1, -8); await wait(120); return;
      case "miss": if (u) { A(u.uid).lunge = { t0: performance.now(), dir: u.side === "hero" ? 1 : -1, dist: 8, ms: 260 }; this.text(u.uid, "FALLO", "#c0c0d0"); } await wait(260); return;
      case "status": {
        if (!u) return;
        const c = this.center(u.uid); if (!c) return;
        const text = e.text ?? "";
        if (e.stun || /Aturdido/i.test(text)) V.stars(c.x, c.y - 10);
        else if (e.kind === "sleep" || e.sleep) V.add({ kind: "ring", x: c.x, y: c.y, color: "#9ab8ff", r0: 14, r1: 4, life: 600, width: 1 });
        else if (e.kind === "confuse" || e.confuse) V.stars(c.x, c.y - 10);
        else if (e.kind === "silence") V.add({ kind: "ring", x: c.x, y: c.y - 6, color: "#c0c0c0", r0: 4, r1: 16, life: 500, width: 2 });
        else if (e.kind === "fear") V.buff(c.x, c.y, "#60c0ff", false);
        else if (e.kind === "blind") V.add({ kind: "smoke", x: c.x, y: c.y - 8, vx: 0, vy: -4, r: 6, color: "40,30,50", life: 700, add: false });
        else if (e.kind === "bleed") V.sparks(c.x, c.y, "#e03040", 10, 50);
        else if (e.imbue) V.explosion(c.x, c.y, false);
        else if (e.good) V.buff(c.x, c.y, "#ffe08a", true);
        else if (/Veneno/i.test(text)) V.poison(c.x, c.y);
        else if (/Quemadura/i.test(text)) V.add({ kind: "ember", x: c.x, y: c.y, vx: 0, vy: -30, color: "#ff8a30", life: 500 });
        else V.buff(c.x, c.y, "#ff8a6a", false);
        this.text(u.uid, text.length > 14 ? text.slice(0, 14) : text, e.good ? "#9affb0" : "#ffb070", 1, -14);
        await wait(240);
        return;
      }
      case "ko": if (u) { const c = this.center(u.uid); A(u.uid).ko = performance.now(); if (u.side === "enemy") this.dying.set(u.uid, performance.now()); if (c) { V.sparks(c.x, c.y, "#ffffff", 20, 70); V.add({ kind: "smoke", x: c.x, y: c.y + 6, vx: 0, vy: -10, r: 6, color: "120,110,120", life: 800, add: false }); } } await wait(420); return;
      case "revive": if (u) { const c = this.center(u.uid); if (c) { V.beam(c.x, c.y + 10); V.light(c.x, c.y, 70, "255,250,200", 600, 1); } this.text(u.uid, "REVIVE", "#fff2a0"); } await wait(450); return;
      case "charge": if (u) { const c = this.center(u.uid); if (c) { V.charge(c.x, c.y); V.light(c.x, c.y, 50, "255,60,40", 600, 0.8); this.focus(c.x, c.y, 1.1, 600); } this.text(u.uid, "CARGA", "#ff5040", 1, -10); this.shake = 2; } await wait(500); return;
      case "interrupt": if (u) { const c = this.center(u.uid); if (c) { V.add({ kind: "ring", x: c.x, y: c.y, color: "#7ae0ff", r0: 4, r1: 30, life: 420, width: 2 }); V.sparks(c.x, c.y, "#7ae0ff", 18, 80); } this.text(u.uid, "INTERRUMPIDO", "#7ae0ff", 1, -18); this.shake = 3; } await wait(440); return;
      case "counter": if (u) this.text(u.uid, "CONTRA", "#ffd84a", 1, -14); await wait(200); return;
      case "combo": {
        V.bigFlash("255,230,150"); this.shake = 7; this.focus(this.W * 0.35, this.H * 0.6, 1.16, 1100);
        for (const id of e.uids ?? []) A(id).lunge = { t0: performance.now(), dir: -1, dist: 70, ms: 600, hop: 8 };
        await wait(250);
        for (const f of this.b.units.filter((x) => x.side === "enemy" && x.alive)) { const c = this.center(f.uid); if (!c) continue; V.slash(c.x, c.y, 1, "#ffe08a", true); V.slash(c.x + 4, c.y - 6, -1, "#ffffff", true); V.explosion(c.x, c.y, false); }
        await wait(500);
        return;
      }
      case "phase": { V.bigFlash("190,60,255"); this.shake = 7; const boss = u && this.center(u.uid); if (boss) { V.explosion(boss.x, boss.y, true); V.light(boss.x, boss.y, 120, "190,60,255", 900, 1); this.focus(boss.x, boss.y, 1.18, 900); } await wait(700); return; }
      case "summon": case "join": { const c = u && this.center(u.uid); if (c) { V.beam(c.x, c.y + 10); V.light(c.x, c.y, 60, "255,250,220", 500, 0.8); } await wait(320); return; }
      default: return;
    }
  }
}

function hexToRgb(c) { const n = parseInt(c.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; }

// MARK: Scene view (dialogue backdrops, title)

export class SceneView extends Stage {
  constructor(cv) { super(cv); this.actors = []; this.setScene("titulo"); }
  set(kind, actors = []) { if (kind !== this.kind || !this.L) this.setScene(kind); this.actors = actors; }
  drawActors(x, t) {
    this.actors.forEach((key, k) => {
      const s = sprite(key);
      const fi = Math.floor(t / 450 + k) % 2;
      const px = Math.round(this.W * 0.5 + (k - (this.actors.length - 1) / 2) * 24 - s.w / 2), py = Math.round(this.H * 0.86 - s.h);
      this.drawFigure(x, s, fi, px, py);
    });
  }
}

// MARK: Map view

const MAP_THEMES = {
  bosque: { ground: ["#1e3326", "#24402c", "#2a4a30", "#2e4a2c"], dots: ["#1a2e20", "#355a38"], river: "#2c5470", peaks: "#5a5a6a", trees: "#14261a" },
  minas: { ground: ["#141016", "#1c161e", "#221a24", "#1a141c"], dots: ["#0e0a10", "#3a3040"], river: "#7a2a10", peaks: "#3a3440", lava: true, dark: 0.35 },
  llanuras: { ground: ["#8a7a30", "#a08a38", "#b09a40", "#9a8434"], dots: ["#6a5a20", "#c8b050"], river: "#3a7ab0", peaks: "#7a8aa0" },
  rio: { ground: ["#4a4c4e", "#56585a", "#5e605e", "#505250"], dots: ["#3a3c3e", "#6a6c6a"], river: "#2a5a80", peaks: "#6a6c72", city: true, wide: true },
  ciudadela: { ground: ["#3a2a24", "#46302a", "#4e3630", "#3e2c26"], dots: ["#2a1e1a", "#6a5040"], river: "#5a3a2a", peaks: "#e8e4dc", citadel: true, ash: true },
};

export class MapView {
  constructor(cv) { this.cv = cv; this.x = cv.getContext("2d"); this.x.imageSmoothingEnabled = false; this.W = cv.width; this.H = cv.height; this.base = null; this.running = false; }
  setMap(chapter, game) { this.chapter = chapter; this.game = game; this.theme = MAP_THEMES[chapter.map] ?? MAP_THEMES.bosque; this.base = this.drawBase(); }
  drawBase() {
    const { W, H } = this, th = this.theme;
    const [c, x] = canvas(W, H);
    const r = seeded(31 + (this.chapter?.id ?? 1) * 7);
    gradient(x, W, 0, H, th.ground);
    for (let k = 0; k < 260; k++) { x.fillStyle = r() > 0.5 ? th.dots[0] : th.dots[1]; x.fillRect(Math.floor(r() * W), Math.floor(r() * H), 3, 2); }
    if (th.trees) for (let k = 0; k < 60; k++) pine(x, Math.floor(r() * W), Math.floor(r() * H), 6 + Math.floor(r() * 5), th.trees);
    const rw = th.wide ? 8 : th.lava ? 2 : 4;
    x.fillStyle = th.river; for (let y = 0; y < H; y++) x.fillRect(Math.round(W * 0.9 + Math.sin(y / 9) * 6), y, rw, 1);
    x.fillStyle = th.lava ? "#ff8a30" : "rgba(200,230,255,0.5)"; for (let y = 0; y < H; y += 3) x.fillRect(Math.round(W * 0.9 + Math.sin(y / 9) * 6), y, 1, 1);
    for (let k = 0; k < 5; k++) { const mx = W * 0.62 + k * 16, my = 18; x.fillStyle = th.peaks; for (let j = 0; j < 14; j++) x.fillRect(Math.round(mx - j / 1.2), my + j, Math.round(j * 1.7), 1); if (!th.citadel) { x.fillStyle = "#e8e8f0"; x.fillRect(Math.round(mx - 1), my, 3, 2); } }
    if (th.city) for (let k = 0; k < 40; k++) { x.fillStyle = r() < 0.5 ? "#7a7c80" : "#3a3c40"; x.fillRect(Math.floor(r() * W), Math.floor(r() * H), 4, 3); }
    if (th.citadel) { const cx = W * 0.6, cy = H * 0.12; for (let t = 0; t < 4; t++) { x.fillStyle = "#e8e4dc"; x.beginPath(); x.arc(cx, cy + 8, 30 - t * 6, Math.PI, 0); x.fill(); x.fillStyle = "#b8b2a6"; x.fillRect(cx - 30 + t * 6, cy + 8, 60 - t * 12, 1); } }
    // Soft vignette baked in.
    const v = x.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.8); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, `rgba(0,0,0,${0.35 + (th.dark ?? 0)})`); x.fillStyle = v; x.fillRect(0, 0, W, H);
    return c;
  }
  start() { if (this.running) return; this.running = true; const tick = (t) => { if (!this.running) return; this.draw(t); requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
  stop() { this.running = false; }
  draw(t) {
    const { x, W, H, chapter, game } = this;
    if (!this.base) return;
    x.drawImage(this.base, 0, 0);
    // Cloud shadows drifting over the land.
    x.fillStyle = "rgba(0,0,0,0.12)";
    for (let k = 0; k < 3; k++) { const cx = ((t / (90 + k * 40) + k * 90) % (W + 80)) - 40; x.beginPath(); x.ellipse(cx, H * (0.25 + k * 0.28), 26, 9, 0, 0, Math.PI * 2); x.fill(); }
    const nodes = chapter.nodes;
    for (const [id, n] of Object.entries(nodes)) for (const l of n.links) {
      if (id > l || !nodes[l]) continue;
      const m = nodes[l];
      const open = game.unlocked.includes(id) && game.unlocked.includes(l);
      for (let k = 0; k <= 30; k += 2) { const px = n.x * W + (m.x - n.x) * W * (k / 30), py = n.y * H + (m.y - n.y) * H * (k / 30); x.fillStyle = open ? "#d8b878" : "rgba(80,90,80,0.6)"; x.fillRect(Math.round(px), Math.round(py), 2, 1); }
    }
    for (const [id, n] of Object.entries(nodes)) {
      const px = Math.round(n.x * W), py = Math.round(n.y * H);
      const open = game.unlocked.includes(id), here = game.node === id;
      const pulse = here ? Math.round(1 + Math.sin(t / 200)) : 0;
      if (open) {
        x.globalCompositeOperation = "lighter";
        const g = x.createRadialGradient(px, py, 0, px, py, 16); g.addColorStop(0, n.camp ? "rgba(255,150,50,0.5)" : "rgba(255,220,130,0.3)"); g.addColorStop(1, "rgba(255,200,100,0)"); x.fillStyle = g; x.fillRect(px - 16, py - 16, 32, 32);
        x.globalCompositeOperation = "source-over";
      }
      x.fillStyle = OUTLINE; x.fillRect(px - 4 - pulse, py - 4 - pulse, 9 + pulse * 2, 9 + pulse * 2);
      x.fillStyle = !open ? "#4a5048" : n.camp ? "#ff9a40" : game.visited.includes(id) ? "#d8b878" : "#ffe08a";
      x.fillRect(px - 3 - pulse, py - 3 - pulse, 7 + pulse * 2, 7 + pulse * 2);
      if (n.camp && open) { x.fillStyle = "#ffe060"; x.fillRect(px - 1, py - 2 + Math.round(Math.sin(t / 100)), 2, 2); }
      if (here) { const b = Math.round(Math.sin(t / 250) * 2); x.fillStyle = "#ffffff"; x.fillRect(px, py - 9 + b, 1, 3); x.fillRect(px - 1, py - 7 + b, 3, 1); }
    }
    if (this.theme.ash) { x.fillStyle = "rgba(210,200,200,0.5)"; for (let k = 0; k < 30; k++) x.fillRect(Math.round((k * 47 + Math.sin(t / 1000 + k) * 6) % W), Math.round((k * 31 + t / 60) % H), 1, 1); }
    if (this.theme.lava) for (let k = 0; k < 10; k++) { const a = (Math.sin(t / 300 + k) + 1) / 2; x.fillStyle = `rgba(255,140,40,${a * 0.5})`; x.fillRect(Math.round(W * 0.9 + Math.sin((k * 20) / 9) * 6), k * 20, 2, 2); }
  }
}
