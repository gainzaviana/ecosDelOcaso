// Structural checks for every chapter: links, unlocks, battles, speakers, items and backdrops exist.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHAPTERS, SPEAKERS } from "../js/story.js";
import { ENEMIES } from "../js/enemies.js";
import { GEAR, HEROES, ITEMS, RUNES } from "../js/characters.js";

const BGS = ["bosque", "claro", "ruinas", "hondonada", "titulo", "montana", "minas", "forja", "pozo", "puente", "llanuras", "aldea",
  "atalaya", "fortaleza", "rio", "ciudad", "biblioteca", "faro", "campos", "ciudadela", "patio", "muralla", "trono"];
const MAPS = ["bosque", "minas", "llanuras", "rio", "ciudadela"];

for (const ch of CHAPTERS) {
  test(`chapter ${ch.id}: map, nodes and links are consistent`, () => {
    assert.ok(MAPS.includes(ch.map), `map theme ${ch.map}`);
    assert.ok(ch.nodes[ch.start], `start node ${ch.start}`);
    for (const [id, n] of Object.entries(ch.nodes)) {
      assert.ok(BGS.includes(n.bg), `${id}: bg ${n.bg}`);
      for (const l of n.links) { assert.ok(ch.nodes[l], `${id} → ${l}`); assert.ok(ch.nodes[l].links.includes(id), `${l} links back to ${id}`); }
      if (n.scene) assert.ok(ch.scenes[n.scene], `${id}: scene ${n.scene}`);
      for (const e of n.patrol ?? []) assert.ok(ENEMIES[e], `${id}: patrol ${e}`);
    }
  });

  test(`chapter ${ch.id}: battles reference real enemies, guests and backdrops`, () => {
    for (const [id, b] of Object.entries(ch.battles)) {
      for (const e of b.enemies) assert.ok(ENEMIES[e], `${id}: enemy ${e}`);
      assert.ok(BGS.includes(b.bg), `${id}: bg ${b.bg}`);
      if (b.guest) assert.ok(HEROES[b.guest], `${id}: guest ${b.guest}`);
      for (const s of b.script ?? []) for (const a of s.actions) {
        if (a.say) assert.ok(SPEAKERS[a.say.who], `${id}: speaker ${a.say.who}`);
        for (const e of a.spawn ?? []) assert.ok(ENEMIES[e], `${id}: spawn ${e}`);
        if (a.join) assert.ok(HEROES[a.join], `${id}: join ${a.join}`);
      }
    }
  });

  test(`chapter ${ch.id}: scenes are playable and every requirement can be met`, () => {
    const flags = new Set(), unlocks = new Set([ch.start]);
    for (const [sid, steps] of Object.entries(ch.scenes)) for (const st of steps) {
      if (st.say) assert.ok(SPEAKERS[st.say[0]], `${sid}: speaker ${st.say[0]}`);
      if (st.battle) assert.ok(ch.battles[st.battle], `${sid}: battle ${st.battle}`);
      if (st.unlock) { assert.ok(ch.nodes[st.unlock], `${sid}: unlock ${st.unlock}`); unlocks.add(st.unlock); }
      if (st.flag) flags.add(st.flag);
      if (st.quest) assert.ok(ch.quests[st.quest[0]], `${sid}: quest ${st.quest[0]}`);
      if (st.join) assert.ok(HEROES[st.join], `${sid}: join ${st.join}`);
      if (st.give && st.give[0] !== "gold") { const [kind, id] = st.give; assert.ok({ gear: GEAR, rune: RUNES, item: ITEMS }[kind]?.[id], `${sid}: give ${kind} ${id}`); }
    }
    for (const [id, n] of Object.entries(ch.nodes)) {
      assert.ok(unlocks.has(id), `${id} is never unlocked`);
      if (n.requires) assert.ok(flags.has(n.requires), `${id} requires ${n.requires}, never set`);
    }
    assert.ok(Object.values(ch.scenes).some((s) => s.some((st) => st.chapterEnd)), "has a chapter end");
    for (const id of ch.shop?.items ?? []) assert.ok(ITEMS[id], `shop item ${id}`);
    for (const id of ch.shop?.gear ?? []) assert.ok(GEAR[id], `shop gear ${id}`);
  });
}
