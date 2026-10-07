**English version:** [README.md](README.md)

# PokéChose

Organiza tu colección, prepara un equipo de hasta seis Pokémon y consulta sus fortalezas y debilidades mientras juegas **Pokémon Negro**. PokéChose funciona en el navegador y puede leer tu partida de melonDS sin modificarla.

Puedes usarlo manualmente, sincronizarlo con un archivo de guardado o activar la lectura en vivo. El catálogo y el análisis utilizan las reglas de **Black/White, Generación V**; la integración con partidas está implementada para **Pokémon Negro**.

## Funciones

- **Catálogo de 649 especies:** explora Teselia o todas las generaciones I–V, busca por nombre, consulta WikiDex y revisa las vías de obtención en Negro.
- **Colección y equipo:** añade Pokémon manualmente y elige hasta seis integrantes; con melonDS, consulta el equipo y las 24 cajas, conservando ejemplares duplicados y motes.
- **Balance de tipos:** identifica debilidades compartidas, resistencias, inmunidades y cobertura ofensiva potencial por STAB.
- **Tabla de tipos:** matriz interactiva de los 17 tipos de Generación V, con multiplicadores y desplazamiento horizontal en móvil.
- **Capturas por zona:** consulta encuentros de Negro, niveles, métodos y porcentajes; filtra por acceso a Surf y Supercaña. La Pokédex marca las especies capturadas alguna vez, aunque ya las hayas evolucionado o liberado.
- **Evoluciones:** abre el árbol de cada familia con sus requisitos de Generación V.
- **Movimientos:** consulta el aprendizaje por nivel en Black/White, con nombres y descripciones en español, tipo, categoría y PP.
- **Datos de tu equipo:** muestra nivel, objeto equipado, PS y progreso de experiencia cuando están disponibles en la partida.
- **Lectura en vivo y combate experimental:** sigue el equipo, las cajas y la Pokédex sin guardar; en combate, consulta tu Pokémon activo, el rival, sus PS y referencias de ventaja por tipos.
- **Cuatro temas:** Original, Pokémon, Pokémon oscuro y Fiesta 🎉. La selección se guarda automáticamente.
- **Idioma:** cambia entre español e inglés con el selector de la cabecera. La interfaz se traduce al instante, sin recargar; español es el idioma por defecto y la elección se guarda automáticamente.
- **Guardado local:** conserva la colección y el equipo manuales, preferencias y caché en el navegador. Sin cuentas ni base de datos.

## Instalación fácil en Windows

### 1. Instala los requisitos

| Requisito | Para qué se necesita |
| --- | --- |
| [Node.js](https://nodejs.org/en/download), versión 22.15 o posterior | Ejecutar PokéChose y sus servicios locales. Incluye npm. |
| Navegador moderno | Usar la interfaz; las comprobaciones del proyecto se realizaron en Chrome. |
| [melonDS 1.1 para escritorio](https://github.com/melonDS-emu/melonDS/releases/tag/1.1) | Leer una partida de Pokémon Negro. No es necesario en modo manual. |
| Tu copia de Pokémon Negro y su partida | Usar los modos conectados. Estos archivos no se incluyen en el proyecto. |

La **lectura en vivo y el lector de combate** se configuraron con melonDS 1.1 y **Pokémon Negro en español, código IRBS, revisión 0**. Otra versión, idioma o revisión del juego necesita direcciones de memoria distintas y no se detecta automáticamente. Si no tienes esa edición, empieza por el modo manual o por la lectura del `.sav` compatible.

### 2. Descarga el proyecto

En la página de este repositorio en GitHub, pulsa **Code → Download ZIP** y extrae el contenido en una carpeta. Abre la carpeta que contiene `package.json` e **Iniciar PokeChose.cmd**; no ejecutes el programa dentro del ZIP.

### 3. Elige cómo arrancarlo

**Solo modo manual, sin emulador:** abre una terminal en la carpeta del proyecto y ejecuta:

```powershell
npm ci
npm run dev
```

Abre la dirección que muestre Vite y selecciona **Manual** en **Origen del equipo**. No necesitas archivos de configuración.

**Con melonDS y el lanzador de Windows:**

1. Copia `live.config.example.json` y renombra la copia a `live.config.local.json`. Conserva la plantilla sin cambios si vas a utilizar la edición española IRBS revisión 0 indicada arriba. El lanzador necesita este archivo porque también inicia el lector de combate, aunque solo elijas el modo Save.
2. Si quieres leer el archivo de guardado, configura también `save.config.local.json` como se explica en el apartado siguiente. Para usar únicamente la lectura en vivo no hace falta configurar la ruta del `.sav`.
3. Haz doble clic en **[Iniciar PokeChose.cmd](Iniciar%20PokeChose.cmd)**. Instala las dependencias si falta Vite, inicia la aplicación y los servicios locales, y abre el navegador.
4. Deja abierta la ventana de la terminal mientras uses PokéChose. Pulsa **Ctrl+C** para detenerlo.

La primera instalación y las consultas de datos no guardados en caché necesitan internet. En los siguientes usos, vuelve a abrir el lanzador. PokéChose se ejecuta como aplicación local; no necesitas publicar un servidor ni abrir `index.html` directamente.

## Cómo conectar tu partida

| Origen del equipo | Qué muestra | Cuándo se actualiza |
| --- | --- | --- |
| Manual | Tu colección y equipo elegidos en la aplicación | Al hacer cambios en la interfaz |
| Save de melonDS | Equipo, cajas y Pokédex del `.sav` | Cuando guardas dentro del juego |
| melonDS en vivo (experimental) | Equipo, cajas y Pokédex de la memoria del emulador | Mientras el lector está conectado |

### Opción A: leer el archivo de guardado

Esta opción admite **Pokémon Negro RAW `.sav` de 512 KiB**. No admite partidas de Blanco, Negro 2/Blanco 2 ni savestates.

1. Abre Pokémon Negro en melonDS y guarda desde el menú del juego para tener un archivo `.sav`.
2. Localiza el `.sav` que usa el emulador. La ubicación puede depender de su configuración; no selecciones un archivo de estado rápido.
3. Copia `save.config.example.json` como `save.config.local.json` en la carpeta del proyecto.
4. Edita `savePath` con la ruta de **tu** archivo. En Windows puedes usar `/`:

```json
{
  "savePath": "D:/Mis partidas/Pokemon Black.sav"
}
```

5. Inicia PokéChose con el lanzador, siguiendo los pasos de instalación, y elige **Save de melonDS** en **Origen del equipo**.
6. Juega y guarda dentro de Pokémon Negro. Los cambios escritos en ese archivo aparecerán automáticamente en PokéChose.

No necesitas activar GDB para leer el `.sav`. Los cambios que solo existen en memoria o en un savestate no actualizan esta fuente. Si cambias `savePath`, reinicia los servicios. Los archivos de configuración local y los `.sav` están excluidos mediante `.gitignore`.

### Opción B: leer melonDS en vivo

Para esta opción utiliza la configuración de juego y emulador compatible descrita en los requisitos.

1. Crea `live.config.local.json` a partir de `live.config.example.json`, si todavía no lo has hecho.
2. En las opciones de depuración **GDB** de melonDS, activa el servidor para **ARM7 en el puerto 3334**. Para la vista de combate, activa también **ARM9 en el puerto 3333**.
3. Desmarca **Break on startup** para que el juego no quede detenido al iniciar. Si melonDS requiere reiniciar para aplicar las opciones, conserva primero tu progreso.
4. Abre Pokémon Negro y entra a tu partida.
5. Inicia PokéChose con **Iniciar PokeChose.cmd**, selecciona **melonDS en vivo (experimental)** y pulsa **Conectar lector**.
6. Para consultar al rival, abre **Combate** y pulsa **Conectar combate**. Es un lector separado y utiliza la conexión ARM9.

El equipo, los PS, la experiencia y la Pokédex se consultan aproximadamente cada **3 segundos**, más el tiempo que tarda la lectura. Las cajas se revisan cada **2 minutos**; puedes adelantar su lectura con **Actualizar colección** en **Mi colección**. El servicio no escribe la memoria del emulador ni el save.

Tras un Reset, reapertura del emulador o pérdida de conexión, utiliza **Reconectar lector** y, si corresponde, **Reconectar combate**. **Pausar lectura** detiene el sondeo del lector principal. Cambiar de origen no lo pausa automáticamente: pulsa ese botón si quieres detenerlo en segundo plano.

No conectes otro lector al mismo puerto GDB mientras PokéChose lo esté usando. Si el emulador acepta la conexión pero no responde, conserva tu progreso, reinicia la partida en melonDS y vuelve a conectar. Más detalles: [lectura en vivo](docs/es/live-reading.md) y [vista de combate](docs/es/enemy-prototype.md).

## Cómo usar PokéChose

### Preparar tu equipo

1. Elige **Manual**, **Save de melonDS** o **melonDS en vivo** en el selector de origen.
2. En Manual, abre **Explorar catálogo**, busca una especie y pulsa **+ Colección**.
3. Ve a **Mi colección** y añade hasta seis Pokémon al equipo. Puedes quitar miembros y probar otras combinaciones.
4. Abre **Balance de tipos** para revisar las debilidades compartidas y la cobertura potencial. Usa **Tabla de tipos** como referencia para tus enfrentamientos.

En los modos conectados, el equipo y la colección reflejan la partida y son de solo lectura. Tu colección manual se conserva por separado y vuelve al elegir Manual.

### Planificar capturas y evoluciones

El icono de ubicación junto al selector activa el seguimiento automático y queda
verde y pulsado. Elegir una zona manualmente lo pausa. En modo Save sigue el último
mapa guardado; en vivo sigue la RAM sin guardar. Los mapas desconocidos conservan
la selección y muestran un aviso. El catálogo extraído de Negro español IRBS,
revisión 0, cubre 388 mapas en 71 zonas; quedan 39 mapas sin correspondencia.
Los interiores y plantas con nombre de zona compartido se agrupan: no se filtran
encuentros por planta. Consulta [extracción y límites](docs/es/rom-locations.md).

En **Capturas por zona**, selecciona una ubicación y marca tu acceso a Surf y Supercaña en **Mis objetos y habilidades**. Estos filtros se configuran manualmente; no leen la mochila ni comprueban tu progreso de historia. Con una Pokédex válida, las especies capturadas quedan completadas aunque ya no estén en tus cajas.

Los encuentros muestran método, nivel y porcentaje cuando están disponibles. Los indicadores de oportunidad señalan mejores porcentajes registrados en zonas posteriores o una única zona con encuentros naturales registrados; no aseguran que una especie solo pueda obtenerse por esa vía.

En el catálogo, los iconos explican las formas de obtención en Negro. La lupa abre la página de la especie en WikiDex. Los nombres de variantes, como `frillish-male`, se presentan como **Frillish** y las cachés antiguas se normalizan sin tener que borrarlas.

Pulsa **Evoluciones** para consultar una familia y sus requisitos, o **Movimientos** para ver el aprendizaje por nivel en Black/White. El listado de movimientos no incluye MT/MO, tutores ni crianza. Los sprites se revelan cuando una especie está vista o capturada en tu Pokédex; en Manual, al añadirla a tu colección.

### Elegir un tema y conservar tus datos

El selector **Tema** de la cabecera ofrece **Original**, **Pokémon**, **Pokémon oscuro** y **Fiesta 🎉**. La selección se guarda al cambiarla y se restaura al recargar. Se aplica también a diálogos y combate.

La colección manual, el equipo y las preferencias se guardan en el navegador. Para recuperarlos, usa el mismo navegador, perfil y dirección: `localhost` y `127.0.0.1`, o puertos distintos, tienen almacenamientos separados. No se sincronizan entre dispositivos. Borrar los datos del sitio elimina lo guardado; una ventana privada puede descartarlo al cerrarse. Si no se puede guardar, la interfaz muestra un aviso.

## Problemas frecuentes

| Problema | Qué revisar |
| --- | --- |
| El lanzador se cierra o indica que falta un archivo | Comprueba Node.js 22.15 o posterior y que exista `live.config.local.json` junto a `package.json`. Lee el error de la terminal. |
| No aparece la partida en modo Save | Revisa `savePath`, el formato RAW de 512 KiB y que hayas guardado dentro del juego. Reinicia los servicios después de cambiar la ruta. |
| El lector en vivo no conecta | Revisa GDB ARM7 3334, la edición compatible, la partida abierta y el botón Conectar lector. |
| Combate no muestra al rival | Revisa GDB ARM9 3333 y Conectar combate. La vista es experimental y requiere una lectura confirmada. |
| Las cajas muestran datos anteriores | Espera la próxima revisión o pulsa Actualizar colección en modo en vivo. |
| El tema o la colección no se conservan | Usa la misma dirección, navegador y perfil; revisa los avisos de almacenamiento. |
| No cargan datos de una especie | Comprueba internet y pulsa Reintentar. Los datos ya consultados se reutilizan desde caché. |
| Un puerto está ocupado | Cierra tu instancia anterior si ya no la necesitas. El lanzador reutiliza servicios compatibles y avisa si otro programa ocupa el puerto. |

## Alcance y limitaciones

- El análisis usa **Generación V**: 17 tipos, sin Hada; Acero resiste Fantasma y Siniestro.
- Calcula defensa por tipos y cobertura potencial STAB frente a tipos individuales. No simula movimientos reales, habilidades, objetos, clima ni todos los efectos del combate. Los huevos se excluyen del análisis.
- El catálogo abarca generaciones I–V; que una especie aparezca no garantiza que se pueda capturar en Negro. Los encuentros y vías de obtención dependen de los datos disponibles y sus complementos locales.
- La lectura en vivo y el combate son experimentales, con compatibilidad limitada a las direcciones configuradas. Ante errores se conservan los últimos datos válidos y se indica cuando están desactualizados.
- El modo manual y el análisis de datos guardados pueden funcionar sin conexión. Datos no cacheados y sprites necesitan red. No hay service worker.

## Desarrollo

React + TypeScript + Vite, con React Compiler. Ejecuta los comandos desde la carpeta que contiene `package.json`:

| Comando | Función |
| --- | --- |
| `npm ci` | Instalar las dependencias del lockfile |
| `npm run dev` | Iniciar solo la interfaz |
| `npm run dev:save` | Iniciar interfaz y servicios de save, lectura en vivo y combate; requiere `live.config.local.json` |
| `npm test` | Ejecutar las pruebas de Node |
| `npm run lint` | Comprobar el código con ESLint |
| `npm run build` | Comprobar TypeScript y generar `dist/` |
| `npm run preview` | Servir el bundle después de compilar |
| `npm run preview:save` | Servir el bundle con los servicios locales; requiere `live.config.local.json` |

Para leer solo el `.sav` sin arrancar los lectores en vivo y combate, usa dos terminales: `npm run bridge` y `npm run dev`. Los servicios en vivo y combate también pueden iniciarse por separado con `npm run bridge:live` y `npm run bridge:battle`.

Los servicios escuchan en `127.0.0.1`: save en **3001**, en vivo en **3002** y combate en **3003**. Vite redirige sus solicitudes tanto en desarrollo como en preview. Las opciones avanzadas incluyen `MELONDS_SAVE_PATH`, `SAVE_BRIDGE_PORT`, `LIVE_BRIDGE_PORT` y `MELONDS_GDB_PORT`; consulta la documentación técnica antes de cambiarlas.

La última validación de código registrada aprobó **167 pruebas**, lint y build. Se comprobaron los cuatro temas a 1280, 390 y 320 px y los nombres, búsqueda y enlaces del catálogo con datos sintéticos. Esta reorganización del README solo revisó documentación y enlaces; no repitió pruebas de código ni una instalación nueva.

## Documentación técnica

Para preparar una publicación en GitHub, consulta [preparación del repositorio](docs/es/github-preparation.md). Las configuraciones locales, partidas, ROMs, perfiles de navegador y salidas de investigación están excluidas; las plantillas y capturas seleccionadas permanecen disponibles.

- [Fuentes de datos y adaptadores](docs/es/data-sources.md) ([English](docs/data-sources.md))
- [Formato del save y acceso de solo lectura](docs/es/save-format.md) ([English](docs/save-format.md))
- [Configuración, intervalos y recuperación de la lectura en vivo](docs/es/live-reading.md) ([English](docs/live-reading.md))
- [Vista experimental de combate](docs/es/enemy-prototype.md) y [viabilidad del lector](docs/es/battle-feasibility.md)
- [Vías de obtención del catálogo](docs/es/acquisition.md) ([English](docs/acquisition.md))
- [Temas y persistencia](docs/es/themes-validation.md)
- [Nombres y enlaces del catálogo](docs/es/catalog-names-validation.md)
- [Validación de integración](docs/es/live-integration-validation.md) y [barras y objetos](docs/es/team-vitals-validation.md)

Las guías anteriores sin enlace en inglés son registros históricos de una sesión de desarrollo concreta (capturas, conteos de pruebas y fecha incluidos), no documentación viva de la funcionalidad actual; ver [auditoría de traducción de documentación](docs/doc-translation-audit.md) para el detalle de qué se tradujo y por qué. Las guías de contribución en `AGENTS.md`, incluida la sección de localización (`src/i18n/`), ya están en inglés.

## Datos y créditos

Datos y sprites de [PokéAPI](https://pokeapi.co/docs/v2). Enlaces y referencias de especies, zonas y métodos de obtención de [WikiDex](https://www.wikidex.net/wiki/WikiDex). Emulación mediante [melonDS](https://github.com/melonDS-emu/melonDS).

PokéChose es un proyecto independiente de apoyo a la partida. Pokémon y sus elementos pertenecen a sus respectivos titulares.
