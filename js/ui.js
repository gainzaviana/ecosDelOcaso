// DOM screens and menus (mobile-first, thumb-friendly). The canvases inside them are drawn by
// pixelRenderer.js; game rules live in combat.js / engine.js.

import { ATTRS, ATTR_HELP, ATTR_NAME, DMG, FUTURE_HEROES, GEAR, HEROES, ITEMS, RUNES, SKILLS, TIER_AT, TRAIT_AT, activeTraits, totalMastery, traitTier, unlockedSkills } from "./characters.js";
import { ENEMIES } from "./enemies.js";
import { act, canCombo, current, enemies, heroSkills, heroes, reserve, targetsFor, timeline } from "./combat.js";
import { allocate, buy, describeSave, equip, heroStats, socketCount, socketRune, unsocketRune, xpToNext } from "./engine.js";
import { BattleView, portrait } from "./pixelRenderer.js";
import { SPEAKERS } from "./story.js";

// MARK: DOM helpers

// append/replaceChildren skip empty values (null, undefined, false), so optional parts can be
// written inline: el.append(cond ? node : null).
for (const m of ["append", "replaceChildren"]) {
  const orig = Element.prototype[m];
  Element.prototype[m] = function (...kids) { return orig.apply(this, kids.flat().filter((k) => k !== null && k !== undefined && k !== false)); };
}

export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "class") el.className = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
export const $ = (sel) => document.querySelector(sel);
const app = () => $("#app");

export function show(screen) {
  for (const el of app().children) el.hidden = el.id !== screen;
}

export function toast(text, ms = 2200) {
  const t = h("div", { class: "toast", role: "status" }, text);
  document.body.append(t);
  setTimeout(() => t.classList.add("out"), ms - 300);
  setTimeout(() => t.remove(), ms);
}

/** A modal sheet; resolves with whatever `done` is called with. */
export function sheet(title, build, { wide = false, closable = true } = {}) {
  return new Promise((resolve) => {
    const close = (v) => { wrap.remove(); resolve(v); };
    const body = h("div", { class: "sheet-body" });
    const wrap = h("div", { class: "sheet-wrap", onclick: (e) => { if (closable && e.target === wrap) close(); } },
      h("div", { class: `sheet${wide ? " wide" : ""}`, role: "dialog", "aria-label": title },
        h("div", { class: "sheet-head" }, h("span", { class: "title" }, title), closable ? h("button", { class: "icon-btn", "aria-label": "Cerrar", onclick: () => close() }, "✕") : null),
        body));
    document.body.append(wrap);
    const rerender = () => { body.replaceChildren(); build(body, close, rerender); };
    rerender();
  });
}

function bar(value, max, kind, label) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return h("div", { class: `bar ${kind}`, role: "meter", "aria-label": label, "aria-valuenow": value, "aria-valuemax": max },
    h("div", { class: "bar-fill", style: { width: `${pct}%` } }), h("span", { class: "bar-text" }, label ? `${label} ${value}/${max}` : `${value}/${max}`));
}

const typeIcon = (t) => (t ? `${DMG[t]?.icon ?? ""}` : "");
const speaker = (who) => SPEAKERS[who] ?? { name: HEROES[who]?.name ?? who, color: "#fff" };

// MARK: Dialogue

/** Shows a dialogue line with a typewriter effect; resolves on tap. */
export function say(who, text) {
  return new Promise((resolve) => {
    const sp = speaker(who);
    const box = $("#dialogue");
    const face = HEROES[who] || ENEMIES[who] ? h("img", { class: "face", src: portrait(HEROES[who] ? who : ENEMIES[who] ? ENEMIES[who].sprite : who, 48), alt: "" }) : who === "guardian" ? h("img", { class: "face", src: portrait("guardian", 48), alt: "" }) : null;
    const txt = h("p", { class: "dlg-text" });
    const hint = h("span", { class: "dlg-next", "aria-hidden": "true" }, "▼");
    box.replaceChildren(h("div", { class: "dlg-inner", style: { "--who": sp.color } }, face, h("div", { class: "dlg-col" }, sp.name ? h("div", { class: "dlg-name" }, sp.name) : null, txt)), hint);
    box.hidden = false;
    let k = 0, done = false;
    const timer = setInterval(() => { k += 2; txt.textContent = text.slice(0, k); if (k >= text.length) { clearInterval(timer); done = true; } }, 18);
    const next = () => {
      if (!done) { clearInterval(timer); txt.textContent = text; done = true; return; }
      box.hidden = true; box.removeEventListener("click", next); document.removeEventListener("keydown", key);
      resolve();
    };
    const key = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); next(); } };
    box.addEventListener("click", next);
    document.addEventListener("keydown", key);
  });
}

// MARK: Battle screen

/**
 * Runs a battle to its end in the battle screen. Resolves with the finished battle.
 * `onSay` shows scripted dialogue mid-battle.
 */
export async function runBattle(b, g) {
  show("battle");
  const cv = $("#battle-canvas");
  const view = new BattleView(cv);
  view.setBattle(b);
  view.start();
  const ui = { selecting: null };
  renderBattleHud(b, g, view, ui);

  const play = async (events) => {
    for (const e of events) {
      if (e.t === "say") { renderBattleHud(b, g, view, ui); await say(e.who, e.text); continue; }
      if (e.t === "turn" || e.t === "fellowship" || e.t === "join" || e.t === "swap" || e.t === "summon") renderBattleHud(b, g, view, ui);
      await view.play(e);
      if (["damage", "heal", "ko", "revive", "ap", "status"].includes(e.t)) renderHeroes(b);
    }
    renderBattleHud(b, g, view, ui);
  };

  const { advance, enemyAct } = await import("./combat.js");
  await play(advance(b));
  while (!b.result) {
    const u = current(b);
    if (u.side === "enemy") {
      await new Promise((r) => setTimeout(r, 380));
      await play(enemyAct(b));
      continue;
    }
    const action = await chooseAction(b, g, view, ui);
    const ev = act(b, action);
    if (ev.error) { toast(ev.error); continue; }
    ui.selecting = null;
    view.selected = null;
    await play(ev);
  }
  await new Promise((r) => setTimeout(r, 500));
  view.stop();
  return b;
}

function renderBattleHud(b, g, view, ui) {
  // Turn timeline.
  const tl = $("#timeline");
  tl.replaceChildren(...timeline(b, 9).map((t, k) => {
    const u = b.units.find((x) => x.uid === t.uid);
    return h("div", { class: `tl-chip ${t.side}${k === 0 ? " now" : ""}${t.charging ? " charging" : ""}`, title: t.name, style: { "--c": t.color ?? "#c05050" } },
      h("img", { src: portrait(t.side === "hero" ? t.id : ENEMIES[t.id].sprite, 24), alt: t.name }),
      t.charging ? h("span", { class: "tl-warn", "aria-label": "Cargando" }, "⚠") : null,
      k === 0 ? null : null, u?.haste > 0 ? h("span", { class: "tl-badge" }, "»") : u?.slow > 0 ? h("span", { class: "tl-badge" }, "«") : null);
  }));
  // Fellowship gauge.
  const fg = $("#fellowship");
  fg.replaceChildren(h("span", { class: "fg-label" }, "Comunidad"), h("div", { class: `fg-bar${b.fellowship >= 100 ? " full" : ""}` }, h("div", { class: "fg-fill", style: { width: `${b.fellowship}%` } })));
  renderHeroes(b);
  void g; void view; void ui;
}

function renderHeroes(b) {
  const list = $("#hero-cards");
  const cur = current(b);
  list.replaceChildren(...heroes(b, false).map((u) => h("div", { class: `hero-card${u.uid === cur?.uid ? " active" : ""}${u.alive ? "" : " ko"}`, style: { "--c": u.color } },
    h("img", { class: "hc-face", src: portrait(u.id, 32), alt: "" }),
    h("div", { class: "hc-col" },
      h("div", { class: "hc-name" }, u.name, u.charging ? "" : "", statusIcons(u)),
      bar(u.hp, u.hpMax, "hp", "PV"), bar(u.ap, u.apMax, "ap", "AP")))),
    ...reserve(b).map((u) => h("div", { class: `hero-card reserve${u.alive ? "" : " ko"}` }, h("img", { class: "hc-face", src: portrait(u.id, 32), alt: "" }), h("div", { class: "hc-col" }, h("div", { class: "hc-name" }, `${u.name} · reserva`), bar(u.hp, u.hpMax, "hp", "PV")))));
}

function statusIcons(u) {
  const out = [];
  if (u.haste > 0) out.push("»"); if (u.slow > 0) out.push("«");
  if (u.statuses.poison) out.push("☠"); if (u.statuses.burn) out.push("🔥"); if (u.statuses.bleed) out.push("🩸");
  if (u.buffs.some((x) => x.stat === "atk" && x.mult > 1)) out.push("⚔▲"); if (u.buffs.some((x) => x.stat === "def" && x.mult > 1)) out.push("🛡▲");
  if (u.taunt > 0) out.push("❗"); if (u.counter > 0) out.push("↺"); if (u.defending) out.push("🛡");
  return out.length ? h("span", { class: "hc-st" }, out.join(" ")) : null;
}

/** The command menu for the current hero; resolves with an action. */
function chooseAction(b, g, view, ui) {
  return new Promise((resolve) => {
    const u = current(b);
    const panel = $("#commands");
    const done = (a) => { view.cv.onclick = null; resolve(a); };
    const knownWeak = (e) => [...new Set([...(g.bestiary[e.id] ?? []), ...(b.discovered[e.id] ?? [])])];

    const pickTarget = (kind, label, then) => {
      const list = targetsFor(b, kind);
      if (list.length === 1 && kind !== "deadAlly") return then(list[0].uid);
      panel.replaceChildren(
        h("div", { class: "cmd-title" }, `${label}: elige objetivo`),
        h("div", { class: "cmd-list" }, ...list.map((t) => h("button", { class: `cmd ${t.side}`, onclick: () => then(t.uid), onpointerenter: () => { view.selected = t.uid; } },
          h("span", { class: "cmd-main" }, t.name, t.charging ? " ⚠" : ""),
          h("span", { class: "cmd-sub" }, `${t.hp}/${t.hpMax} PV`, t.side === "enemy" && knownWeak(t).length ? ` · débil: ${knownWeak(t).map(typeIcon).join(" ")}` : "")))),
        h("button", { class: "cmd back", onclick: root }, "← Volver"));
      view.selected = list[0]?.uid ?? null;
      view.cv.onclick = (ev) => {
        const r = view.cv.getBoundingClientRect();
        const id = view.hit(((ev.clientX - r.left) / r.width) * view.W, ((ev.clientY - r.top) / r.height) * view.H);
        if (id && list.some((t) => t.uid === id)) then(id);
      };
    };

    const skillsMenu = (catId) => {
      const all = heroSkills(b, u);
      const cats = [...new Set(all.map((x) => x.skill.cat))];
      const cat = catId ?? cats[0];
      const hs = g.heroes[u.id];
      panel.replaceChildren(
        h("div", { class: "cmd-tabs" }, ...cats.map((c) => {
          const info = HEROES[u.id].cats.find((x) => x.id === c);
          return h("button", { class: `tab${c === cat ? " on" : ""}`, onclick: () => skillsMenu(c) }, info ? `${info.icon} ${info.name}` : c === "rasgos" ? "★ Definitiva" : c);
        })),
        h("div", { class: "cmd-list" }, ...all.filter((x) => x.skill.cat === cat).map(({ id, skill, why }) => h("button", { class: "cmd skill", disabled: !!why, onclick: () => useSkill(id) },
          h("span", { class: "cmd-main" }, `${typeIcon(skill.type)} ${skill.name}`, h("span", { class: "ap-cost" }, `${skill.ap} AP`)),
          h("span", { class: "cmd-sub" }, why ?? skill.text)))),
        hs && HEROES[u.id].cats.some((c) => c.id === cat) ? h("div", { class: "mastery-line" }, masteryText(u.id, cat, hs.mastery[cat] + (b.mastery[u.id]?.[cat] ?? 0))) : null,
        h("button", { class: "cmd back", onclick: root }, "← Volver"));
    };

    const useSkill = (id) => {
      const s = SKILLS[id];
      if (["enemy", "ally", "deadAlly"].includes(s.target)) pickTarget(s.target, s.name, (t) => done({ kind: "skill", skill: id, target: t }));
      else done({ kind: "skill", skill: id });
    };

    const itemsMenu = () => {
      const have = Object.entries(b.inventory.items).filter(([, n]) => n > 0);
      panel.replaceChildren(
        h("div", { class: "cmd-list" }, ...(have.length ? have.map(([id, n]) => h("button", { class: "cmd", onclick: () => pickTarget(ITEMS[id].target, ITEMS[id].name, (t) => done({ kind: "item", item: id, target: t })) },
          h("span", { class: "cmd-main" }, ITEMS[id].name, h("span", { class: "ap-cost" }, `×${n}`)), h("span", { class: "cmd-sub" }, ITEMS[id].text))) : [h("p", { class: "muted" }, "No te quedan objetos.")])),
        h("button", { class: "cmd back", onclick: root }, "← Volver"));
    };

    const swapMenu = () => {
      panel.replaceChildren(
        h("div", { class: "cmd-title" }, `¿A quién saca ${u.name}?`),
        h("div", { class: "cmd-list" }, ...reserve(b).filter((r) => r.alive).map((r) => h("button", { class: "cmd", onclick: () => done({ kind: "swap", with: r.uid }) }, h("span", { class: "cmd-main" }, r.name), h("span", { class: "cmd-sub" }, `${r.hp}/${r.hpMax} PV · ${r.ap}/${r.apMax} AP`)))),
        h("button", { class: "cmd back", onclick: root }, "← Volver"));
    };

    function root() {
      view.selected = null;
      view.cv.onclick = null;
      const foes = enemies(b);
      const reserveReady = reserve(b).some((r) => r.alive);
      panel.replaceChildren(
        h("div", { class: "cmd-title" }, h("span", { style: { color: u.color } }, u.name), ` · ${u.ap}/${u.apMax} AP`),
        h("div", { class: "cmd-grid" },
          h("button", { class: "cmd big attack", onclick: () => pickTarget("enemy", "Atacar", (t) => done({ kind: "attack", target: t })) }, h("span", { class: "cmd-main" }, `${typeIcon(u.attackType)} Atacar`), h("span", { class: "cmd-sub" }, "+1 AP")),
          h("button", { class: "cmd big", onclick: () => skillsMenu() }, h("span", { class: "cmd-main" }, "✦ Habilidades"), h("span", { class: "cmd-sub" }, `${heroSkills(b, u).filter((x) => !x.why).length} disponibles`)),
          h("button", { class: "cmd big", onclick: () => done({ kind: "defend" }) }, h("span", { class: "cmd-main" }, "🛡 Defender"), h("span", { class: "cmd-sub" }, "½ daño · +4 AP")),
          h("button", { class: "cmd big", onclick: itemsMenu }, h("span", { class: "cmd-main" }, "🎒 Objetos"), h("span", { class: "cmd-sub" }, `${Object.values(b.inventory.items).reduce((a, n) => a + n, 0)} en la bolsa`)),
          reserveReady ? h("button", { class: "cmd big", onclick: swapMenu }, h("span", { class: "cmd-main" }, "⇄ Cambiar"), h("span", { class: "cmd-sub" }, "trae a un héroe de reserva")) : null,
          canCombo(b) ? h("button", { class: "cmd big combo", onclick: () => done({ kind: "combo" }) }, h("span", { class: "cmd-main" }, "★ Ataque de la Comunidad"), h("span", { class: "cmd-sub" }, "todo el grupo a la vez")) : null,
        ),
        foes.some((f) => f.charging) ? h("div", { class: "hint" }, `⚠ ${foes.filter((f) => f.charging).map((f) => f.name).join(", ")} está cargando: interrúmpelo con un golpe contundente o un aturdimiento.`) : null);
    }
    root();
  });
}

function masteryText(heroId, cat, m) {
  const next = TIER_AT.find((n) => n > m);
  return next ? `Maestría ${m} · siguiente habilidad a ${next}` : `Maestría ${m} · categoría dominada`;
}

// MARK: Party screen (stats, attribute points, skills and mastery, equipment and runestones)

export function partySheet(g, onChange) {
  let heroId = g.party.active[0];
  let tab = "estado";
  return sheet("Grupo", (body, close, rerender) => {
    const ids = [...g.party.active, ...g.party.reserve];
    body.append(h("div", { class: "tabs" }, ...ids.map((id) => h("button", { class: `tab hero-tab${id === heroId ? " on" : ""}`, style: { "--c": HEROES[id].color }, onclick: () => { heroId = id; rerender(); } },
      h("img", { src: portrait(id, 24), alt: "" }), HEROES[id].name, g.heroes[id].attrPoints ? h("span", { class: "dot" }, g.heroes[id].attrPoints) : null))));
    body.append(h("div", { class: "tabs small" }, ...[["estado", "Estado"], ["habilidades", "Habilidades"], ["equipo", "Equipo"], ["formacion", "Formación"]].map(([k, l]) => h("button", { class: `tab${tab === k ? " on" : ""}`, onclick: () => { tab = k; rerender(); } }, l))));
    const hs = g.heroes[heroId];
    const H = HEROES[heroId];
    const st = heroStats(g, heroId);
    if (tab === "estado") {
      body.append(
        h("div", { class: "hero-head" }, h("img", { src: portrait(heroId, 64), alt: "", class: "big-face" }), h("div", {}, h("div", { class: "title" }, H.name), h("div", { class: "muted" }, H.title), h("div", {}, `Nivel ${hs.level}`), bar(hs.xp, xpToNext(hs.level), "xp", "XP"))),
        hs.attrPoints ? h("div", { class: "hint" }, `Tienes ${hs.attrPoints} punto${hs.attrPoints === 1 ? "" : "s"} de atributo. Cada decisión cuenta.`) : null,
        h("div", { class: "attrs" }, ...ATTRS.map((a) => h("div", { class: "attr" },
          h("div", {}, h("b", {}, ATTR_NAME[a]), h("span", { class: "muted small" }, ` — ${ATTR_HELP[a]}`)),
          h("div", { class: "attr-val" }, String(hs.attrs[a]), hs.attrPoints ? h("button", { class: "plus", "aria-label": `Subir ${ATTR_NAME[a]}`, onclick: () => { allocate(g, heroId, a); onChange?.(); rerender(); } }, "+") : null)))),
        h("div", { class: "stats" }, ...[["PV", st.hpMax], ["AP", st.apMax], ["Ataque", st.atk], ["Magia", st.mag], ["Defensa", st.def], ["Resistencia", st.res], ["Velocidad", st.spd.toFixed(1)], ["Crítico", `${st.crit.toFixed(0)} %`], ["Evasión", `${st.eva} %`], ["AP por turno", st.apRegen]].map(([k, v]) => h("div", { class: "stat" }, h("span", { class: "muted" }, k), h("b", {}, String(v))))));
    }
    if (tab === "habilidades") {
      const unlocked = unlockedSkills(heroId, hs.mastery);
      for (const c of H.cats) {
        const m = hs.mastery[c.id] ?? 0;
        const next = TIER_AT.find((n) => n > m);
        body.append(h("div", { class: "cat" },
          h("div", { class: "cat-head" }, h("b", {}, `${c.icon} ${c.name}`), h("span", { class: "muted" }, next ? `maestría ${m}/${next}` : `maestría ${m} · dominada`)),
          bar(m, next ?? m, "xp", ""),
          ...c.tiers.map((id, k) => h("div", { class: `skill-row${unlocked.includes(id) ? "" : " locked"}` }, h("b", {}, unlocked.includes(id) ? SKILLS[id].name : `🔒 ${SKILLS[id].name}`), h("span", { class: "muted small" }, unlocked.includes(id) ? ` · ${SKILLS[id].ap} AP · ${SKILLS[id].text}` : ` · se desbloquea con maestría ${TIER_AT[k]}`)))));
      }
      if (H.traits.length) {
        const tm = totalMastery(heroId, hs.mastery);
        const tier = traitTier(heroId, hs.mastery);
        body.append(h("div", { class: "cat" },
          h("div", { class: "cat-head" }, h("b", {}, "★ Rasgos y Definitiva"), h("span", { class: "muted" }, `maestría total ${tm}`)),
          ...H.traits.map((t, k) => h("div", { class: `skill-row${tier > k ? "" : " locked"}` }, h("b", {}, tier > k ? t.name : `🔒 ${t.name}`), h("span", { class: "muted small" }, ` · ${t.text}${tier > k ? "" : ` (maestría total ${TRAIT_AT[k]})`}`))),
          h("div", { class: `skill-row${tier >= 4 ? "" : " locked"}` }, h("b", {}, `${tier >= 4 ? "" : "🔒 "}${SKILLS[H.ultimate].name}`), h("span", { class: "muted small" }, ` · ${SKILLS[H.ultimate].text}${tier >= 4 ? "" : ` (maestría total ${TRAIT_AT[3]})`}`))));
        void activeTraits;
      }
      body.append(h("p", { class: "muted small" }, "Las habilidades se aprenden usándolas en combate: cada uso suma maestría a su categoría (el doble si golpea una debilidad)."));
    }
    if (tab === "equipo") {
      for (const slot of ["weapon", "armor", "cloak"]) {
        const it = GEAR[hs.gear[slot]];
        const options = g.inventory.gear.filter((id) => GEAR[id].slot === slot && (!GEAR[id].for || GEAR[id].for === heroId));
        body.append(h("div", { class: "slot" },
          h("div", { class: "slot-head" }, h("span", { class: "muted" }, { weapon: "Arma", armor: "Armadura", cloak: "Capa" }[slot]), h("b", {}, it?.name ?? "—"), h("span", { class: "small" }, gearText(it))),
          slot !== "cloak" ? h("div", { class: "sockets" }, ...Array.from({ length: socketCount(hs, slot) }, (_, k) => {
            const r = hs.sockets[slot]?.[k];
            return r ? h("button", { class: "socket full", style: { "--r": RUNES[r].color }, title: RUNES[r].text, onclick: () => { unsocketRune(g, heroId, slot, k); onChange?.(); rerender(); } }, `◆ ${RUNES[r].name} ✕`)
              : h("span", { class: "socket" }, "◇ engarce libre");
          })) : null,
          options.length ? h("div", { class: "row wrap" }, ...options.map((id) => h("button", { class: "small-btn", onclick: () => { const e = equip(g, heroId, id); if (e) toast(e); onChange?.(); rerender(); } }, `Equipar ${GEAR[id].name} (${gearText(GEAR[id])})`))) : null));
      }
      if (g.inventory.runes.length) body.append(h("div", { class: "slot" }, h("div", { class: "slot-head" }, h("b", {}, "Runas en la bolsa")),
        ...g.inventory.runes.map((r, k) => h("div", { class: "row wrap" }, h("span", { style: { color: RUNES[r].color } }, `◆ ${RUNES[r].name}`), h("span", { class: "muted small" }, RUNES[r].text),
          ...["weapon", "armor"].map((slot) => h("button", { class: "small-btn", disabled: (hs.sockets[slot]?.length ?? 0) >= socketCount(hs, slot), onclick: () => { const e = socketRune(g, heroId, slot, r); if (e) toast(e); onChange?.(); rerender(); } }, `→ ${slot === "weapon" ? "arma" : "armadura"}`))))));
    }
    if (tab === "formacion") {
      body.append(h("p", { class: "muted" }, "Hasta 3 héroes luchan a la vez; el resto espera en reserva y puede entrar con «Cambiar» en combate."));
      const all = [...g.party.active, ...g.party.reserve];
      body.append(h("div", { class: "formation" }, ...all.map((id) => {
        const active = g.party.active.includes(id);
        return h("div", { class: "row" }, h("img", { src: portrait(id, 24), alt: "" }), h("b", {}, HEROES[id].name), h("span", { class: "muted" }, active ? "En combate" : "Reserva"),
          h("button", { class: "small-btn", disabled: active ? g.party.active.length <= 1 : g.party.active.length >= 3, onclick: () => {
            if (active) { g.party.active = g.party.active.filter((x) => x !== id); g.party.reserve.push(id); }
            else { g.party.reserve = g.party.reserve.filter((x) => x !== id); g.party.active.push(id); }
            onChange?.(); rerender();
          } }, active ? "A reserva" : "A combate"));
      })));
      body.append(h("div", { class: "future" }, h("div", { class: "muted small" }, "Se unirán más adelante:"), ...FUTURE_HEROES.map((f) => h("div", { class: "row muted" }, `🔒 ${f.name}, ${f.title}`))));
    }
    void close;
  }, { wide: true });
}

export function gearText(it) {
  if (!it) return "";
  return [["atk", "Atq"], ["mag", "Mag"], ["def", "Def"], ["res", "Res"], ["hp", "PV"], ["ap", "AP"], ["crit", "Crít %"], ["eva", "Eva"], ["spd", "Vel"]].filter(([k]) => it[k]).map(([k, l]) => `${l} +${it[k]}`).join(" · ") + (it.sockets ? ` · ${it.sockets} engarce${it.sockets > 1 ? "s" : ""}` : "");
}

// MARK: Shop, saves

export function shopSheet(g, shop, onChange) {
  return sheet("Tienda de Hilda", (body, close, rerender) => {
    body.append(h("div", { class: "gold" }, `🪙 ${g.gold} de oro`));
    body.append(h("div", { class: "cat-head" }, h("b", {}, "Objetos")));
    for (const id of shop.items) body.append(h("div", { class: "shop-row" }, h("div", {}, h("b", {}, ITEMS[id].name), h("div", { class: "muted small" }, `${ITEMS[id].text} · tienes ${g.inventory.items[id] ?? 0}`)),
      h("button", { class: "small-btn", disabled: g.gold < ITEMS[id].price, onclick: () => { const e = buy(g, "item", id); if (e) toast(e); onChange?.(); rerender(); } }, `${ITEMS[id].price} 🪙`)));
    body.append(h("div", { class: "cat-head" }, h("b", {}, "Equipo")));
    for (const id of shop.gear) {
      const it = GEAR[id];
      const owned = g.inventory.gear.includes(id) || Object.values(g.heroes).some((hs) => Object.values(hs.gear).includes(id));
      body.append(h("div", { class: "shop-row" }, h("div", {}, h("b", {}, it.name), h("div", { class: "muted small" }, `${it.for ? `para ${HEROES[it.for].name} · ` : ""}${gearText(it)}`)),
        h("button", { class: "small-btn", disabled: owned || g.gold < it.price, onclick: () => { const e = buy(g, "gear", id); if (e) toast(e); else toast(`${it.name}: equípalo en Grupo → Equipo.`); onChange?.(); rerender(); } }, owned ? "Comprado" : `${it.price} 🪙`)));
    }
    void close;
  });
}

export function savesSheet(mode, onPick) {
  return sheet(mode === "save" ? "Guardar partida" : "Cargar partida", (body, close) => {
    const slots = mode === "load" ? ["auto", 1, 2, 3] : [1, 2, 3];
    for (const s of slots) {
      const d = describeSave(s);
      body.append(h("button", { class: "slot-btn", disabled: mode === "load" && !d, onclick: () => { onPick(s); close(s); } },
        h("b", {}, s === "auto" ? "Guardado automático" : `Ranura ${s}`),
        h("span", { class: "muted small" }, d ? `Cap. ${d.chapter} · nivel ${d.level} · ${d.heroes} héroes · ${new Date(d.savedAt).toLocaleString()}` : "Vacía")));
    }
  });
}
