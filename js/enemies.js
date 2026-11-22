// Enemies of Chapter 1. Each one has weaknesses and resistances to damage types; some have a
// telegraphed "charge" attack: they spend a turn charging (⚠ on the timeline) and unleash it on their
// next turn unless a hero interrupts them (blunt hits, Sello Estelar, Atadura de Raíces…).
//
// skill: { name, power, stat, type, target: hero | allHeroes, weight, charge?, effects? }

export const ENEMIES = {
  merodeador: {
    name: "Merodeador Grisáceo", sprite: "merodeador", hp: 46, atk: 15, mag: 6, def: 5, res: 3, spd: 13, eva: 4,
    weak: ["luz", "fuego"], resist: [], xp: 14, gold: 8,
    skills: [
      { name: "Cuchillada", power: 1.0, stat: "atk", type: "cortante", target: "hero", weight: 3 },
      { name: "Puñal Sucio", power: 0.8, stat: "atk", type: "cortante", target: "hero", weight: 1, effects: [{ do: "status", kind: "poison", chance: 0.5, turns: 3 }] },
    ],
  },
  arquero: {
    name: "Arquero Merodeador", sprite: "arquero", hp: 38, atk: 15, mag: 6, def: 3, res: 3, spd: 14, eva: 6,
    weak: ["cortante", "luz"], resist: ["perforante"], xp: 16, gold: 10,
    skills: [
      { name: "Flecha Negra", power: 1.05, stat: "atk", type: "perforante", target: "hero", weight: 3 },
      { name: "Lluvia Rápida", power: 0.6, stat: "atk", type: "perforante", target: "allHeroes", weight: 1 },
    ],
  },
  bruto: {
    name: "Bruto de Hollín", sprite: "bruto", hp: 110, atk: 19, mag: 4, def: 9, res: 2, spd: 10, eva: 0,
    weak: ["perforante", "luz"], resist: ["contundente"], xp: 34, gold: 22,
    skills: [
      { name: "Porrazo", power: 1.0, stat: "atk", type: "contundente", target: "hero", weight: 3 },
      { name: "Golpe Demoledor", power: 2.3, stat: "atk", type: "contundente", target: "hero", weight: 2, charge: true },
    ],
  },
  lobo: {
    name: "Lobo Sombrío", sprite: "lobo", hp: 40, atk: 15, mag: 4, def: 3, res: 4, spd: 19, eva: 10,
    weak: ["fuego", "cortante"], resist: ["sombra"], xp: 15, gold: 4,
    skills: [
      { name: "Mordisco", power: 1.0, stat: "atk", type: "perforante", target: "hero", weight: 3 },
      { name: "Desgarro", power: 0.8, stat: "atk", type: "cortante", target: "hero", weight: 1, effects: [{ do: "status", kind: "bleed", chance: 0.6, turns: 3 }] },
    ],
  },
  "lobo-alfa": {
    name: "Lobo Alfa", sprite: "lobo-alfa", hp: 95, atk: 18, mag: 4, def: 5, res: 5, spd: 17, eva: 8,
    weak: ["fuego"], resist: ["sombra"], xp: 40, gold: 18,
    skills: [
      { name: "Mordisco Feroz", power: 1.2, stat: "atk", type: "perforante", target: "hero", weight: 3 },
      { name: "Aullido de la Manada", power: 0, target: "self", weight: 1, effects: [{ do: "buff", stat: "atk", mult: 1.3, turns: 3 }] },
    ],
  },
  arana: {
    name: "Araña del Musgo", sprite: "arana", hp: 52, atk: 14, mag: 10, def: 4, res: 4, spd: 15, eva: 6,
    weak: ["fuego", "contundente"], resist: ["perforante"], xp: 20, gold: 9,
    skills: [
      { name: "Picadura", power: 0.9, stat: "atk", type: "perforante", target: "hero", weight: 2, effects: [{ do: "status", kind: "poison", chance: 0.7, turns: 3 }] },
      { name: "Telaraña", power: 0, target: "hero", weight: 1, effects: [{ do: "slow", turns: 2 }] },
    ],
  },
  "reina-arana": {
    name: "Madre del Musgo", sprite: "reina-arana", hp: 170, atk: 17, mag: 15, def: 6, res: 6, spd: 12, eva: 2,
    weak: ["fuego", "luz"], resist: ["perforante", "sombra"], xp: 70, gold: 45,
    skills: [
      { name: "Colmillos", power: 1.15, stat: "atk", type: "perforante", target: "hero", weight: 3, effects: [{ do: "status", kind: "poison", chance: 0.5, turns: 3 }] },
      { name: "Nube de Esporas", power: 0.7, stat: "mag", type: "sombra", target: "allHeroes", weight: 2, charge: true, effects: [{ do: "status", kind: "poison", chance: 0.8, turns: 3 }, { do: "status", kind: "sleep", chance: 0.3, turns: 2 }] },
    ],
  },
  // Chapter 1 boss: two phases. At half health it roots itself and starts charging its big attack.
  guardian: {
    name: "El Guardián Marchito", sprite: "guardian", hp: 420, atk: 21, mag: 19, def: 9, res: 7, spd: 12, eva: 0, boss: true,
    weak: ["fuego", "cortante"], resist: ["perforante", "sombra"], xp: 220, gold: 120,
    skills: [
      { name: "Azote de Ramas", power: 1.1, stat: "atk", type: "contundente", target: "hero", weight: 3 },
      { name: "Esporas Marchitas", power: 0.6, stat: "mag", type: "sombra", target: "allHeroes", weight: 1, effects: [{ do: "status", kind: "poison", chance: 0.5, turns: 3 }, { do: "status", kind: "sleep", chance: 0.2, turns: 2 }] },
    ],
    phases: [
      {
        at: 0.5, text: "¡El Guardián hunde sus raíces en la tierra! Sus ojos arden con luz enferma.",
        buff: { stat: "atk", mult: 1.2 },
        summon: ["arana", "arana"],
        skills: [
          { name: "Azote de Ramas", power: 1.2, stat: "atk", type: "contundente", target: "hero", weight: 3 },
          { name: "Raíces del Abismo", power: 1.7, stat: "mag", type: "sombra", target: "allHeroes", weight: 3, charge: true },
          { name: "Absorber Savia", power: 0, target: "self", weight: 1, effects: [{ do: "healSelf", pct: 0.08 }] },
        ],
      },
    ],
  },

  // MARK: Chapter II · Las Minas de Hondaforja
  trasgo: {
    name: "Trasgo de las Minas", sprite: "trasgo", hp: 95, atk: 20, mag: 8, def: 9, res: 6, spd: 16, eva: 6,
    weak: ["luz", "fuego"], resist: ["sombra"], xp: 38, gold: 18,
    skills: [
      { name: "Tajo Mellado", power: 1.0, stat: "atk", type: "cortante", target: "hero", weight: 3 },
      { name: "Lanza Oxidada", power: 1.1, stat: "atk", type: "perforante", target: "hero", weight: 2 },
    ],
  },
  "trasgo-arquero": {
    name: "Arquero Trasgo", sprite: "trasgo-arquero", hp: 80, atk: 21, mag: 8, def: 6, res: 6, spd: 17, eva: 8,
    weak: ["luz", "cortante"], resist: ["perforante"], xp: 40, gold: 20,
    skills: [
      { name: "Flecha de Hueso", power: 1.05, stat: "atk", type: "perforante", target: "hero", weight: 3 },
      { name: "Andanada", power: 0.6, stat: "atk", type: "perforante", target: "allHeroes", weight: 1 },
    ],
  },
  murcielago: {
    name: "Murciélago de Ceniza", sprite: "murcielago", hp: 70, atk: 18, mag: 6, def: 5, res: 5, spd: 24, eva: 18,
    weak: ["perforante", "luz"], resist: ["sombra"], xp: 34, gold: 8,
    skills: [
      { name: "Mordisco", power: 0.95, stat: "atk", type: "perforante", target: "hero", weight: 3, effects: [{ do: "status", kind: "bleed", chance: 0.4, turns: 3 }] },
      { name: "Chirrido", power: 0, target: "hero", weight: 1, effects: [{ do: "status", kind: "confuse", chance: 0.6, turns: 2 }] },
    ],
  },
  "troll-cueva": {
    name: "Troll de la Cueva", sprite: "troll-cueva", hp: 300, atk: 28, mag: 6, def: 14, res: 6, spd: 10, eva: 0,
    weak: ["perforante", "fuego"], resist: ["contundente"], xp: 110, gold: 60,
    skills: [
      { name: "Puñetazo", power: 1.0, stat: "atk", type: "contundente", target: "hero", weight: 3 },
      { name: "Mazo Terrible", power: 2.3, stat: "atk", type: "contundente", target: "hero", weight: 2, charge: true },
    ],
  },
  cangrejo: {
    name: "Cangrejo de Roca", sprite: "cangrejo", hp: 430, atk: 30, mag: 10, def: 22, res: 8, spd: 11, eva: 0,
    weak: ["contundente", "fuego"], resist: ["cortante", "perforante"], xp: 160, gold: 90,
    skills: [
      { name: "Pinza", power: 1.1, stat: "atk", type: "cortante", target: "hero", weight: 3 },
      { name: "Caparazón", power: 0, target: "self", weight: 1, effects: [{ do: "buff", stat: "def", mult: 1.5, turns: 2 }] },
      { name: "Tenazas Abisales", power: 2.0, stat: "atk", type: "contundente", target: "hero", weight: 2, charge: true, effects: [{ do: "stun", chance: 0.5 }] },
    ],
  },
  coloso: {
    name: "El Coloso de Brasa", sprite: "coloso", hp: 1300, atk: 32, mag: 28, def: 14, res: 12, spd: 12, eva: 0, boss: true,
    weak: ["contundente", "luz"], resist: ["fuego", "cortante"], xp: 520, gold: 260,
    skills: [
      { name: "Puño de Brasa", power: 1.15, stat: "atk", type: "contundente", target: "hero", weight: 3 },
      { name: "Aliento Ígneo", power: 0.8, stat: "mag", type: "fuego", target: "allHeroes", weight: 2, effects: [{ do: "status", kind: "burn", chance: 0.4, turns: 2 }] },
    ],
    phases: [
      {
        at: 0.6, text: "La piedra del Coloso se agrieta y la lava asoma por las grietas. ¡De las sombras del techo bajan murciélagos!",
        summon: ["murcielago", "murcielago"],
        skills: [
          { name: "Puño de Brasa", power: 1.2, stat: "atk", type: "contundente", target: "hero", weight: 3 },
          { name: "Lluvia de Brasas", power: 1.4, stat: "mag", type: "fuego", target: "allHeroes", weight: 2, charge: true, effects: [{ do: "status", kind: "burn", chance: 0.5, turns: 2 }] },
        ],
      },
      {
        at: 0.3, text: "¡El Coloso ruge y el puente entero tiembla! Su corazón de lava late cada vez más fuerte.",
        buff: { stat: "atk", mult: 1.25 },
        skills: [
          { name: "Puño de Brasa", power: 1.25, stat: "atk", type: "contundente", target: "hero", weight: 2 },
          { name: "Aliento Ígneo", power: 0.9, stat: "mag", type: "fuego", target: "allHeroes", weight: 2 },
          { name: "Grieta Ardiente", power: 2.6, stat: "atk", type: "contundente", target: "hero", weight: 2, charge: true },
        ],
      },
    ],
  },

  // MARK: Chapter III · Las Llanuras Doradas y la Fortaleza de Rocaeco
  "huargo-jinete": {
    name: "Jinete de Huargo", sprite: "huargo-jinete", hp: 150, atk: 27, mag: 8, def: 12, res: 8, spd: 22, eva: 10,
    weak: ["fuego", "cortante"], resist: ["sombra"], xp: 70, gold: 30,
    skills: [
      { name: "Lanzazo", power: 1.05, stat: "atk", type: "perforante", target: "hero", weight: 3 },
      { name: "Arrollar", power: 1.8, stat: "atk", type: "contundente", target: "hero", weight: 1, charge: true },
    ],
  },
  "hierro-negro": {
    name: "Guerrero de Hierro Negro", sprite: "hierro-negro", hp: 175, atk: 30, mag: 8, def: 18, res: 8, spd: 15, eva: 2,
    weak: ["luz", "perforante"], resist: ["cortante"], xp: 80, gold: 36,
    skills: [
      { name: "Tajo Negro", power: 1.0, stat: "atk", type: "cortante", target: "hero", weight: 3 },
      { name: "Golpe de Escudo", power: 0.9, stat: "atk", type: "contundente", target: "hero", weight: 1, effects: [{ do: "slow", turns: 2 }] },
    ],
  },
  ballestero: {
    name: "Ballestero de Hierro Negro", sprite: "ballestero", hp: 130, atk: 31, mag: 8, def: 10, res: 8, spd: 16, eva: 6,
    weak: ["cortante", "luz"], resist: ["perforante"], xp: 74, gold: 34,
    skills: [
      { name: "Virote", power: 1.1, stat: "atk", type: "perforante", target: "hero", weight: 3 },
      { name: "Descarga", power: 0.65, stat: "atk", type: "perforante", target: "allHeroes", weight: 1 },
    ],
  },
  "bruto-asalto": {
    name: "Bruto de Asalto", sprite: "bruto-asalto", hp: 240, atk: 34, mag: 6, def: 16, res: 6, spd: 12, eva: 0,
    weak: ["perforante", "luz"], resist: ["contundente"], xp: 100, gold: 44,
    skills: [
      { name: "Porrazo", power: 1.0, stat: "atk", type: "contundente", target: "hero", weight: 3 },
      { name: "Hachazo Brutal", power: 2.2, stat: "atk", type: "cortante", target: "hero", weight: 2, charge: true },
    ],
  },
  ariete: {
    name: "Ariete de Asedio", sprite: "ariete", hp: 420, atk: 36, mag: 4, def: 30, res: 6, spd: 8, eva: 0,
    weak: ["fuego", "contundente"], resist: ["cortante", "perforante"], xp: 150, gold: 70,
    skills: [
      { name: "Avance", power: 0, target: "self", weight: 1, effects: [{ do: "buff", stat: "atk", mult: 1.25, turns: 3 }] },
      { name: "Embate", power: 1.3, stat: "atk", type: "contundente", target: "allHeroes", weight: 2, charge: true },
    ],
  },
  capitan: {
    name: "Draugmar, Capitán de Hierro Negro", sprite: "capitan", hp: 1250, atk: 38, mag: 20, def: 20, res: 12, spd: 14, eva: 0, boss: true,
    weak: ["luz", "perforante"], resist: ["cortante", "sombra"], xp: 900, gold: 420,
    skills: [
      { name: "Hacha Negra", power: 1.15, stat: "atk", type: "cortante", target: "hero", weight: 3 },
      { name: "Grito de Guerra", power: 0, target: "self", weight: 1, effects: [{ do: "buff", stat: "atk", mult: 1.25, turns: 3 }] },
    ],
    phases: [
      {
        at: 0.5, text: "«¡A mí, Hierro Negro!» Draugmar sopla su cuerno y dos guerreros saltan la muralla.",
        summon: ["hierro-negro", "hierro-negro"],
        skills: [
          { name: "Hacha Negra", power: 1.2, stat: "atk", type: "cortante", target: "hero", weight: 3 },
          { name: "Torbellino Negro", power: 0.9, stat: "atk", type: "cortante", target: "allHeroes", weight: 2 },
          { name: "Hacha Rompemuros", power: 2.4, stat: "atk", type: "contundente", target: "hero", weight: 2, charge: true },
        ],
      },
    ],
  },

  // MARK: Chapter IV · La Ciudad Ribereña en Ruinas
  corsario: {
    name: "Corsario del Río", sprite: "corsario", hp: 220, atk: 36, mag: 10, def: 18, res: 10, spd: 18, eva: 8,
    weak: ["luz", "cortante"], resist: [], xp: 120, gold: 60,
    skills: [
      { name: "Sablazo", power: 1.0, stat: "atk", type: "cortante", target: "hero", weight: 3 },
      { name: "Garfio", power: 1.1, stat: "atk", type: "perforante", target: "hero", weight: 2, effects: [{ do: "status", kind: "bleed", chance: 0.5, turns: 3 }] },
    ],
  },
  espectro: {
    name: "Espectro del Río", sprite: "espectro", hp: 190, atk: 20, mag: 33, def: 30, res: 10, spd: 17, eva: 10,
    weak: ["luz", "fuego"], resist: ["cortante", "perforante", "contundente"], xp: 130, gold: 50,
    skills: [
      { name: "Toque Helado", power: 1.0, stat: "mag", type: "sombra", target: "hero", weight: 3, effects: [{ do: "slow", turns: 2 }] },
      { name: "Lamento", power: 0.6, stat: "mag", type: "sombra", target: "allHeroes", weight: 1, effects: [{ do: "status", kind: "fear", chance: 0.4, turns: 2 }] },
    ],
  },
  "arquero-oscuro": {
    name: "Tirador Corsario", sprite: "arquero-oscuro", hp: 180, atk: 38, mag: 8, def: 12, res: 10, spd: 19, eva: 10,
    weak: ["cortante", "luz"], resist: ["perforante"], xp: 115, gold: 56,
    skills: [
      { name: "Flecha Envenenada", power: 1.05, stat: "atk", type: "perforante", target: "hero", weight: 3, effects: [{ do: "status", kind: "poison", chance: 0.5, turns: 3 }] },
      { name: "Lluvia de Flechas", power: 0.6, stat: "atk", type: "perforante", target: "allHeroes", weight: 1 },
    ],
  },
  "bestia-alada": {
    name: "Bestia Alada", sprite: "bestia-alada", hp: 420, atk: 42, mag: 10, def: 18, res: 12, spd: 19, eva: 12,
    weak: ["perforante", "luz"], resist: ["contundente"], xp: 200, gold: 80,
    skills: [
      { name: "Garras", power: 1.1, stat: "atk", type: "cortante", target: "hero", weight: 3 },
      { name: "Chillido", power: 0, target: "allHeroes", weight: 1, effects: [{ do: "slow", turns: 2 }, { do: "status", kind: "confuse", chance: 0.3, turns: 2 }] },
      { name: "Picado", power: 2.0, stat: "atk", type: "perforante", target: "hero", weight: 2, charge: true },
    ],
  },
  morvath: {
    name: "Morvath, el Espectro Alado", sprite: "morvath", hp: 1450, atk: 44, mag: 46, def: 22, res: 22, spd: 16, eva: 4, boss: true,
    weak: ["luz", "fuego"], resist: ["cortante", "sombra"], xp: 1500, gold: 700,
    skills: [
      { name: "Hoja Espectral", power: 1.15, stat: "atk", type: "sombra", target: "hero", weight: 3 },
      { name: "Aliento Helado", power: 0.8, stat: "mag", type: "sombra", target: "allHeroes", weight: 2, effects: [{ do: "slow", turns: 2 }] },
    ],
    phases: [
      {
        at: 0.5, text: "Morvath alza su hoja y lanza un grito que hiela la sangre. Las aguas del río se oscurecen.",
        summon: ["espectro"],
        skills: [
          { name: "Hoja Espectral", power: 1.2, stat: "atk", type: "sombra", target: "hero", weight: 3 },
          { name: "Grito de Pavor", power: 0, target: "allHeroes", weight: 1, effects: [{ do: "status", kind: "fear", chance: 0.7, turns: 3 }, { do: "slow", turns: 2 }] },
          { name: "Picado Mortal", power: 2.4, stat: "atk", type: "sombra", target: "hero", weight: 2, charge: true },
        ],
      },
    ],
  },

  // MARK: Chapter V · El Asedio de la Ciudadela Blanca
  "troll-asedio": {
    name: "Troll de Asedio", sprite: "troll-asedio", hp: 600, atk: 50, mag: 8, def: 26, res: 10, spd: 12, eva: 0,
    weak: ["perforante", "fuego"], resist: ["contundente"], xp: 320, gold: 120,
    skills: [
      { name: "Mazazo", power: 1.0, stat: "atk", type: "contundente", target: "hero", weight: 3 },
      { name: "Golpe de Asedio", power: 2.3, stat: "atk", type: "contundente", target: "hero", weight: 2, charge: true },
    ],
  },
  "hierro-elite": {
    name: "Élite de Hierro Negro", sprite: "hierro-elite", hp: 300, atk: 46, mag: 10, def: 26, res: 14, spd: 17, eva: 4,
    weak: ["luz", "fuego"], resist: ["cortante"], xp: 240, gold: 100,
    skills: [
      { name: "Doble Tajo", power: 0.75, stat: "atk", type: "cortante", target: "hero", weight: 3 },
      { name: "Grito Negro", power: 0, target: "self", weight: 1, effects: [{ do: "buff", stat: "atk", mult: 1.25, turns: 3 }] },
      { name: "Mirada de Hierro", power: 0, target: "hero", weight: 1, effects: [{ do: "status", kind: "fear", chance: 0.6, turns: 2 }] },
      { name: "Ejecución", power: 2.0, stat: "atk", type: "cortante", target: "hero", weight: 1, charge: true },
    ],
  },
  "rey-sombrio": {
    name: "El Rey Sombrío", sprite: "rey-sombrio", hp: 2050, atk: 46, mag: 46, def: 26, res: 26, spd: 17, eva: 0, boss: true,
    weak: ["luz"], resist: ["sombra", "cortante"], xp: 3000, gold: 1500,
    skills: [
      { name: "Maza del Rey", power: 1.2, stat: "atk", type: "contundente", target: "hero", weight: 3 },
      { name: "Llama Negra", power: 0.9, stat: "mag", type: "sombra", target: "allHeroes", weight: 2, effects: [{ do: "status", kind: "burn", chance: 0.4, turns: 2 }] },
    ],
    phases: [
      {
        at: 0.65, text: "«¿Creéis que la luz dura para siempre?» El Rey Sombrío alza su corona y un espectro brota de su capa.",
        summon: ["espectro"],
        skills: [
          { name: "Maza del Rey", power: 1.2, stat: "atk", type: "contundente", target: "hero", weight: 2 },
          { name: "Corona de Sombras", power: 1.0, stat: "mag", type: "sombra", target: "allHeroes", weight: 2, effects: [{ do: "debuff", stat: "def", mult: 0.75, turns: 3 }] },
          { name: "Palabra de Silencio", power: 0.5, stat: "mag", type: "sombra", target: "allHeroes", weight: 1, effects: [{ do: "status", kind: "silence", chance: 0.35, turns: 2 }] },
          { name: "Juicio Sombrío", power: 2.2, stat: "mag", type: "sombra", target: "hero", weight: 2, charge: true },
        ],
      },
      {
        at: 0.3, text: "El cielo se oscurece por completo. El Rey Sombrío ya no finge ser un hombre: es la noche misma.",
        buff: { stat: "atk", mult: 1.3 },
        skills: [
          { name: "Maza del Rey", power: 1.3, stat: "atk", type: "contundente", target: "hero", weight: 2 },
          { name: "Eclipse", power: 1.6, stat: "mag", type: "sombra", target: "allHeroes", weight: 2, charge: true },
          { name: "Devorar Almas", power: 0, target: "self", weight: 1, effects: [{ do: "healSelf", pct: 0.06 }] },
        ],
      },
    ],
  },
};
