// Pixel-art renderer: every sprite, background and effect is drawn in code on low-resolution
// canvases that CSS scales up with crisp pixels. Sprites are built from simple shapes on a pixel
// grid, then shaded (light from the top-left) and outlined, Sea-of-Stars-style warm palettes.

import { HEROES } from "./characters.js";

// MARK: Pixel helpers

const OUTLINE = "#160f1c";

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d");
  x.imageSmoothingEnabled = false;
  return [c, x];
}

function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function shade(c, f) { const [r, g, b] = hex(c); const k = (v) => Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)))); return `rgb(${k(r)},${k(g)},${k(b)})`; }

/** Shading (lighter top-left edges, darker bottom-right) and a dark outline around the shape. */
function finish(c) {
  const x = c.getContext("2d");
  const { width: w, height: h } = c;
  const img = x.getImageData(0, 0, w, h);
  const d = img.data;
  const at = (i, j) => (i < 0 || j < 0 || i >= w || j >= h ? 0 : d[(j * w + i) * 4 + 3]);
  const out = new Uint8ClampedArray(d);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = (j * w + i) * 4;
    if (d[k + 3]) {
      const lit = !at(i - 1, j) || !at(i, j - 1);
      const dark = !at(i + 1, j) || !at(i, j + 1);
      const f = lit && !dark ? 1.18 : dark && !lit ? 0.78 : 1;
      out[k] = Math.min(255, d[k] * f); out[k + 1] = Math.min(255, d[k + 1] * f); out[k + 2] = Math.min(255, d[k + 2] * f);
    } else if (at(i - 1, j) || at(i + 1, j) || at(i, j - 1) || at(i, j + 1)) {
      const [r, g, b] = hex(OUTLINE);
      out[k] = r; out[k + 1] = g; out[k + 2] = b; out[k + 3] = 255;
    }
  }
  x.putImageData(new ImageData(out, w, h), 0, 0);
  return c;
}

function flip(src) {
  const [c, x] = canvas(src.width, src.height);
  x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0);
  return c;
}

// MARK: Sprites

/** A humanoid facing right, on a 20×28 grid (big: scaled grid). bob shifts the upper body up. */
function humanoid(o, bob = 0, big = 1) {
  const W = Math.round(20 * big), H = Math.round(28 * big);
  const [c, x] = canvas(W + 2, H + 2);
  const R = (col, x0, y0, w, h, upper = true) => {
    x.fillStyle = col;
    const yy = y0 - (upper ? bob : 0);
    x.fillRect(Math.round(x0 * big) + 1, Math.round(yy * big) + 1, Math.max(1, Math.round(w * big)), Math.max(1, Math.round(h * big)));
  };
  const top = 4; // head top (room for hats)
  // Cape behind.
  if (o.cape) { R(o.cape, 3, top + 8, 3, 11); R(shade(o.cape, -0.25), 2, top + 16, 4, 4); }
  // Legs and boots.
  R(shade(o.legs, -0.2), 7, top + 15, 2, 7, false); R(o.legs, 10, top + 15, 2, 7, false);
  R("#3a2418", 6, top + 21, 3, 2, false); R("#4a2e1e", 10, top + 21, 3, 2, false);
  // Back arm, torso, belt.
  R(shade(o.tunic, -0.3), 5, top + 8, 2, 6);
  R(o.tunic, 6, top + 7, 6, 9); R(shade(o.tunic, -0.15), 6, top + 13, 6, 3);
  R(o.trim, 6, top + 12, 6, 1); R(o.trim, 8, top + 7, 2, 1);
  // Head.
  R(o.skin, 7, top, 5, 6);
  R(OUTLINE, 10, top + 2, 1, 1); // eye
  R(shade(o.skin, -0.15), 7, top + 5, 5, 1);
  // Hair styles.
  const hair = o.hair;
  if (o.hairStyle === "short") { R(hair, 7, top - 1, 5, 2); R(hair, 6, top, 2, 3); }
  if (o.hairStyle === "long") { R(hair, 7, top - 1, 5, 2); R(hair, 6, top, 2, 8); R(hair, 5, top + 3, 2, 6); R(hair, 11, top - 1, 1, 2); }
  if (o.hairStyle === "hood") { R(o.cape, 6, top - 1, 7, 2); R(o.cape, 6, top, 2, 6); R(o.cape, 5, top + 2, 2, 6); R(hair, 8, top + 1, 3, 1); }
  if (o.hairStyle === "wizard") { R(o.cape, 4, top - 1, 11, 1); R(o.cape, 6, top - 3, 6, 2); R(o.cape, 7, top - 5, 3, 2); R(o.cape, 8, top - 6, 2, 1); R(hair, 6, top, 2, 4); }
  if (o.hairStyle === "bald") { R(shade(o.skin, 0.1), 7, top - 1, 5, 1); }
  if (o.helmet) { R(o.helmet, 6, top - 1, 7, 3); R(shade(o.helmet, 0.3), 7, top - 1, 4, 1); }
  if (o.beard === true) R(hair, 9, top + 4, 3, 2);
  if (o.beard === "long") { R("#e8e8ee", 8, top + 4, 4, 6); R("#d0d0d8", 9, top + 9, 2, 2); }
  if (o.ears) { R(o.skin, 6, top + 1, 1, 2); R(o.skin, 5, top, 1, 1); }
  // Front arm and hand.
  R(o.tunic, 11, top + 8, 2, 5); R(o.skin, 12, top + 12, 2, 2);
  // Weapons (held in the front hand).
  const wp = o.weapon;
  if (wp === "sword") { R("#5a3a22", 13, top + 11, 1, 3); R(o.trim, 12, top + 10, 3, 1); for (let k = 0; k < 7; k++) R(k < 2 ? "#ffffff" : "#c8d0e0", 14 + Math.floor(k / 2), top + 9 - k, 1, 1); }
  if (wp === "knife") { R("#5a3a22", 13, top + 12, 1, 2); R("#b8c0c8", 14, top + 9, 1, 3); }
  if (wp === "bow") { R("#7a5230", 14, top + 4, 1, 1); R("#7a5230", 15, top + 5, 1, 8); R("#7a5230", 14, top + 13, 1, 1); R("#e8e0c8", 14, top + 5, 1, 8); }
  if (wp === "staff") { R("#6a4a2a", 14, top + 1, 1, 21); R(o.gem ?? "#bfe8ff", 13, top - 2, 3, 3); R("#ffffff", 14, top - 2, 1, 1); }
  if (wp === "club") { R("#5a3a22", 13, top + 7, 2, 7); R("#6a4a2e", 12, top + 3, 4, 5); R("#8a8a8a", 13, top + 4, 1, 1); R("#8a8a8a", 15, top + 6, 1, 1); }
  return finish(c);
}

function wolf(o, bob = 0, big = 1) {
  const [c, x] = canvas(Math.round(30 * big), Math.round(20 * big));
  const R = (col, x0, y0, w, h, up = true) => { x.fillStyle = col; x.fillRect(Math.round(x0 * big) + 1, Math.round((y0 - (up ? bob : 0)) * big) + 1, Math.max(1, Math.round(w * big)), Math.max(1, Math.round(h * big))); };
  R(o.fur, 1, 4, 5, 2); R(o.fur, 0, 2, 3, 3); // tail
  R(o.fur, 5, 6, 15, 7); R(shade(o.fur, -0.2), 5, 11, 15, 2); R(o.mane ?? shade(o.fur, 0.2), 15, 5, 5, 7);
  R(o.fur, 19, 3, 7, 6); R(o.fur, 24, 6, 4, 3); R("#1a1014", 27, 7, 1, 1); // head, snout, nose
  R(o.fur, 20, 1, 2, 3); R(o.fur, 23, 1, 2, 3); // ears
  R(o.eye ?? "#ff4040", 23, 5, 1, 1);
  R("#e8e0d0", 25, 9, 2, 1); // fangs
  for (const lx of [6, 9, 15, 18]) R(shade(o.fur, -0.15), lx, 13, 2, 5, false);
  return finish(c);
}

function spider(o, bob = 0, big = 1) {
  const [c, x] = canvas(Math.round(30 * big), Math.round(20 * big));
  const P = (col, x0, y0, w = 1, h = 1, up = true) => { x.fillStyle = col; x.fillRect(Math.round(x0 * big) + 1, Math.round((y0 - (up ? bob : 0)) * big) + 1, Math.max(1, Math.round(w * big)), Math.max(1, Math.round(h * big))); };
  for (let k = 0; k < 4; k++) { // legs
    const lx = 9 + k * 3;
    P(o.leg, lx, 9, 1, 3, false); P(o.leg, lx - 2, 12, 2, 1, false); P(o.leg, lx - 3, 13, 1, 5, false);
    P(o.leg, lx + 1, 8, 1, 2); P(o.leg, lx + 2, 6, 1, 2);
  }
  for (let j = -5; j <= 5; j++) for (let i = -6; i <= 6; i++) if ((i * i) / 36 + (j * j) / 25 <= 1) P(o.body, 9 + i, 9 + j);
  for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (i * i + j * j <= 10) P(o.head ?? o.body, 19 + i, 10 + j);
  P(o.mark ?? "#c8e070", 7, 7, 3, 2); P(o.mark ?? "#c8e070", 8, 9, 1, 3);
  P("#ff3030", 21, 9); P("#ff3030", 21, 11); P("#ff6060", 22, 10);
  if (o.crown) for (const sx of [4, 7, 10, 13]) P(o.crown, sx, 2, 1, 3);
  return finish(c);
}

function treeGiant(bob = 0) {
  const [c, x] = canvas(58, 66);
  const R = (col, x0, y0, w, h, up = true) => { x.fillStyle = col; x.fillRect(x0, y0 - (up ? bob : 0), w, h); };
  // Roots.
  for (const [rx, rw] of [[8, 10], [20, 6], [32, 7], [42, 12]]) R("#3a2a1e", rx, 58, rw, 5, false);
  R("#4a3424", 14, 52, 30, 7, false);
  // Trunk.
  R("#5a4030", 16, 18, 26, 36); R("#6a4c36", 18, 18, 8, 36); R("#47321f", 34, 18, 6, 36);
  for (let k = 0; k < 6; k++) R("#3a2818", 20 + k * 4, 24 + (k % 2) * 6, 1, 18);
  // Glowing cracks.
  R("#c050ff", 28, 34, 1, 9); R("#c050ff", 27, 42, 3, 1); R("#e090ff", 22, 46, 1, 5);
  // Head knot and eyes.
  R("#5a4030", 18, 8, 22, 12); R("#6a4c36", 20, 8, 8, 4);
  R("#f0a0ff", 22, 12, 4, 3); R("#f0a0ff", 32, 12, 4, 3); R("#ffffff", 23, 13, 1, 1); R("#ffffff", 33, 13, 1, 1);
  R("#2a1a12", 25, 17, 8, 2);
  // Branch arms.
  R("#5a4030", 6, 22, 11, 4); R("#5a4030", 3, 14, 4, 10); R("#5a4030", 0, 10, 3, 5); R("#5a4030", 41, 22, 12, 4); R("#5a4030", 51, 12, 4, 12); R("#5a4030", 54, 8, 3, 5);
  // Canopy of sick leaves and moss.
  for (const [lx, ly, lw, lh] of [[10, 2, 14, 7], [26, 0, 16, 8], [16, 4, 26, 5], [0, 6, 6, 5], [52, 4, 6, 5]]) R("#4a6a3a", lx, ly, lw, lh);
  for (const [lx, ly] of [[14, 3], [30, 1], [22, 5], [36, 4]]) R("#7a5a8a", lx, ly, 3, 2);
  R("#5a8a4a", 16, 28, 5, 3); R("#5a8a4a", 36, 40, 4, 3); R("#5a8a4a", 20, 50, 6, 2);
  return finish(c);
}

const SPRITE_DEFS = {
  merodeador: (b) => humanoid({ skin: "#8a9a7a", hair: "#3a3a2a", hairStyle: "bald", tunic: "#6a5040", trim: "#3a2a20", legs: "#4a3a2a", weapon: "knife", ears: true }, b),
  arquero: (b) => humanoid({ skin: "#8a9a7a", hair: "#2a2a20", hairStyle: "hood", tunic: "#5a5a40", trim: "#3a2a20", cape: "#3a3a2a", legs: "#3a3020", weapon: "bow", ears: true }, b),
  bruto: (b) => humanoid({ skin: "#6a6a74", hair: "#202020", hairStyle: "bald", tunic: "#4a3a30", trim: "#8a2a20", legs: "#3a2a20", weapon: "club", helmet: "#4a4a50" }, b, 1.45),
  lobo: (b) => wolf({ fur: "#5a5a6a" }, b),
  "lobo-alfa": (b) => wolf({ fur: "#3a3a48", mane: "#c8c8d8", eye: "#ffcc30" }, b, 1.35),
  arana: (b) => spider({ body: "#3a4a2a", leg: "#2a3a1e", mark: "#a8d060" }, b),
  "reina-arana": (b) => spider({ body: "#2e3a26", leg: "#24301c", mark: "#d0e080", head: "#4a3a5a", crown: "#a080c0" }, b, 1.6),
  guardian: (b) => treeGiant(b),
};

const cache = new Map();

/** A sprite: two idle frames, facing right (enemies) or left (heroes, flipped). */
export function sprite(key) {
  if (cache.has(key)) return cache.get(key);
  let frames;
  if (HEROES[key]) frames = [0, 1].map((b) => flip(humanoid(HEROES[key].sprite, b)));
  else frames = [0, 1].map((b) => SPRITE_DEFS[key](b));
  const white = frames.map((f) => { const [c, x] = canvas(f.width, f.height); x.drawImage(f, 0, 0); x.globalCompositeOperation = "source-atop"; x.fillStyle = "#ffffff"; x.fillRect(0, 0, f.width, f.height); return c; });
  const s = { frames, white, w: frames[0].width, h: frames[0].height };
  cache.set(key, s);
  return s;
}

/** A small portrait (head and shoulders) as a data URL, for dialogue and the turn timeline. */
const portraitCache = new Map();
export function portrait(key, size = 32) {
  const k = `${key}@${size}`;
  if (portraitCache.has(k)) return portraitCache.get(k);
  const s = sprite(key);
  const f = s.frames[0];
  const [c, x] = canvas(size, size);
  const crop = HEROES[key] ? Math.round(f.width * 0.75) : Math.min(f.width, f.height);
  const sx = HEROES[key] ? Math.round(f.width * 0.15) : 0;
  const sy = HEROES[key] ? 0 : Math.max(0, Math.round((f.height - crop) / 2));
  x.drawImage(f, sx, sy, crop, crop, 0, 0, size, size);
  const url = c.toDataURL();
  portraitCache.set(k, url);
  return url;
}

// MARK: Bitmap font (3×5) for floating numbers and labels

const FONT = {
  0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 3: "111001111001111", 4: "101101111001001",
  5: "111100111001111", 6: "111100111101111", 7: "111001010010010", 8: "111101111101111", 9: "111101111001111",
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
  F: "111100110100100", G: "011100101101011", I: "111010010010111", L: "100100100100111", M: "101111111101101",
  N: "110101101101101", O: "010101101101010", P: "110101110100100", R: "110101110101101", S: "011100010001110",
  T: "111010010010010", U: "101101101101111", V: "101101101101010", "+": "000010111010000", "!": "010010010000010",
  "-": "000000111000000", " ": "000000000000000", "¡": "010000010010010", "É": "111100110100111",
};

export function drawText(x, text, px, py, color, scale = 1) {
  let cx = Math.round(px - (text.length * 4 * scale) / 2);
  for (const ch of text.toUpperCase()) {
    const g = FONT[ch] ?? FONT[" "];
    for (let pass = 0; pass < 2; pass++) {
      x.fillStyle = pass ? color : OUTLINE;
      for (let k = 0; k < 15; k++) if (g[k] === "1") {
        const gx = cx + (k % 3) * scale, gy = py + Math.floor(k / 3) * scale;
        if (pass) x.fillRect(gx, gy, scale, scale);
        else for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) x.fillRect(gx + dx, gy + dy, scale, scale);
      }
    }
    cx += 4 * scale;
  }
}

// MARK: Backgrounds

function seeded(seed) { let t = seed; return () => { t = (t * 1664525 + 1013904223) >>> 0; return t / 4294967296; }; }

/** A dithered vertical gradient between colour stops. */
function gradient(x, w, y0, y1, stops) {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0 - 1) * (stops.length - 1);
    const k = Math.min(stops.length - 2, Math.floor(t)), f = t - k;
    for (let i = 0; i < w; i++) {
      const pick = f > ((i + y) % 2 ? 0.66 : 0.33) ? stops[k + 1] : stops[k];
      x.fillStyle = pick; x.fillRect(i, y, 1, 1);
    }
  }
}

function pine(x, cx, base, h, col) {
  for (let j = 0; j < h; j++) {
    const half = Math.floor((j / h) * (h * 0.32)) + (j % 4 === 0 ? 1 : 0);
    x.fillStyle = col; x.fillRect(cx - half, base - h + j, half * 2 + 1, 1);
  }
}


const BG = {
  bosque: { sky: ["#1f2a48", "#3e4a6e", "#c98a6a", "#f2c48a"], far: "#4a5a72", mid: "#2f4a3c", near: "#1d2e26", ground: ["#3a4a2a", "#4a5a30", "#5a4a30"], light: "rgba(255,220,160,0.10)", motes: "#ffe8b0" },
  claro: { sky: ["#0e1430", "#1c2450", "#2a3060", "#3a3a6a"], far: "#22304a", mid: "#1a2a26", near: "#121c18", ground: ["#2a3420", "#34402a", "#3a3224"], light: "rgba(255,170,90,0.10)", motes: "#ffd080", fire: true },
  ruinas: { sky: ["#2a1e3e", "#4a3260", "#8a5a7a", "#c8907a"], far: "#4a4060", mid: "#3a4436", near: "#24281e", ground: ["#3a3a30", "#4a4838", "#55503e"], light: "rgba(200,180,255,0.10)", motes: "#e0d0ff", ruins: true },
  hondonada: { sky: ["#0e0814", "#1e1028", "#3a1a40", "#5a2050"], far: "#2a1a30", mid: "#1e1424", near: "#140c18", ground: ["#2a1a24", "#341e2a", "#3e2430"], light: "rgba(220,90,255,0.10)", motes: "#e080ff", twisted: true },
  titulo: { sky: ["#141a38", "#2a2e5a", "#7a5a7a", "#e8a070"], far: "#3a3e60", mid: "#22303a", near: "#141c22", ground: ["#1e2a20", "#24301e", "#2a2a1e"], light: "rgba(255,210,150,0.12)", motes: "#ffe0a0" },
};

const bgCache = new Map();
/** The static part of a scene background (sky, layered trees, ground). */
export function background(kind, w, h) {
  const key = `${kind}@${w}x${h}`;
  if (bgCache.has(key)) return bgCache.get(key);
  const p = BG[kind] ?? BG.bosque;
  const [c, x] = canvas(w, h);
  const rnd = seeded(kind.length * 977 + w);
  const horizon = Math.round(h * 0.55);
  gradient(x, w, 0, horizon + 10, p.sky);
  // Moon or sun.
  x.fillStyle = kind === "hondonada" ? "#e070ff" : kind === "claro" ? "#f0f0ff" : "#fff0c0";
  const mx = Math.round(w * 0.78), my = Math.round(h * 0.16), mr = 7;
  for (let j = -mr; j <= mr; j++) for (let i = -mr; i <= mr; i++) if (i * i + j * j <= mr * mr) x.fillRect(mx + i, my + j, 1, 1);
  if (kind === "claro" || kind === "titulo") for (let k = 0; k < 40; k++) { x.fillStyle = rnd() > 0.5 ? "#ffffff" : "#a0b0ff"; x.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * horizon * 0.8), 1, 1); }
  // Far, mid and near tree layers.
  for (let i = -4; i < w + 8; i += 6 + Math.floor(rnd() * 5)) pine(x, i, horizon + 8, 20 + Math.floor(rnd() * 14), p.far);
  if (p.ruins) for (let i = 10; i < w; i += 34 + Math.floor(rnd() * 20)) { x.fillStyle = "#6a6478"; const ch = 18 + Math.floor(rnd() * 22); x.fillRect(i, horizon + 10 - ch, 6, ch); x.fillStyle = "#7e7890"; x.fillRect(i - 1, horizon + 10 - ch, 8, 3); x.fillStyle = "#4a6a3a"; x.fillRect(i, horizon + 4 - Math.floor(ch / 2), 3, 4); }
  for (let i = -6; i < w + 10; i += 9 + Math.floor(rnd() * 8)) {
    if (p.twisted) { x.fillStyle = p.mid; const th = 26 + Math.floor(rnd() * 18); for (let j = 0; j < th; j++) x.fillRect(i + Math.round(Math.sin(j / 4) * 2), horizon + 14 - j, 3, 1); x.fillRect(i - 4, horizon + 14 - th, 11, 2); }
    else pine(x, i, horizon + 16, 26 + Math.floor(rnd() * 20), p.mid);
  }
  // Ground with a path.
  gradient(x, w, horizon + 12, h, p.ground);
  for (let k = 0; k < w * 2; k++) { x.fillStyle = rnd() > 0.5 ? shade(p.ground[1], 0.15) : shade(p.ground[0], -0.2); x.fillRect(Math.floor(rnd() * w), horizon + 14 + Math.floor(rnd() * (h - horizon - 14)), 1, 1); }
  x.fillStyle = shade(p.ground[2], 0.12);
  for (let y = horizon + 18; y < h; y++) { const half = 10 + (y - horizon) * 0.55; x.fillRect(Math.round(w * 0.5 - half + Math.sin(y / 6) * 3), y, Math.round(half * 2), 1); }
  // Near trunks framing the scene.
  x.fillStyle = p.near;
  x.fillRect(0, 0, 7, h); x.fillRect(w - 6, 0, 6, h); x.fillRect(4, 0, 14, 10); x.fillRect(w - 18, 0, 14, 9);
  if (p.twisted) { x.fillStyle = "#b040e0"; for (let k = 0; k < 6; k++) { const rx = Math.floor(rnd() * w); x.fillRect(rx, h - 8 - Math.floor(rnd() * 20), 1, 6); } }
  if (p.fire) { // campfire logs
    const fx = Math.round(w * 0.5), fy = Math.round(h * 0.82);
    x.fillStyle = "#4a2e1e"; x.fillRect(fx - 8, fy, 16, 3); x.fillRect(fx - 5, fy - 2, 10, 2);
    x.fillStyle = "#6a6a70"; for (const sx of [-10, -6, 6, 9]) x.fillRect(fx + sx, fy + 2, 3, 2);
  }
  bgCache.set(key, c);
  return c;
}

// MARK: Ambient particles

export class Ambient {
  constructor(kind, w, h) {
    this.kind = kind; this.w = w; this.h = h;
    const r = seeded(7);
    this.motes = Array.from({ length: 26 }, () => ({ x: r() * w, y: r() * h, s: 0.1 + r() * 0.25, p: r() * 6.28 }));
    this.flies = BG[kind]?.fire || kind === "bosque" || kind === "titulo" ? Array.from({ length: 8 }, () => ({ x: r() * w, y: h * 0.5 + r() * h * 0.4, p: r() * 6.28 })) : [];
  }
  draw(x, t) {
    const p = BG[this.kind] ?? BG.bosque;
    // Light shafts.
    x.fillStyle = p.light;
    for (let k = 0; k < 3; k++) {
      const off = Math.sin(t / 2200 + k) * 6;
      x.beginPath();
      const sx = this.w * (0.25 + k * 0.25) + off;
      x.moveTo(sx, 0); x.lineTo(sx + 14, 0); x.lineTo(sx - 26, this.h); x.lineTo(sx - 48, this.h); x.fill();
    }
    // Mist bands.
    for (let k = 0; k < 3; k++) {
      x.fillStyle = `rgba(220,225,240,${0.05 + k * 0.02})`;
      const y = this.h * (0.5 + k * 0.12) + Math.sin(t / 1800 + k * 2) * 2;
      const dx = ((t / (60 + k * 30)) % (this.w * 2)) - this.w;
      x.fillRect(Math.round(dx), Math.round(y), this.w, 3); x.fillRect(Math.round(dx - this.w * 1.1), Math.round(y + 2), this.w, 2);
    }
    // Dust motes.
    x.fillStyle = p.motes;
    for (const m of this.motes) {
      const yy = (m.y - (t * m.s) / 40) % this.h;
      const xx = m.x + Math.sin(t / 900 + m.p) * 3;
      if (Math.sin(t / 400 + m.p) > -0.2) x.fillRect(Math.round(xx), Math.round(yy < 0 ? yy + this.h : yy), 1, 1);
    }
    // Fireflies / embers.
    for (const f of this.flies) {
      const a = (Math.sin(t / 500 + f.p) + 1) / 2;
      x.fillStyle = BG[this.kind]?.fire ? `rgba(255,${150 + Math.round(a * 80)},60,${a})` : `rgba(210,255,140,${a})`;
      x.fillRect(Math.round(f.x + Math.sin(t / 1300 + f.p) * 6), Math.round(f.y + Math.cos(t / 1100 + f.p) * 4 - (BG[this.kind]?.fire ? (t / 30 + f.p * 40) % 40 : 0)), 1, 1);
    }
    // Campfire flames and glow.
    if (p.fire) {
      const fx = Math.round(this.w * 0.5), fy = Math.round(this.h * 0.82);
      const g = x.createRadialGradient(fx, fy, 2, fx, fy, 60);
      g.addColorStop(0, `rgba(255,160,70,${0.32 + Math.sin(t / 120) * 0.05})`); g.addColorStop(1, "rgba(255,120,40,0)");
      x.fillStyle = g; x.fillRect(fx - 60, fy - 60, 120, 120);
      for (let k = 0; k < 5; k++) { const hgt = 4 + ((Math.sin(t / 90 + k * 1.7) + 1) * 3) | 0; x.fillStyle = k % 2 ? "#ffd060" : "#ff7a30"; x.fillRect(fx - 5 + k * 2, fy - hgt, 2, hgt); }
    }
  }
}

// MARK: Battle view

/** Screen positions of fighters: enemies on the left facing right, heroes on the right facing left. */
export function battleLayout(b, W, H) {
  const pos = new Map();
  const heroes = b.units.filter((u) => u.side === "hero" && !u.inReserve);
  const foes = b.units.filter((u) => u.side === "enemy" && (u.alive || u.fading));
  const ground = H * 0.62; // where the grass starts
  heroes.forEach((u, k) => pos.set(u.uid, { x: W - 44 + (k % 2 ? 16 : 0), y: ground + 14 + k * 17 }));
  const big = foes.find((u) => u.boss);
  let k = 0;
  for (const u of foes) {
    if (u.boss) { pos.set(u.uid, { x: 52, y: H - 6 }); continue; }
    const slot = k;
    pos.set(u.uid, { x: (big ? 104 : 38) + (slot % 2) * 30, y: ground + 14 + (slot % 3) * 15 });
    k++;
  }
  return pos;
}

/**
 * The battle scene renderer: draws the background, fighters (idle bob, flashes, lunges), floating
 * numbers and screen effects, and plays the engine's events as short animations.
 */
export class BattleView {
  constructor(cv) {
    this.cv = cv; this.x = cv.getContext("2d"); this.x.imageSmoothingEnabled = false;
    this.W = cv.width; this.H = cv.height;
    this.fx = []; this.shake = 0; this.flash = null; this.anims = new Map(); this.hitstop = 0;
    this.b = null; this.amb = null; this.selected = null; this.running = false;
  }
  setBattle(b) { this.b = b; this.amb = new Ambient(b.bg, this.W, this.H); this.fx = []; this.anims.clear(); }
  start() { if (this.running) return; this.running = true; const tick = (t) => { if (!this.running) return; this.draw(t); requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
  stop() { this.running = false; }

  /** Which fighter is at a canvas point (for tap targeting). */
  hit(px, py) {
    if (!this.b) return null;
    const pos = battleLayout(this.b, this.W, this.H);
    for (const u of this.b.units) {
      const p = pos.get(u.uid); if (!p || !u.alive) continue;
      const s = sprite(u.side === "hero" ? u.id : spriteKey(u));
      if (px >= p.x - s.w / 2 && px <= p.x + s.w / 2 && py >= p.y - s.h && py <= p.y) return u.uid;
    }
    return null;
  }

  draw(t) {
    const { x, W, H, b } = this;
    if (!b) return;
    x.save();
    if (this.shake > 0) { x.translate(Math.round((Math.random() - 0.5) * this.shake), Math.round((Math.random() - 0.5) * this.shake)); this.shake *= 0.85; if (this.shake < 0.5) this.shake = 0; }
    x.drawImage(background(b.bg, W, H), 0, 0);
    this.amb.draw(x, t);
    const pos = battleLayout(b, W, H);
    const order = [...b.units].filter((u) => pos.has(u.uid)).sort((a, c) => pos.get(a.uid).y - pos.get(c.uid).y);
    for (const u of order) this.drawUnit(u, pos.get(u.uid), t);
    // Floating numbers and particles.
    const now = performance.now();
    this.fx = this.fx.filter((f) => now - f.t0 < f.life);
    for (const f of this.fx) {
      const k = (now - f.t0) / f.life;
      if (f.kind === "text") drawText(x, f.text, f.x, Math.round(f.y - k * 16), f.color, f.scale ?? 1);
      if (f.kind === "spark") { x.fillStyle = f.color; x.globalAlpha = 1 - k; x.fillRect(Math.round(f.x + f.vx * k * 20), Math.round(f.y + f.vy * k * 20), 2, 2); x.globalAlpha = 1; }
      if (f.kind === "orb") { const px = f.x + (f.tx - f.x) * k, py = f.y + (f.ty - f.y) * k - Math.sin(k * Math.PI) * 10; x.fillStyle = f.color; x.fillRect(Math.round(px) - 2, Math.round(py) - 2, 4, 4); x.fillStyle = "#ffffff"; x.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2); }
      if (f.kind === "ring") { x.strokeStyle = f.color; x.globalAlpha = 1 - k; x.lineWidth = 1; x.beginPath(); x.arc(f.x, f.y, 4 + k * 16, 0, 6.28); x.stroke(); x.globalAlpha = 1; }
    }
    x.restore();
    if (this.flash) {
      const k = (now - this.flash.t0) / this.flash.life;
      if (k >= 1) this.flash = null; else { x.fillStyle = this.flash.color; x.globalAlpha = (1 - k) * this.flash.alpha; x.fillRect(0, 0, W, H); x.globalAlpha = 1; }
    }
  }

  drawUnit(u, p, t) {
    const { x } = this;
    const a = this.anims.get(u.uid) ?? {};
    const s = sprite(u.side === "hero" ? u.id : spriteKey(u));
    const fi = Math.floor(t / 420 + (u.uid.charCodeAt(1) % 2)) % 2;
    const frame = s.frames[fi];
    const now = performance.now();
    let dx = 0, dy = 0, alpha = 1;
    if (a.lunge) { const k = Math.min(1, (now - a.lunge.t0) / 300); const e = Math.sin(k * Math.PI); dx = a.lunge.dir * e * 14; if (k >= 1) delete a.lunge; }
    if (a.hurt) { const k = (now - a.hurt.t0) / 260; if (k >= 1) delete a.hurt; else dx += (u.side === "hero" ? 1 : -1) * Math.sin(k * 20) * 2; }
    if (!u.alive) { const k = Math.min(1, (now - (a.ko ?? now)) / 600); alpha = u.side === "enemy" ? 1 - k : 0.45; dy = u.side === "enemy" ? k * 4 : 0; if (u.side === "enemy" && k >= 1) return; }
    const px = Math.round(p.x - s.w / 2 + dx), py = Math.round(p.y - s.h + dy);
    // Shadow.
    x.fillStyle = "rgba(10,6,20,0.35)"; x.fillRect(Math.round(p.x - s.w / 3), Math.round(p.y - 1), Math.round(s.w / 1.5), 3);
    // Charging aura.
    if (u.charging && u.alive) { const k = (Math.sin(now / 120) + 1) / 2; x.fillStyle = `rgba(255,70,50,${0.18 + k * 0.2})`; x.fillRect(px - 2, py - 2, s.w + 4, s.h + 4); drawText(x, "!", p.x, py - 9, "#ff5040"); }
    if (u.uid === this.b.turnUid && u.alive) { x.fillStyle = "#ffe08a"; const bob = Math.round(Math.sin(now / 160)); x.fillRect(Math.round(p.x) - 1, py - 6 + bob, 3, 2); x.fillRect(Math.round(p.x), py - 4 + bob, 1, 1); }
    if (u.uid === this.selected) { x.strokeStyle = "#ffe08a"; x.globalAlpha = 0.6 + Math.sin(now / 100) * 0.4; x.strokeRect(px - 1.5, py - 1.5, s.w + 3, s.h + 3); x.globalAlpha = 1; }
    x.globalAlpha = alpha;
    x.drawImage(frame, px, py);
    if (a.flash && now - a.flash < 100) x.drawImage(s.white[fi], px, py);
    x.globalAlpha = 1;
    // Enemy health bar.
    if (u.side === "enemy" && u.alive) {
      const bw = Math.max(16, Math.min(34, s.w));
      const bx = Math.round(p.x - bw / 2), by = Math.round(p.y + 2);
      x.fillStyle = OUTLINE; x.fillRect(bx - 1, by - 1, bw + 2, 4);
      x.fillStyle = "#4a1a1a"; x.fillRect(bx, by, bw, 2);
      x.fillStyle = u.hp / u.hpMax > 0.4 ? "#e04848" : "#ff8a30"; x.fillRect(bx, by, Math.round((bw * u.hp) / u.hpMax), 2);
    }
    this.anims.set(u.uid, a);
  }

  // MARK: Event animations

  text(uid, text, color, scale = 1, dy = 0) {
    const p = battleLayout(this.b, this.W, this.H).get(uid);
    if (!p) return;
    const s = sprite(this.b.units.find((u) => u.uid === uid).side === "hero" ? this.b.units.find((u) => u.uid === uid).id : spriteKey(this.b.units.find((u) => u.uid === uid)));
    this.fx.push({ kind: "text", text, color, x: p.x, y: p.y - s.h - 4 + dy, t0: performance.now(), life: 900, scale });
  }
  sparks(uid, color, n = 8) {
    const p = battleLayout(this.b, this.W, this.H).get(uid);
    if (!p) return;
    for (let k = 0; k < n; k++) { const a = Math.random() * 6.28; this.fx.push({ kind: "spark", x: p.x, y: p.y - 12, vx: Math.cos(a), vy: Math.sin(a), color, t0: performance.now(), life: 420 }); }
  }

  /** Plays one engine event; resolves when its animation is done. */
  async play(e) {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const a = (uid) => { const o = this.anims.get(uid) ?? {}; this.anims.set(uid, o); return o; };
    const u = e.uid && this.b.units.find((x) => x.uid === e.uid);
    switch (e.t) {
      case "attack": {
        if (!u) return;
        a(u.uid).lunge = { t0: performance.now(), dir: u.side === "hero" ? -1 : 1 };
        if (e.name && e.name !== "Ataque") this.text(u.uid, e.name.length < 14 ? e.name : "", "#ffe08a", 1, -6);
        if (e.big) { this.shake = 4; this.flash = { color: "#ff4030", alpha: 0.25, t0: performance.now(), life: 300 }; }
        if (e.type && ["fuego", "luz", "sombra"].includes(e.type) && e.target) {
          const pos = battleLayout(this.b, this.W, this.H);
          const p0 = pos.get(u.uid), p1 = pos.get(e.target);
          if (p0 && p1) this.fx.push({ kind: "orb", x: p0.x, y: p0.y - 14, tx: p1.x, ty: p1.y - 14, color: { fuego: "#ff8a30", luz: "#fff2a0", sombra: "#b060ff" }[e.type], t0: performance.now(), life: 300 });
        }
        await wait(230);
        return;
      }
      case "cast": if (u) { this.fx.push({ kind: "ring", x: battleLayout(this.b, this.W, this.H).get(u.uid)?.x ?? 0, y: (battleLayout(this.b, this.W, this.H).get(u.uid)?.y ?? 0) - 12, color: "#bfe8ff", t0: performance.now(), life: 450 }); } await wait(260); return;
      case "damage": {
        if (!u) return;
        a(u.uid).hurt = { t0: performance.now() }; a(u.uid).flash = performance.now();
        if (e.crit || e.combo) { this.hitstop = 70; await wait(70); this.shake = e.combo ? 6 : 3; }
        this.text(u.uid, String(e.amount), e.dot ? "#c0a0ff" : e.crit ? "#ffd84a" : "#ffffff", e.crit ? 2 : 1);
        if (e.weak) this.text(u.uid, "¡DEBIL!", "#ff9a40", 1, -10);
        if (e.resist) this.text(u.uid, "RESISTE", "#9aa0b0", 1, -10);
        this.sparks(u.uid, e.weak ? "#ff9a40" : "#ffffff", e.crit ? 12 : 6);
        await wait(e.dot ? 260 : 330);
        return;
      }
      case "heal": if (u) { this.text(u.uid, `+${e.amount}`, "#7aff9a", 1); this.sparks(u.uid, "#7aff9a", 6); } await wait(300); return;
      case "ap": if (u) this.text(u.uid, `+${e.amount} AP`, "#7ac8ff", 1, -8); await wait(120); return;
      case "miss": if (u) this.text(u.uid, "FALLO", "#c0c0d0"); await wait(260); return;
      case "status": if (u) this.text(u.uid, e.text.length > 12 ? e.text.slice(0, 12) : e.text, e.good ? "#9affb0" : "#ffb070", 1, -12); await wait(220); return;
      case "ko": if (u) { a(u.uid).ko = performance.now(); this.sparks(u.uid, "#ffffff", 14); } await wait(400); return;
      case "revive": if (u) { this.text(u.uid, "REVIVE", "#fff2a0"); this.flash = { color: "#fff6c0", alpha: 0.3, t0: performance.now(), life: 400 }; } await wait(400); return;
      case "charge": if (u) { this.text(u.uid, "CARGA", "#ff5040", 1, -8); this.shake = 2; } await wait(450); return;
      case "interrupt": if (u) { this.text(u.uid, "INTERRUMPIDO", "#7ae0ff", 1, -16); this.sparks(u.uid, "#7ae0ff", 14); this.shake = 3; } await wait(420); return;
      case "counter": if (u) this.text(u.uid, "CONTRA", "#ffd84a", 1, -12); await wait(200); return;
      case "combo": this.flash = { color: "#ffe08a", alpha: 0.7, t0: performance.now(), life: 700 }; this.shake = 6; for (const id of e.uids) a(id).lunge = { t0: performance.now(), dir: -1 }; await wait(650); return;
      case "phase": this.flash = { color: "#b040e0", alpha: 0.5, t0: performance.now(), life: 700 }; this.shake = 6; await wait(600); return;
      case "summon": case "join": await wait(300); return;
      default: return;
    }
  }
}

/** Enemy sprite key for a unit. */
export function spriteKey(u) { return u.side === "hero" ? u.id : (u.spriteKey ?? u.id); }

// MARK: Map view

export class MapView {
  constructor(cv) { this.cv = cv; this.x = cv.getContext("2d"); this.x.imageSmoothingEnabled = false; this.W = cv.width; this.H = cv.height; this.base = null; this.running = false; }
  setMap(chapter, game) { this.chapter = chapter; this.game = game; this.base = this.drawBase(); }
  drawBase() {
    const { W, H } = this;
    const [c, x] = canvas(W, H);
    const r = seeded(31);
    gradient(x, W, 0, H, ["#1e3326", "#24402c", "#2a4a30", "#2e4a2c"]);
    for (let k = 0; k < 260; k++) { // forest canopy dots
      const tx = Math.floor(r() * W), ty = Math.floor(r() * H);
      x.fillStyle = r() > 0.5 ? "#1a2e20" : "#355a38"; x.fillRect(tx, ty, 3, 2); x.fillStyle = "#13221a"; x.fillRect(tx + 1, ty + 2, 1, 1);
    }
    // River.
    x.fillStyle = "#2c5470";
    for (let y = 0; y < H; y++) x.fillRect(Math.round(W * 0.9 + Math.sin(y / 9) * 6), y, 4, 1);
    // Mountains to the east.
    for (let k = 0; k < 5; k++) { const mx = W * 0.62 + k * 16, my = 18; x.fillStyle = "#5a5a6a"; for (let j = 0; j < 14; j++) x.fillRect(Math.round(mx - j / 1.2), my + j, Math.round(j * 1.7), 1); x.fillStyle = "#e8e8f0"; x.fillRect(Math.round(mx - 1), my, 3, 2); }
    return c;
  }
  start() { if (this.running) return; this.running = true; const tick = (t) => { if (!this.running) return; this.draw(t); requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
  stop() { this.running = false; }
  draw(t) {
    const { x, W, H, chapter, game } = this;
    if (!this.base) return;
    x.drawImage(this.base, 0, 0);
    const nodes = chapter.nodes;
    // Paths between unlocked nodes.
    for (const [id, n] of Object.entries(nodes)) for (const l of n.links) {
      if (id > l) continue;
      const m = nodes[l];
      const open = game.unlocked.includes(id) && game.unlocked.includes(l);
      const steps = 30;
      for (let k = 0; k <= steps; k++) {
        if (k % 2) continue;
        const px = n.x * W + (m.x - n.x) * W * (k / steps), py = n.y * H + (m.y - n.y) * H * (k / steps);
        x.fillStyle = open ? "#d8b878" : "#3a4a3a"; x.fillRect(Math.round(px), Math.round(py), 2, 1);
      }
    }
    for (const [id, n] of Object.entries(nodes)) {
      const px = Math.round(n.x * W), py = Math.round(n.y * H);
      const open = game.unlocked.includes(id);
      const here = game.node === id;
      const pulse = here ? Math.round(1 + Math.sin(t / 200)) : 0;
      x.fillStyle = OUTLINE; x.fillRect(px - 4 - pulse, py - 4 - pulse, 9 + pulse * 2, 9 + pulse * 2);
      x.fillStyle = !open ? "#4a5048" : n.camp ? "#ff9a40" : game.visited.includes(id) ? "#d8b878" : "#ffe08a";
      x.fillRect(px - 3 - pulse, py - 3 - pulse, 7 + pulse * 2, 7 + pulse * 2);
      if (n.camp && open) { x.fillStyle = "#ffe060"; x.fillRect(px - 1, py - 2 + Math.round(Math.sin(t / 100)), 2, 2); }
      if (here) { x.fillStyle = "#ffffff"; x.fillRect(px, py - 9 + Math.round(Math.sin(t / 250) * 2), 1, 3); x.fillRect(px - 1, py - 7 + Math.round(Math.sin(t / 250) * 2), 3, 1); }
    }
  }
}

/** Draws a static scene (title, camp, dialogue backdrops) with its ambient animation. */
export class SceneView {
  constructor(cv) { this.cv = cv; this.x = cv.getContext("2d"); this.x.imageSmoothingEnabled = false; this.W = cv.width; this.H = cv.height; this.kind = "titulo"; this.amb = null; this.running = false; this.actors = []; }
  set(kind, actors = []) { this.kind = kind; this.amb = new Ambient(kind, this.W, this.H); this.actors = actors; }
  start() { if (this.running) return; this.running = true; const tick = (t) => { if (!this.running) return; this.draw(t); requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
  stop() { this.running = false; }
  draw(t) {
    const { x, W, H } = this;
    x.drawImage(background(this.kind, W, H), 0, 0);
    this.amb?.draw(x, t);
    this.actors.forEach((key, k) => {
      const s = sprite(key);
      const f = s.frames[Math.floor(t / 450 + k) % 2];
      const px = Math.round(W * 0.5 + (k - (this.actors.length - 1) / 2) * 26 - s.w / 2), py = Math.round(H * 0.86 - s.h);
      x.fillStyle = "rgba(10,6,20,0.35)"; x.fillRect(px + 3, py + s.h - 1, s.w - 6, 3);
      x.drawImage(f, px, py);
    });
  }
}
