// Battle visual effects: particles with additive glow, sword slashes, arrows, fireballs and
// explosions, beams of light, shadow orbs, shockwaves, rune circles and the dynamic lights they cast
// on the scene. Effects are recipes keyed by damage type / skill; the battle view triggers them
// from the engine's events.

const rnd = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

export const TYPE_COLORS = {
  cortante: ["#ffffff", "#cfe0ff"],
  perforante: ["#fff6c8", "#e8d090"],
  contundente: ["#ffe0a0", "#c89060"],
  fuego: ["#ffd060", "#ff6a20"],
  luz: ["#fffbe0", "#ffe27a"],
  sombra: ["#d090ff", "#6a20b0"],
};

export class Vfx {
  constructor() { this.p = []; this.lights = []; this.now = 0; }
  get busy() { return this.p.length > 0; }

  /** A dynamic light: lights up the dark scene around (x, y) for `life` ms. */
  light(x, y, r, color, life = 400, a = 0.9) { this.lights.push({ x, y, r, color, a, t0: performance.now(), life }); }

  add(o) { this.p.push({ t0: performance.now(), life: 500, add: true, ...o }); }

  // MARK: Recipes

  sparks(x, y, color, n = 12, speed = 60, opts = {}) {
    for (let k = 0; k < n; k++) {
      const a = opts.dir !== undefined ? opts.dir + rnd(-0.7, 0.7) : rnd(0, TAU);
      const v = rnd(speed * 0.4, speed);
      this.add({ kind: "spark", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (opts.up ?? 0), g: opts.g ?? 90, color, size: opts.size ?? (Math.random() < 0.3 ? 2 : 1), life: rnd(250, 520) });
    }
  }
  slash(x, y, dir = 1, color = "#ffffff", big = false) {
    const r = big ? 18 : 12;
    for (let k = 0; k < (big ? 3 : 2); k++) this.add({ kind: "slash", x: x + k * 3 * dir, y: y - k * 2, r, dir, a0: -2.3 + k * 0.25, color, life: 260 + k * 40, width: big ? 3 : 2 });
    this.sparks(x, y, color, big ? 18 : 10, 70, { dir: dir > 0 ? 0 : Math.PI });
    this.light(x, y, big ? 60 : 40, "255,255,255", 220, 0.7);
  }
  thrust(x, y, dir = 1) {
    this.add({ kind: "streak", x: x - 16 * dir, y, x2: x + 4 * dir, y2: y, color: "#fff6c8", life: 180, width: 2 });
    this.sparks(x, y, "#fff6c8", 10, 60, { dir: dir > 0 ? 0 : Math.PI });
    this.light(x, y, 36, "255,240,200", 180, 0.6);
  }
  arrow(x0, y0, x1, y1, color = "#e8d8b0", trail = "#fff6c8") {
    this.add({ kind: "arrow", x0, y0, x1, y1, color, trail, life: 220, add: false });
  }
  impact(x, y, type = "cortante", crit = false) {
    const [c1, c2] = TYPE_COLORS[type] ?? TYPE_COLORS.cortante;
    this.add({ kind: "burst", x, y, color: c1, r: crit ? 14 : 9, life: 200 });
    this.sparks(x, y, c1, crit ? 22 : 12, crit ? 95 : 65);
    this.sparks(x, y, c2, crit ? 10 : 5, 45);
    if (crit) this.add({ kind: "ring", x, y, color: c1, r0: 4, r1: 28, life: 380, width: 2 });
    this.light(x, y, crit ? 70 : 42, hexRgb(c1), crit ? 320 : 200, crit ? 1 : 0.7);
  }
  blunt(x, y, big = false) {
    this.add({ kind: "ring", x, y: y + 6, color: "#ffe0a0", r0: 3, r1: big ? 34 : 22, life: 360, width: 2, flat: true });
    for (let k = 0; k < (big ? 10 : 6); k++) this.add({ kind: "debris", x: x + rnd(-6, 6), y: y + 4, vx: rnd(-50, 50), vy: rnd(-90, -40), g: 260, color: Math.random() < 0.5 ? "#8a7058" : "#5a4a3a", life: rnd(400, 650), add: false });
    for (let k = 0; k < 5; k++) this.add({ kind: "smoke", x: x + rnd(-8, 8), y: y + 4, vx: rnd(-14, 14), vy: rnd(-10, -2), r: rnd(3, 6), color: "190,170,140", life: rnd(500, 800), add: false });
    this.light(x, y, big ? 60 : 40, "255,220,160", 260, 0.7);
  }
  fireball(x0, y0, x1, y1) { this.add({ kind: "orb", x0, y0, x1, y1, color: "#ff8a30", core: "#fff0a0", life: 300, size: 4, trail: "fire", arc: 10 }); this.light(x0, y0, 50, "255,140,50", 300, 0.8); }
  explosion(x, y, big = false) {
    this.add({ kind: "burst", x, y, color: "#fff0a0", r: big ? 22 : 13, life: 260 });
    this.add({ kind: "ring", x, y, color: "#ff8a30", r0: 4, r1: big ? 44 : 26, life: 420, width: 3 });
    for (let k = 0; k < (big ? 40 : 22); k++) this.add({ kind: "ember", x: x + rnd(-4, 4), y: y + rnd(-4, 4), vx: rnd(-60, 60), vy: rnd(-90, -10), color: Math.random() < 0.5 ? "#ffd060" : "#ff6a20", life: rnd(400, 900) });
    for (let k = 0; k < 6; k++) this.add({ kind: "smoke", x: x + rnd(-8, 8), y: y - 4, vx: rnd(-12, 12), vy: rnd(-24, -8), r: rnd(4, 8), color: "60,50,50", life: rnd(700, 1100), add: false });
    this.light(x, y, big ? 140 : 90, "255,150,60", big ? 700 : 480, 1);
  }
  beam(x, y, color = "#fffbe0") {
    this.add({ kind: "beam", x, y, color, life: 520, width: 10 });
    this.sparks(x, y, color, 16, 50, { up: 30, g: -20 });
    this.add({ kind: "ring", x, y: y + 4, color, r0: 2, r1: 26, life: 500, width: 2, flat: true });
    this.light(x, y - 20, 110, "255,250,210", 600, 1);
  }
  shadowOrbs(x, y) {
    for (let k = 0; k < 10; k++) { const a = rnd(0, TAU); this.add({ kind: "orbit", cx: x, cy: y, r0: rnd(16, 26), a, spin: rnd(4, 7), color: Math.random() < 0.5 ? "#b060ff" : "#4a1080", life: rnd(350, 520), size: 2 }); }
    this.add({ kind: "burst", x, y, color: "#d090ff", r: 10, life: 260 });
    this.light(x, y, 70, "170,80,255", 500, 0.9);
  }
  heal(x, y) {
    for (let k = 0; k < 16; k++) this.add({ kind: "rise", x: x + rnd(-10, 10), y: y + rnd(-4, 10), vy: rnd(-40, -20), color: Math.random() < 0.5 ? "#9affb0" : "#ffffff", plus: Math.random() < 0.35, life: rnd(500, 900) });
    this.add({ kind: "ring", x, y: y + 8, color: "#7affa0", r0: 4, r1: 18, life: 600, width: 1, flat: true });
    this.light(x, y, 60, "120,255,160", 700, 0.8);
  }
  buff(x, y, color = "#ffe08a", up = true) {
    for (let k = 0; k < 3; k++) this.add({ kind: "ring", x, y: y + 8 - (up ? k * 6 : -k * 6), color, r0: 10, r1: 12, life: 500 + k * 120, width: 1, flat: true, drift: up ? -18 : 18 });
    for (let k = 0; k < 6; k++) this.add({ kind: "chevron", x: x + rnd(-10, 10), y: y + rnd(-6, 8), vy: up ? rnd(-30, -16) : rnd(16, 30), up, color, life: rnd(500, 800) });
    this.light(x, y, 40, hexRgb(color), 450, 0.5);
  }
  stars(x, y) { for (let k = 0; k < 4; k++) this.add({ kind: "orbit", cx: x, cy: y - 6, r0: 7, a: (k * TAU) / 4, spin: 6, color: "#ffe060", life: 900, size: 2, star: true, flat: true }); }
  poison(x, y) { for (let k = 0; k < 10; k++) this.add({ kind: "rise", x: x + rnd(-8, 8), y: y + rnd(0, 8), vy: rnd(-24, -10), color: "#8ad050", bubble: true, life: rnd(500, 900), add: false }); }
  circle(x, y, color = "#bfe8ff") { this.add({ kind: "glyph", x, y: y + 2, color, r: 12, life: 650 }); this.light(x, y, 50, hexRgb(color), 650, 0.6); }
  charge(x, y) {
    for (let k = 0; k < 16; k++) { const a = rnd(0, TAU), d = rnd(18, 30); this.add({ kind: "gather", x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, tx: x, ty: y, color: Math.random() < 0.5 ? "#ff5040" : "#ffb070", life: rnd(400, 650) }); }
    this.light(x, y, 70, "255,80,60", 700, 0.9);
  }
  bigFlash(color = "255,230,150") { this.add({ kind: "flash", color, life: 500, add: true }); }

  /** Damage-type impact with the right flourish. */
  hit(x, y, type, crit, dir) {
    if (type === "cortante") this.slash(x, y, dir, "#ffffff", crit);
    else if (type === "perforante") this.thrust(x, y, dir);
    else if (type === "contundente") this.blunt(x, y + 8, crit);
    else if (type === "fuego") this.explosion(x, y, crit);
    else if (type === "luz") this.beam(x, y + 10);
    else if (type === "sombra") this.shadowOrbs(x, y);
    this.impact(x, y, type, crit);
  }

  // MARK: Drawing

  /** Draws every particle; returns nothing. Additive ones glow over the scene. */
  draw(x, W, H) {
    const now = performance.now();
    this.p = this.p.filter((p) => now - p.t0 < p.life);
    for (const p of this.p) {
      const k = (now - p.t0) / p.life, t = (now - p.t0) / 1000;
      x.globalCompositeOperation = p.add ? "lighter" : "source-over";
      switch (p.kind) {
        case "spark": case "ember": case "debris": {
          const px = p.x + p.vx * t, py = p.y + p.vy * t + 0.5 * (p.g ?? (p.kind === "ember" ? -30 : 0)) * t * t;
          x.globalAlpha = 1 - k;
          x.fillStyle = p.color;
          const s = p.size ?? (p.kind === "debris" ? 2 : 1);
          x.fillRect(Math.round(px), Math.round(py), s, s);
          if (p.kind === "ember" && k < 0.6) { x.globalAlpha = (1 - k) * 0.35; x.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3); }
          break;
        }
        case "slash": {
          x.globalAlpha = 1 - k; x.strokeStyle = p.color; x.lineWidth = p.width * (1 - k * 0.6);
          const sweep = Math.min(1, k * 2.2) * 2.6;
          x.beginPath();
          if (p.dir > 0) x.arc(p.x - p.r * 0.6, p.y, p.r, p.a0, p.a0 + sweep); else x.arc(p.x + p.r * 0.6, p.y, p.r, Math.PI - p.a0 - sweep, Math.PI - p.a0);
          x.stroke();
          break;
        }
        case "streak": { x.globalAlpha = 1 - k; x.strokeStyle = p.color; x.lineWidth = p.width; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x + (p.x2 - p.x) * Math.min(1, k * 3), p.y2); x.stroke(); break; }
        case "arrow": {
          const e = Math.min(1, k * 1.15);
          const ax = p.x0 + (p.x1 - p.x0) * e, ay = p.y0 + (p.y1 - p.y0) * e - Math.sin(e * Math.PI) * 6;
          const ang = Math.atan2(p.y1 - p.y0, p.x1 - p.x0);
          x.globalAlpha = 1; x.globalCompositeOperation = "lighter"; x.strokeStyle = p.trail; x.lineWidth = 1;
          x.beginPath(); x.moveTo(ax - Math.cos(ang) * 18, ay - Math.sin(ang) * 18 + 2); x.lineTo(ax, ay); x.stroke();
          x.globalCompositeOperation = "source-over"; x.fillStyle = p.color;
          for (let s = 0; s < 6; s++) x.fillRect(Math.round(ax - Math.cos(ang) * s), Math.round(ay - Math.sin(ang) * s), 1, 1);
          x.fillStyle = "#ffffff"; x.fillRect(Math.round(ax), Math.round(ay), 2, 1);
          break;
        }
        case "orb": {
          const e = Math.min(1, k * 1.1);
          const ox = p.x0 + (p.x1 - p.x0) * e, oy = p.y0 + (p.y1 - p.y0) * e - Math.sin(e * Math.PI) * (p.arc ?? 0);
          x.globalAlpha = 0.4; x.fillStyle = p.color; x.beginPath(); x.arc(ox, oy, p.size + 3, 0, TAU); x.fill();
          x.globalAlpha = 1; x.beginPath(); x.arc(ox, oy, p.size, 0, TAU); x.fill();
          x.fillStyle = p.core; x.fillRect(Math.round(ox) - 1, Math.round(oy) - 1, 2, 2);
          if (Math.random() < 0.8) this.p.push({ kind: "ember", x: ox, y: oy, vx: rnd(-10, 10), vy: rnd(-10, 10), color: p.trail === "fire" ? "#ff8a30" : p.color, t0: now, life: 300, add: true });
          break;
        }
        case "burst": { x.globalAlpha = 1 - k; x.fillStyle = p.color; x.beginPath(); x.arc(p.x, p.y, p.r * (0.5 + k), 0, TAU); x.fill(); break; }
        case "ring": {
          x.globalAlpha = 1 - k; x.strokeStyle = p.color; x.lineWidth = p.width ?? 1;
          const r = p.r0 + (p.r1 - p.r0) * Math.sqrt(k);
          x.beginPath(); x.ellipse(p.x, p.y + (p.drift ?? 0) * k, r, p.flat ? r * 0.35 : r, 0, 0, TAU); x.stroke();
          break;
        }
        case "beam": {
          const w = p.width * (k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8);
          const g = x.createLinearGradient(p.x - w, 0, p.x + w, 0);
          g.addColorStop(0, "rgba(255,250,220,0)"); g.addColorStop(0.5, "rgba(255,250,220,0.9)"); g.addColorStop(1, "rgba(255,250,220,0)");
          x.globalAlpha = 1; x.fillStyle = g; x.fillRect(p.x - w, 0, w * 2, p.y);
          x.fillStyle = "#ffffff"; x.fillRect(Math.round(p.x) - 1, 0, 2, p.y);
          break;
        }
        case "orbit": {
          const a = p.a + p.spin * t, r = p.r0 * (p.star ? 1 : 1 - k);
          const ox = p.cx + Math.cos(a) * r, oy = p.cy + Math.sin(a) * r * (p.flat ? 0.4 : 1);
          x.globalAlpha = p.star ? 1 - k * 0.5 : 1 - k * 0.3; x.fillStyle = p.color;
          if (p.star) { x.fillRect(Math.round(ox) - 1, Math.round(oy), 3, 1); x.fillRect(Math.round(ox), Math.round(oy) - 1, 1, 3); }
          else x.fillRect(Math.round(ox), Math.round(oy), p.size, p.size);
          break;
        }
        case "rise": {
          const py = p.y + p.vy * t;
          x.globalAlpha = 1 - k; x.fillStyle = p.color;
          if (p.plus) { x.fillRect(Math.round(p.x) - 1, Math.round(py), 3, 1); x.fillRect(Math.round(p.x), Math.round(py) - 1, 1, 3); }
          else if (p.bubble) { x.strokeStyle = p.color; x.lineWidth = 1; x.beginPath(); x.arc(p.x, py, 1.5 + k * 1.5, 0, TAU); x.stroke(); }
          else x.fillRect(Math.round(p.x), Math.round(py), 1, 1);
          break;
        }
        case "chevron": {
          const py = p.y + p.vy * t;
          x.globalAlpha = 1 - k; x.fillStyle = p.color;
          const d = p.up ? 1 : -1;
          x.fillRect(Math.round(p.x), Math.round(py), 1, 1); x.fillRect(Math.round(p.x) - 1, Math.round(py) + d, 1, 1); x.fillRect(Math.round(p.x) + 1, Math.round(py) + d, 1, 1);
          break;
        }
        case "smoke": {
          x.globalAlpha = (1 - k) * 0.45; x.fillStyle = `rgb(${p.color})`;
          x.beginPath(); x.arc(p.x + p.vx * t, p.y + p.vy * t, p.r * (1 + k), 0, TAU); x.fill();
          break;
        }
        case "glyph": {
          x.globalAlpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85; x.strokeStyle = p.color; x.lineWidth = 1;
          x.beginPath(); x.ellipse(p.x, p.y, p.r, p.r * 0.35, 0, 0, TAU); x.stroke();
          x.beginPath(); x.ellipse(p.x, p.y, p.r * 0.65, p.r * 0.23, 0, 0, TAU); x.stroke();
          for (let s = 0; s < 6; s++) { const a = s * (TAU / 6) + t * 3; x.fillStyle = p.color; x.fillRect(Math.round(p.x + Math.cos(a) * p.r * 0.82), Math.round(p.y + Math.sin(a) * p.r * 0.29), 1, 1); }
          break;
        }
        case "gather": {
          const e = Math.min(1, k * 1.2);
          x.globalAlpha = e; x.fillStyle = p.color;
          x.fillRect(Math.round(p.x + (p.tx - p.x) * e), Math.round(p.y + (p.ty - p.y) * e), 1, 1);
          break;
        }
        case "flash": { x.globalAlpha = (1 - k) * 0.6; x.fillStyle = `rgb(${p.color})`; x.fillRect(0, 0, W, H); break; }
      }
    }
    x.globalAlpha = 1;
    x.globalCompositeOperation = "source-over";
  }

  /** The dynamic lights still alive (fading out). */
  liveLights() {
    const now = performance.now();
    this.lights = this.lights.filter((l) => now - l.t0 < l.life);
    return this.lights.map((l) => ({ ...l, a: l.a * (1 - (now - l.t0) / l.life) }));
  }
}

function hexRgb(c) {
  if (!c.startsWith("#")) return c;
  const n = parseInt(c.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
