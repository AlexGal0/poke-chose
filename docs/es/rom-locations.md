# Ubicaciones desde la ROM de Pokémon Negro

El extractor local lee la ROM sin modificarla ni conectarse a melonDS:

```powershell
node scripts/extract-black-locations.mjs 'ruta/a/tu-juego.nds'
```

Emite JSON por stdout; no crea archivos ni incluye la ruta personal. Solo se ha
validado Pokémon Negro español, código IRBS, revisión 0. Otras versiones se
rechazan explícitamente. No incorporar ROMs, archivos NARC ni bancos de texto
extraídos al repositorio.

La lectura usa FNT/FAT de Nitro para localizar `a/0/1/2` y `a/0/0/2`, abre sus
contenedores NARC y decodifica el banco de nombres 89. La tabla de cabeceras es
el primer miembro del primer archivo: entradas de 48 bytes, índice de nombre
en +0x1a y referencia de encuentros uint16 en +0x14. Se publican también los
campos +0x16 y +0x18 como `mapField` y `parentField`; no se presupone que todos
los mapas del juego permitan interpretar esas relaciones de la misma manera.
Los controles de texto desconocidos se conservan escapados. Los textos comprimidos
se rechazan explícitamente; no aparecieron en el banco de nombres observado.

Referencias de formato consultadas (implementación propia, sin copiar código):

- [Gen5RomHandler: loadWildMapNames](https://github.com/Ajarmar/universal-pokemon-randomizer-zx/blob/master/src/com/dabomstew/pkrandom/romhandlers/Gen5RomHandler.java).
- [gen5_offsets.ini: archivos y banco de nombres](https://github.com/Ajarmar/universal-pokemon-randomizer-zx/blob/master/src/com/dabomstew/pkrandom/config/gen5_offsets.ini).
- [PPTxtHandler: formato y cifrado de texto](https://github.com/Ajarmar/universal-pokemon-randomizer-zx/blob/master/src/pptxt/PPTxtHandler.java).
- [Investigación de cabeceras BW](https://www.pokecommunity.com/threads/pok%C3%A9mon-b-w-changing-the-maps-weather.410472/).

## Comprobación con la ROM local

Se extrajeron 427 cabeceras. Se contrastaron los cuatro mapas ya observados en
la partida real, sin escribir la ROM, el save o la RAM:

| Mapa | Nombre leído | Índice de nombre | Campo padre | Encuentros |
| --- | --- | --- | --- | --- |
| 96 | Ciudad Fayenza | 10 | 96 | 1 |
| 99 | Ciudad Fayenza | 10 | 96 | 65535 |
| 331 | Ruta 6 | 19 | 331 | 84 |
| 332 | Ruta 6 | 19 | 331 | 65535 |

La ROM agrupa los nombres de estos interiores con sus zonas. No contiene el
nombre «Centro Pokémon» o «Laboratorio de estaciones» en esas entradas; esos
detalles proceden de la observación del jugador. El valor 65535 indica ausencia
de conjunto de encuentros en la interpretación utilizada por el randomizador.

Las pruebas sintéticas verifican el recorrido Nitro → NARC → texto → cabeceras,
acentos, datos truncados, referencias inválidas y que el buffer original no cambia.
La identificación de nombres no convierte sus índices en IDs de PokéAPI: esa
correspondencia se debe resolver por separado.

## Catálogo para la checklist

```powershell
node --experimental-strip-types scripts/generate-black-map-zones.mjs 'ruta/a/tu-juego.nds'
```

El generador emite TypeScript por stdout y el resumen de cobertura por stderr.
`src/domain/black-map-zones.ts` conserva únicamente IDs derivados, agrupados por
zona PokéAPI. La aplicación usa ese catálogo directamente: el navegador no
necesita la ROM ni recibe sus bytes. La ROM solo se necesita para regenerarlo.

Los nombres completos se comparan con las etiquetas españolas existentes,
ignorando mayúsculas y acentos. Solo hay dos alias explícitos por abreviatura:
«Alm. Frigoríficos» y «Centro Comercial». Nombres sin correspondencia única no
se asignan; no se infieren por número, proximidad o campo padre.

Resultado: 388 de 427 mapas, agrupados en 71 zonas. Los 39 restantes incluyen
entradas sin nombre utilizable, nombres especiales y accesos cuya etiqueta no
coincide con el catálogo. Se mantiene el comportamiento anterior de conservar
la selección ante un mapa desconocido. La cobertura procede de la extracción
estática: no significa que se hayan recorrido 388 mapas durante la validación.
El nombre del juego agrupa interiores y plantas, por lo que la checklist sigue
mostrando la zona general y no encuentros específicos de cada habitación.

Validación del extractor: 204 pruebas, lint y build correctos. Validación de la
integración del catálogo: 206 pruebas, lint y build correctos. En el navegador
con el lector real activo se mostró Ruta 6, selección automática y el nuevo
resumen de cobertura; el equipo terminó de cargar. No se reinició GDB.
Captura: `artifacts/location-follow-rom-catalog.png`. No se repitieron recorridos
por otras zonas ni pruebas responsive en este paso; se conservó la estructura
de los controles. Reapertura completa y sesiones largas siguen pendientes.
