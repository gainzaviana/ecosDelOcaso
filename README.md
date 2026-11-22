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
para instalarlo como app. La partida se guarda sola tras cada combate, escena y viaje; en las hogueras
hay tres ranuras de guardado manual.

## Qué hay

- **Combate CTB**: una línea de turnos muestra quién actúa y en qué orden. Prisa, Lentitud,
  aturdimientos y retrasos mueven a los combatientes por la línea en tiempo real. Los enemigos
  telegrafían sus ataques cargados (⚠) y un golpe contundente o un aturdimiento los interrumpe.
- **Debilidades**: Cortante, Perforante, Contundente, Fuego, Luz y Sombra. Golpear una debilidad
  hace más daño, llena antes la barra de la **Comunidad** y se recuerda para siguientes combates.
- **Ataque de la Comunidad**: con la barra llena, todo el grupo ataca a la vez.
- **Grupo de 3 + reserva**: con «Cambiar» entra un héroe de reserva en mitad del combate.
- **Maestría por uso**: cada héroe tiene dos categorías de habilidades (5 niveles cada una) que se
  desbloquean usándolas en combate, y una de **Rasgos** que crece con la maestría total: tres pasivas y
  la habilidad **Definitiva**.
- **Atributos**: al subir de nivel repartes 3 puntos entre Fuerza, Espíritu, Constitución, Destreza
  y Velocidad.
- **Equipo y runas**: arma, armadura y capa; las armas y armaduras tienen engarces para runas
  (crítico, AP por turno, resistencia a la Sombra, revivir una vez…).
- **Capítulo I · Sombras en el Bosque Susurrante**: emboscada inicial con el Mago Gris, mapa con
  cinco lugares, hoguera con tienda, la misión secundaria de Mirla (recompensa: Lágrima Estelar) y el
  jefe en dos fases, el Guardián Marchito, con Maestro Orven como invitado.

## Héroes

| Héroe | Rol | Categorías |
|---|---|---|
| **Valen**, Capitán de la Ciudadela | Espada y mando | Artes de Espada · Liderazgo |
| **Elowen**, Doncella de la Luz Estelar | Magia de luz y apoyo | Luz Espiritual · Canto Élfico |
| **Theron**, Montaraz del Norte | Arco y artes del bosque | Arquería · Artes del Montaraz |
| **Maestro Orven**, el Mago Gris | Invitado | Saber Antiguo |

Próximos capítulos: Bram (Herrero de Hondaforja), Freya (Doncella Escudera), Kaelen (Jinete de las
Llanuras) y Kaelor, el Rey Errante, como invitado.

## Código

| Archivo | Qué hace |
|---|---|
| `js/combat.js` | Motor de combate (lógica pura): línea de turnos, daño, estados, cargas, Comunidad. |
| `js/engine.js` | Estado de la partida, estadísticas, niveles, equipo, guardado. |
| `js/characters.js` | Héroes, habilidades, árboles de maestría, equipo, runas y objetos. |
| `js/enemies.js` | Enemigos del capítulo I (debilidades, cargas, fases del jefe). |
| `js/story.js` | Capítulo I: escenas, mapa, combates y misión secundaria. |
| `js/pixelRenderer.js` | Sprites, fondos, partículas y efectos dibujados en canvas. |
| `js/ui.js` | Pantallas y menús (combate, grupo, tienda, guardado). |
| `js/main.js` | Arranque, título, mapa y el director de la historia. |

`TUNING` en `js/combat.js` ajusta la dureza de los enemigos.

```sh
npm test    # node --test: el motor de combate y que cada combate del capítulo se puede ganar
```
