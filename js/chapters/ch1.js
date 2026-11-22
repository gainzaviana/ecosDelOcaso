// Chapter I: "Sombras en el Bosque Susurrante" (forest, the Grey Wizard, the Withered Guardian).

export const CHAPTER1 = {
  id: 1,
  start: "camino",
  map: "bosque",
  title: "Capítulo I · Sombras en el Bosque Susurrante",
  next: "Capítulo II · Las Minas de Hondaforja",
  nodes: {
    camino: { name: "Camino Brumoso", x: 0.18, y: 0.78, bg: "bosque", links: ["claro"], scene: "intro", patrol: ["merodeador", "arquero"],
      desc: "El viejo camino real cruza el bosque bajo una niebla que no se levanta nunca." },
    claro: { name: "Claro del Viejo Roble", x: 0.42, y: 0.58, bg: "claro", links: ["camino", "puesto", "ruinas", "hondonada"], scene: "claro", camp: true,
      desc: "Una hoguera bajo un roble milenario. Aquí se puede descansar, comerciar y guardar la partida." },
    puesto: { name: "Puesto del Montaraz", x: 0.72, y: 0.72, bg: "bosque", links: ["claro"], scene: "puesto", patrol: ["lobo", "lobo"],
      desc: "Una cabaña de troncos en el linde norte, donde los montaraces vigilan el bosque." },
    ruinas: { name: "Ruinas de Velmor", x: 0.26, y: 0.3, bg: "ruinas", links: ["claro"], scene: "ruinas", patrol: ["arana", "merodeador"], requires: "mirla",
      desc: "Columnas caídas de un reino olvidado, cubiertas de musgo y telarañas." },
    hondonada: { name: "Hondonada Marchita", x: 0.7, y: 0.22, bg: "hondonada", links: ["claro"], scene: "jefe", requires: "theron",
      desc: "Donde los árboles se retuercen y la savia corre negra. El corazón de la sombra." },
  },
  battles: {
    emboscada: {
      enemies: ["merodeador", "merodeador"], bg: "bosque", level: 1,
      script: [
        { when: { turns: 1 }, actions: [{ say: { who: "consejo", text: "Arriba ves la línea de turnos: quién actúa y en qué orden. Los Merodeadores son débiles a la Luz: prueba los ataques de Elowen." } }] },
        { when: { defeated: 1 }, actions: [{ say: { who: "merodeador", text: "¡Traed al Bruto! ¡Aplastadlos!" } }, { spawn: ["bruto"] }, { say: { who: "consejo", text: "El Bruto de Hollín carga ataques demoledores (⚠ en la línea de turnos). Un golpe contundente, como el Golpe Rompeescudos de Valen, interrumpe la carga." } }] },
        { when: { turns: 11, hpBelow: 0.4 }, actions: [{ say: { who: "orven", text: "¡Atrás, criaturas del hollín! ¡Este camino no es vuestro!" } }, { join: "orven" }, { fellowship: 60 }, { say: { who: "consejo", text: "Cada golpe, y sobre todo cada debilidad, llena la barra de la Comunidad. Cuando esté llena, desata un Ataque de la Comunidad." } }] },
      ],
    },
    lobos: {
      enemies: ["lobo", "lobo", "lobo-alfa"], bg: "bosque", level: 2,
      script: [{ when: { turns: 1 }, actions: [{ say: { who: "theron", text: "Son rápidos: mirad la línea de turnos. El fuego los espanta." } }] }],
    },
    aranas: {
      enemies: ["arana", "arana", "reina-arana"], bg: "ruinas", level: 3,
      script: [{ when: { turns: 2 }, actions: [{ say: { who: "consejo", text: "La Madre del Musgo prepara una nube de esporas. Interrúmpela o protégete: Purificar de Elowen quita el veneno." } }] }],
    },
    guardian: {
      enemies: ["guardian"], bg: "hondonada", level: 4, guest: "orven",
      script: [
        { when: { turns: 1 }, actions: [{ say: { who: "orven", text: "Lucharé a vuestro lado. Si me necesitáis en primera línea, usad Cambiar." } }, { join: "orven" }] },
      ],
    },
    // Patrols (repeatable, from a node's "Patrullar").
  },
  /** Extra actions at this chapter's campfire (talking to people). */
  campActions: [
    { label: "Hablar con Mirla", scene: "mirla", flag: "theron", notFlag: "mirla" },
    { label: "Devolver el colgante a Mirla", scene: "entrega", flag: "colgante", quest: ["pendiente", "active"] },
  ],
  quests: {
    pendiente: { name: "El colgante de Mirla", text: "Recupera el colgante que Mirla perdió en las Ruinas de Velmor.", reward: "Lágrima Estelar, Runa de Ascua y 60 de oro" },
  },
  shop: {
    items: ["raiz-alba", "hidromiel", "hoja-vela", "antidoto"],
    gear: ["espada-alba", "baculo-estrella", "arco-tejo", "malla-roble", "capa-susurro"],
  },
  scenes: {
    intro: [
      { say: ["narrador", "El Bosque Susurrante, al caer la tarde. La niebla se arrastra entre los troncos como un animal cansado."] },
      { say: ["valen", "Mantente cerca, Elowen. Desde que salimos de la Ciudadela, algo nos sigue."] },
      { say: ["elowen", "Los árboles callan, capitán. Eso nunca es buena señal."] },
      { say: ["merodeador", "¡Ahí están! ¡El capitán y la doncella de luz! ¡A por ellos!"] },
      { battle: "emboscada" },
      { say: ["orven", "Un mal encuentro en mal camino. Me llamo Orven; algunos me llaman el Mago Gris."] },
      { say: ["valen", "Valen, capitán de la Guardia de la Ciudadela. Te debemos la vida, maestro."] },
      { say: ["orven", "Me la deberéis cuando acabe lo que ha empezado. Algo despierta en la Hondonada Marchita: un antiguo guardián del bosque, enfermo de sombra."] },
      { say: ["orven", "Id al Claro del Viejo Roble y descansad. Buscad al montaraz Theron en su puesto del norte: conoce estos senderos mejor que nadie. Os esperaré donde los árboles sangran."] },
      { say: ["elowen", "Ha desaparecido entre la niebla… como si nunca hubiera estado."] },
      { unlock: "claro" },
      { tip: "Pulsa en el Claro del Viejo Roble en el mapa para viajar allí." },
    ],
    claro: [
      { say: ["narrador", "Bajo el roble milenario arde una hoguera tranquila. Una buhonera ha montado su puesto junto al fuego."] },
      { say: ["hilda", "¡Viajeros! Raíces del Alba, hidromiel, buen acero… Si tenéis oro, tengo lo que necesitáis."] },
      { tip: "En las hogueras puedes Descansar (recupera vida y AP), comprar en la Tienda y Guardar. Cuando un héroe sube de nivel, reparte sus puntos de atributo en Grupo." },
      { unlock: "puesto" },
      { flag: "claro" },
    ],
    puesto: [
      { say: ["narrador", "Aullidos. Junto a la cabaña del montaraz, una manada de lobos sombríos rodea a un hombre encapuchado."] },
      { say: ["theron", "¡Llegáis a tiempo, forasteros! ¡Coged un flanco!"] },
      { join: "theron" },
      { battle: "lobos" },
      { say: ["theron", "Theron, montaraz del Norte. Orven me habló de vosotros. Si vais a la Hondonada, iré con vosotros: allí empezó la podredumbre."] },
      { say: ["theron", "Pero antes, la vieja Mirla, la herbolaria del Claro, anda buscando ayuda. Una buena causa… y suele pagar bien."] },
      { flag: "theron" },
      { unlock: "hondonada" },
      { tip: "Theron se une al grupo. La Hondonada Marchita ya está abierta… pero quizá quieras prepararte antes." },
    ],
    mirla: [
      { say: ["mirla", "¿Vais hacia las Ruinas de Velmor? Ay, mi colgante… era de mi madre. Lo perdí huyendo de las arañas del musgo."] },
      { say: ["elowen", "Lo traeremos de vuelta, Mirla."] },
      { quest: ["pendiente", "active"] },
      { flag: "mirla" },
      { unlock: "ruinas" },
    ],
    ruinas: [
      { say: ["narrador", "Entre las columnas caídas, las telarañas brillan como plata húmeda. Algo enorme se mueve en la oscuridad."] },
      { say: ["theron", "La Madre del Musgo. Cuidado con sus esporas."] },
      { battle: "aranas" },
      { say: ["elowen", "¡Aquí está! Un colgante con una piedra que brilla como una estrella."] },
      { say: ["valen", "Y un viejo cofre bajo las raíces. Que la herbolaria no diga que no fuimos generosos con nosotros mismos."] },
      { give: ["rune", "runa-ascua", 1] },
      { flag: "colgante" },
    ],
    entrega: [
      { say: ["mirla", "¡Mi colgante! Gracias, gracias… Tomad esto: una Lágrima Estelar. Dicen que devuelve la vida a quien la lleva, una vez."] },
      { give: ["rune", "lagrima-estelar", 1] },
      { give: ["gold", "", 60] },
      { quest: ["pendiente", "done"] },
      { tip: "Las runas se engarzan en armas y armaduras desde Grupo → Equipo." },
    ],
    jefe: [
      { say: ["narrador", "La Hondonada Marchita. Los árboles se retuercen como manos, y en el centro, un gigante de corteza y raíces abre unos ojos de luz enferma."] },
      { say: ["orven", "Ahí está: el Guardián. Durante mil años protegió este bosque. Ahora la sombra lo devora desde dentro."] },
      { say: ["guardian", "…intrusos… la sombra… es… eterna…"] },
      { say: ["valen", "Entonces le pondremos fin. ¡Por la Ciudadela!"] },
      { battle: "guardian" },
      { say: ["narrador", "El Guardián cae de rodillas. La savia negra se aclara, y por un instante, el bosque entero suspira."] },
      { say: ["orven", "Lo habéis liberado. Pero esta sombra no nació aquí: viene del este, de las minas de Hondaforja, bajo las montañas."] },
      { say: ["theron", "Entonces allí iremos."] },
      { chapterEnd: true },
    ],
  },
};
