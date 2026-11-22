// Game state, derived stats, levelling, equipment and saving. Pure functions over a JSON-safe state
// (localStorage access is wrapped so the module also runs in tests).

import { ATTRS, GEAR, HEROES, ITEMS, RUNES, activeTraits } from "./characters.js";

export const SAVE_VERSION = 1;
const AUTO = "ecos.auto";
const SLOT = (n) => `ecos.slot${n}`;

// MARK: Random (seeded, so tests and replays are stable)

export function rng(seed = Date.now() >>> 0) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// MARK: New game

function newHero(id, level = 1) {
  const h = HEROES[id];
  return {
    level, xp: 0, attrPoints: 0, attrs: { ...h.base },
    mastery: Object.fromEntries(h.cats.map((c) => [c.id, 0])),
    gear: { ...h.gear }, sockets: { weapon: [], armor: [] },
    hp: null, ap: null, // null = full
  };
}

export function newGame() {
  return {
    version: SAVE_VERSION,
    chapter: 1,
    scene: "intro",
    node: "camino",
    flags: {},
    party: { active: ["valen", "elowen"], reserve: [] },
    heroes: { valen: newHero("valen"), elowen: newHero("elowen") },
    inventory: { items: { "raiz-alba": 3, hidromiel: 1, "hoja-vela": 1 }, gear: [], runes: [] },
    gold: 40,
    quests: {},
    bestiary: {}, // enemy id → known weaknesses
    unlocked: ["camino"],
    visited: [],
    playTime: 0,
    savedAt: null,
  };
}

/** A hero joins the fellowship (to the active party if there's room). */
export function joinHero(g, id) {
  if (!g.heroes[id]) g.heroes[id] = newHero(id, Math.max(1, ...Object.values(g.heroes).map((h) => h.level)));
  if (g.party.active.includes(id) || g.party.reserve.includes(id)) return;
  if (g.party.active.length < 3) g.party.active.push(id); else g.party.reserve.push(id);
}

// MARK: Stats

/** Bonuses from gear and socketed runestones. */
function gearBonus(hs) {
  const b = { atk: 0, mag: 0, def: 0, res: 0, hp: 0, ap: 0, crit: 0, eva: 0, spd: 0, apRegen: 0, resist: [], autoRevive: 0, attackType: null };
  for (const slot of ["weapon", "armor", "cloak"]) {
    const it = GEAR[hs.gear[slot]];
    if (!it) continue;
    for (const k of ["atk", "mag", "def", "res", "hp", "ap", "crit", "eva", "spd"]) b[k] += it[k] ?? 0;
  }
  for (const r of [...(hs.sockets.weapon ?? []), ...(hs.sockets.armor ?? [])]) {
    const rr = RUNES[r];
    if (!rr) continue;
    for (const k of ["crit", "def", "eva", "apRegen"]) b[k] += rr[k] ?? 0;
    if (rr.resist) b.resist.push(rr.resist);
    if (rr.autoRevive) b.autoRevive = Math.max(b.autoRevive, rr.autoRevive);
    if (rr.attackType) b.attackType = rr.attackType;
  }
  return b;
}

/** A hero's full stats: attributes, level, gear, runes and passive traits. */
export function heroStats(g, id) {
  const hs = g.heroes[id];
  const h = HEROES[id];
  const a = hs.attrs;
  const b = gearBonus(hs);
  const traits = activeTraits(id, hs.mastery);
  const t = (k) => traits.reduce((n, x) => n + (x[k] ?? 0), 0);
  const hpMax = Math.round((40 + a.con * 8 + hs.level * 6 + b.hp) * (1 + t("hpPct")));
  return {
    hpMax,
    apMax: 12 + a.esp * 3 + b.ap + t("apMax"),
    atk: 4 + a.fue * 2 + b.atk,
    mag: 4 + a.esp * 2 + b.mag,
    def: 2 + a.con + b.def,
    res: 2 + a.esp + b.res,
    spd: 8 + a.vel * 1.5 + b.spd,
    crit: 5 + a.des * 1.5 + b.crit + t("crit"),
    eva: Math.round(a.des * 0.8 + b.eva),
    apRegen: 1 + b.apRegen + t("apRegen"),
    regenPct: t("regenPct"),
    healPct: t("healPct"),
    counter: t("counter"),
    firstTurn: t("firstTurn"),
    resist: b.resist,
    autoRevive: b.autoRevive,
    attackType: b.attackType ?? h.attack,
  };
}

// MARK: Levelling

export const xpToNext = (level) => Math.round(24 * Math.pow(level, 1.55));
export const ATTR_POINTS_PER_LEVEL = 3;

/** Gives XP to a hero; returns how many levels it gained. */
export function gainXp(g, id, xp) {
  const hs = g.heroes[id];
  if (HEROES[id].guest) return 0;
  hs.xp += xp;
  let n = 0;
  while (hs.xp >= xpToNext(hs.level)) {
    hs.xp -= xpToNext(hs.level);
    hs.level++;
    hs.attrPoints += ATTR_POINTS_PER_LEVEL;
    n++;
  }
  if (n) { hs.hp = null; hs.ap = null; }
  return n;
}

/** Spends one attribute point. */
export function allocate(g, id, attr) {
  const hs = g.heroes[id];
  if (!ATTRS.includes(attr) || hs.attrPoints <= 0) return false;
  hs.attrs[attr]++;
  hs.attrPoints--;
  return true;
}

// MARK: Equipment

export function equip(g, id, gearId) {
  const it = GEAR[gearId];
  const hs = g.heroes[id];
  if (!it || (it.for && it.for !== id)) return "Ese equipo no es para este héroe.";
  const k = g.inventory.gear.indexOf(gearId);
  if (k < 0) return "No tienes ese equipo.";
  g.inventory.gear.splice(k, 1);
  const old = hs.gear[it.slot];
  if (old) g.inventory.gear.push(old);
  hs.gear[it.slot] = gearId;
  // Runes in a slot whose item has fewer sockets go back to the bag.
  const slots = it.sockets ?? 0;
  if (hs.sockets[it.slot]) while (hs.sockets[it.slot].length > slots) g.inventory.runes.push(hs.sockets[it.slot].pop());
  return undefined;
}

export const socketCount = (hs, slot) => GEAR[hs.gear[slot]]?.sockets ?? 0;

export function socketRune(g, id, slot, runeId) {
  const hs = g.heroes[id];
  const k = g.inventory.runes.indexOf(runeId);
  if (k < 0) return "No tienes esa runa.";
  const list = (hs.sockets[slot] ??= []);
  if (list.length >= socketCount(hs, slot)) return "No quedan engarces libres.";
  g.inventory.runes.splice(k, 1);
  list.push(runeId);
  return undefined;
}

export function unsocketRune(g, id, slot, index) {
  const list = g.heroes[id].sockets[slot] ?? [];
  const [r] = list.splice(index, 1);
  if (r) g.inventory.runes.push(r);
}

// MARK: Inventory and rewards

export function give(g, kind, id, n = 1) {
  if (kind === "item") g.inventory.items[id] = (g.inventory.items[id] ?? 0) + n;
  else if (kind === "gear") for (let k = 0; k < n; k++) g.inventory.gear.push(id);
  else if (kind === "rune") for (let k = 0; k < n; k++) g.inventory.runes.push(id);
  else if (kind === "gold") g.gold += n;
}

export function buy(g, kind, id) {
  const price = (kind === "item" ? ITEMS[id] : GEAR[id])?.price;
  if (!price) return "No está a la venta.";
  if (g.gold < price) return "No tienes oro suficiente.";
  g.gold -= price;
  give(g, kind, id);
  return undefined;
}

/** Full rest at a campfire. */
export function rest(g) {
  for (const hs of Object.values(g.heroes)) { hs.hp = null; hs.ap = null; }
}

/** After a battle: XP, gold, drops, mastery and the heroes' remaining health. Returns level-ups. */
export function applyBattleResult(g, result) {
  const ups = [];
  for (const [id, m] of Object.entries(result.mastery)) {
    const hs = g.heroes[id];
    if (!hs) continue;
    for (const [cat, n] of Object.entries(m)) if (cat in hs.mastery) hs.mastery[cat] += n;
  }
  for (const u of result.heroes) {
    const hs = g.heroes[u.id];
    if (!hs || HEROES[u.id].guest) continue;
    const st = heroStats(g, u.id);
    hs.hp = u.hp <= 0 ? 1 : Math.min(u.hp, st.hpMax);
    hs.ap = Math.min(u.ap, st.apMax);
  }
  if (result.victory) {
    g.gold += result.gold;
    for (const d of result.drops) give(g, d.kind, d.id, d.n ?? 1);
    for (const id of [...g.party.active, ...g.party.reserve]) {
      const n = gainXp(g, id, result.xp);
      if (n) ups.push({ id, levels: n, level: g.heroes[id].level });
    }
  }
  for (const [eid, types] of Object.entries(result.discovered ?? {})) {
    const known = new Set(g.bestiary[eid] ?? []);
    for (const t of types) known.add(t);
    g.bestiary[eid] = [...known];
  }
  return ups;
}

// MARK: Saving

const store = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };

export function save(g, slot = "auto") {
  const ls = store();
  if (!ls) return false;
  g.savedAt = new Date().toISOString();
  try { ls.setItem(slot === "auto" ? AUTO : SLOT(slot), JSON.stringify(g)); return true; } catch { return false; }
}

export function load(slot = "auto") {
  const ls = store();
  try {
    const t = ls?.getItem(slot === "auto" ? AUTO : SLOT(slot));
    const g = t ? JSON.parse(t) : null;
    return g && g.version === SAVE_VERSION ? g : null;
  } catch { return null; }
}

/** A short description of a saved game (for the slot list). */
export function describeSave(slot) {
  const g = load(slot);
  if (!g) return null;
  const lv = Math.max(...Object.values(g.heroes).map((h) => h.level));
  return { chapter: g.chapter, node: g.node, level: lv, heroes: Object.keys(g.heroes).length, savedAt: g.savedAt, playTime: g.playTime };
}
