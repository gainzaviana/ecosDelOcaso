// Heroes, skills, mastery trees, equipment and runestones. Pure data and small helpers: no DOM.
//
// Every hero has three skill categories that level up by USING them in battle (mastery), plus a
// fourth, "Rasgos", that grows with the hero's total mastery and unlocks passives and, at the top,
// the hero's own ultimate.

export const ATTRS = ["fue", "esp", "con", "des", "vel"];
export const ATTR_NAME = { fue: "Fuerza", esp: "Espíritu", con: "Constitución", des: "Destreza", vel: "Velocidad" };
export const ATTR_HELP = {
  fue: "Ataque físico de armas y artes de combate.",
  esp: "Poder de la magia y la luz, AP máximos y resistencia mágica.",
  con: "Vida máxima y defensa física.",
  des: "Crítico, puntería y evasión.",
  vel: "Velocidad: actúas antes y más a menudo en la línea de turnos.",
};

/** Damage types: each enemy is weak to some and resists others. */
export const DMG = {
  cortante: { name: "Cortante", icon: "⚔" },
  perforante: { name: "Perforante", icon: "➶" },
  contundente: { name: "Contundente", icon: "🔨" },
  fuego: { name: "Fuego", icon: "🔥" },
  luz: { name: "Luz", icon: "✦" },
  sombra: { name: "Sombra", icon: "☾" },
};
export const PHYSICAL = ["cortante", "perforante", "contundente"];

/** Mastery needed (uses in battle) for each tier of a category. */
export const TIER_AT = [0, 4, 10, 18, 30];
/** Total mastery needed for each Rasgos tier (three passives, then the ultimate). */
export const TRAIT_AT = [6, 16, 30, 48];

// MARK: Skills
// target: enemy | allEnemies | randomEnemies | ally | allAllies | self | deadAlly
// stat: atk | mag (what powers it). power: multiplier. delay: how long until this hero acts again (100 = normal).
// effects: buff {stat, mult, turns} · debuff {stat, mult, turns} · status {kind, chance, turns} · haste/slow {turns}
//          stun · delay {amount} · interrupt · heal {power} · revive {pct} · ap {amount} · taunt {turns}
//          counter {turns} · cleanse · regen {turns} · evade {turns}

export const SKILLS = {
  // Valen — Artes de Espada
  "tajo-firme": { name: "Tajo Firme", cat: "espada", ap: 3, stat: "atk", power: 1.45, type: "cortante", target: "enemy", text: "Un corte preciso y potente." },
  "rompeescudos": { name: "Golpe Rompeescudos", cat: "espada", ap: 5, stat: "atk", power: 1.2, type: "contundente", target: "enemy", effects: [{ do: "interrupt" }, { do: "debuff", stat: "def", mult: 0.7, turns: 3 }], text: "Golpe con el pomo: interrumpe cargas y baja la defensa." },
  "doble-corte": { name: "Doble Corte", cat: "espada", ap: 6, stat: "atk", power: 0.95, hits: 2, type: "cortante", target: "enemy", text: "Dos tajos encadenados." },
  "contragolpe": { name: "Postura de Contragolpe", cat: "espada", ap: 5, target: "self", delay: 70, effects: [{ do: "counter", turns: 2 }, { do: "buff", stat: "def", mult: 1.3, turns: 2 }], text: "Responde a cada golpe físico con un contraataque." },
  "juicio-acero": { name: "Juicio de Acero", cat: "espada", ap: 10, stat: "atk", power: 2.6, type: "cortante", target: "enemy", delay: 120, text: "El golpe definitivo de un capitán." },
  // Valen — Liderazgo
  "grito-batalla": { name: "Grito de Batalla", cat: "liderazgo", ap: 5, target: "allAllies", effects: [{ do: "buff", stat: "atk", mult: 1.25, turns: 3 }], text: "+25 % de ataque al grupo durante 3 turnos." },
  "firmes": { name: "¡Firmes!", cat: "liderazgo", ap: 5, target: "allAllies", effects: [{ do: "buff", stat: "def", mult: 1.3, turns: 3 }], text: "+30 % de defensa al grupo durante 3 turnos." },
  "provocar": { name: "Provocar", cat: "liderazgo", ap: 4, target: "self", delay: 80, effects: [{ do: "taunt", turns: 2 }, { do: "buff", stat: "def", mult: 1.25, turns: 2 }], text: "Los enemigos te atacan solo a ti durante 2 turnos." },
  "animo": { name: "Ánimo", cat: "liderazgo", ap: 6, target: "allAllies", effects: [{ do: "ap", amount: 5 }], text: "Cada compañero recupera 5 AP." },
  "estandarte": { name: "Estandarte de la Ciudadela", cat: "liderazgo", ap: 12, target: "allAllies", effects: [{ do: "haste", turns: 2 }, { do: "buff", stat: "atk", mult: 1.2, turns: 3 }], text: "Prisa y +20 % de ataque a todo el grupo." },
  "carga-capitan": { name: "Carga del Capitán", cat: "rasgos", ap: 14, stat: "atk", power: 1.7, type: "cortante", target: "allEnemies", effects: [{ do: "interrupt" }], text: "Definitiva: arrasa a todos los enemigos e interrumpe sus cargas." },

  // Elowen — Luz Espiritual
  "luz-sanadora": { name: "Luz Sanadora", cat: "luz", ap: 4, stat: "mag", target: "ally", effects: [{ do: "heal", power: 1.15 }], text: "Cura a un compañero." },
  "destello": { name: "Destello", cat: "luz", ap: 4, stat: "mag", power: 1.35, type: "luz", target: "enemy", text: "Un haz de luz pura." },
  "aura-protectora": { name: "Aura Protectora", cat: "luz", ap: 6, target: "allAllies", effects: [{ do: "buff", stat: "res", mult: 1.4, turns: 3 }, { do: "buff", stat: "def", mult: 1.15, turns: 3 }], text: "Protege al grupo de la magia y los golpes." },
  "renacer": { name: "Renacer", cat: "luz", ap: 10, target: "deadAlly", effects: [{ do: "revive", pct: 0.4 }], text: "Devuelve a la vida a un compañero caído con el 40 % de vida." },
  "estrella-alba": { name: "Estrella del Alba", cat: "luz", ap: 12, stat: "mag", power: 1.6, type: "luz", target: "allEnemies", delay: 120, text: "Luz cegadora sobre todos los enemigos." },
  // Elowen — Canto Élfico
  "canto-veloz": { name: "Canto Veloz", cat: "canto", ap: 4, target: "ally", effects: [{ do: "haste", turns: 3 }], text: "Prisa: el compañero actúa más a menudo." },
  "lamento-lento": { name: "Lamento Lento", cat: "canto", ap: 4, target: "enemy", effects: [{ do: "slow", turns: 3 }], text: "Lentitud: el enemigo actúa menos a menudo." },
  "purificar": { name: "Purificar", cat: "canto", ap: 3, stat: "mag", target: "ally", effects: [{ do: "cleanse" }, { do: "heal", power: 0.6 }], text: "Quita venenos y quemaduras y cura un poco." },
  "sello-estelar": { name: "Sello Estelar", cat: "canto", ap: 7, target: "enemy", effects: [{ do: "stun" }, { do: "interrupt" }], text: "Aturde: el enemigo pierde su turno y su carga." },
  "coro-estrellas": { name: "Coro de Estrellas", cat: "canto", ap: 12, stat: "mag", target: "allAllies", effects: [{ do: "heal", power: 0.75 }, { do: "regen", turns: 3 }], text: "Cura a todo el grupo y lo regenera." },
  "lluvia-estrellas": { name: "Lluvia de Estrellas", cat: "rasgos", ap: 14, stat: "mag", power: 2.0, type: "luz", target: "allEnemies", effects: [{ do: "slow", turns: 2 }], text: "Definitiva: estrellas sobre todos los enemigos, que quedan ralentizados." },

  // Theron — Arquería
  "disparo-certero": { name: "Disparo Certero", cat: "arco", ap: 3, stat: "atk", power: 1.3, crit: 20, type: "perforante", target: "enemy", text: "+20 % de crítico." },
  "flecha-lisiante": { name: "Flecha Lisiante", cat: "arco", ap: 4, stat: "atk", power: 1.0, type: "perforante", target: "enemy", effects: [{ do: "slow", turns: 2 }, { do: "status", kind: "bleed", chance: 0.6, turns: 3 }], text: "Ralentiza y puede hacer sangrar." },
  "andanada": { name: "Andanada", cat: "arco", ap: 6, stat: "atk", power: 0.85, type: "perforante", target: "allEnemies", text: "Flechas sobre todos los enemigos." },
  "tiro-corazon": { name: "Tiro al Corazón", cat: "arco", ap: 8, stat: "atk", power: 2.2, crit: 30, type: "perforante", target: "enemy", text: "Un disparo letal (+30 % de crítico)." },
  "lluvia-flechas": { name: "Lluvia de Flechas", cat: "arco", ap: 10, stat: "atk", power: 1.15, hits: 4, type: "perforante", target: "randomEnemies", text: "Cuatro flechas a enemigos al azar." },
  // Theron — Artes del Montaraz
  "flecha-ignea": { name: "Flecha Ígnea", cat: "montaraz", ap: 4, stat: "atk", power: 1.15, type: "fuego", target: "enemy", effects: [{ do: "status", kind: "burn", chance: 0.7, turns: 2 }], text: "Fuego que puede quemar." },
  "veneno-raiz": { name: "Veneno de Raíz", cat: "montaraz", ap: 3, stat: "atk", power: 0.6, type: "perforante", target: "enemy", effects: [{ do: "status", kind: "poison", chance: 1, turns: 4 }], text: "Envenena durante 4 turnos." },
  "paso-sombrio": { name: "Paso Sombrío", cat: "montaraz", ap: 4, target: "self", delay: 60, effects: [{ do: "haste", turns: 2 }, { do: "evade", turns: 2 }], text: "Prisa y evasión: casi imposible de alcanzar." },
  "atadura-raices": { name: "Atadura de Raíces", cat: "montaraz", ap: 5, stat: "atk", power: 0.7, type: "contundente", target: "enemy", effects: [{ do: "interrupt" }, { do: "delay", amount: 60 }], text: "Interrumpe cargas y retrasa el próximo turno del enemigo." },
  "flecha-runica": { name: "Flecha Rúnica", cat: "montaraz", ap: 8, stat: "atk", power: 1.8, type: "luz", target: "enemy", text: "Una flecha con runas de luz." },
  "cazador-sombras": { name: "Cazador de Sombras", cat: "rasgos", ap: 14, stat: "atk", power: 3.0, crit: 40, type: "perforante", target: "enemy", effects: [{ do: "stun" }], text: "Definitiva: un disparo devastador que aturde." },

  // Bram — Artes del Hacha
  "hachazo": { name: "Hachazo", cat: "hacha", ap: 3, stat: "atk", power: 1.5, type: "cortante", target: "enemy", text: "Un golpe de hacha brutal." },
  "quebrantahuesos": { name: "Quebrantahuesos", cat: "hacha", ap: 5, stat: "atk", power: 1.3, type: "contundente", target: "enemy", effects: [{ do: "interrupt" }, { do: "debuff", stat: "def", mult: 0.65, turns: 3 }], text: "Interrumpe cargas y rompe la armadura." },
  "torbellino": { name: "Torbellino", cat: "hacha", ap: 6, stat: "atk", power: 0.95, type: "cortante", target: "allEnemies", text: "Gira el hacha contra todos los enemigos." },
  "golpe-sismico": { name: "Golpe Sísmico", cat: "hacha", ap: 8, stat: "atk", power: 1.15, type: "contundente", target: "allEnemies", effects: [{ do: "delay", amount: 30 }, { do: "interrupt" }], text: "Hace temblar el suelo: retrasa e interrumpe a todos." },
  "furia-hondaforja": { name: "Furia de Hondaforja", cat: "hacha", ap: 10, stat: "atk", power: 2.8, type: "contundente", target: "enemy", delay: 120, text: "Toda la fuerza de un herrero enano." },
  // Bram — Forja Rúnica
  "runa-brasa": { name: "Runa de Brasa", cat: "forja", ap: 4, target: "ally", effects: [{ do: "imbue", type: "fuego", turns: 3 }, { do: "buff", stat: "atk", mult: 1.15, turns: 3 }], text: "Los ataques del compañero arden (Fuego) durante 3 turnos." },
  "muro-piedra": { name: "Muro de Piedra", cat: "forja", ap: 4, target: "self", delay: 80, effects: [{ do: "buff", stat: "def", mult: 1.6, turns: 2 }, { do: "taunt", turns: 2 }], text: "Se planta como una roca y atrae los golpes." },
  "temple": { name: "Temple", cat: "forja", ap: 6, target: "allAllies", effects: [{ do: "buff", stat: "def", mult: 1.25, turns: 3 }, { do: "buff", stat: "res", mult: 1.25, turns: 3 }], text: "Templa la armadura de todo el grupo." },
  "martillo-yunque": { name: "Martillo y Yunque", cat: "forja", ap: 7, stat: "atk", power: 1.1, type: "contundente", target: "enemy", effects: [{ do: "stun" }], text: "Un golpe que aturde." },
  "runa-ancestral": { name: "Runa Ancestral", cat: "forja", ap: 12, target: "allAllies", effects: [{ do: "regen", turns: 3 }, { do: "buff", stat: "atk", mult: 1.2, turns: 3 }], text: "Una runa de los antiguos: regeneración y fuerza." },
  "ira-montana": { name: "Ira de la Montaña", cat: "rasgos", ap: 14, stat: "atk", power: 2.0, type: "contundente", target: "allEnemies", effects: [{ do: "interrupt" }, { do: "stun", chance: 0.4 }], text: "Definitiva: la montaña entera cae sobre los enemigos." },

  // Freya — Arte del Escudo
  "golpe-escudo": { name: "Golpe de Escudo", cat: "escudo", ap: 3, stat: "atk", power: 1.1, type: "contundente", target: "enemy", effects: [{ do: "interrupt" }], text: "Interrumpe cargas." },
  "cobertura": { name: "Cobertura", cat: "escudo", ap: 4, target: "allAllies", effects: [{ do: "buff", stat: "def", mult: 1.2, turns: 2 }], text: "+20 % de defensa al grupo." },
  "muro-escudos": { name: "Muro de Escudos", cat: "escudo", ap: 6, target: "allAllies", effects: [{ do: "buff", stat: "def", mult: 1.4, turns: 2 }, { do: "buff", stat: "res", mult: 1.2, turns: 2 }], text: "Una muralla de escudos para todo el grupo." },
  "desafio": { name: "Desafío", cat: "escudo", ap: 5, target: "self", delay: 80, effects: [{ do: "taunt", turns: 3 }, { do: "counter", turns: 3 }], text: "Provoca a los enemigos y devuelve cada golpe." },
  "egida-doncella": { name: "Égida de la Doncella", cat: "escudo", ap: 12, target: "allAllies", effects: [{ do: "buff", stat: "def", mult: 1.5, turns: 3 }, { do: "buff", stat: "res", mult: 1.5, turns: 3 }, { do: "regen", turns: 3 }], text: "Protección total y regeneración." },
  // Freya — Lanza
  "estocada": { name: "Estocada", cat: "lanza", ap: 3, stat: "atk", power: 1.4, type: "perforante", target: "enemy", text: "Una estocada certera." },
  "rompefilas": { name: "Lanza Rompefilas", cat: "lanza", ap: 5, stat: "atk", power: 0.9, type: "perforante", target: "allEnemies", text: "Atraviesa la fila enemiga." },
  "barrido": { name: "Barrido", cat: "lanza", ap: 5, stat: "atk", power: 1.1, type: "perforante", target: "enemy", effects: [{ do: "slow", turns: 2 }], text: "Barre las piernas: lentitud." },
  "ensarte": { name: "Ensarte", cat: "lanza", ap: 8, stat: "atk", power: 2.1, crit: 25, type: "perforante", target: "enemy", text: "Un golpe letal (+25 % de crítico)." },
  "lanza-tormenta": { name: "Lanza de Tormenta", cat: "lanza", ap: 10, stat: "atk", power: 1.05, hits: 3, type: "perforante", target: "randomEnemies", text: "Tres lanzadas a enemigos al azar." },
  "carga-doncella": { name: "Carga de la Doncella", cat: "rasgos", ap: 14, stat: "atk", power: 1.8, type: "perforante", target: "allEnemies", effects: [{ do: "slow", turns: 2 }], text: "Definitiva: carga contra todos y los ralentiza." },

  // Kaelen — Artes del Jinete
  "carga-veloz": { name: "Carga Veloz", cat: "jinete", ap: 3, stat: "atk", power: 1.3, type: "cortante", target: "enemy", delay: 70, text: "Rápida: vuelves a actuar antes." },
  "golpe-carrera": { name: "Golpe en Carrera", cat: "jinete", ap: 5, stat: "atk", power: 1.0, hits: 2, type: "cortante", target: "enemy", text: "Dos tajos al galope." },
  "pisoton": { name: "Pisotón", cat: "jinete", ap: 5, stat: "atk", power: 1.2, type: "contundente", target: "enemy", effects: [{ do: "stun", chance: 0.45 }, { do: "interrupt" }], text: "Puede aturdir; interrumpe cargas." },
  "cabalgata": { name: "Cabalgata", cat: "jinete", ap: 7, stat: "atk", power: 0.95, type: "cortante", target: "allEnemies", delay: 80, text: "Cruza el campo golpeando a todos." },
  "embestida-corcel": { name: "Embestida del Corcel", cat: "jinete", ap: 10, stat: "atk", power: 2.4, type: "contundente", target: "enemy", effects: [{ do: "interrupt" }, { do: "delay", amount: 40 }], text: "Un golpe devastador que retrasa al enemigo." },
  // Kaelen — Canto de las Llanuras
  "grito-jinete": { name: "Grito del Jinete", cat: "llanuras", ap: 3, target: "self", delay: 70, effects: [{ do: "haste", turns: 2 }, { do: "buff", stat: "atk", mult: 1.2, turns: 2 }], text: "Prisa y +20 % de ataque." },
  "cuerno-guerra": { name: "Cuerno de Guerra", cat: "llanuras", ap: 5, target: "allAllies", effects: [{ do: "buff", stat: "atk", mult: 1.2, turns: 3 }], text: "+20 % de ataque al grupo." },
  "viento-oeste": { name: "Viento del Oeste", cat: "llanuras", ap: 8, target: "allAllies", effects: [{ do: "haste", turns: 2 }], text: "Prisa para todo el grupo." },
  "juramento": { name: "Juramento", cat: "llanuras", ap: 6, target: "allAllies", effects: [{ do: "ap", amount: 4 }, { do: "regen", turns: 2 }], text: "+4 AP y regeneración al grupo." },
  "amanecer-dorado": { name: "Amanecer Dorado", cat: "llanuras", ap: 12, stat: "mag", target: "allAllies", effects: [{ do: "heal", power: 0.8 }, { do: "buff", stat: "atk", mult: 1.25, turns: 3 }], text: "La luz del alba cura y anima al grupo." },
  "estampida": { name: "Estampida", cat: "rasgos", ap: 14, stat: "atk", power: 1.6, hits: 3, type: "cortante", target: "randomEnemies", effects: [], text: "Definitiva: una estampida de jinetes arrasa el campo." },

  // Kaelor, el Rey Errante (invitado)
  "hoja-rey": { name: "Hoja del Rey", cat: "invitado", ap: 5, stat: "atk", power: 2.2, type: "cortante", target: "enemy", text: "La hoja forjada de nuevo." },
  "juramento-rey": { name: "Juramento del Rey", cat: "invitado", ap: 6, target: "allAllies", effects: [{ do: "buff", stat: "atk", mult: 1.3, turns: 3 }, { do: "buff", stat: "def", mult: 1.2, turns: 3 }], text: "Ataque y defensa al grupo." },
  "destello-real": { name: "Destello Real", cat: "invitado", ap: 8, stat: "mag", power: 1.4, type: "luz", target: "allEnemies", text: "Luz real sobre todos los enemigos." },

  // Maestro Orven, el Mago Gris (invitado)
  "luz-cegadora": { name: "Luz Cegadora", cat: "invitado", ap: 6, stat: "mag", power: 1.4, type: "luz", target: "allEnemies", effects: [{ do: "status", kind: "blind", chance: 0.5, turns: 2 }], text: "Luz blanca sobre todos los enemigos." },
  "baston-ardiente": { name: "Bastón Ardiente", cat: "invitado", ap: 5, stat: "mag", power: 2.0, type: "fuego", target: "enemy", effects: [{ do: "interrupt" }], text: "Llamas del bastón que interrumpen cargas." },
  "escudo-errante": { name: "Escudo del Errante", cat: "invitado", ap: 6, target: "allAllies", effects: [{ do: "buff", stat: "def", mult: 1.35, turns: 3 }, { do: "buff", stat: "res", mult: 1.35, turns: 3 }], text: "Una barrera para todo el grupo." },
};

// MARK: Heroes

export const HEROES = {
  valen: {
    name: "Valen", title: "Capitán de la Ciudadela", color: "#c9a14a",
    base: { fue: 7, esp: 3, con: 7, des: 4, vel: 5 }, attack: "cortante",
    sprite: { skin: "#e8b48a", hair: "#5a3a22", hairStyle: "short", tunic: "#3c5a9a", trim: "#c9a14a", cape: "#2a3f73", legs: "#4a3a2a", weapon: "sword", helmet: false, beard: true },
    cats: [
      { id: "espada", name: "Artes de Espada", icon: "⚔", tiers: ["tajo-firme", "rompeescudos", "doble-corte", "contragolpe", "juicio-acero"] },
      { id: "liderazgo", name: "Liderazgo", icon: "📯", tiers: ["grito-batalla", "firmes", "provocar", "animo", "estandarte"] },
    ],
    traits: [
      { name: "Piel Curtida", text: "+12 % de vida máxima.", hpPct: 0.12 },
      { name: "Disciplina", text: "+1 AP al empezar cada turno.", apRegen: 1 },
      { name: "Contraataque Instintivo", text: "15 % de devolver los golpes físicos.", counter: 0.15 },
    ],
    ultimate: "carga-capitan",
    gear: { weapon: "espada-ciudadela", armor: "cota-guardia", cloak: "capa-azul" },
  },
  elowen: {
    name: "Elowen", title: "Doncella de la Luz Estelar", color: "#8fd0ff",
    base: { fue: 3, esp: 8, con: 4, des: 5, vel: 6 }, attack: "luz",
    sprite: { skin: "#f3d6c0", hair: "#e9e2c8", hairStyle: "long", tunic: "#e8f0ff", trim: "#8fd0ff", cape: "#7aa6d8", legs: "#c9d6ee", weapon: "staff", helmet: false },
    cats: [
      { id: "luz", name: "Luz Espiritual", icon: "✦", tiers: ["luz-sanadora", "destello", "aura-protectora", "renacer", "estrella-alba"] },
      { id: "canto", name: "Canto Élfico", icon: "♪", tiers: ["canto-veloz", "lamento-lento", "purificar", "sello-estelar", "coro-estrellas"] },
    ],
    traits: [
      { name: "Gracia Élfica", text: "+12 AP máximos.", apMax: 12 },
      { name: "Fuente Serena", text: "+1 AP al empezar cada turno.", apRegen: 1 },
      { name: "Luz Interior", text: "Tus curaciones son un 25 % más fuertes.", healPct: 0.25 },
    ],
    ultimate: "lluvia-estrellas",
    gear: { weapon: "baculo-alba", armor: "tunica-seda", cloak: "capa-estelar" },
  },
  theron: {
    name: "Theron", title: "Montaraz del Norte", color: "#6fae5a",
    base: { fue: 5, esp: 4, con: 5, des: 8, vel: 7 }, attack: "perforante",
    sprite: { skin: "#d9a07a", hair: "#2a2018", hairStyle: "hood", tunic: "#4d6b3a", trim: "#8a6a3a", cape: "#3a4d2c", legs: "#3a2f24", weapon: "bow", helmet: false, beard: true },
    cats: [
      { id: "arco", name: "Arquería", icon: "➶", tiers: ["disparo-certero", "flecha-lisiante", "andanada", "tiro-corazon", "lluvia-flechas"] },
      { id: "montaraz", name: "Artes del Montaraz", icon: "☾", tiers: ["flecha-ignea", "veneno-raiz", "paso-sombrio", "atadura-raices", "flecha-runica"] },
    ],
    traits: [
      { name: "Ojo de Halcón", text: "+10 % de crítico.", crit: 10 },
      { name: "Rastreador", text: "Empieza cada combate antes en la línea de turnos.", firstTurn: 0.5 },
      { name: "Sangre del Norte", text: "Recupera un 4 % de vida al empezar cada turno.", regenPct: 0.04 },
    ],
    ultimate: "cazador-sombras",
    gear: { weapon: "arco-norte", armor: "cuero-montaraz", cloak: "capa-musgo" },
  },
  bram: {
    name: "Bram", title: "Herrero de Hondaforja", color: "#d0884a",
    base: { fue: 8, esp: 3, con: 9, des: 3, vel: 4 }, attack: "contundente",
    sprite: { skin: "#e0a880", hair: "#a8582a", hairStyle: "short", tunic: "#6a4a32", trim: "#c08040", cape: null, legs: "#4a3426", weapon: "axe", helmet: "#8a8a92", beard: "braid", short: true },
    cats: [
      { id: "hacha", name: "Artes del Hacha", icon: "🪓", tiers: ["hachazo", "quebrantahuesos", "torbellino", "golpe-sismico", "furia-hondaforja"] },
      { id: "forja", name: "Forja Rúnica", icon: "⚒", tiers: ["runa-brasa", "muro-piedra", "temple", "martillo-yunque", "runa-ancestral"] },
    ],
    traits: [
      { name: "Aguante Enano", text: "+15 % de vida máxima.", hpPct: 0.15 },
      { name: "Terquedad", text: "+1 AP al empezar cada turno.", apRegen: 1 },
      { name: "Represalia de Forja", text: "20 % de devolver los golpes físicos.", counter: 0.2 },
    ],
    ultimate: "ira-montana",
    gear: { weapon: "hacha-forja", armor: "malla-enana", cloak: "capa-cuero" },
  },
  freya: {
    name: "Freya", title: "Doncella Escudera", color: "#e0c070",
    base: { fue: 6, esp: 4, con: 7, des: 5, vel: 6 }, attack: "perforante",
    sprite: { skin: "#f0c8a8", hair: "#e8c060", hairStyle: "braid", tunic: "#5a7a4a", trim: "#d8b050", cape: "#8a3a2a", legs: "#4a4030", weapon: "spear", shield: "#a07040" },
    cats: [
      { id: "escudo", name: "Arte del Escudo", icon: "🛡", tiers: ["golpe-escudo", "cobertura", "muro-escudos", "desafio", "egida-doncella"] },
      { id: "lanza", name: "Lanza", icon: "🔱", tiers: ["estocada", "rompefilas", "barrido", "ensarte", "lanza-tormenta"] },
    ],
    traits: [
      { name: "Escudo Firme", text: "+10 % de vida máxima.", hpPct: 0.1 },
      { name: "Valor", text: "+1 AP al empezar cada turno.", apRegen: 1 },
      { name: "Contraataque", text: "20 % de devolver los golpes físicos.", counter: 0.2 },
    ],
    ultimate: "carga-doncella",
    gear: { weapon: "lanza-llanura", armor: "cota-escudera", cloak: "capa-roja" },
  },
  kaelen: {
    name: "Kaelen", title: "Jinete de las Llanuras", color: "#7aa0d8",
    base: { fue: 6, esp: 4, con: 5, des: 6, vel: 9 }, attack: "cortante",
    sprite: { skin: "#e8b890", hair: "#c8a050", hairStyle: "long", tunic: "#3a6a5a", trim: "#d0b060", cape: "#2a4a3e", legs: "#5a4a30", weapon: "sword", helmet: "#b8b0a0", plume: "#4a8a5a" },
    cats: [
      { id: "jinete", name: "Artes del Jinete", icon: "🐎", tiers: ["carga-veloz", "golpe-carrera", "pisoton", "cabalgata", "embestida-corcel"] },
      { id: "llanuras", name: "Canto de las Llanuras", icon: "📯", tiers: ["grito-jinete", "cuerno-guerra", "viento-oeste", "juramento", "amanecer-dorado"] },
    ],
    traits: [
      { name: "Jinete Nato", text: "Empieza cada combate antes en la línea de turnos.", firstTurn: 0.5 },
      { name: "Resistencia", text: "+10 % de vida máxima.", hpPct: 0.1 },
      { name: "Ímpetu", text: "+10 % de crítico.", crit: 10 },
    ],
    ultimate: "estampida",
    gear: { weapon: "sable-jinete", armor: "cuero-jinete", cloak: "capa-verde" },
  },
  kaelor: {
    name: "Kaelor", title: "El Rey Errante", color: "#d8d0ff", guest: true,
    base: { fue: 12, esp: 8, con: 10, des: 8, vel: 9 }, attack: "cortante", level: 14,
    sprite: { skin: "#d8a888", hair: "#2a2220", hairStyle: "long", tunic: "#2a3a4a", trim: "#c8c8e0", cape: "#1e2a36", legs: "#2a2a30", weapon: "sword", beard: true },
    cats: [{ id: "invitado", name: "Linaje Real", icon: "♛", tiers: ["hoja-rey", "juramento-rey", "destello-real"], allUnlocked: true }],
    traits: [],
    gear: { weapon: "hoja-rey", armor: "cota-rey", cloak: "capa-rey" },
  },
  // Guest hero: fixed level and skills, joins for key fights.
  orven: {
    name: "Maestro Orven", title: "El Mago Gris", color: "#b8b8c8", guest: true,
    base: { fue: 5, esp: 12, con: 7, des: 5, vel: 6 }, attack: "contundente", level: 10,
    sprite: { skin: "#e0c0a0", hair: "#cfcfd6", hairStyle: "wizard", tunic: "#8a8a99", trim: "#d8d8e0", cape: "#6a6a7a", legs: "#5a5a66", weapon: "staff", helmet: false, beard: "long" },
    cats: [{ id: "invitado", name: "Saber Antiguo", icon: "✷", tiers: ["luz-cegadora", "baston-ardiente", "escudo-errante"], allUnlocked: true }],
    traits: [],
    gear: { weapon: "baston-gris", armor: "tunica-gris", cloak: "capa-gris" },
  },
};

/** Heroes who join later (shown as locked in the party screen until they do). */
export const FUTURE_HEROES = [
  { id: "bram", name: "Bram", title: "Herrero de Hondaforja", chapter: 2 },
  { id: "freya", name: "Freya", title: "Doncella Escudera", chapter: 3 },
  { id: "kaelen", name: "Kaelen", title: "Jinete de las Llanuras", chapter: 3 },
];

// MARK: Equipment and runestones

export const GEAR = {
  "espada-ciudadela": { name: "Espada de la Ciudadela", slot: "weapon", atk: 8, sockets: 1, for: "valen" },
  "espada-alba": { name: "Hoja del Alba", slot: "weapon", atk: 13, crit: 5, sockets: 2, for: "valen", price: 180 },
  "baculo-alba": { name: "Báculo del Alba", slot: "weapon", atk: 3, mag: 7, sockets: 1, for: "elowen" },
  "baculo-estrella": { name: "Báculo de Estrella Fugaz", slot: "weapon", atk: 4, mag: 12, ap: 4, sockets: 2, for: "elowen", price: 180 },
  "arco-norte": { name: "Arco del Norte", slot: "weapon", atk: 8, crit: 5, sockets: 1, for: "theron" },
  "arco-tejo": { name: "Arco de Tejo Antiguo", slot: "weapon", atk: 12, crit: 10, sockets: 2, for: "theron", price: 180 },
  "baston-gris": { name: "Bastón Gris", slot: "weapon", atk: 8, mag: 14, sockets: 0, for: "orven" },
  "cota-guardia": { name: "Cota de la Guardia", slot: "armor", def: 6, sockets: 1 },
  "tunica-seda": { name: "Túnica de Seda Élfica", slot: "armor", def: 3, res: 4, sockets: 1 },
  "cuero-montaraz": { name: "Cuero de Montaraz", slot: "armor", def: 4, eva: 4, sockets: 1 },
  "tunica-gris": { name: "Túnica Gris", slot: "armor", def: 5, res: 8, sockets: 0 },
  "malla-roble": { name: "Malla de Corteza de Roble", slot: "armor", def: 9, hp: 15, sockets: 1, price: 140 },
  "capa-azul": { name: "Capa Azul", slot: "cloak", res: 2 },
  "capa-estelar": { name: "Capa Estelar", slot: "cloak", res: 4, ap: 2 },
  "capa-musgo": { name: "Capa de Musgo", slot: "cloak", eva: 3, res: 2 },
  "capa-gris": { name: "Capa Gris", slot: "cloak", res: 4 },
  "capa-susurro": { name: "Capa del Susurro", slot: "cloak", res: 6, eva: 5, spd: 1, price: 120 },
  // New heroes' starting gear.
  "hacha-forja": { name: "Hacha de Forja", slot: "weapon", atk: 12, sockets: 1, for: "bram" },
  "malla-enana": { name: "Malla Enana", slot: "armor", def: 9, sockets: 1 },
  "capa-cuero": { name: "Capa de Cuero", slot: "cloak", res: 3 },
  "lanza-llanura": { name: "Lanza de la Llanura", slot: "weapon", atk: 13, sockets: 1, for: "freya" },
  "cota-escudera": { name: "Cota de Escudera", slot: "armor", def: 9, res: 3, sockets: 1 },
  "capa-roja": { name: "Capa Roja", slot: "cloak", res: 4 },
  "sable-jinete": { name: "Sable de Jinete", slot: "weapon", atk: 13, crit: 5, sockets: 1, for: "kaelen" },
  "cuero-jinete": { name: "Cuero de Jinete", slot: "armor", def: 7, eva: 4, sockets: 1 },
  "capa-verde": { name: "Capa Verde de las Llanuras", slot: "cloak", res: 4, spd: 1 },
  "hoja-rey": { name: "La Hoja Reforjada", slot: "weapon", atk: 24, mag: 10, sockets: 0, for: "kaelor" },
  "cota-rey": { name: "Cota del Rey", slot: "armor", def: 14, res: 10, sockets: 0 },
  "capa-rey": { name: "Capa del Rey", slot: "cloak", res: 6 },
  // Chapter II shop.
  "espada-mithril": { name: "Espada de Plata Lunar", slot: "weapon", atk: 19, crit: 8, sockets: 2, for: "valen", price: 420 },
  "baculo-cristal": { name: "Báculo de Cristal de Mina", slot: "weapon", atk: 6, mag: 18, ap: 6, sockets: 2, for: "elowen", price: 420 },
  "arco-hondo": { name: "Arco de las Profundidades", slot: "weapon", atk: 18, crit: 14, sockets: 2, for: "theron", price: 420 },
  "hacha-runica": { name: "Hacha Rúnica", slot: "weapon", atk: 19, sockets: 2, for: "bram", price: 420 },
  "cota-plata": { name: "Cota de Plata Lunar", slot: "armor", def: 14, res: 6, hp: 20, sockets: 2, price: 380 },
  // Chapter III shop.
  "espada-rey": { name: "Espada del Senescal", slot: "weapon", atk: 26, crit: 10, sockets: 2, for: "valen", price: 820 },
  "baculo-sol": { name: "Báculo del Sol Naciente", slot: "weapon", atk: 8, mag: 26, ap: 8, sockets: 2, for: "elowen", price: 820 },
  "arco-viento": { name: "Arco del Viento Norte", slot: "weapon", atk: 25, crit: 18, sockets: 2, for: "theron", price: 820 },
  "martillo-trueno": { name: "Martillo del Trueno", slot: "weapon", atk: 27, sockets: 2, for: "bram", price: 820 },
  "lanza-alba": { name: "Lanza del Alba", slot: "weapon", atk: 26, crit: 8, sockets: 2, for: "freya", price: 820 },
  "sable-viento": { name: "Sable del Viento", slot: "weapon", atk: 26, crit: 12, sockets: 2, for: "kaelen", price: 820 },
  "armadura-real": { name: "Armadura de la Guardia Real", slot: "armor", def: 20, res: 10, hp: 40, sockets: 2, price: 760 },
  "capa-estrellas": { name: "Capa de las Estrellas", slot: "cloak", res: 12, eva: 6, ap: 4, spd: 1, price: 600 },
  // Chapter IV–V rewards.
  "espada-ocaso": { name: "Espada del Último Ocaso", slot: "weapon", atk: 34, crit: 14, sockets: 2, for: "valen" },
  "arco-ocaso": { name: "Arco del Último Ocaso", slot: "weapon", atk: 32, crit: 22, sockets: 2, for: "theron" },
};

export const RUNES = {
  "runa-filo": { name: "Runa del Filo", text: "+15 % de crítico.", crit: 15, color: "#e05050" },
  "piedra-manantial": { name: "Piedra del Manantial", text: "+1 AP al empezar cada turno.", apRegen: 1, color: "#50a0e0" },
  "gema-umbria": { name: "Gema Umbría", text: "Resistes la Sombra (la mitad de daño).", resist: "sombra", color: "#8050c0" },
  "lagrima-estelar": { name: "Lágrima Estelar", text: "Revives una vez por combate con el 30 % de vida.", autoRevive: 0.3, color: "#e0e0ff" },
  "runa-hierro": { name: "Runa de Hierro", text: "+5 de defensa.", def: 5, color: "#a0a0a0" },
  "runa-ascua": { name: "Runa de Ascua", text: "Tus ataques básicos hacen daño de Fuego.", attackType: "fuego", color: "#ff8a30" },
  "ojo-halcon": { name: "Ojo del Halcón", text: "+8 de evasión.", eva: 8, color: "#e0c050" },
  "runa-montana": { name: "Runa de la Montaña", text: "+10 de defensa.", def: 10, color: "#b08050" },
  "cristal-alba": { name: "Cristal del Alba", text: "+2 AP al empezar cada turno.", apRegen: 2, color: "#a0e0ff" },
  "runa-rey": { name: "Runa del Rey", text: "+20 % de crítico.", crit: 20, color: "#f0e0a0" },
  "lagrima-mayor": { name: "Lágrima Estelar Mayor", text: "Revives una vez por combate con el 60 % de vida.", autoRevive: 0.6, color: "#ffffff" },
};

export const ITEMS = {
  "raiz-alba": { name: "Raíz del Alba", text: "Cura el 45 % de la vida.", target: "ally", heal: 0.45, price: 25 },
  "hidromiel": { name: "Hidromiel Plateado", text: "Recupera 12 AP.", target: "ally", ap: 12, price: 30 },
  "hoja-vela": { name: "Hoja de Vela", text: "Revive con el 35 % de vida.", target: "deadAlly", revive: 0.35, price: 60 },
  "antidoto": { name: "Musgo Limpio", text: "Cura venenos, quemaduras y sangrados.", target: "ally", cleanse: true, price: 15 },
  "gran-raiz": { name: "Gran Raíz del Alba", text: "Cura el 80 % de la vida.", target: "ally", heal: 0.8, price: 70 },
  "elixir-plata": { name: "Elixir de Plata", text: "Recupera 25 AP.", target: "ally", ap: 25, price: 80 },
};

/** Skills of a hero that are unlocked by mastery (and the ultimate if Rasgos reached it). */
export function unlockedSkills(heroId, mastery) {
  const h = HEROES[heroId];
  const out = [];
  for (const c of h.cats) {
    const m = mastery?.[c.id] ?? 0;
    c.tiers.forEach((id, k) => { if (c.allUnlocked || m >= TIER_AT[k]) out.push(id); });
  }
  if (h.ultimate && traitTier(heroId, mastery) >= 4) out.push(h.ultimate);
  return out;
}

/** Total mastery across a hero's categories. */
export const totalMastery = (heroId, mastery) => HEROES[heroId].cats.reduce((a, c) => a + (mastery?.[c.id] ?? 0), 0);
/** How many Rasgos tiers are unlocked (0–4; 4 includes the ultimate). */
export const traitTier = (heroId, mastery) => TRAIT_AT.filter((n) => totalMastery(heroId, mastery) >= n).length;
/** The passive traits unlocked. */
export const activeTraits = (heroId, mastery) => HEROES[heroId].traits.slice(0, Math.min(3, traitTier(heroId, mastery)));
