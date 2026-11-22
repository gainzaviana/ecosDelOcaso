// Ecos del Ocaso — boot, title screen, chapter map, the story director and battle results.

import { GEAR, HEROES, ITEMS, RUNES, SKILLS, unlockedSkills } from "./characters.js";
import { battleResult, createBattle } from "./combat.js";
import { applyBattleResult, give, joinHero, load, newGame, rest, rng, save } from "./engine.js";
import { MapView, SceneView, portrait } from "./pixelRenderer.js";
import { CHAPTER1 } from "./story.js";
import { $, h, partySheet, runBattle, savesSheet, say, sheet, shopSheet, show, toast } from "./ui.js";

const CH = CHAPTER1;
let g = null;
let sceneView, mapView;
let busy = false;
const clock = { last: Date.now() };

function autosave() {
  if (!g) return;
  g.playTime += Math.round((Date.now() - clock.last) / 1000);
  clock.last = Date.now();
  save(g, "auto");
}

// MARK: Title

function title() {
  show("title");
  sceneView.set("titulo", ["theron", "valen", "elowen"]);
  sceneView.cv = $("#title-canvas"); sceneView.x = sceneView.cv.getContext("2d");
  sceneView.start();
  const cont = load("auto");
  $("#title-menu").replaceChildren(
    cont ? h("button", { class: "btn gold", onclick: () => begin(cont) }, "Continuar") : null,
    h("button", { class: `btn${cont ? "" : " gold"}`, onclick: async () => {
      if (cont && !confirm("¿Empezar una partida nueva? El guardado automático se sobrescribirá (tus ranuras de guardado se conservan).")) return;
      begin(newGame());
    } }, "Nueva partida"),
    h("button", { class: "btn", onclick: () => savesSheet("load", (s) => { const x = load(s); if (x) begin(x); }) }, "Cargar"),
  );
}

async function begin(state) {
  g = state;
  clock.last = Date.now();
  sceneView.stop();
  if (g.scene === "intro" && !g.visited.includes("camino")) {
    await playScene("intro", "camino");
  }
  openMap();
}

// MARK: Story director

/** Plays a scene's steps in order (dialogue, battles, rewards…). */
async function playScene(id, nodeId) {
  busy = true;
  const steps = CH.scenes[id];
  const node = CH.nodes[nodeId ?? g.node];
  show("scene");
  const actors = () => [...g.party.active];
  sceneView.cv = $("#scene-canvas"); sceneView.x = sceneView.cv.getContext("2d");
  sceneView.set(node?.bg ?? "bosque", actors());
  sceneView.start();
  for (const st of steps) {
    if (st.say) { sceneView.set(node?.bg ?? "bosque", actors()); await say(st.say[0], st.say[1]); }
    if (st.tip) await say("consejo", st.tip);
    if (st.join) { joinHero(g, st.join); toast(`${HEROES[st.join].name}, ${HEROES[st.join].title}, se une al grupo.`); sceneView.set(node?.bg ?? "bosque", actors()); }
    if (st.flag) g.flags[st.flag] = true;
    if (st.quest) { g.quests[st.quest[0]] = st.quest[1]; toast(st.quest[1] === "done" ? `Misión completada: ${CH.quests[st.quest[0]].name}` : `Nueva misión: ${CH.quests[st.quest[0]].name}`); }
    if (st.give) { give(g, st.give[0], st.give[1], st.give[2]); toast(st.give[0] === "gold" ? `+${st.give[2]} de oro` : `Obtienes: ${rewardName(st.give[0], st.give[1])}`); }
    if (st.unlock && !g.unlocked.includes(st.unlock)) g.unlocked.push(st.unlock);
    if (st.heal) rest(g);
    if (st.battle) {
      sceneView.stop();
      const won = await battle(CH.battles[st.battle]);
      if (!won) { busy = false; return false; }
      show("scene"); sceneView.start();
    }
    if (st.chapterEnd) { sceneView.stop(); await chapterEnd(); busy = false; return true; }
  }
  sceneView.stop();
  if (nodeId && !g.visited.includes(nodeId)) g.visited.push(nodeId);
  g.scene = null;
  autosave();
  busy = false;
  return true;
}

/** The display name of a reward. */
const rewardName = (kind, id) => ({ rune: RUNES, item: ITEMS, gear: GEAR }[kind]?.[id]?.name ?? id);

/** A battle from the story or a patrol. Resolves true on victory; on defeat offers to retry. */
async function battle(spec) {
  for (;;) {
    const snapshot = JSON.stringify(g);
    const skillsBefore = Object.fromEntries(Object.keys(g.heroes).filter((id) => !HEROES[id].guest).map((id) => [id, unlockedSkills(id, g.heroes[id].mastery)]));
    const b = createBattle(g, spec, rng());
    await runBattle(b, g);
    const r = battleResult(b);
    if (r.victory) {
      const ups = applyBattleResult(g, r);
      await victory(r, ups, skillsBefore);
      autosave();
      return true;
    }
    const again = await sheet("Derrota", (body, close) => {
      body.append(h("p", {}, "La sombra se cierne sobre el grupo… pero la historia aún no ha terminado."),
        h("button", { class: "btn gold", onclick: () => close(true) }, "Reintentar el combate"),
        h("button", { class: "btn", onclick: () => close(false) }, "Volver al mapa"));
    }, { closable: false });
    g = JSON.parse(snapshot);
    if (!again) { openMap(); return false; }
  }
}

function victory(r, ups, before) {
  const newSkills = [];
  for (const [id, list] of Object.entries(before)) for (const s of unlockedSkills(id, g.heroes[id].mastery)) if (!list.includes(s)) newSkills.push(`${HEROES[id].name}: ${SKILLS[s].name}`);
  const mastery = Object.entries(r.mastery).flatMap(([id, m]) => Object.entries(m).map(([cat, n]) => `${HEROES[id].name} · ${HEROES[id].cats.find((c) => c.id === cat)?.name ?? cat} +${n}`));
  return sheet("¡Victoria!", (body, close) => {
    body.append(
      h("div", { class: "reward" }, h("b", {}, `+${r.xp} XP`), h("b", {}, `+${r.gold} 🪙`)),
      mastery.length ? h("div", { class: "muted small" }, "Maestría: ", mastery.join(" · ")) : null,
      ...newSkills.map((t) => h("div", { class: "hint" }, `✦ Nueva habilidad — ${t}`)),
      ...ups.map((u) => h("div", { class: "levelup" }, h("img", { src: portrait(u.id, 32), alt: "" }), `${HEROES[u.id].name} sube al nivel ${u.level}: +${u.levels * 3} puntos de atributo`)),
      ups.length ? h("button", { class: "btn gold", onclick: () => { close(); partySheet(g, autosave); } }, "Repartir puntos ahora") : null,
      h("button", { class: `btn${ups.length ? "" : " gold"}`, onclick: () => close() }, "Continuar"));
  }, { closable: false });
}

async function chapterEnd() {
  autosave();
  await sheet("Fin del capítulo", (body, close) => {
    body.append(
      h("div", { class: "chapter-end" }, h("div", { class: "title" }, CH.title), h("p", {}, "Completado."), h("p", { class: "muted" }, `Próximamente: ${CH.next}.`)),
      h("p", { class: "muted small" }, "Puedes seguir explorando el bosque, patrullar para ganar experiencia o completar la misión de Mirla."),
      h("button", { class: "btn gold", onclick: () => close() }, "Volver al mapa"));
  }, { closable: false });
  g.flags.chapter1 = true;
  autosave();
  openMap();
}

// MARK: Map

function openMap() {
  show("map");
  sceneView.stop();
  mapView.setMap(CH, g);
  mapView.start();
  renderMap();
}

function renderMap() {
  $("#map-title").textContent = CH.title;
  $("#map-gold").textContent = `🪙 ${g.gold}`;
  const pins = $("#map-pins");
  pins.replaceChildren(...Object.entries(CH.nodes).map(([id, n]) => {
    const open = g.unlocked.includes(id);
    return h("button", { class: `pin${id === g.node ? " here" : ""}${open ? "" : " locked"}`, style: { left: `${n.x * 100}%`, top: `${n.y * 100}%` }, disabled: !open, onclick: () => travel(id) }, open ? n.name : "???");
  }));
  const n = CH.nodes[g.node];
  const actions = [];
  if (n.scene && !g.visited.includes(g.node)) actions.push(h("button", { class: "btn gold", onclick: () => arrive(g.node) }, "Explorar"));
  if (n.camp) {
    actions.push(h("button", { class: "btn", onclick: () => { rest(g); autosave(); toast("El grupo descansa junto al fuego: vida y AP al máximo."); renderMap(); } }, "🔥 Descansar"));
    actions.push(h("button", { class: "btn", onclick: () => shopSheet(g, CH.shop, () => { autosave(); renderMap(); }) }, "🛒 Tienda"));
    actions.push(h("button", { class: "btn", onclick: () => savesSheet("save", (s) => { save(g, s); toast(`Guardado en la ranura ${s}.`); }) }, "💾 Guardar"));
    if (g.flags.theron && !g.flags.mirla) actions.push(h("button", { class: "btn gold", onclick: async () => { await playScene("mirla"); openMap(); } }, "Hablar con Mirla"));
    if (g.flags.colgante && g.quests.pendiente === "active") actions.push(h("button", { class: "btn gold", onclick: async () => { await playScene("entrega"); openMap(); } }, "Devolver el colgante a Mirla"));
  }
  if (n.patrol && g.visited.includes(g.node)) actions.push(h("button", { class: "btn", onclick: () => patrol(n) }, "⚔ Patrullar"));
  actions.push(h("button", { class: "btn", onclick: () => partySheet(g, autosave).then(renderMap) }, "👥 Grupo"));
  const pending = Object.values(g.heroes).some((hs) => hs.attrPoints > 0);
  $("#node-panel").replaceChildren(
    h("div", { class: "node-name" }, n.name), h("p", { class: "muted small" }, n.desc),
    pending ? h("div", { class: "hint" }, "Tienes puntos de atributo por repartir en Grupo.") : null,
    ...Object.entries(g.quests).filter(([, s]) => s === "active").map(([q]) => h("div", { class: "quest" }, `📜 ${CH.quests[q].name}: ${CH.quests[q].text}`)),
    h("div", { class: "actions" }, ...actions));
}

async function travel(id) {
  if (busy) return;
  if (id === g.node) { if (CH.nodes[id].scene && !g.visited.includes(id)) arrive(id); return; }
  const here = CH.nodes[g.node];
  if (!here.links.includes(id) && !CH.nodes[id].links.includes(g.node)) { toast("No hay camino directo: pasa por el Claro."); return; }
  const n = CH.nodes[id];
  if (n.requires && !g.flags[n.requires]) { toast("Aún no conoces el camino."); return; }
  g.node = id;
  autosave();
  renderMap();
  if (n.scene && !g.visited.includes(id)) await arrive(id);
}

async function arrive(id) {
  mapView.stop();
  const ok = await playScene(CH.nodes[id].scene, id);
  if (ok !== false) openMap();
}

async function patrol(n) {
  mapView.stop();
  const r = Math.random;
  const size = 2 + (r() < 0.5 ? 1 : 0);
  const enemies = Array.from({ length: size }, () => n.patrol[Math.floor(r() * n.patrol.length)]);
  await battle({ enemies, bg: n.bg });
  openMap();
}

// MARK: Boot

function boot() {
  sceneView = new SceneView($("#title-canvas"));
  mapView = new MapView($("#map-canvas"));
  $("#btn-menu").onclick = () => sheet("Menú", (body, close) => {
    body.append(
      h("button", { class: "btn", onclick: () => { close(); partySheet(g, autosave).then(renderMap); } }, "👥 Grupo"),
      h("button", { class: "btn", onclick: () => { close(); savesSheet("load", (s) => { const x = load(s); if (x) { g = x; openMap(); } }); } }, "📂 Cargar partida"),
      h("button", { class: "btn", onclick: () => { close(); autosave(); mapView.stop(); title(); } }, "🏠 Volver al título"),
      h("p", { class: "muted small" }, "La partida se guarda sola tras cada combate, escena y viaje. En las hogueras puedes guardar en tres ranuras."));
  });
  window.addEventListener("pagehide", autosave);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") autosave(); });
  title();
}

boot();

if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js").catch(() => {});
