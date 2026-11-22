// Sprite library: every character and creature is drawn from simple shapes on a pixel grid, then
// shaded (light from the top-left) and outlined. Two idle frames each (breathing / wing flaps).

import { HEROES } from "./characters.js";

export const OUTLINE = "#160f1c";

export function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d");
  x.imageSmoothingEnabled = false;
  return [c, x];
}
export function hex(c) {
  if (c.startsWith("rgb")) return c.match(/\d+/g).slice(0, 3).map(Number);
  const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function shade(c, f) { const [r, g, b] = hex(c); const k = (v) => Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)))); return `rgb(${k(r)},${k(g)},${k(b)})`; }

/** Shading (lighter top-left edges, darker bottom-right) and a dark outline around the shape. */
function finish(c) {
  const x = c.getContext("2d");
  const { width: w, height: h } = c;
  const img = x.getImageData(0, 0, w, h);
  const d = img.data;
  const at = (i, j) => (i < 0 || j < 0 || i >= w || j >= h ? 0 : d[(j * w + i) * 4 + 3]);
  const out = new Uint8ClampedArray(d);
  const [or, og, ob] = hex(OUTLINE);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = (j * w + i) * 4;
    if (d[k + 3]) {
      if (d[k + 3] < 250) continue; // glows keep their colour
      const lit = !at(i - 1, j) || !at(i, j - 1);
      const dark = !at(i + 1, j) || !at(i, j + 1);
      const f = lit && !dark ? 1.18 : dark && !lit ? 0.78 : 1;
      out[k] = Math.min(255, d[k] * f); out[k + 1] = Math.min(255, d[k + 1] * f); out[k + 2] = Math.min(255, d[k + 2] * f);
    } else if (at(i - 1, j) > 250 || at(i + 1, j) > 250 || at(i, j - 1) > 250 || at(i, j + 1) > 250) {
      out[k] = or; out[k + 1] = og; out[k + 2] = ob; out[k + 3] = 255;
    }
  }
  x.putImageData(new ImageData(out, w, h), 0, 0);
  return c;
}

export function flip(src) {
  const [c, x] = canvas(src.width, src.height);
  x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0);
  return c;
}

/** A pen for one sprite: R draws a rect on the grid (scaled by `big`, upper parts bob). */
function pen(w, h, big, bob) {
  const [c, x] = canvas(Math.round(w * big) + 2, Math.round(h * big) + 2);
  const R = (col, x0, y0, ww, hh, upper = true) => {
    if (!col) return;
    x.fillStyle = col;
    x.fillRect(Math.round(x0 * big) + 1, Math.round((y0 - (upper ? bob : 0)) * big) + 1, Math.max(1, Math.round(ww * big)), Math.max(1, Math.round(hh * big)));
  };
  return { c, x, R };
}

// MARK: Humanoids

/** A humanoid facing right on a 22×30 grid. Options: short (dwarf), helmet, plume, crown, shield, weapons… */
function humanoid(o, bob = 0, big = 1) {
  const { c, R } = pen(22, 30, big, bob);
  const d = o.short ? 3 : 0; // dwarves: shorter legs, everything above sits lower
  const w = o.short ? 1 : 0; // and a wider body
  const top = 5 + d;
  if (o.cape) { R(o.cape, 3, top + 8, 3, 11 - d); R(shade(o.cape, -0.25), 2, top + 16 - d, 4, 4); }
  if (o.hairStyle === "braid") { R(o.hair, 5, top + 2, 2, 12); R(shade(o.hair, -0.2), 5, top + 13, 2, 2); }
  // Legs and boots.
  R(shade(o.legs, -0.2), 7, top + 15, 2 + w, 7 - d, false); R(o.legs, 10 + w, top + 15, 2 + w, 7 - d, false);
  R(o.boots ?? "#3a2418", 6, 26, 3 + w, 2, false); R(shade(o.boots ?? "#4a2e1e", 0.1), 10 + w, 26, 3 + w, 2, false);
  // Back arm, torso, belt.
  R(shade(o.tunic, -0.3), 5, top + 8, 2, 6);
  R(o.tunic, 6, top + 7, 6 + w * 2, 9); R(shade(o.tunic, -0.15), 6, top + 13, 6 + w * 2, 3);
  R(o.trim, 6, top + 12, 6 + w * 2, 1); R(o.trim, 8, top + 7, 2, 1);
  if (o.armor) { R(o.armor, 6, top + 7, 6 + w * 2, 4); R(shade(o.armor, 0.3), 7, top + 7, 3, 1); R(o.armor, 5, top + 7, 2, 2); R(o.armor, 11 + w * 2, top + 7, 2, 2); }
  // Head.
  R(o.skin, 7, top, 5 + w, 6);
  R(o.eyes ?? OUTLINE, 10 + w, top + 2, 1, 1);
  R(shade(o.skin, -0.15), 7, top + 5, 5 + w, 1);
  if (o.ears) { R(o.skin, 6, top + 1, 1, 2); R(o.skin, 5, top, 1, 1); R(o.skin, 4, top - 1, 1, 1); }
  const hair = o.hair;
  if (o.hairStyle === "short") { R(hair, 7, top - 1, 5 + w, 2); R(hair, 6, top, 2, 3); }
  if (o.hairStyle === "long") { R(hair, 7, top - 1, 5, 2); R(hair, 6, top, 2, 8); R(hair, 5, top + 3, 2, 6); R(hair, 11, top - 1, 1, 2); }
  if (o.hairStyle === "braid") { R(hair, 7, top - 1, 5, 2); R(hair, 6, top, 2, 4); }
  if (o.hairStyle === "hood") { R(o.cape ?? o.tunic, 6, top - 1, 7, 2); R(o.cape ?? o.tunic, 6, top, 2, 6); R(o.cape ?? o.tunic, 5, top + 2, 2, 6); R(hair, 8, top + 1, 3, 1); }
  if (o.hairStyle === "wizard") { R(o.cape, 4, top - 1, 11, 1); R(o.cape, 6, top - 3, 6, 2); R(o.cape, 7, top - 5, 3, 2); R(o.cape, 8, top - 6, 2, 1); R(hair, 6, top, 2, 4); }
  if (o.hairStyle === "bandana") { R(o.bandana ?? "#a02a2a", 7, top - 1, 5, 2); R(o.bandana ?? "#a02a2a", 5, top, 2, 1); R(hair, 6, top + 1, 2, 3); }
  if (o.hairStyle === "bald") R(shade(o.skin, 0.1), 7, top - 1, 5, 1);
  if (o.helmet) { R(o.helmet, 6, top - 1, 7 + w, 3); R(shade(o.helmet, 0.3), 7, top - 1, 4, 1); if (o.visor) R(OUTLINE, 9, top + 1, 4, 1); }
  if (o.horns) { R(o.horns, 5, top - 3, 1, 3); R(o.horns, 13, top - 3, 1, 3); }
  if (o.plume) { R(o.plume, 8, top - 4, 3, 3); R(shade(o.plume, 0.25), 6, top - 3, 3, 2); }
  if (o.crown) { R(o.crown, 7, top - 2, 6, 1); R(o.crown, 7, top - 4, 1, 2); R(o.crown, 9, top - 5, 1, 3); R(o.crown, 11, top - 4, 1, 2); }
  if (o.beard === true) R(hair, 9, top + 4, 3 + w, 2);
  if (o.beard === "long") { R("#e8e8ee", 8, top + 4, 4, 6); R("#d0d0d8", 9, top + 9, 2, 2); }
  if (o.beard === "braid") { R(hair, 8, top + 4, 5, 4); R(hair, 9, top + 8, 3, 3); R(o.trim, 9, top + 10, 3, 1); R(hair, 10, top + 11, 1, 2); }
  // Front arm and hand.
  R(o.tunic, 11 + w, top + 8, 2, 5); R(o.skin, 12 + w, top + 12, 2, 2);
  if (o.armor) R(o.armor, 11 + w, top + 8, 2, 2);
  // Weapons.
  const X = 13 + w; // hand x
  const wp = o.weapon;
  if (wp === "sword") { R("#5a3a22", X, top + 11, 1, 3); R(o.trim, X - 1, top + 10, 3, 1); for (let k = 0; k < 8; k++) R(k < 2 ? "#ffffff" : "#c8d0e0", X + 1 + Math.floor(k / 2), top + 9 - k, 1, 1); }
  if (wp === "knife") { R("#5a3a22", X, top + 12, 1, 2); R("#b8c0c8", X + 1, top + 9, 1, 3); }
  if (wp === "bow" || wp === "crossbow") { R("#7a5230", X + 1, top + 4, 1, 1); R("#7a5230", X + 2, top + 5, 1, 8); R("#7a5230", X + 1, top + 13, 1, 1); R("#e8e0c8", X + 1, top + 5, 1, 8); if (wp === "crossbow") R("#5a4030", X - 2, top + 9, 5, 1); }
  if (wp === "staff") { R("#6a4a2a", X + 1, top + 1, 1, 21); R(o.gem ?? "#bfe8ff", X, top - 2, 3, 3); R("#ffffff", X + 1, top - 2, 1, 1); }
  if (wp === "club") { R("#5a3a22", X, top + 7, 2, 7); R("#6a4a2e", X - 1, top + 3, 4, 5); R("#8a8a8a", X, top + 4, 1, 1); R("#8a8a8a", X + 2, top + 6, 1, 1); }
  if (wp === "axe") { R("#5a3a22", X, top + 3, 1, 12); R("#c8ccd4", X + 1, top + 2, 3, 5); R("#ffffff", X + 3, top + 2, 1, 5); R("#8a8a92", X - 1, top + 3, 1, 3); }
  if (wp === "bigaxe") { R("#3a2a1e", X, top + 1, 2, 15); R("#3a3a42", X + 2, top, 4, 6); R("#6a6a72", X + 5, top, 1, 6); }
  if (wp === "spear") { R("#7a5a36", X - 2, top + 15, 1, 1); for (let k = 0; k < 16; k++) R("#7a5a36", X - 1 + Math.floor(k / 3), top + 14 - k, 1, 1); R("#d8dde6", X + 4, top - 4, 2, 3); R("#ffffff", X + 5, top - 4, 1, 1); }
  if (wp === "mace") { R("#3a2a1e", X, top + 6, 1, 8); R("#5a5a66", X - 1, top + 2, 3, 4); R("#8a8a96", X - 2, top + 3, 1, 2); R("#8a8a96", X + 2, top + 3, 1, 2); }
  if (o.shield) { R(o.shield, X - 2, top + 8, 4, 6); R(shade(o.shield, 0.25), X - 2, top + 8, 4, 1); R(o.trim, X - 1, top + 10, 2, 2); }
  return finish(c);
}

// MARK: Beasts

function wolf(o, bob = 0, big = 1) {
  const { c, R } = pen(30, 20, big, bob);
  R(o.fur, 1, 4, 5, 2); R(o.fur, 0, 2, 3, 3);
  R(o.fur, 5, 6, 15, 7); R(shade(o.fur, -0.2), 5, 11, 15, 2); R(o.mane ?? shade(o.fur, 0.2), 15, 5, 5, 7);
  R(o.fur, 19, 3, 7, 6); R(o.fur, 24, 6, 4, 3); R("#1a1014", 27, 7, 1, 1);
  R(o.fur, 20, 1, 2, 3); R(o.fur, 23, 1, 2, 3);
  R(o.eye ?? "#ff4040", 23, 5, 1, 1);
  R("#e8e0d0", 25, 9, 2, 1);
  for (const lx of [6, 9, 15, 18]) R(shade(o.fur, -0.15), lx, 13, 2, 5, false);
  return finish(c);
}

function spider(o, bob = 0, big = 1) {
  const { c, R } = pen(30, 20, big, bob);
  for (let k = 0; k < 4; k++) {
    const lx = 9 + k * 3;
    R(o.leg, lx, 9, 1, 3, false); R(o.leg, lx - 2, 12, 2, 1, false); R(o.leg, lx - 3, 13, 1, 5, false);
    R(o.leg, lx + 1, 8, 1, 2); R(o.leg, lx + 2, 6, 1, 2);
  }
  for (let j = -5; j <= 5; j++) for (let i = -6; i <= 6; i++) if ((i * i) / 36 + (j * j) / 25 <= 1) R(o.body, 9 + i, 9 + j, 1, 1);
  for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (i * i + j * j <= 10) R(o.head ?? o.body, 19 + i, 10 + j, 1, 1);
  R(o.mark ?? "#c8e070", 7, 7, 3, 2); R(o.mark ?? "#c8e070", 8, 9, 1, 3);
  R("#ff3030", 21, 9, 1, 1); R("#ff3030", 21, 11, 1, 1); R("#ff6060", 22, 10, 1, 1);
  if (o.crown) for (const sx of [4, 7, 10, 13]) R(o.crown, sx, 2, 1, 3);
  return finish(c);
}

function bat(o, flap = 0) {
  const { c, R } = pen(26, 18, 1, 0);
  const up = flap ? -3 : 1;
  for (let k = 0; k < 8; k++) { R(o.wing, 4 + k, 7 + up + Math.floor(Math.abs(k - 3) / 2), 1, 4 - Math.floor(k / 3)); R(o.wing, 21 - k, 7 + up + Math.floor(Math.abs(k - 3) / 2), 1, 4 - Math.floor(k / 3)); }
  R(o.body, 11, 6, 5, 6); R(o.body, 12, 4, 3, 2); R(o.body, 11, 3, 1, 2); R(o.body, 15, 3, 1, 2);
  R("#ffcc40", 13, 6, 1, 1); R("#ffcc40", 14, 6, 1, 1);
  R("#e8e0d0", 13, 9, 1, 1);
  return finish(c);
}

function crab(o, bob = 0) {
  const { c, R } = pen(36, 24, 1, bob);
  for (let k = 0; k < 3; k++) { R(o.leg, 7 + k * 4, 16, 1, 6, false); R(o.leg, 6 + k * 4, 21, 2, 1, false); R(o.leg, 22 + k * 4, 16, 1, 6, false); R(o.leg, 22 + k * 4, 21, 2, 1, false); }
  for (let j = -6; j <= 6; j++) for (let i = -12; i <= 12; i++) if ((i * i) / 144 + (j * j) / 36 <= 1) R(j < -2 ? shade(o.shell, 0.15) : o.shell, 18 + i, 13 + j, 1, 1);
  R(o.spots, 12, 9, 3, 2); R(o.spots, 20, 8, 4, 2); R(o.spots, 16, 12, 2, 2);
  R(o.shell, 2, 5, 6, 5); R(o.shell, 0, 3, 3, 4); R(shade(o.shell, -0.2), 4, 9, 3, 6); // big claw
  R(o.shell, 30, 7, 4, 4); R(o.shell, 32, 5, 3, 3); R(shade(o.shell, -0.2), 30, 10, 2, 5);
  R(OUTLINE, 15, 5, 1, 3); R(OUTLINE, 21, 5, 1, 3); R("#ffd040", 15, 4, 1, 1); R("#ffd040", 21, 4, 1, 1);
  return finish(c);
}

/** The Ember Colossus: a golem of black stone with lava in its cracks (no wings). */
function golem(bob = 0) {
  const { c, R } = pen(56, 64, 1, bob);
  R("#2a2224", 14, 50, 10, 12, false); R("#2a2224", 32, 50, 10, 12, false); // legs
  R("#3a3034", 12, 58, 13, 4, false); R("#3a3034", 31, 58, 13, 4, false);
  R("#3a3236", 12, 22, 32, 30); R("#4a4044", 14, 22, 12, 28); R("#2a2226", 36, 24, 8, 26); // torso
  R("#ff8020", 22, 30, 12, 10); R("#ffd060", 25, 32, 6, 6); R("#ffffff", 27, 34, 2, 2); // molten core
  for (const [cx, cy, cw, ch] of [[16, 26, 1, 10], [17, 36, 6, 1], [38, 28, 1, 12], [33, 44, 7, 1], [20, 44, 1, 6]]) R("#ff7a20", cx, cy, cw, ch);
  R("#3a3236", 2, 24, 10, 8); R("#3a3236", 0, 30, 8, 16); R("#4a4044", 0, 44, 10, 8); // left arm and fist
  R("#3a3236", 44, 24, 10, 8); R("#3a3236", 48, 30, 8, 16); R("#4a4044", 46, 44, 10, 8);
  R("#ff7a20", 2, 46, 6, 1); R("#ff7a20", 48, 46, 6, 1);
  R("#3a3236", 18, 8, 20, 15); R("#4a4044", 20, 8, 8, 6); // head
  R("#ffcc40", 22, 14, 4, 3); R("#ffcc40", 31, 14, 4, 3); R("#ffffff", 23, 15, 1, 1); R("#ffffff", 32, 15, 1, 1);
  R("#ff6020", 24, 20, 9, 2);
  R("#2a2226", 16, 4, 4, 6); R("#2a2226", 36, 4, 4, 6); R("#2a2226", 14, 2, 3, 3); R("#2a2226", 39, 2, 3, 3); // rocky crests
  return finish(c);
}

function ram(bob = 0) {
  const { c, R } = pen(48, 30, 1, bob);
  R("#5a3a22", 4, 8, 34, 3); R("#6a4a2a", 6, 4, 30, 4); R("#4a2e1a", 8, 2, 26, 2); // roof
  R("#7a5a36", 6, 14, 38, 5); R("#5a3a22", 6, 18, 38, 1); R("#3a3a42", 40, 12, 7, 9); R("#6a6a72", 42, 13, 3, 3); // log and iron head
  R("#4a2e1a", 6, 11, 2, 9); R("#4a2e1a", 34, 11, 2, 9);
  for (const wx of [8, 20, 32]) { R("#3a2418", wx, 21, 6, 6, false); R("#7a5a36", wx + 2, 23, 2, 2, false); }
  return finish(c);
}

function specter(o, bob = 0, big = 1) {
  const { c, R } = pen(24, 30, big, bob);
  R(o.robe, 6, 6, 10, 16); R(shade(o.robe, -0.2), 12, 8, 4, 14);
  for (let k = 0; k < 4; k++) R(o.robe, 6 + k * 3, 21 + (k % 2), 2, 4 - (k % 2));
  R(o.robe, 7, 2, 8, 6); R("#0a0610", 9, 4, 5, 4); R(o.eyes, 10, 5, 1, 1); R(o.eyes, 12, 5, 1, 1);
  R(o.robe, 15, 9, 4, 3); R(shade(o.robe, 0.2), 18, 11, 2, 3); // reaching arm
  if (o.crown) { R(o.crown, 8, 1, 7, 1); R(o.crown, 8, 0, 1, 1); R(o.crown, 11, -1, 1, 2); R(o.crown, 14, 0, 1, 1); }
  if (o.blade) { for (let k = 0; k < 8; k++) R(o.blade, 19 + Math.floor(k / 3), 12 - k, 1, 1); }
  return finish(c);
}

function wingedBeast(o, flap = 0) {
  const { c, R } = pen(48, 34, 1, 0);
  const up = flap ? -6 : 0;
  // Wings (behind).
  for (let k = 0; k < 14; k++) R(shade(o.skin, -0.25), 8 + k, 10 + up + Math.floor(k / 2), 1, 8 - Math.floor(k / 3));
  R(o.skin, 14, 16, 16, 7); R(shade(o.skin, 0.15), 15, 16, 10, 2); // body
  R(o.skin, 28, 12, 3, 6); R(o.skin, 30, 8, 3, 6); R(o.skin, 32, 6, 6, 4); R("#d8c890", 37, 8, 6, 2); // neck, head, beak
  R("#ffd040", 35, 7, 1, 1); R(o.skin, 33, 4, 2, 3);
  R(o.skin, 6, 18, 9, 2); R(o.skin, 2, 17, 5, 2); // tail
  R(shade(o.skin, -0.2), 17, 23, 2, 5, false); R(shade(o.skin, -0.2), 25, 23, 2, 5, false); R("#d8c890", 16, 27, 4, 1, false); R("#d8c890", 24, 27, 4, 1, false);
  for (let k = 0; k < 16; k++) R(o.skin, 16 + k, 14 + up + Math.floor(k / 3) - (k > 8 ? 2 : 0), 1, 3);
  return finish(c);
}

/** Two sprites in one canvas (a rider on a mount). */
function compose(base, top, dx, dy) {
  const [c, x] = canvas(Math.max(base.width, top.width + dx), Math.max(base.height, top.height + dy));
  x.drawImage(base, 0, Math.max(0, -dy)); x.drawImage(top, dx, Math.max(0, dy));
  return c;
}

function treeGiant(bob = 0) {
  const { c, R } = pen(58, 66, 1, bob);
  for (const [rx, rw] of [[8, 10], [20, 6], [32, 7], [42, 12]]) R("#3a2a1e", rx, 58, rw, 5, false);
  R("#4a3424", 14, 52, 30, 7, false);
  R("#5a4030", 16, 18, 26, 36); R("#6a4c36", 18, 18, 8, 36); R("#47321f", 34, 18, 6, 36);
  for (let k = 0; k < 6; k++) R("#3a2818", 20 + k * 4, 24 + (k % 2) * 6, 1, 18);
  R("#c050ff", 28, 34, 1, 9); R("#c050ff", 27, 42, 3, 1); R("#e090ff", 22, 46, 1, 5);
  R("#5a4030", 18, 8, 22, 12); R("#6a4c36", 20, 8, 8, 4);
  R("#f0a0ff", 22, 12, 4, 3); R("#f0a0ff", 32, 12, 4, 3); R("#ffffff", 23, 13, 1, 1); R("#ffffff", 33, 13, 1, 1);
  R("#2a1a12", 25, 17, 8, 2);
  R("#5a4030", 6, 22, 11, 4); R("#5a4030", 3, 14, 4, 10); R("#5a4030", 0, 10, 3, 5); R("#5a4030", 41, 22, 12, 4); R("#5a4030", 51, 12, 4, 12); R("#5a4030", 54, 8, 3, 5);
  for (const [lx, ly, lw, lh] of [[10, 2, 14, 7], [26, 0, 16, 8], [16, 4, 26, 5], [0, 6, 6, 5], [52, 4, 6, 5]]) R("#4a6a3a", lx, ly, lw, lh);
  for (const [lx, ly] of [[14, 3], [30, 1], [22, 5], [36, 4]]) R("#7a5a8a", lx, ly, 3, 2);
  R("#5a8a4a", 16, 28, 5, 3); R("#5a8a4a", 36, 40, 4, 3); R("#5a8a4a", 20, 50, 6, 2);
  return finish(c);
}

// MARK: Catalogue

const goblin = { skin: "#8a9a7a", hair: "#3a3a2a", tunic: "#6a5040", trim: "#3a2a20", legs: "#4a3a2a", ears: true };
const iron = { skin: "#7a7468", hair: "#1a1a1a", hairStyle: "bald", tunic: "#2a2a30", trim: "#6a2020", legs: "#1e1e22", armor: "#3a3a44", helmet: "#2e2e36", visor: true, eyes: "#ff4030" };
const corsair = { skin: "#c8946a", hair: "#2a1e18", hairStyle: "bandana", tunic: "#3a4a5a", trim: "#c8a050", legs: "#3a2e24" };

const DEFS = {
  merodeador: (b) => humanoid({ ...goblin, hairStyle: "bald", weapon: "knife" }, b),
  arquero: (b) => humanoid({ ...goblin, hair: "#2a2a20", hairStyle: "hood", tunic: "#5a5a40", cape: "#3a3a2a", weapon: "bow" }, b),
  bruto: (b) => humanoid({ skin: "#6a6a74", hair: "#202020", hairStyle: "bald", tunic: "#4a3a30", trim: "#8a2a20", legs: "#3a2a20", weapon: "club", helmet: "#4a4a50" }, b, 1.45),
  lobo: (b) => wolf({ fur: "#5a5a6a" }, b),
  "lobo-alfa": (b) => wolf({ fur: "#3a3a48", mane: "#c8c8d8", eye: "#ffcc30" }, b, 1.35),
  arana: (b) => spider({ body: "#3a4a2a", leg: "#2a3a1e", mark: "#a8d060" }, b),
  "reina-arana": (b) => spider({ body: "#2e3a26", leg: "#24301c", mark: "#d0e080", head: "#4a3a5a", crown: "#a080c0" }, b, 1.6),
  guardian: (b) => treeGiant(b),
  trasgo: (b) => humanoid({ ...goblin, skin: "#7a8a8a", tunic: "#4a4a40", hairStyle: "bald", weapon: "knife", eyes: "#ffd040" }, b, 0.9),
  "trasgo-arquero": (b) => humanoid({ ...goblin, skin: "#7a8a8a", tunic: "#4a4038", hairStyle: "hood", cape: "#2e2e28", weapon: "bow", eyes: "#ffd040" }, b, 0.9),
  murcielago: (b) => bat({ wing: "#4a3a4a", body: "#3a2a34" }, b),
  "troll-cueva": (b) => humanoid({ skin: "#6a7a6a", hair: "#2a2a20", hairStyle: "bald", tunic: "#4a3a2a", trim: "#2a2018", legs: "#3a3226", weapon: "club", eyes: "#ffcc30" }, b, 1.6),
  cangrejo: (b) => crab({ shell: "#6a5a6a", leg: "#4a3e4a", spots: "#4ac0d0" }, b),
  coloso: (b) => golem(b),
  "huargo-jinete": (b) => compose(wolf({ fur: "#4a4a40", eye: "#ffcc30" }, b, 1.15), humanoid({ ...goblin, skin: "#7a7468", tunic: "#3a3030", hairStyle: "bald", helmet: "#3a3a44", weapon: "spear", eyes: "#ff4030" }, b, 0.75), 8, -12),
  "hierro-negro": (b) => humanoid({ ...iron, weapon: "sword", shield: "#3a3036" }, b, 1.05),
  "hierro-elite": (b) => humanoid({ ...iron, armor: "#4a4452", trim: "#a02020", horns: "#d0c8b0", weapon: "bigaxe", cape: "#3a1418" }, b, 1.15),
  ballestero: (b) => humanoid({ ...iron, weapon: "crossbow", helmet: "#34343c" }, b),
  "bruto-asalto": (b) => humanoid({ ...iron, armor: "#4a3a30", weapon: "bigaxe", helmet: "#3a3a44", horns: "#a89878" }, b, 1.4),
  ariete: (b) => ram(b),
  capitan: (b) => humanoid({ ...iron, armor: "#2a2a30", trim: "#c02020", cape: "#5a1418", horns: "#e0d8c0", weapon: "bigaxe", shield: null }, b, 1.55),
  corsario: (b) => humanoid({ ...corsair, weapon: "sword", beard: true }, b),
  "arquero-oscuro": (b) => humanoid({ ...corsair, bandana: "#2a3a6a", cape: "#2a2a3a", weapon: "bow" }, b),
  espectro: (b) => specter({ robe: "#8aa0b8", eyes: "#d0f0ff" }, b),
  "bestia-alada": (b) => wingedBeast({ skin: "#4a4a5a" }, b),
  morvath: (b) => compose(wingedBeast({ skin: "#3a3a4a" }, b), specter({ robe: "#6a7a90", eyes: "#e0f0ff", crown: "#c8c8d8", blade: "#c8e0ff" }, b, 0.85), 14, -16),
  "troll-asedio": (b) => humanoid({ skin: "#5a6a5a", hair: "#202018", hairStyle: "bald", tunic: "#3a2e24", trim: "#5a5a60", legs: "#2e2820", armor: "#4a4a52", weapon: "mace", eyes: "#ffcc30", helmet: "#3e3e46" }, b, 1.75),
  "rey-sombrio": (b) => humanoid({ skin: "#3a3044", hair: "#0a0610", hairStyle: "bald", tunic: "#1a1420", trim: "#8040c0", legs: "#140e18", armor: "#2a2232", helmet: "#1e1826", visor: true, eyes: "#e080ff", crown: "#c8b060", cape: "#2a0e30", weapon: "mace" }, b, 1.7),
};

const cache = new Map();

/** A sprite (two idle frames + white silhouettes for hit flashes). Heroes face left, enemies right. */
export function sprite(key) {
  if (cache.has(key)) return cache.get(key);
  let frames;
  if (HEROES[key]) frames = [0, 1].map((b) => flip(humanoid(HEROES[key].sprite, b)));
  else frames = [0, 1].map((b) => (DEFS[key] ?? DEFS.merodeador)(b));
  const tint = (f, col) => { const [c, x] = canvas(f.width, f.height); x.drawImage(f, 0, 0); x.globalCompositeOperation = "source-atop"; x.fillStyle = col; x.fillRect(0, 0, f.width, f.height); return c; };
  const s = { frames, white: frames.map((f) => tint(f, "#ffffff")), dark: frames.map((f) => tint(f, "#000000")), w: frames[0].width, h: frames[0].height };
  cache.set(key, s);
  return s;
}

/** Flying creatures hover above the ground. */
export const FLYING = new Set(["murcielago", "espectro", "bestia-alada", "morvath"]);
