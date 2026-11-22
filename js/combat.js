// The tactical battle engine (pure logic, no DOM): a Conditional Turn-Based timeline where every
// combatant has a "next" time; the lowest acts. Fast skills, Prisa (haste), Lentitud (slow),
// stuns and delays move units along the timeline. Every action returns a list of events that the
// renderer animates (damage numbers, flashes, charge warnings…).

import { DMG, HEROES, ITEMS, PHYSICAL, SKILLS, unlockedSkills } from "./characters.js";
import { ENEMIES } from "./enemies.js";
import { heroStats } from "./engine.js";

const BASE = 10000; // delay 100 at speed 1 → time units
const FELLOW_MAX = 100;
const STATUS_NAME = { poison: "Veneno", burn: "Quemadura", bleed: "Sangrado", blind: "Ceguera" };
const STATUS_PCT = { poison: 0.06, burn: 0.09, bleed: 0.05 };

// MARK: Setup

function heroUnit(g, id, uid) {
  const st = heroStats(g, id);
  const hs = g.heroes[id];
  const h = HEROES[id];
  return {
    uid, side: "hero", id, name: h.name, color: h.color, guest: !!h.guest,
    hp: hs.hp ?? st.hpMax, hpMax: st.hpMax, ap: hs.ap ?? st.apMax, apMax: st.apMax,
    atk: st.atk, mag: st.mag, def: st.def, res: st.res, spd: st.spd, crit: st.crit, eva: st.eva,
    apRegen: st.apRegen, regenPct: st.regenPct, healPct: st.healPct, counterChance: st.counter, firstTurn: st.firstTurn,
    weak: [], resist: st.resist, attackType: st.attackType, autoRevive: st.autoRevive,
    skills: h.guest ? h.cats.flatMap((c) => c.tiers) : unlockedSkills(id, hs.mastery),
    ...freshState(),
  };
}

/** Tuning knobs for enemy strength (1 = as written in enemies.js). */
export const TUNING = { hp: 1.25, atk: 1.9, boss: 1.25 };

/** scale: a number (health ×n, attack ×√n) or { hp, atk } for a chapter's enemies. */
function enemyUnit(id, uid, scale = 1) {
  const e = ENEMIES[id];
  const sh = typeof scale === "number" ? scale : scale.hp ?? 1;
  const sa = typeof scale === "number" ? Math.sqrt(scale) : scale.atk ?? 1;
  // Bosses' health is set by hand for their chapter: the chapter scales only their attack and speed.
  const hp = Math.round(e.hp * TUNING.hp * (e.boss ? TUNING.boss : sh));
  return {
    uid, side: "enemy", id, name: e.name, boss: !!e.boss,
    hp, hpMax: hp, ap: 0, apMax: 0,
    atk: e.atk * TUNING.atk * sa, mag: e.mag * TUNING.atk * sa, def: e.def, res: e.res, spd: e.spd * (typeof scale === "number" ? 1 : scale.spd ?? 1), crit: 5, eva: e.eva ?? 0,
    weak: e.weak, resist: e.resist, skills: e.skills, phasesDone: 0,
    ...freshState(),
  };
}

const freshState = () => ({ next: 0, buffs: [], statuses: {}, haste: 0, slow: 0, taunt: 0, counter: 0, evade: 0, regen: 0, imbue: null, charging: null, defending: false, revived: false, alive: true, inReserve: false });

/**
 * A new battle. opts: { enemies: [ids], script?: [...], seed?, guests?: [hero ids that join now] }.
 * The hero party comes from the game state (active 3 + reserve).
 */
export function createBattle(g, opts, rand = Math.random) {
  const b = {
    time: 0, units: [], fellowship: opts.fellowship ?? 0, turnUid: null, result: null, turns: 0,
    mastery: {}, discovered: {}, defeated: 0, script: (opts.script ?? []).map((s) => ({ ...s, done: false })),
    rand, inventory: g.inventory, bg: opts.bg ?? "bosque", music: opts.music, xp: 0, gold: 0, drops: [], log: [],
    noLoss: !!opts.noLoss, scale: opts.scale ?? 1, spec: opts,
  };
  let n = 0;
  for (const id of g.party.active) b.units.push(heroUnit(g, id, `h${n++}`));
  for (const id of g.party.reserve) { const u = heroUnit(g, id, `h${n++}`); u.inReserve = true; b.units.push(u); }
  n = 0;
  for (const id of opts.enemies) b.units.push(enemyUnit(id, `e${n++}`, b.scale));
  for (const u of b.units) u.next = startDelay(b, u);
  b.g = g;
  return b;
}

function startDelay(b, u) {
  const base = BASE / spdEff(u);
  return base * (0.55 + b.rand() * 0.45) * (1 - (u.firstTurn ?? 0));
}

// MARK: Queries

export const spdEff = (u) => u.spd * (u.haste > 0 ? 1.5 : 1) * (u.slow > 0 ? 0.6 : 1);
export const fighting = (b) => b.units.filter((u) => u.alive && !u.inReserve);
export const heroes = (b, alive = true) => b.units.filter((u) => u.side === "hero" && !u.inReserve && (!alive || u.alive));
export const enemies = (b) => b.units.filter((u) => u.side === "enemy" && u.alive);
export const reserve = (b) => b.units.filter((u) => u.side === "hero" && u.inReserve);
export const unit = (b, uid) => b.units.find((u) => u.uid === uid);
export const current = (b) => unit(b, b.turnUid);

/** Effective stat with buffs/debuffs. */
export function stat(u, k) {
  let v = u[k];
  for (const x of u.buffs) if (x.stat === k) v *= x.mult;
  return v;
}

/** The next n turns, in order (simulated with normal 100-delay actions). */
export function timeline(b, n = 8) {
  const sim = fighting(b).map((u) => ({ uid: u.uid, next: u.next, step: BASE / spdEff(u) }));
  const out = [];
  while (out.length < n && sim.length) {
    sim.sort((a, c) => a.next - c.next);
    const s = sim[0];
    const u = unit(b, s.uid);
    out.push({ uid: u.uid, side: u.side, name: u.name, id: u.id, charging: !!u.charging && out.every((x) => x.uid !== u.uid), color: u.color });
    s.next += s.step;
  }
  return out;
}

/** The skills a hero can use now (with why not). */
export function heroSkills(b, u) {
  return u.skills.map((id) => {
    const s = SKILLS[id];
    let why;
    if (u.ap < s.ap) why = `Necesitas ${s.ap} AP`;
    else if (s.target === "deadAlly" && !heroes(b, false).some((x) => !x.alive)) why = "Nadie ha caído";
    return { id, skill: s, why };
  });
}

export const canCombo = (b) => b.fellowship >= FELLOW_MAX && heroes(b).length >= 2;

/** Valid targets for a skill / item target kind. */
export function targetsFor(b, kind) {
  switch (kind) {
    case "enemy": return enemies(b);
    case "ally": return heroes(b);
    case "deadAlly": return heroes(b, false).filter((u) => !u.alive);
    default: return [];
  }
}

// MARK: Turn flow

/** Advances to the next unit's turn, resolving its start-of-turn effects. Returns events. */
export function advance(b) {
  const ev = [];
  if (b.result) return ev;
  for (let guard = 0; guard < 50; guard++) {
    const alive = fighting(b);
    alive.sort((a, c) => a.next - c.next || (a.side === "hero" ? -1 : 1));
    const u = alive[0];
    if (!u) break;
    b.time = u.next;
    b.turnUid = u.uid;
    b.turns++;
    u.defending = false;
    ev.push({ t: "turn", uid: u.uid });
    startOfTurn(b, u, ev);
    if (checkEnd(b, ev)) return ev;
    if (u.alive) return ev;
  }
  return ev;
}

function startOfTurn(b, u, ev) {
  // Damage over time.
  for (const [k, s] of Object.entries(u.statuses)) {
    if (!STATUS_PCT[k] || !u.alive) continue;
    const dmg = Math.max(1, Math.round(u.hpMax * STATUS_PCT[k]));
    ev.push({ t: "status", uid: u.uid, text: STATUS_NAME[k] });
    hurt(b, u, dmg, ev, { dot: true });
    s.turns--;
  }
  for (const k of Object.keys(u.statuses)) if (u.statuses[k].turns <= 0) delete u.statuses[k];
  if (!u.alive) return;
  if (u.regen > 0) { heal(b, u, Math.round(u.hpMax * 0.06), ev); u.regen--; }
  if (u.regenPct) heal(b, u, Math.round(u.hpMax * u.regenPct), ev);
  if (u.side === "hero") gainAp(u, u.apRegen, ev, true);
}

/** End of the acting unit's turn: tick its timed effects and schedule its next turn. */
function endTurn(b, u, delay = 100) {
  u.next = b.time + (delay * BASE) / 100 / spdEff(u);
  for (const x of u.buffs) x.turns--;
  u.buffs = u.buffs.filter((x) => x.turns > 0);
  for (const k of ["haste", "slow", "taunt", "counter", "evade"]) if (u[k] > 0) u[k]--;
  if (u.imbue && --u.imbue.turns <= 0) u.imbue = null;
}

function checkEnd(b, ev) {
  if (b.result) return true;
  if (!enemies(b).length) { finish(b, "victory", ev); return true; }
  if (!heroes(b).length) {
    const sub = reserve(b).find((u) => u.alive);
    if (sub) {
      const out = heroes(b, false)[0];
      swapUnits(b, out, sub, ev);
      return false;
    }
    finish(b, "defeat", ev);
    return true;
  }
  return false;
}

function finish(b, result, ev) {
  b.result = result;
  ev.push({ t: "end", result });
}

// MARK: Player actions

/**
 * The current hero acts. action: { kind: "attack", target } | { kind: "skill", skill, target }
 * | { kind: "defend" } | { kind: "item", item, target } | { kind: "swap", with } | { kind: "combo" }.
 * Returns events, or { error } if the action isn't valid.
 */
export function act(b, action) {
  const u = current(b);
  if (!u || u.side !== "hero" || b.result) return { error: "No es el turno de un héroe." };
  const ev = [];
  let delay = 100;
  switch (action.kind) {
    case "attack": {
      const t = unit(b, action.target);
      if (!t?.alive || t.side !== "enemy") return { error: "Elige un enemigo." };
      ev.push({ t: "attack", uid: u.uid, target: t.uid, name: "Ataque" });
      strike(b, u, t, { power: 1, stat: u.attackType === "luz" ? "mag" : "atk", type: u.attackType, basic: true }, ev);
      gainAp(u, 1, ev);
      break;
    }
    case "skill": {
      const s = SKILLS[action.skill];
      if (!s || !u.skills.includes(action.skill)) return { error: "No conoces esa habilidad." };
      if (u.ap < s.ap) return { error: `Necesitas ${s.ap} AP.` };
      const targets = resolveTargets(b, u, s.target, action.target);
      if (!targets) return { error: "Elige un objetivo." };
      u.ap -= s.ap;
      ev.push({ t: s.power ? "attack" : "cast", uid: u.uid, target: targets[0]?.uid, name: s.name, skill: action.skill, type: s.type });
      const hitWeak = useSkill(b, u, s, targets, ev);
      if (s.cat && s.cat !== "rasgos" && s.cat !== "invitado") {
        const m = (b.mastery[u.id] ??= {});
        m[s.cat] = (m[s.cat] ?? 0) + 1 + (hitWeak ? 1 : 0);
      }
      delay = s.delay ?? 100;
      break;
    }
    case "defend": {
      u.defending = true;
      ev.push({ t: "cast", uid: u.uid, name: "Defender" });
      gainAp(u, 4, ev);
      delay = 80;
      break;
    }
    case "item": {
      const it = ITEMS[action.item];
      if (!it || !(b.inventory.items[action.item] > 0)) return { error: "No te queda." };
      const t = unit(b, action.target);
      if (!t || t.side !== "hero" || t.inReserve) return { error: "Elige a un compañero." };
      if (it.target === "deadAlly" ? t.alive : !t.alive) return { error: it.target === "deadAlly" ? "Solo sobre un caído." : "Está fuera de combate." };
      b.inventory.items[action.item]--;
      ev.push({ t: "cast", uid: u.uid, name: it.name });
      if (it.heal) heal(b, t, Math.round(t.hpMax * it.heal), ev);
      if (it.ap) gainAp(t, it.ap, ev);
      if (it.revive) revive(b, t, it.revive, ev);
      if (it.cleanse) { t.statuses = {}; ev.push({ t: "status", uid: t.uid, text: "Purificado" }); }
      delay = 80;
      break;
    }
    case "swap": {
      const sub = unit(b, action.with);
      if (!sub || !sub.inReserve || !sub.alive) return { error: "Elige a quién sacar." };
      swapUnits(b, u, sub, ev);
      delay = 100;
      break;
    }
    case "combo": {
      if (!canCombo(b)) return { error: "La barra de la Comunidad no está llena." };
      combo(b, ev);
      delay = 100;
      break;
    }
    default: return { error: "Acción desconocida." };
  }
  if (u.alive && !u.inReserve) endTurn(b, u, delay);
  runScript(b, ev);
  if (!checkEnd(b, ev)) ev.push(...advance(b));
  return ev;
}

function resolveTargets(b, u, kind, target) {
  switch (kind) {
    case "self": return [u];
    case "allAllies": return heroes(b);
    case "allEnemies": return enemies(b);
    case "randomEnemies": return enemies(b).length ? [] : null;
    case "enemy": case "ally": case "deadAlly": {
      const t = unit(b, target);
      return t && targetsFor(b, kind).includes(t) ? [t] : null;
    }
    default: return null;
  }
}

/** Applies a skill. Returns whether it hit a weakness. */
function useSkill(b, u, s, targets, ev) {
  let weak = false;
  if (s.target === "randomEnemies") {
    for (let k = 0; k < (s.hits ?? 1); k++) {
      const list = enemies(b);
      if (!list.length) break;
      const t = list[Math.floor(b.rand() * list.length)];
      weak = strike(b, u, t, s, ev) || weak;
    }
    return weak;
  }
  for (const t of targets) {
    if (s.power) for (let k = 0; k < (s.hits ?? 1); k++) { if (t.alive) weak = strike(b, u, t, s, ev) || weak; }
    for (const e of s.effects ?? []) applyEffect(b, u, t, e, s, ev);
  }
  return weak;
}

function swapUnits(b, out, sub, ev) {
  out.inReserve = true;
  sub.inReserve = false;
  sub.next = b.time + (40 * BASE) / 100 / spdEff(sub);
  ev.push({ t: "swap", out: out.uid, in: sub.uid });
}

function combo(b, ev) {
  const team = heroes(b);
  const power = team.reduce((a, x) => a + Math.max(stat(x, "atk"), stat(x, "mag")), 0) * 1.6;
  b.fellowship = 0;
  ev.push({ t: "combo", uids: team.map((x) => x.uid) });
  for (const t of enemies(b)) {
    const dmg = Math.round(power * (60 / (60 + t.def)) * (0.95 + b.rand() * 0.1));
    ev.push({ t: "damage", uid: t.uid, amount: dmg, crit: true, combo: true });
    hurt(b, t, dmg, ev);
  }
  ev.push({ t: "fellowship", value: 0 });
}

// MARK: Enemy turns

/** The current enemy acts (simple weighted AI with telegraphed charge attacks). */
export function enemyAct(b) {
  const u = current(b);
  if (!u || u.side !== "enemy" || b.result) return [];
  const ev = [];
  let delay = 100;
  if (u.charging) {
    const s = u.charging;
    u.charging = null;
    ev.push({ t: "attack", uid: u.uid, name: s.name, big: true, type: s.type });
    enemySkill(b, u, s, ev);
  } else {
    const s = pickSkill(b, u);
    if (s.charge) {
      u.charging = s;
      ev.push({ t: "charge", uid: u.uid, name: s.name });
      delay = 55;
    } else {
      ev.push({ t: s.power ? "attack" : "cast", uid: u.uid, name: s.name, type: s.type });
      enemySkill(b, u, s, ev);
    }
  }
  if (u.alive) endTurn(b, u, delay);
  runScript(b, ev);
  if (!checkEnd(b, ev)) ev.push(...advance(b));
  return ev;
}

function pickSkill(b, u) {
  const opts = u.skills.filter((s) => {
    if (s.effects?.some((e) => e.do === "healSelf") && u.hp > u.hpMax * 0.7) return false;
    if (s.target === "self" && s.effects?.some((e) => e.do === "buff") && u.buffs.some((x) => x.mult > 1)) return false;
    return true;
  });
  const total = opts.reduce((a, s) => a + s.weight, 0);
  let r = b.rand() * total;
  for (const s of opts) { r -= s.weight; if (r <= 0) return s; }
  return opts[0];
}

function pickHero(b) {
  const list = heroes(b);
  const taunter = list.find((h) => h.taunt > 0);
  if (taunter) return taunter;
  // A little more likely to go for the wounded.
  const w = list.map((h) => 1 + (1 - h.hp / h.hpMax));
  let r = b.rand() * w.reduce((a, x) => a + x, 0);
  for (let k = 0; k < list.length; k++) { r -= w[k]; if (r <= 0) return list[k]; }
  return list[0];
}

function enemySkill(b, u, s, ev) {
  const targets = s.target === "allHeroes" ? heroes(b) : s.target === "self" ? [u] : [pickHero(b)].filter(Boolean);
  for (const t of targets) {
    if (!t.alive) continue;
    if (s.power) strike(b, u, t, s, ev);
    for (const e of s.effects ?? []) applyEffect(b, u, t, e, s, ev);
  }
}

// MARK: Damage and effects

/** One hit. Returns whether it hit a weakness. */
function strike(b, u, t, s, ev) {
  if (!t.alive) return false;
  let type = s.type ?? "contundente";
  // Runa de Brasa: the hero's physical blows carry the imbued element.
  const imbued = u.imbue && PHYSICAL.includes(type);
  if (imbued) type = u.imbue.type;
  const physical = PHYSICAL.includes(type);
  // Evasion (physical only) and blindness.
  const eva = (stat(t, "eva") ?? 0) + (t.evade > 0 ? 40 : 0);
  const blind = u.statuses.blind && physical ? 50 : 0;
  if (physical && b.rand() * 100 < eva + blind) { ev.push({ t: "miss", uid: t.uid }); return false; }
  const atk = stat(u, s.stat ?? "atk");
  const mitig = physical ? stat(t, "def") : stat(t, "res");
  let dmg = atk * (s.power ?? 1) * (40 / (40 + mitig)) * (imbued ? 1.1 : 1);
  const weak = t.weak.includes(type);
  const resisted = t.resist.includes(type);
  if (weak) dmg *= 1.5;
  if (resisted) dmg *= 0.5;
  const crit = b.rand() * 100 < (u.crit ?? 5) + (s.crit ?? 0);
  if (crit) dmg *= 1.6;
  if (t.defending) dmg *= 0.5;
  dmg = Math.max(1, Math.round(dmg * (0.92 + b.rand() * 0.16)));
  ev.push({ t: "damage", uid: t.uid, amount: dmg, crit, weak, resist: resisted, type });
  if (u.side === "hero" && t.side === "enemy") {
    if (weak || resisted) { const d = (b.discovered[t.id] ??= []); if (!d.includes(type)) d.push(type); }
    addFellowship(b, 4 + (weak ? 6 : 0) + (crit ? 3 : 0), ev);
  } else if (u.side === "enemy") addFellowship(b, 2, ev);
  hurt(b, t, dmg, ev);
  // Blunt hits break a charge.
  if (t.alive && t.charging && type === "contundente" && u.side === "hero") interrupt(t, ev);
  // Counters (physical single hits on a hero that is countering).
  if (t.alive && u.alive && t.side === "hero" && u.side === "enemy" && physical && (t.counter > 0 || b.rand() < (t.counterChance ?? 0))) {
    ev.push({ t: "counter", uid: t.uid, target: u.uid });
    strike(b, t, u, { power: 0.8, stat: "atk", type: t.attackType }, ev);
  }
  return weak;
}

function interrupt(t, ev) {
  if (!t.charging) return;
  t.charging = null;
  ev.push({ t: "interrupt", uid: t.uid });
}

function hurt(b, t, dmg, ev, opts = {}) {
  t.hp = Math.max(0, t.hp - dmg);
  if (opts.dot) ev.push({ t: "damage", uid: t.uid, amount: dmg, dot: true });
  if (t.hp > 0) { if (t.boss) checkPhase(b, t, ev); return; }
  // Lágrima Estelar: revive once.
  if (t.side === "hero" && t.autoRevive && !t.revived) {
    t.revived = true;
    t.hp = Math.round(t.hpMax * t.autoRevive);
    ev.push({ t: "revive", uid: t.uid, text: "Lágrima Estelar" });
    return;
  }
  t.alive = false;
  t.charging = null;
  t.statuses = {}; t.buffs = [];
  ev.push({ t: "ko", uid: t.uid });
  if (t.side === "enemy") {
    const e = ENEMIES[t.id];
    b.defeated++;
    b.xp += e.xp; b.gold += e.gold;
    for (const d of e.drops ?? []) if (b.rand() < (d.chance ?? 1)) b.drops.push(d);
  }
}

function heal(b, t, amount, ev) {
  if (!t.alive || amount <= 0) return;
  const before = t.hp;
  t.hp = Math.min(t.hpMax, t.hp + amount);
  if (t.hp > before) ev.push({ t: "heal", uid: t.uid, amount: t.hp - before });
}

function revive(b, t, pct, ev) {
  if (t.alive) return;
  t.alive = true;
  t.hp = Math.max(1, Math.round(t.hpMax * pct));
  t.next = b.time + (60 * BASE) / 100 / spdEff(t);
  ev.push({ t: "revive", uid: t.uid });
}

function gainAp(u, n, ev, quiet = false) {
  if (u.side !== "hero" || !n) return;
  const before = u.ap;
  u.ap = Math.min(u.apMax, u.ap + n);
  if (!quiet && u.ap > before) ev.push({ t: "ap", uid: u.uid, amount: u.ap - before });
}

function addFellowship(b, n, ev) {
  const before = b.fellowship;
  b.fellowship = Math.min(FELLOW_MAX, b.fellowship + n);
  if (b.fellowship !== before) ev.push({ t: "fellowship", value: b.fellowship, full: before < FELLOW_MAX && b.fellowship >= FELLOW_MAX });
}

function applyEffect(b, u, t, e, s, ev) {
  if (!t.alive && e.do !== "revive") return;
  switch (e.do) {
    case "buff": case "debuff": {
      t.buffs = t.buffs.filter((x) => !(x.stat === e.stat && (x.mult > 1) === (e.mult > 1)));
      t.buffs.push({ stat: e.stat, mult: e.mult, turns: e.turns });
      ev.push({ t: "status", uid: t.uid, text: `${{ atk: "Ataque", def: "Defensa", res: "Resistencia", spd: "Velocidad" }[e.stat]} ${e.mult > 1 ? "▲" : "▼"}`, good: e.mult > 1 });
      break;
    }
    case "status": {
      if (b.rand() > (e.chance ?? 1)) break;
      t.statuses[e.kind] = { turns: e.turns };
      ev.push({ t: "status", uid: t.uid, text: STATUS_NAME[e.kind], good: false });
      break;
    }
    case "haste": case "slow": {
      const before = spdEff(t);
      t.haste = e.do === "haste" ? e.turns : 0;
      t.slow = e.do === "slow" ? e.turns : 0;
      reschedule(b, t, before);
      ev.push({ t: "status", uid: t.uid, text: e.do === "haste" ? "Prisa" : "Lentitud", good: e.do === "haste" });
      break;
    }
    case "stun": {
      if (e.chance !== undefined && b.rand() > e.chance) break;
      t.next += (0.7 * BASE) / spdEff(t); interrupt(t, ev); ev.push({ t: "status", uid: t.uid, text: "Aturdido", good: false, stun: true });
      break;
    }
    case "imbue": t.imbue = { type: e.type, turns: e.turns }; ev.push({ t: "status", uid: t.uid, text: `Arma de ${DMG[e.type].name}`, good: true, imbue: e.type }); break;
    case "delay": t.next += (e.amount * BASE) / 100 / spdEff(t); ev.push({ t: "status", uid: t.uid, text: "Retrasado", good: false }); break;
    case "interrupt": interrupt(t, ev); break;
    case "heal": heal(b, t, Math.round(stat(u, "mag") * e.power * (1 + (u.healPct ?? 0))), ev); break;
    case "healSelf": heal(b, t, Math.round(t.hpMax * e.pct), ev); break;
    case "revive": revive(b, t, e.pct, ev); break;
    case "ap": gainAp(t, e.amount, ev); break;
    case "taunt": t.taunt = e.turns; ev.push({ t: "status", uid: t.uid, text: "Provoca", good: true }); break;
    case "counter": t.counter = e.turns; ev.push({ t: "status", uid: t.uid, text: "Contragolpe", good: true }); break;
    case "evade": t.evade = e.turns; ev.push({ t: "status", uid: t.uid, text: "Evasión", good: true }); break;
    case "regen": t.regen = e.turns; ev.push({ t: "status", uid: t.uid, text: "Regeneración", good: true }); break;
    case "cleanse": t.statuses = {}; ev.push({ t: "status", uid: t.uid, text: "Purificado", good: true }); break;
  }
}

/** Haste/slow: the time left until the unit's next turn scales with its new speed. */
function reschedule(b, t, before) {
  if (t.uid === b.turnUid) return; // the acting unit is rescheduled when its turn ends
  const left = Math.max(0, t.next - b.time);
  t.next = b.time + left * (before / spdEff(t));
}

// MARK: Boss phases and scripted moments

function checkPhase(b, t, ev) {
  const phases = ENEMIES[t.id].phases ?? [];
  const p = phases[t.phasesDone];
  if (!p || t.hp > t.hpMax * p.at) return;
  t.phasesDone++;
  t.skills = p.skills;
  t.charging = null;
  if (p.buff) t.buffs.push({ ...p.buff, turns: 99 });
  ev.push({ t: "phase", uid: t.uid, text: p.text });
  for (const id of p.summon ?? []) addEnemy(b, id, ev);
}

function addEnemy(b, id, ev) {
  const u = enemyUnit(id, `e${b.units.length}`, b.scale);
  u.next = b.time + (50 * BASE) / 100 / spdEff(u);
  b.units.push(u);
  ev.push({ t: "summon", uid: u.uid });
}

/** Script entries: { when: { turns } | { defeated } | { hpBelow: pct (any hero) }, actions: [{ say }, { join }, { spawn }] }. */
function runScript(b, ev) {
  for (const s of b.script) {
    if (s.done) continue;
    const w = s.when;
    const ok = (w.turns !== undefined && b.turns >= w.turns) || (w.defeated !== undefined && b.defeated >= w.defeated)
      || (w.hpBelow !== undefined && heroes(b).some((h) => h.hp / h.hpMax < w.hpBelow));
    if (!ok) continue;
    s.done = true;
    for (const a of s.actions) {
      if (a.say) ev.push({ t: "say", who: a.say.who, text: a.say.text });
      if (a.join) joinUnit(b, a.join, ev);
      if (a.spawn) for (const id of a.spawn) addEnemy(b, id, ev);
      if (a.fellowship) { b.fellowship = Math.min(FELLOW_MAX, b.fellowship + a.fellowship); ev.push({ t: "fellowship", value: b.fellowship }); }
    }
  }
}

/** A guest hero at least as strong as the party (their attributes grow with the level). */
export function guestState(g, id) {
  const H = HEROES[id];
  const party = Math.max(1, ...Object.entries(g.heroes).filter(([k, h]) => h && !HEROES[k]?.guest).map(([, h]) => h.level));
  const level = Math.max(H.level ?? 1, party + 1);
  const grow = Math.floor((level - 1) * 0.7);
  return { level, xp: 0, attrPoints: 0, attrs: Object.fromEntries(Object.entries(H.base).map(([k, v]) => [k, v + grow])), mastery: {}, gear: { ...H.gear }, sockets: { weapon: [], armor: [] }, hp: null, ap: null };
}

function joinUnit(b, id, ev) {
  if (b.units.some((u) => u.id === id)) return;
  b.g.heroes[id] = guestState(b.g, id);
  const u = heroUnit(b.g, id, `h${b.units.length}`);
  u.next = b.time + (30 * BASE) / 100 / spdEff(u);
  if (heroes(b, false).length >= 3) u.inReserve = true;
  b.units.push(u);
  ev.push({ t: "join", uid: u.uid, reserve: u.inReserve });
}

/** What the battle gives back to the game state. */
export function battleResult(b) {
  return {
    victory: b.result === "victory",
    xp: b.xp, gold: b.gold, drops: b.drops, mastery: b.mastery, discovered: b.discovered,
    heroes: b.units.filter((u) => u.side === "hero").map((u) => ({ id: u.id, hp: u.hp, ap: u.ap })),
  };
}

export const DAMAGE_TYPES = DMG;

// MARK: Saving a battle in progress

/** The battle as JSON (without the random source and the game references). */
export function exportBattle(b) {
  return JSON.stringify(b, (k, v) => (k === "rand" || k === "g" || k === "inventory" ? undefined : v));
}

/** A saved battle, reconnected to the game state. */
export function importBattle(json, g, rand = Math.random) {
  const b = typeof json === "string" ? JSON.parse(json) : json;
  b.rand = rand; b.g = g; b.inventory = g.inventory;
  return b;
}
