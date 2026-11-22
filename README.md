# Ecos del Ocaso

Un RPG táctico por turnos en pixel art, pensado para el móvil (PWA, funciona sin conexión). Inspirado
en el combate y la progresión de los RPG clásicos de fantasía épica por turnos, con un universo,
personajes, nombres y arte propios. Sin dependencias ni compilación: HTML, CSS y módulos de JavaScript.

## Jugar

En la web: **https://gainzaviana.github.io/ecosDelOcaso/** (se publica sola con cada `git push` a `main`).
Ábrela en el móvil y usa «Añadir a pantalla de inicio» para instalarla como app.

En local:

```sh
cd EcosDelOcaso
python3 -m http.server 8080      # o: npm start
```

Abre `http://<IP-de-tu-ordenador>:8080` en el móvil (misma wifi) y usa «Añadir a pantalla de inicio»
para instalarlo como app.

**Guardado automático**: la partida se guarda sola después de cada acción de combate, cada línea de
diálogo y cada viaje, cada 20 segundos, y al cerrar o minimizar la app (un 💾 parpadea al guardar).
Si cierras en mitad de un combate o de una escena, «Continuar» te devuelve exactamente a ese punto.
En las hogueras hay además tres ranuras de guardado manual.

## Qué hay

- **Combate CTB**: una línea de turnos muestra quién actúa y en qué orden. Prisa, Lentitud,
  aturdimientos y retrasos mueven a los combatientes por la línea en tiempo real. Los enemigos
  telegrafían sus ataques cargados (⚠) y un golpe contundente o un aturdimiento los interrumpe.
- **Debilidades**: Cortante, Perforante, Contundente, Fuego, Luz y Sombra. Golpear una debilidad
  hace más daño y llena antes la barra de la **Comunidad**. Bajo la vida de cada enemigo se ven los
  iconos de sus debilidades. Si el ataque o la habilidad que vas a usar es eficaz, el enemigo brilla
  con el color del elemento y el botón muestra «¡Eficaz!»; si lo resiste, aparece tachado.
- **Estados alterados**: Veneno, Quemadura y Sangrado (dañan cada turno), Ceguera (falla ataques
  físicos), Confusión (la mitad de las veces ataca a cualquiera, aliado o enemigo), Sueño (pierde
  turnos hasta recibir un golpe), Silencio (no puede usar habilidades) y Miedo (−30 % de daño). Los
  jefes son inmunes al Sueño y a la Confusión. Héroes y enemigos tienen ataques que los provocan; el
  Musgo Limpio y Purificar los curan.
- **Ataque de la Comunidad**: con la barra llena, todo el grupo ataca a la vez.
- **Grupo de 3 + reserva**: con «Cambiar» entra un héroe de reserva en mitad del combate.
- **Maestría por uso**: cada héroe tiene dos categorías de habilidades (5 niveles cada una) que se
  desbloquean usándolas en combate, y una de **Rasgos** que crece con la maestría total: tres pasivas y
  la habilidad **Definitiva**.
- **Atributos**: al subir de nivel repartes 3 puntos entre Fuerza, Espíritu, Constitución, Destreza
  y Velocidad.
- **Equipo y runas**: arma, armadura y capa; las armas y armaduras tienen engarces para runas
  (crítico, AP por turno, resistencia a la Sombra, revivir una vez…).
- **Iluminación dinámica**: los escenarios se pintan en tres capas con paralaje y se iluminan en
  tiempo real. Antorchas, hogueras, lava, cristales y hechizos abren luz en la oscuridad; los
  personajes proyectan sombras largas y tienen un borde de luz del lado de la fuente. Hay lluvia,
  nieve, brasas, ceniza, niebla, relámpagos, reflejos en el agua y una cámara que se acerca a la acción.
- **Efectos de combate**: cada tipo de daño tiene su efecto (tajos, estocadas, ondas de choque con
  escombros, bolas de fuego con explosión, rayos de luz, orbes de sombra), además de círculos
  mágicos, curaciones, mejoras, venenos, cargas, interrupciones, el Ataque de la Comunidad y los
  cambios de fase de los jefes.

## Capítulos

| Capítulo | Jefe | Se une |
|---|---|---|
| **I · Sombras en el Bosque Susurrante** | El Guardián Marchito | Theron (Orven como invitado) |
| **II · Las Minas de Hondaforja** | El Coloso de Brasa | Bram |
| **III · Las Llanuras Doradas** | Draugmar, Capitán de Hierro Negro | Freya y Kaelen (Kaelor como invitado) |
| **IV · La Ciudad Ribereña en Ruinas** | Morvath, el Espectro Alado | — |
| **V · El Asedio de la Ciudadela Blanca** | El Rey Sombrío | Final de la historia |

Cada capítulo tiene su mapa, una hoguera con tienda, una misión secundaria con recompensa
(Lágrima Estelar, armas del Último Ocaso…) y enemigos propios con sus debilidades.

## Héroes

| Héroe | Rol | Categorías |
|---|---|---|
| **Valen**, Capitán de la Ciudadela | Espada y mando | Artes de Espada · Liderazgo |
| **Elowen**, Doncella de la Luz Estelar | Magia de luz y apoyo | Luz Espiritual · Canto Élfico |
| **Theron**, Montaraz del Norte | Arco y artes del bosque | Arquería · Artes del Montaraz |
| **Bram**, Herrero de Hondaforja | Hacha y runas de fuego | Hacha · Forja Rúnica |
| **Freya**, Doncella Escudera | Escudo y lanza | Escudo · Lanza |
| **Kaelen**, Jinete de las Llanuras | Sable veloz | Jinete · Llanuras |
| **Maestro Orven**, el Mago Gris | Invitado | Saber Antiguo |
| **Kaelor**, el Rey Errante | Invitado | Hoja del Rey |

## Código

| Archivo | Qué hace |
|---|---|
| `js/combat.js` | Motor de combate (lógica pura): línea de turnos, daño, estados, cargas, Comunidad. |
| `js/engine.js` | Estado de la partida, estadísticas, niveles, equipo, guardado. |
| `js/characters.js` | Héroes, habilidades, árboles de maestría, equipo, runas y objetos. |
| `js/enemies.js` | Enemigos de los cinco capítulos (debilidades, cargas, fases de los jefes). |
| `js/story.js` | Personajes que hablan y la lista de capítulos. |
| `js/chapters/ch1–ch5.js` | Cada capítulo: mapa, escenas, combates, misión secundaria y tienda. |
| `js/sprites.js` | Sprites de héroes y enemigos generados por código (pixel art). |
| `js/vfx.js` | Partículas y luces de los efectos de combate. |
| `js/pixelRenderer.js` | Escenarios con capas, iluminación, clima, cámara y las vistas de combate, escena y mapa. |
| `js/ui.js` | Pantallas y menús (combate, grupo, tienda, guardado). |
| `js/main.js` | Arranque, título, mapa y el director de la historia. |

`TUNING` en `js/combat.js` ajusta la dureza de los enemigos.

```sh
npm test    # node --test: motor de combate, combates ganables y coherencia de los cinco capítulos
```
