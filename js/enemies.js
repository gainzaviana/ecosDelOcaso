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
      { name: "Nube de Esporas", power: 0.7, stat: "mag", type: "sombra", target: "allHeroes", weight: 2, charge: true, effects: [{ do: "status", kind: "poison", chance: 0.8, turns: 3 }] },
    ],
  },
  // Chapter 1 boss: two phases. At half health it roots itself and starts charging its big attack.
  guardian: {
    name: "El Guardián Marchito", sprite: "guardian", hp: 420, atk: 21, mag: 19, def: 9, res: 7, spd: 12, eva: 0, boss: true,
    weak: ["fuego", "cortante"], resist: ["perforante", "sombra"], xp: 220, gold: 120,
    skills: [
      { name: "Azote de Ramas", power: 1.1, stat: "atk", type: "contundente", target: "hero", weight: 3 },
      { name: "Esporas Marchitas", power: 0.6, stat: "mag", type: "sombra", target: "allHeroes", weight: 1, effects: [{ do: "status", kind: "poison", chance: 0.5, turns: 3 }] },
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
};
