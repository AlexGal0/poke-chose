# Investigación de dobles y hordas en X

Sesión del 27 de octubre de 2026. Paso 4 del plan de combate. Diagnósticos
locales de solo lectura por RPC UDP, con la huella del ejecutable X comprobada
antes y después. No se ejecutaron plugins, no se escribieron saves ni memoria,
no se pausó el juego y no se guardaron dumps. Los cambios de combate los realizó
el usuario. Durante esta investigación la producción anunciaba solo sencillo. La integración
posterior ya habilita los tres formatos generales; véase la [guía vigente](multi-battle.md).

Estado consolidado tras la continuación de la investigación: se identifican los
tres formatos generales y sus capacidades de puestos mediante las rutinas de
configuración del perfil local. Véase «Identificación cerrada» al final. Las
secciones intermedias conservan los hallazgos y límites de la primera parte.

## Referencias contrastadas

- [PokemonCheatPlugin, statsModifier.c](https://github.com/Hartie95/PokemonCheatPlugin/blob/master/source/battle/statsModifier.c):
  las cuatro direcciones ya utilizadas corresponden a dos copias de estadísticas
  propias y dos rivales; no son cuatro puestos de campo independientes.
- [Gen6CTRPFrameworkOverhauled, Helpers.cpp](https://github.com/samaBR85/Gen6CTRPFrameworkOverhauled/blob/main/Sources/Helpers.cpp):
  `SetBattleOffset` fija las bases propias y `IfInBattle` consulta `0x081FB170`.
  Su revisión de juego soportada no demuestra que coincida con la instalación
  local; por eso se mantiene la comprobación de huella de PokéChose.
- [Codes.cpp](https://github.com/samaBR85/Gen6CTRPFrameworkOverhauled/blob/main/Sources/Codes.cpp):
  `GetBattleParty` recorre seis punteros consecutivos; `PartyPosition` selecciona
  esas entradas. Fue una pista sobre la tabla completa, no una prueba de que
  todas las entradas sean participantes activos.

Se consultó el código como referencia documental, sin ejecutar sus escrituras.

## Tablas observadas

| Tabla | Copia A | Copia B | Observación |
| --- | --- | --- | --- |
| Estadísticas propias, orden de combate | `0x081FB284` | `0x081FB624` | Seis punteros y palabra siguiente con total propio |
| Estadísticas rivales, orden de combate | `0x081FB2A0` | `0x081FB640` | Hasta seis punteros y palabra siguiente con total rival |
| Referencias propias, orden original | `0x081FB304` | `0x081FB6A4` | Conservó orden del equipo durante ambos cambios |
| Referencias rivales adicionales | `0x081FB334` | `0x081FB6D4` | Referencias a los mismos registros rivales |

La separación de las copias es `0x3A0`. La palabra posterior a las seis entradas
coincidió con 6 propios y 2 rivales en el doble; con 6 y 5 en la horda. Es un
total de equipo, no el número de activos. Un puntero cero tampoco se transforma
automáticamente en un puesto de campo vacío confirmado.

Los registros consecutivos observados tienen separación `0x244`. Especie en
`+0x0C`, PS máximos en `+0x0E`, actuales en `+0x10` y siete etapas en `+0x104`.
Los cuatro primeros campos ya pertenecían al lector individual; la observación
amplía el conjunto de registros a reservas y varios rivales.

## Identidad sin depender de especie y PS

La palabra `+0x00` del registro de estadísticas enlazó al objeto PK6. Se comprobaron
sus punteros internos: núcleo en objeto `+64`, dirección del núcleo en `+4` y
estadísticas de equipo en núcleo `+344`, apuntadas por objeto `+8`. Se reutiliza
el decodificador PK6 con checksum y doble lectura. `+0x08` del registro de combate
se conserva como candidato no interpretado: no es un identificador demostrado.

La identidad de especie/PID/entrenador coincidió entre ambas copias y permitió
localizar los espacios originales de los miembros propios. El diagnóstico publica
solo resultados de coincidencia y cantidades de identidades distintas; no publica
PID ni identificadores de entrenador.

## Doble real

El usuario confirmó Shelgon nivel 40 y Mienfoo nivel 40 como activos. Las dos
copias devolvieron 109/109 y 99/99 PS, respectivamente. También aparecían las
cuatro reservas, por lo que no se puede usar el número de registros válidos como
número de activos.

Tras cambiar ambos por Binacle y Krokorok, las tablas principales devolvieron:

| Entrada de combate | Especie | Nivel PK6 | PS del campo | Espacio original por identidad |
| --- | --- | --- | --- | --- |
| 0 | Binacle | 38 | 90/91 | 2 |
| 1 | Krokorok | 37 | 93/102 | 3 |
| 2 | Shelgon | 40 | 109/109 | 0 |
| 3 | Mienfoo | 40 | 99/99 | 1 |

Índices desde cero. Las referencias de `0x081FB304`/`0x081FB6A4` conservaron
el orden original y apuntaron a las entradas 2, 3, 0, 1, 4 y 5 de la nueva tabla
de combate. Esto demuestra reordenación; identificar las primeras dos entradas
como activos todavía exige confirmar el formato y las transiciones de KO.

Rivales: Pansage y Pansear, ambos nivel 10 y 30/30 PS en las dos copias.
Las dos tablas PK6 rivales confirmaron un total de dos.

## Horda real

El usuario confirmó la entrada en una horda. Se observaron cinco Gulpin, nivel 5,
con PS máximos 23, 22, 22, 23 y 22 en orden de tabla; todos a PS completos en
la primera lectura. Ambas copias y los contadores PK6 coincidieron.

El criterio especie/PS máximos produjo grupos ambiguos de dos o tres candidatos.
El enlace PK6 produjo cinco identidades distintas por copia y coincidencias de
identidad entre copias. Esto confirma que el lector individual no puede ampliarse
repitiendo su heurística actual de especie y PS.

El usuario numeró la disposición visual como `1 2 3` arriba y `4 5` abajo,
con un hueco central en la fila inferior. Al derrotar solamente el 1 (superior
izquierdo), la entrada 3 de ambas tablas pasó a 0/23 PS. Los otros registros
conservaron sus PS, las cinco identidades siguieron presentes y el total siguió
siendo cinco. Por tanto, no se deben compactar las entradas tras un KO ni
equiparar su índice directamente con el orden de lectura de pantalla.

Los KO sucesivos de las posiciones 2, 3 y 4 afectaron a las entradas 2, 1 y 4,
respectivamente, en ambas copias. Quedó viva solamente la entrada 0, que por
exclusión corresponde a la posición 5. La disposición completa observada fue:

| Posición indicada por el usuario | Índice en tabla | Validación |
| --- | --- | --- |
| 1: arriba izquierda | 3 | KO individual, 0/23 PS |
| 2: arriba centro | 2 | KO individual, 0/22 PS |
| 3: arriba derecha | 1 | KO individual, 0/22 PS |
| 4: abajo izquierda | 4 | KO individual, 0/22 PS |
| 5: abajo derecha | 0 | Único superviviente, 23/23 PS |

Tras cuatro KO las dos tablas conservaron cinco identidades distintas y un total
de cinco. No se validó esta geometría en otra horda o con otra disposición de
cámara; el adaptador deberá conservar el orden del motor y aplicar un mapeo
visual explícito al presentar este perfil.

## Formato: resultado de la primera parte

`0x081FB170` devolvió `0x40001` tanto en doble como en horda; `0x40000` fue
observado fuera de combate entre ambos. Es un indicador de actividad, no un
discriminante de modalidad. Los escalares pequeños encontrados alrededor de las
tablas no confirman por sí mismos un enum de formato ni la cantidad de activos.

Se repitió la entrada en doble y horda. Una primera comparación directa se
interrumpió por timeout RPC durante la carga; se corrigió el diagnóstico para
conservar su muestra ante cortes temporales. La comparación posterior, desde
otra horda a otro doble, terminó con huella válida y muestras estables:

| Dirección | Horda | Doble | Interpretación |
| --- | --- | --- | --- |
| `0x081FB12C` | 311 | 312 | Escalar cambiante; no identifica formato |
| `0x081FB198` | 311 | 312 | Escalar cambiante; no identifica formato |
| `0x081FB238` | 7052468 | 7054524 | Escalar cambiante, significado sin confirmar |
| `0x081FB2B8` | 5 | 2 | Total rival en la copia A |
| `0x081FB658` | 5 | 2 | Total rival en la copia B |

No aparecieron otros cambios escalares bajo el filtro de la comparación de
2 KiB. Esto descarta interpretar estos candidatos como un enum demostrado; no
demuestra que el formato no exista en otro bloque o en un campo empaquetado.
La siguiente investigación debe localizar el descriptor de configuración del
combate o una tabla explícita de participantes de campo, en vez de inferir el
formato del total de reservas o de los PS.

Al terminar la primera parte quedaban por confirmar el discriminante de formato, la cantidad de puestos
activos y las transiciones de sustitución de rivales en dobles. El mapeo visual
de la horda y la permanencia de sus registros tras cuatro KO se observaron en
esta sesión, pero requieren contraste en otra pelea. No se infiere horda de tener cinco rivales:
un entrenador puede tener cinco reservas. Aliados con otro entrenador, revisión
distinta del ejecutable, transformaciones y formatos especiales siguen fuera de
esta validación. La continuación descrita al final resuelve el discriminante y
las capacidades generales de campo. La integración al contrato compartido pertenece al paso 8.

## Diagnóstico reproducible

`npm run probe:x-battle` ejecuta `scripts/probe-citra-x-battle-field.ts`.
`bridge/citra/x-battle-probe.ts` contiene las lecturas acotadas y testeables.
Se toman dos pasadas estables, se vuelven a comprobar las tablas al acabar la
investigación de identidades y se rechazan datos truncados o cambiantes. Un
fallo aborta el diagnóstico; no modifica la lectura de producción.

Las búsquedas auxiliares se limitan a un bloque fijo de 2 KiB alrededor de las
estructuras conocidas y a los registros propios observados. Se emiten referencias
conocidas y campos candidatos seleccionados, nunca bytes en bruto. Los campos
`format: unconfirmed`, `sideCandidate` y `rosterSlotCandidates` son deliberados:
el diagnóstico no normaliza esos indicios como soporte funcional.

Los tests usan memoria sintética para rangos acotados, punteros inválidos, salida,
cambios entre pasadas, identidades ambiguas, checksum y referencias de contexto.
Estos tests verifican el diagnóstico, no prueban que los offsets sean universales.

`node --experimental-strip-types scripts/compare-citra-x-battle-field.ts`
conserva una muestra de 2 KiB solamente en RAM y espera, como máximo tres minutos,
otra pelea activa con un total rival distinto. Compara únicamente escalares
candidatos cambiantes y excluye direcciones RAM reubicadas. El cambio de total
solo dispara la comparación; no se interpreta como identificador del formato.
Los cortes RPC durante la transición se toleran hasta el plazo límite.

Validación automática: 454 pruebas correctas (`npm test`), `npm run lint` y
`npm run build` correctos. La suite completa se ejecutó fuera del sandbox por
sus conexiones locales y reemplazos de archivos temporales sintéticos. No hubo
cambios de interfaz en este paso y no se realizaron pruebas visuales de ella.

## Identificación cerrada: rutinas de configuración de puestos

Se corrigió un filtro que descartaba palabras mayores de 24 bits. La comparación
ampliada encontró en `0x081FB238` una dirección de código distinta por modalidad.
Se analizaron esas instrucciones ARM como datos con Capstone, instalado únicamente
en la caché ignorada `node_modules/.cache/poke-chose-research-capstone`. No es una
dependencia de PokéChose ni se necesita para ejecutar el diagnóstico final.

Las tres rutinas configuran la misma función `0x007120EC` con un índice de bando
y una cantidad explícita de puestos. La función guarda esa cantidad como byte
en el modelo correspondiente al bando. No se deduce del total del equipo, la
especie, los PS ni los supervivientes.

| Formato | Selector observado | Instrucción de cantidad propia | Instrucción de cantidad rival | Puestos |
| --- | --- | --- | --- | --- |
| Sencillo | `0x006BA7A4` | `0x006BAA0C` | `0x006BAA24` | 1 / 1 |
| Doble | `0x006BA4BC` | `0x006BA72C` | `0x006BA744` | 2 / 2 |
| Horda | `0x006B9CB4` | `0x006B9F24` | `0x006B9F3C` | 1 / 5 |

En esos puntos se verifican las instrucciones ARM que cargan la cantidad en
`r3`. En la función común se observó su almacenamiento en el modelo de bando,
con paso de 12 bytes por bando y cantidad en `+0x25`.

Validación real de la continuación:

- Sencillo salvaje: selector `0x006BA7A4`.
- Sencillo contra entrenador: el mismo selector y lectura final `single`, 1/1.
  Confirma que el discriminante no es salvaje frente a entrenador.
- Doble: selector `0x006BA4BC`, con código que declara 2/2.
- Horda: selector `0x006B9CB4`, con código que declara 1/5; el selector se mantuvo
  después de derrotar un Gulpin, mientras el equipo conservó sus cinco registros.
- Fuera de combate: el lector devuelve formato sin confirmar aunque sobreviva
  un valor anterior en memoria.

`src/games/x/memory-battle-format.ts` implementa la lectura acotada. Exige estado
activo, selector conocido, coincidencia de las dos instrucciones de cantidad y
cabecera estable antes y después. El llamador comprueba la huella del ejecutable,
igual que en los otros lectores de X. Selectores desconocidos —incluidos otros
formatos todavía no investigados— devuelven `null`; datos truncados, código
discordante y cambios durante la lectura se rechazan.

`npm run probe:x-battle` publica ahora `format` y `fieldPositions` desde ese
lector. Las capacidades son puestos configurados, incluyendo los que tienen un
ocupante debilitado; no representan el número de Pokémon vivos.

### Candidatos descartados y alcance

La tabla temporal de referencias hallada en el área de batalla contenía cuatro
participantes en el doble y seis en la horda, pero se vació al avanzar el turno
tras un KO mientras el combate seguía activo. No se utiliza como discriminante
ni como prueba de salida. Otro listado transitorio retuvo el debilitado y otro
lo excluyó: son pruebas de por qué no se debe clasificar contando esas colas.

El campo `+0x88` del primer objeto seguido tomó `0x14` tanto en horda como en
doble y no sirve como identificador completo. Los enlaces gráficos y campos
que distinguían salvaje de entrenador tampoco se incorporan al lector final.
Los scripts auxiliares de esas búsquedas se retiraron; no quedan procesos de
investigación activos ni muestras de memoria guardadas.

La identificación queda validada para este ejecutable y los menús de turno
observados, incluyendo un turno de horda posterior a KO. No se afirma lectura
continua durante todas las animaciones, menús auxiliares o fases de entrada.
Al integrar el paso 8, las fases sin selector confirmado deben conservarse como
lectura parcial; la sesión del paso 7 decidirá cuándo retener el último formato
y cuándo borrarlo ante una salida confirmada. También quedan pendientes la
normalización completa de varios participantes, dobles con aliados, sustituciones
rivales con reservas y otras revisiones del ejecutable. Esas limitaciones no
cambian las capacidades de campo ya identificadas.

Validación final de la continuación: 458 pruebas correctas (`npm test`), que
incluyen los tres formatos, selector desconocido, salida, instrucciones
discordantes, truncamiento y cambios durante una lectura. Lint y build se
ejecutaron sobre la entrega final. Las observaciones reales y los tests sintéticos
se mantienen separados en este informe.
