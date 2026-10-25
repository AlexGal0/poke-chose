# Investigación: porcentaje de aparición por género

25 de octubre de 2026. Registro de investigación seguido de la implementación. El estado actual muestra una barra bicolor con cálculos propios de Black y X mediante un contrato compartido; véase [Implementación de proporciones base](#implementación-de-proporciones-base) y el [resumen consolidado](changes-2026-10-25.md). Las primeras secciones conservan la investigación previa al cambio de interfaz.

## Datos disponibles

Las 354 especies del atlas local de X (`src/games/x/data/encounters.json`) incluyen `genderRate`; no hace falta leer el save ni RAM para obtener la proporción base. `scripts/update-x-encounters.mjs` ya copia `gender_rate` de PokéAPI. Se observaron los valores -1, 0, 1, 2, 4, 6, 7 y 8. El contrato compartido EncounterAtlasData incluye ese campo. El indicador actual solo presenta macho/hembra/ambos/sin género; no muestra porcentajes.

PokéAPI define el campo como probabilidad nominal de hembra en octavos, y -1 como especie sin género: [documentación de PokemonSpecies](https://pokeapi.co/docs/v2#pokemon-species). Esto permite expresar una proporción nominal directamente: hembra = rate / 8; macho = 1 - rate / 8. No equivale automáticamente a una probabilidad efectiva histórica por juego.

## Diferencia de X/Y

La generación VI compara un valor aleatorio entre 1 y 252 con el umbral de género. Para umbrales no especiales, la probabilidad de hembra es (umbral - 1) / 252. Los valores especiales distinguen solo macho, solo hembra y sin género.

| Nominal macho / hembra | Efectiva normal en X/Y, macho / hembra |
| --- | --- |
| 87,5 / 12,5 % | 88,10 / 11,90 % |
| 75 / 25 % | 75,40 / 24,60 % |
| 50 / 50 % | 50 / 50 % |
| 25 / 75 % | 24,60 / 75,40 % |
| 12,5 / 87,5 % | 11,11 / 88,89 % |

La explicación y la tabla histórica están en [Gender, generaciones VI–VII](https://bulbapedia.bulbagarden.net/wiki/Gender#Generations_VI_to_VII). PKHeX también distingue expresamente las reglas por PID de generaciones III–V: [EntityGender](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/Util/EntityGender.cs). No se debe reutilizar el cálculo de Black para X ni presentar rate/8 como exactitud del RNG de todos los juegos.

## Dos porcentajes diferentes

1. Dentro de la especie: probabilidad de hembra/macho una vez que aparece esa especie.
2. Dentro del método y condiciones seleccionados: probabilidad de que un encuentro sea esa especie y tenga ese género. Para encuentros individuales normales, se obtiene multiplicando la aparición de especie por la proporción efectiva.

Ejemplo matemático hipotético, sin una zona real atribuida: especie con 20 % de aparición y proporción de Eevee en X → hembra aproximadamente 2,38 % por encuentro; macho aproximadamente 17,62 %. No representa probabilidad de captura con una Poké Ball ni garantiza un resultado tras un número de intentos.

`encounterChances` ya agrupa área, método y condiciones. Se deben mantener esos grupos, sin sumar pesca, hierba, horarios u otros contextos incompatibles.

## Condiciones y excepciones

- Gran Encanto puede forzar el género opuesto al del primer integrante del equipo; la rama forzada y la rama normal se combinan. No corresponde sustituir el resultado total por un 66,7 % fijo. Referencia: [Cute Charm](https://bulbapedia.bulbagarden.net/wiki/Cute_Charm_(Ability)). Su compatibilidad debe establecerse por método/juego antes de aplicarlo automáticamente.
- Una horda es un encuentro de grupo: la probabilidad por individuo no es la probabilidad de que la horda contenga al menos una hembra. No usar directamente la multiplicación anterior para todo el grupo.
- Encuentros fijos, regalos e intercambios pueden imponer un género. El contrato de encuentros actual no expresa esa restricción. Una variedad terminada en male/female no prueba por sí sola que la tabla fuerce el género; puede ser la variedad de presentación predeterminada.
- Las especies sin género deben mostrar «sin género», no 0 % de ambos con una probabilidad perdida.

## Propuesta inicial (registro histórico)

Primera entrega: porcentajes base de X/Y en el indicador de género del atlas, con etiquetas que los distingan de la aparición de especie. Conservar los valores nominales para explicar su procedencia si se muestran. El cálculo histórico pertenecería al adaptador/reglas de X; el componente compartido solo recibiría probabilidades normalizadas.

Segunda entrega: probabilidades conjuntas para encuentros individuales con área/método/condiciones confirmados. Presentar explícitamente el supuesto de encuentro normal; no aplicar a regalos, intercambios, grupos o restricciones desconocidas.

La adaptación por Gran Encanto y los casos forzados requieren una ampliación concreta del contrato y pruebas de sus diferencias; no son condición para mostrar una proporción base bien etiquetada. No se realizaron pruebas de frecuencia empírica ni una validación nueva del RNG de la ROM local en esta investigación.

## Implementación de proporciones base

Se implementó la presentación en Capturas de Black y X. El contrato compartido GenderDistribution (src/models/gender-distribution.ts) contiene porcentajes male/female ya calculados; no conoce juego, generación ni umbrales. Ausencia/null significa que no hay distribución disponible/aplicable, sin un fallback 50/50. El indicador de especie sin género conserva su etiqueta.

Cada juego aporta un cálculo: blackGenderDistribution usa umbral/256 para hembra; xGenderDistribution usa (umbral-1)/252. Los casos de un solo género se resuelven explícitamente. No se codifican estas reglas en el renderer ni en los helpers de traducción. X normaliza genderDistribution al componer xEncounters; Black conserva su API histórica de metadatos y allí elige su adaptador. Ese acoplamiento de la API antigua a Black es deliberado; la extracción de toda su fuente de encuentros no forma parte de este cambio.

GenderDistributionText comparte render y formato local con un decimal máximo. GenderBadge del atlas y GenderIcon del flujo histórico consumen la misma distribución normalizada. Solo los indicadores de especie de Capturas muestran porcentajes; no se confunden con el género confirmado de un ejemplar del equipo, caja o guardería. El texto accesible/tooltip explica que es una proporción base aproximada sin modificadores. No se multiplica por la aparición de la especie ni se simula Gran Encanto, hordas o géneros impuestos.

Validación: 390 pruebas, lint y build correctos. Pruebas nuevas cubren diferencias entre ambos adaptadores, sumas de porcentajes, casos de un solo género, datos desconocidos y formato ES/EN. Comparación visual de ambos adaptadores con ejemplos conocidos, idiomas ES/EN y viewport 390 px. En el atlas real de X se verificaron los indicadores de Ruta 10, incluidos Eevee (88,1/11,9 %) y Snubbull (24,6/75,4 %). No se realizaron muestreos empíricos de frecuencias. Capturas: artifacts/gender-ratio-comparison.png y artifacts/gender-ratio-x-captures.png.

Presentación posterior: barra única de 120 px con tramos azul/rosa proporcionales y etiquetas encima. Las especies de un solo género muestran un tramo completo sin 0 %; las especies sin género mantienen su símbolo. Comprobado con ambas envolturas visuales (Black y X), proporciones desiguales y 50/50, escritorio y móvil de 390 px sin desbordamiento. 390 pruebas, lint y build correctos. Captura: artifacts/gender-bar-check.png.
