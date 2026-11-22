// Ecos del Ocaso — boot, title screen, chapter map, the story director, battle results, chapter
// transitions and autosave (also in the middle of a scene or a battle: closing the app never loses
// progress).

import { GEAR, HEROES, ITEMS, RUNES, SKILLS, unlockedSkills } from "./characters.js";
import { battleResult, createBattle, exportBattle, importBattle } from "./combat.js";
import { applyBattleResult, give, joinHero, load, newGame, rest, rng, save } from "./engine.js";
import { MapView, SceneView, portrait } from "./pixelRenderer.js";
import { CHAPTERS, chapterOf } from "./story.js";
import { $, h, partySheet, runBattle, savesSheet, say, sheet, shopSheet, show, toast } from "./ui.js";

let g = null;
let sceneView, mapView;
let busy = false;
const clock = { last: Date.now() };
const CH = () => chapterOf(g);
/** Quests of every chapter, by id. */
const QUESTS = Object.assign({}, ...CHAPTERS.map((c) => c.quests));

// MARK: Autosave

function autosave(quiet = false) {
  if (!g) return;
  g.playTime += Math.round((Date.now() - clock.last) / 1000);
  clock.last = Date.now();
  if (save(g, "auto") && !quiet) pulseSave();
}

/** A small 💾 that blinks in the corner whenever the game saves itself. */
function pulseSave() {
  const dot = $("#save-dot");
  dot.classList.remove("on"); void dot.offsetWidth; dot.classList.add("on");
}

// MARK: Title

function title() {
  show("title");
  sceneView.cv = $("#title-canvas"); sceneView.x = sceneView.cv.getContext("2d");
  sceneView.set("titulo", ["theron", "valen", "elowen"]);
  sceneView.start();
  const cont = load("auto");
  const where = cont ? `${CHAPTERS[(cont.chapter ?? 1) - 1].title.split(" · ")[0]} · ${Math.floor((cont.playTime ?? 0) / 60)} min` : "";
  $("#title-menu").replaceChildren(
    cont ? h("button", { class: "btn gold", onclick: () => begin(cont) }, h("span", {}, "Continuar"), h("span", { class: "btn-sub" }, cont.flags?.completed ? "Partida completada" : where)) : null,
    h("button", { class: `btn${cont ? "" : " gold"}`, onclick: async () => {
      if (cont && !confirm("¿Empezar una partida nueva? El guardado automático se sobrescribirá (tus ranuras de guardado se conservan).")) return;
      begin(newGame());
    } }, "Nueva partida"),
    h("button", { class: "btn", onclick: () => savesSheet("load", (s) => { const x = load(s); if (x) begin(x); }) }, "Cargar"),
  );
}

async function begin(state) {
  g = state;
  g.chapter ??= 1;
  clock.last = Date.now();
  sceneView.stop();
  // Pick up exactly where the game was left: a battle in progress, a scene half-played, or the map.
  if (g.battle) {
    const p = g.battle;
    if (!(await battle(p.spec, p))) return;
    if (p.scene && (await playScene(p.scene.id, p.scene.node, p.scene.step + 1)) !== true) return;
  } else if (g.scenePos) {
    const p = g.scenePos;
    if ((await playScene(p.id, p.node, p.step)) !== true) return;
  } else if ((g.chapter ?? 1) === 1 && g.scene === "intro" && !g.visited.includes("camino")) {
    if ((await playScene("intro", "camino")) !== true) return;
  }
  openMap();
}

// MARK: Story director

/** Plays a scene's steps in order (dialogue, battles, rewards…), from `from` (to resume). */
async function playScene(id, nodeId, from = 0) {
  busy = true;
  const ch = CH();
  const steps = ch.scenes[id];
  if (!steps) { g.scenePos = null; return true; }
  const node = ch.nodes[nodeId ?? g.node];
  show("scene");
  const actors = () => [...g.party.active];
  sceneView.cv = $("#scene-canvas"); sceneView.x = sceneView.cv.getContext("2d");
  sceneView.set(node?.bg ?? "bosque", actors());
  sceneView.start();
  for (let k = from; k < steps.length; k++) {
    const st = steps[k];
    g.scenePos = { id, node: nodeId ?? g.node, step: k };
    if (st.say) { sceneView.set(node?.bg ?? "bosque", actors()); await say(st.say[0], st.say[1]); }
    if (st.tip) await say("consejo", st.tip);
    if (st.join) { joinHero(g, st.join); toast(`${HEROES[st.join].name}, ${HEROES[st.join].title}, se une al grupo.`); sceneView.set(node?.bg ?? "bosque", actors()); }
    if (st.flag) g.flags[st.flag] = true;
    if (st.quest) { g.quests[st.quest[0]] = st.quest[1]; toast(st.quest[1] === "done" ? `Misión completada: ${QUESTS[st.quest[0]].name}` : `Nueva misión: ${QUESTS[st.quest[0]].name}`); }
    if (st.give) { give(g, st.give[0], st.give[1], st.give[2]); toast(st.give[0] === "gold" ? `+${st.give[2]} de oro` : `Obtienes: ${rewardName(st.give[0], st.give[1])}`); }
    if (st.unlock && !g.unlocked.includes(st.unlock)) g.unlocked.push(st.unlock);
    if (st.heal) rest(g);
    if (st.battle) {
      sceneView.stop();
      const won = await battle(ch.battles[st.battle], null, { id, node: nodeId ?? g.node, step: k });
      if (!won) { g.scenePos = null; busy = false; return false; }
      show("scene"); sceneView.start();
    }
    if (st.chapterEnd) { sceneView.stop(); g.scenePos = null; await chapterEnd(); busy = false; return "chapter"; }
    autosave(true);
  }
  sceneView.stop();
  if (nodeId && !g.visited.includes(nodeId)) g.visited.push(nodeId);
  g.scene = null;
  g.scenePos = null;
  autosave();
  busy = false;
  return true;
}

/** The display name of a reward. */
const rewardName = (kind, id) => ({ rune: RUNES, item: ITEMS, gear: GEAR }[kind]?.[id]?.name ?? id);

/**
 * A battle from the story or a patrol. Resolves true on victory; on defeat offers to retry.
 * `resumeFrom` is a saved battle in progress; `scene` is where the story continues afterwards.
 */
async function battle(spec, resumeFrom = null, scene = null) {
  const full = { ...spec, scale: spec.scale ?? CH().scale };
  for (let attempt = 0; ; attempt++) {
    const resuming = attempt === 0 && resumeFrom;
    const snapshot = resuming ? resumeFrom.pre : JSON.stringify({ ...g, battle: null, scenePos: null });
    const skillsBefore = Object.fromEntries(Object.keys(g.heroes).filter((id) => !HEROES[id]?.guest).map((id) => [id, unlockedSkills(id, g.heroes[id].mastery)]));
    const b = resuming ? importBattle(resumeFrom.state, g) : createBattle(g, full, rng());
    const ctx = { spec: full, pre: snapshot, scene: resuming ? resumeFrom.scene : scene };
    // The battle is saved after every action, so closing the app mid-fight resumes it.
    const progress = () => { g.battle = { ...ctx, state: exportBattle(b) }; autosave(true); };
    await runBattle(b, g, { resume: !!resuming, onProgress: progress });
    g.battle = null;
    const r = battleResult(b);
    if (r.victory) {
      const ups = applyBattleResult(g, r);
      for (const id of Object.keys(g.heroes)) if (HEROES[id]?.guest) delete g.heroes[id];
      autosave();
      await victory(r, ups, skillsBefore);
      return true;
    }
    const again = await sheet("Derrota", (body, close) => {
      body.append(h("p", {}, "La sombra se cierne sobre el grupo… pero la historia aún no ha terminado."),
        h("button", { class: "btn gold", onclick: () => close(true) }, "Reintentar el combate"),
        h("button", { class: "btn", onclick: () => close(false) }, "Volver al mapa"));
    }, { closable: false });
    g = JSON.parse(snapshot);
    autosave(true);
    if (!again) { busy = false; openMap(); return false; }
  }
}

function victory(r, ups, before) {
  const newSkills = [];
  for (const [id, list] of Object.entries(before)) if (g.heroes[id]) for (const s of unlockedSkills(id, g.heroes[id].mastery)) if (!list.includes(s)) newSkills.push(`${HEROES[id].name}: ${SKILLS[s].name}`);
  const mastery = Object.entries(r.mastery).filter(([id]) => !HEROES[id].guest).flatMap(([id, m]) => Object.entries(m).map(([cat, n]) => `${HEROES[id].name} · ${HEROES[id].cats.find((c) => c.id === cat)?.name ?? cat} +${n}`));
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

/** End of a chapter: on to the next one (or the ending). */
async function chapterEnd() {
  const ch = CH();
  g.flags[`chapter${ch.id}`] = true;
  autosave();
  const next = CHAPTERS[ch.id];
  if (!next) {
    g.flags.completed = true;
    autosave();
    await sheet("Fin", (body, close) => {
      body.append(
        h("div", { class: "chapter-end" },
          h("div", { class: "title big-title" }, "Ecos del Ocaso"),
          h("p", {}, "Has completado las cinco crónicas."),
          h("p", { class: "muted" }, `Tiempo de juego: ${Math.floor(g.playTime / 3600)} h ${Math.floor((g.playTime % 3600) / 60)} min · Nivel ${Math.max(...Object.values(g.heroes).map((x) => x.level))}`),
          h("div", { class: "credits" }, ...["Valen", "Elowen", "Theron", "Bram", "Freya", "Kaelen"].map((n) => h("span", {}, n)))),
        h("p", { class: "muted small" }, "Puedes seguir explorando la Ciudadela y patrullar para subir de nivel."),
        h("button", { class: "btn gold", onclick: () => close() }, "Volver al mapa"));
    }, { closable: false });
    openMap();
    return;
  }
  await sheet("Capítulo completado", (body, close) => {
    body.append(
      h("div", { class: "chapter-end" }, h("div", { class: "title" }, ch.title), h("p", {}, "Completado."), h("p", { class: "muted" }, `Siguiente: ${next.title}`)),
      h("p", { class: "muted small" }, "El grupo descansa antes de partir: vida y AP al máximo. La partida se ha guardado."),
      h("button", { class: "btn gold", onclick: () => close() }, "Continuar la historia"));
  }, { closable: false });
  // On to the next chapter.
  g.chapter = next.id;
  g.node = next.start;
  if (!g.unlocked.includes(next.start)) g.unlocked.push(next.start);
  rest(g);
  autosave();
  await titleCard(next.title);
  const ok = await playScene(next.nodes[next.start].scene, next.start);
  if (ok === true) openMap();
}

/** A full-screen chapter title between chapters. */
function titleCard(text) {
  return new Promise((resolve) => {
    const [num, name] = text.split(" · ");
    const el = h("div", { class: "title-card", onclick: () => done() }, h("div", { class: "tc-num" }, num), h("div", { class: "tc-name" }, name));
    const done = () => { el.classList.add("out"); setTimeout(() => { el.remove(); resolve(); }, 500); };
    document.body.append(el);
    setTimeout(done, 3200);
  });
}

// MARK: Map

function openMap() {
  show("map");
  sceneView.stop();
  mapView.setMap(CH(), g);
  mapView.start();
  renderMap();
}

function renderMap() {
  const ch = CH();
  $("#map-title").textContent = ch.title;
  $("#map-gold").textContent = `🪙 ${g.gold}`;
  const pins = $("#map-pins");
  pins.replaceChildren(...Object.entries(ch.nodes).map(([id, n]) => {
    const open = g.unlocked.includes(id);
    return h("button", { class: `pin${id === g.node ? " here" : ""}${open ? "" : " locked"}`, style: { left: `${n.x * 100}%`, top: `${n.y * 100}%` }, disabled: !open, onclick: () => travel(id) }, open ? n.name : "???");
  }));
  const n = ch.nodes[g.node];
  const actions = [];
  if (n.scene && !g.visited.includes(g.node)) actions.push(h("button", { class: "btn gold", onclick: () => arrive(g.node) }, "Explorar"));
  if (n.camp) {
    actions.push(h("button", { class: "btn", onclick: () => { rest(g); autosave(); toast("El grupo descansa junto al fuego: vida y AP al máximo."); renderMap(); } }, "🔥 Descansar"));
    actions.push(h("button", { class: "btn", onclick: () => shopSheet(g, ch.shop, () => { autosave(); renderMap(); }) }, "🛒 Tienda"));
    actions.push(h("button", { class: "btn", onclick: () => savesSheet("save", (s) => { save(g, s); toast(`Guardado en la ranura ${s}.`); }) }, "💾 Guardar"));
    for (const a of ch.campActions ?? []) {
      const ok = (!a.flag || g.flags[a.flag]) && (!a.notFlag || !g.flags[a.notFlag]) && (!a.quest || g.quests[a.quest[0]] === a.quest[1]);
      if (ok) actions.push(h("button", { class: "btn gold", onclick: async () => { mapView.stop(); await playScene(a.scene); openMap(); } }, a.label));
    }
  }
  if (n.patrol && g.visited.includes(g.node)) actions.push(h("button", { class: "btn", onclick: () => patrol(n) }, "⚔ Patrullar"));
  actions.push(h("button", { class: "btn", onclick: () => partySheet(g, autosave).then(renderMap) }, "👥 Grupo"));
  const pending = Object.values(g.heroes).some((hs) => hs.attrPoints > 0);
  $("#node-panel").replaceChildren(
    h("div", { class: "node-name" }, n.name), h("p", { class: "muted small" }, n.desc),
    pending ? h("div", { class: "hint" }, "Tienes puntos de atributo por repartir en Grupo.") : null,
    ...Object.entries(g.quests).filter(([q, s]) => s === "active" && QUESTS[q]).map(([q]) => h("div", { class: "quest" }, `📜 ${QUESTS[q].name}: ${QUESTS[q].text}`)),
    h("div", { class: "actions" }, ...actions));
}

async function travel(id) {
  if (busy) return;
  const ch = CH();
  if (id === g.node) { if (ch.nodes[id].scene && !g.visited.includes(id)) arrive(id); return; }
  const here = ch.nodes[g.node];
  if (!here.links.includes(id) && !ch.nodes[id].links.includes(g.node)) { toast("No hay camino directo desde aquí: pasa por la hoguera."); return; }
  const n = ch.nodes[id];
  if (n.requires && !g.flags[n.requires]) { toast("Aún no conoces el camino."); return; }
  g.node = id;
  autosave();
  renderMap();
  if (n.scene && !g.visited.includes(id)) await arrive(id);
}

async function arrive(id) {
  mapView.stop();
  const ok = await playScene(CH().nodes[id].scene, id);
  if (ok === true) openMap();
}

async function patrol(n) {
  mapView.stop();
  const r = Math.random;
  const size = 2 + (r() < 0.5 ? 1 : 0);
  const enemies = Array.from({ length: size }, () => n.patrol[Math.floor(r() * n.patrol.length)]);
  busy = true;
  await battle({ enemies, bg: n.bg });
  busy = false;
  openMap();
}

// MARK: Boot

function boot() {
  sceneView = new SceneView($("#title-canvas"));
  mapView = new MapView($("#map-canvas"));
  $("#btn-menu").onclick = () => sheet("Menú", (body, close) => {
    body.append(
      h("button", { class: "btn", onclick: () => { close(); partySheet(g, autosave).then(renderMap); } }, "👥 Grupo"),
      h("button", { class: "btn", onclick: () => { close(); savesSheet("load", (s) => { const x = load(s); if (x) begin(x); }); } }, "📂 Cargar partida"),
      h("button", { class: "btn", onclick: () => { close(); autosave(); mapView.stop(); title(); } }, "🏠 Volver al título"),
      h("p", { class: "muted small" }, "La partida se guarda sola: tras cada acción en combate, cada línea de diálogo, cada viaje y cada 20 segundos. Si cierras la app, sigues justo donde lo dejaste. En las hogueras hay además tres ranuras de guardado."));
  });
  window.addEventListener("pagehide", () => autosave(true));
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") autosave(true); });
  setInterval(() => { if (g) autosave(); }, 20000);
  title();
}

boot();

if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js").catch(() => {});
