// The story: speakers and the five chapters (one file each in js/chapters/). Scenes are lists of steps the director in main.js
// plays in order:
//   { say: [who, text] } · { battle: id } · { join: heroId } · { flag: name } · { quest: [id, state] }
//   { give: [kind, id, n] } · { unlock: nodeId } · { tip: text } · { heal: true } · { chapterEnd: true }
// Map nodes link to each other; arriving at a node plays its scene once, then offers its actions.

export const SPEAKERS = {
  valen: { name: "Valen", color: "#c9a14a" },
  elowen: { name: "Elowen", color: "#8fd0ff" },
  theron: { name: "Theron", color: "#6fae5a" },
  orven: { name: "Maestro Orven", color: "#d8d8e0" },
  mirla: { name: "Mirla, la herbolaria", color: "#d9a0c8" },
  hilda: { name: "Hilda, la buhonera", color: "#e0b070" },
  narrador: { name: "", color: "#cfc6b0" },
  merodeador: { name: "Merodeador", color: "#a0a890" },
  guardian: { name: "El Guardián Marchito", color: "#b070d0" },
  consejo: { name: "Consejo", color: "#ffd66b" },
  bram: { name: "Bram", color: "#d0884a" },
  freya: { name: "Freya", color: "#e0c070" },
  kaelen: { name: "Kaelen", color: "#7aa0d8" },
  kaelor: { name: "Kaelor, el Rey Errante", color: "#d8d0ff" },
  durga: { name: "Durga, la mercadera", color: "#c0a070" },
  ysolde: { name: "Ysolde, la molinera", color: "#e8c890" },
  corwen: { name: "Corwen, el erudito", color: "#a0c0e0" },
  senescal: { name: "El Senescal Aldric", color: "#e8e8f0" },
  trasgo: { name: "Trasgo", color: "#a0a080" },
  coloso: { name: "El Coloso de Brasa", color: "#ff8040" },
  draugmar: { name: "Draugmar", color: "#9090a0" },
  morvath: { name: "Morvath", color: "#a0b0d0" },
  rey: { name: "El Rey Sombrío", color: "#c060ff" },
};

import { CHAPTER1 } from "./chapters/ch1.js";
import { CHAPTER2 } from "./chapters/ch2.js";
import { CHAPTER3 } from "./chapters/ch3.js";
import { CHAPTER4 } from "./chapters/ch4.js";
import { CHAPTER5 } from "./chapters/ch5.js";

export { CHAPTER1, CHAPTER2, CHAPTER3, CHAPTER4, CHAPTER5 };
/** All chapters in order (g.chapter is 1-based). */
export const CHAPTERS = [CHAPTER1, CHAPTER2, CHAPTER3, CHAPTER4, CHAPTER5];
export const chapterOf = (g) => CHAPTERS[(g.chapter ?? 1) - 1];
