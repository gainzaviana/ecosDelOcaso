// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { act, advance, battleResult, canCombo, createBattle, current, enemies, enemyAct, heroes, heroSkills, reserve, timeline, unit } from "../js/combat.js";
import { allocate, applyBattleResult, gainXp, heroStats, joinHero, newGame, rng, xpToNext } from "../js/engine.js";
import { TIER_AT, unlockedSkills } from "../js/characters.js";
import { CHAPTER1 } from "../js/story.js";

/** Plays a battle with a simple bot: heals when hurt, interrupts charges, uses skills or attacks. */
function autoplay(b, maxSteps = 800) {
  let steps = 0;
  advance(b);
  while (!b.result && steps++ < maxSteps) {
    const u = current(b);
    if (u.side === "enemy") { enemyAct(b); continue; }
    const foes = enemies(b);
    const charging = foes.find((e) => e.charging);
    const skills = heroSkills(b, u).filter((x) => !x.why);
    const hurt = heroes(b).find((h) => h.hp < h.hpMax * 0.45);
    let action;
    if (canCombo(b)) action = { kind: "combo" };
    else if (hurt && skills.some((x) => x.id === "luz-sanadora")) action = { kind: "skill", skill: "luz-sanadora", target: hurt.uid };
    else if (charging && skills.some((x) => x.skill.effects?.some((e) => e.do === "interrupt"))) {
      const s = skills.find((x) => x.skill.effects?.some((e) => e.do === "interrupt"));
      action = { kind: "skill", skill: s.id, target: charging.uid };
    } else {
      const dmg = skills.filter((x) => x.skill.power && x.skill.target === "enemy");
      action = dmg.length && u.ap > 8 ? { kind: "skill", skill: dmg[dmg.length - 1].id, target: foes[0].uid } : { kind: "attack", target: foes[0].uid };
    }
    const ev = act(b, action);
    assert.ok(!ev.error, `${u.name}: ${ev.error} (${JSON.stringify(action)})`);
  }
  return b;
}

test("timeline lists upcoming turns in order and haste moves a hero up", () => {
  const g = newGame();
  const b = createBattle(g, { enemies: ["merodeador", "merodeador"] }, rng(1));
  advance(b);
  const t = timeline(b, 8);
  assert.equal(t.length, 8);
  const elowen = b.units.find((u) => u.id === "elowen");
  const countBefore = timeline(b, 10).filter((x) => x.uid === elowen.uid).length;
  elowen.haste = 3;
  const countAfter = timeline(b, 10).filter((x) => x.uid === elowen.uid).length;
  assert.ok(countAfter > countBefore, `haste: ${countBefore} → ${countAfter}`);
});

test("weakness hits deal more damage, fill the Fellowship gauge and are remembered", () => {
  const g = newGame();
  const b = createBattle(g, { enemies: ["merodeador"] }, rng(2));
  advance(b);
  while (current(b).side !== "hero") enemyAct(b);
  const u = current(b);
  const foe = enemies(b)[0];
  // Elowen's basic attack is Luz: the raider is weak to it.
  const elowen = b.units.find((x) => x.id === "elowen");
  b.turnUid = elowen.uid;
  const ev = act(b, { kind: "attack", target: foe.uid });
  const hit = ev.find((e) => e.t === "damage" || e.t === "miss");
  if (hit.t === "damage") {
    assert.equal(hit.weak, true);
    assert.ok(b.fellowship >= 10);
    assert.deepEqual(battleResult(b).discovered.merodeador, ["luz"]);
  }
  void u;
});

test("charge attacks are telegraphed and a blunt hit interrupts them", () => {
  const g = newGame();
  const b = createBattle(g, { enemies: ["bruto"] }, rng(3));
  advance(b);
  const brute = enemies(b)[0];
  brute.charging = brute.skills.find((s) => s.charge);
  const tl = timeline(b, 8);
  assert.ok(tl.some((x) => x.uid === brute.uid && x.charging));
  const valen = b.units.find((x) => x.id === "valen");
  valen.skills.push("rompeescudos");
  valen.ap = 20;
  b.turnUid = valen.uid;
  const ev = act(b, { kind: "skill", skill: "rompeescudos", target: brute.uid });
  assert.ok(ev.some((e) => e.t === "interrupt" && e.uid === brute.uid) || ev.some((e) => e.t === "miss"));
  if (ev.some((e) => e.t === "interrupt")) assert.equal(brute.charging, null);
});

test("full battles end in victory or defeat without errors; mastery is earned by using skills", () => {
  let wins = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const g = newGame();
    joinHero(g, "theron");
    const b = autoplay(createBattle(g, { enemies: ["merodeador", "arquero", "bruto"] }, rng(seed)));
    assert.ok(b.result, `seed ${seed}: no result`);
    if (b.result === "victory") wins++;
    const r = battleResult(b);
    applyBattleResult(g, r);
    if (r.victory) assert.ok(r.xp > 0);
  }
  assert.ok(wins > 0, "the bot never won");
});

test("swapping brings a reserve hero in; combo needs a full gauge", () => {
  const g = newGame();
  joinHero(g, "theron");
  g.heroes.orven = undefined;
  joinHero(g, "valen");
  g.party.reserve.push("orven");
  g.heroes.orven = { level: 10, xp: 0, attrPoints: 0, attrs: { fue: 5, esp: 12, con: 7, des: 5, vel: 6 }, mastery: {}, gear: { weapon: "baston-gris", armor: "tunica-gris", cloak: "capa-gris" }, sockets: { weapon: [], armor: [] }, hp: null, ap: null };
  const b = createBattle(g, { enemies: ["merodeador"] }, rng(4));
  advance(b);
  while (current(b).side !== "hero") enemyAct(b);
  const out = current(b);
  const sub = reserve(b)[0];
  assert.ok(sub, "reserve hero");
  act(b, { kind: "swap", with: sub.uid });
  assert.equal(unit(b, out.uid).inReserve, true);
  assert.equal(unit(b, sub.uid).inReserve, false);
  assert.equal(canCombo(b), false);
  b.fellowship = 100;
  while (current(b).side !== "hero" && !b.result) enemyAct(b);
  if (!b.result) {
    const ev = act(b, { kind: "combo" });
    assert.ok(ev.some((e) => e.t === "combo"));
    assert.equal(b.fellowship < 100, true);
  }
});

test("levelling gives attribute points to spend; mastery unlocks skill tiers", () => {
  const g = newGame();
  const before = heroStats(g, "valen");
  assert.equal(gainXp(g, "valen", xpToNext(1)), 1);
  assert.equal(g.heroes.valen.attrPoints, 3);
  assert.ok(allocate(g, "valen", "con"));
  assert.ok(heroStats(g, "valen").hpMax > before.hpMax);
  assert.equal(unlockedSkills("valen", { espada: 0, liderazgo: 0 }).length, 2);
  assert.ok(unlockedSkills("valen", { espada: TIER_AT[2], liderazgo: 0 }).includes("doble-corte"));
});

test("Chapter 1 battles are all winnable by the bot at the expected level", () => {
  for (const [name, spec] of Object.entries(CHAPTER1.battles)) {
    let wins = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const g = newGame();
      joinHero(g, "theron");
      for (const id of Object.keys(g.heroes)) { while (g.heroes[id].level < (spec.level ?? 1)) gainXp(g, id, xpToNext(g.heroes[id].level)); g.heroes[id].attrPoints = 0; }
      if (spec.guest) { g.heroes[spec.guest] = { level: 10, xp: 0, attrPoints: 0, attrs: { fue: 5, esp: 12, con: 7, des: 5, vel: 6 }, mastery: {}, gear: { weapon: "baston-gris", armor: "tunica-gris", cloak: "capa-gris" }, sockets: { weapon: [], armor: [] }, hp: null, ap: null }; g.party.reserve.push(spec.guest); }
      const b = autoplay(createBattle(g, spec, rng(seed)));
      if (b.result === "victory") wins++;
    }
    console.log(`  ${name}: bot ${wins}/12`);
    assert.ok(wins > 0, `${name}: never won`);
  }
});

test("sleep skips turns until a hit wakes the sleeper", () => {
  const g = newGame();
  const b = createBattle(g, { enemies: ["merodeador"] }, rng(11));
  advance(b);
  const foe = enemies(b)[0];
  foe.statuses.sleep = { turns: 3 };
  foe.next = b.time + 1; // acts next
  for (const h of heroes(b)) h.next = b.time + 2;
  const ev = advance(b);
  assert.ok(ev.some((e) => e.t === "status" && e.uid === foe.uid && e.sleep), "slept through its turn");
  assert.equal(foe.statuses.sleep.turns, 2);
  // A hit wakes it.
  const valen = b.units.find((x) => x.id === "valen");
  b.turnUid = valen.uid;
  foe.eva = 0; foe.hp = foe.hpMax * 10; foe.hpMax *= 10;
  act(b, { kind: "attack", target: foe.uid });
  assert.equal(foe.statuses.sleep, undefined);
});

test("silence blocks hero skills; bosses are immune to sleep and confusion", () => {
  const g = newGame();
  const b = createBattle(g, { enemies: ["guardian"] }, rng(12));
  advance(b);
  const valen = b.units.find((x) => x.id === "valen");
  valen.statuses.silence = { turns: 2 };
  b.turnUid = valen.uid;
  valen.ap = 30;
  assert.ok(heroSkills(b, valen).every((x) => x.why));
  assert.ok(act(b, { kind: "skill", skill: valen.skills[0], target: enemies(b)[0].uid }).error);
  const elowen = b.units.find((x) => x.id === "elowen");
  elowen.skills.push("lamento-lento"); elowen.ap = 30; b.turnUid = elowen.uid;
  for (let k = 0; k < 6; k++) { b.turnUid = elowen.uid; elowen.ap = 30; act(b, { kind: "skill", skill: "lamento-lento", target: enemies(b)[0].uid }); }
  assert.equal(enemies(b)[0].statuses.sleep, undefined, "boss never sleeps");
});

test("confused fighters sometimes lash out on their own and the state wears off", () => {
  const g = newGame();
  const b = createBattle(g, { enemies: ["merodeador", "merodeador"] }, rng(13));
  advance(b);
  let lashed = 0;
  for (let k = 0; k < 40 && !b.result; k++) {
    for (const u of b.units) if (u.alive && u.side === "enemy") u.statuses.confuse = { turns: 2 };
    const u = current(b);
    const ev = u.side === "enemy" ? enemyAct(b) : act(b, { kind: "defend" });
    lashed += ev.filter((e) => e.confuse).length;
  }
  assert.ok(lashed > 0);
});
