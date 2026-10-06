# Prototipo melonDS en vivo

Experimento separado de PokéChose para Pokémon Negro en español, probado con melonDS 1.1 después de investigar 1.0 RC. No cambia la app, el bridge del save ni sus comandos. No necesita dependencias adicionales; requiere Node 22.15 o superior. Los archivos `config.local.json` y `artifacts/` quedan excluidos de Git.

## Alcance real

Incluye cliente GDB por TCP, lectura de RAM, volcado para investigación, búsqueda de PK5 cifrados usando un save como referencia y seguimiento del equipo cuando se configuran direcciones confirmadas. Se verificaron cambios de orden sin guardar en melonDS 1.1: ROM española IRBS, revisión 0, ARM7 puerto 3334, equipo en `0x02234974`, contador en `0x02234970` y separación de 220 bytes. La configuración local contiene esos valores. La dirección siguió siendo válida tras cargar un savestate, Reset y cerrar/reabrir el emulador; también se verificó el contador 6 → 5 → 6 con el PC. Estas pruebas no garantizan compatibilidad con otras ROM o estabilidad en todas las sesiones futuras.

Posteriormente se localizaron y validaron cajas y Pokédex mediante depósitos, traslados, capturas y restauración de savestate; el registro está en [VALIDATION.md](VALIDATION.md). Los módulos comunes se trasladaron a `bridge/live` y se integraron en la aplicación principal manteniendo este experimento para investigación. El servicio integrado permite pausar conservando TCP y reanudar desde el botón; cerrar la conexión puede exigir Reset. Consulta [fuentes de datos](../../docs/data-sources.md) e [intervalos y recuperación](../../docs/live-reading.md). No hay lectura de mapas ni combate; este último cuenta con una [evaluación de viabilidad](../../docs/battle-feasibility.md), sin implementación todavía.

No escribe memoria, no modifica el save, no coloca breakpoints y no envía interrupciones. Envía `c` para continuar después de conectar y `D` para desconectar al finalizar normalmente: melonDS puede mantener la CPU esperando durante la conexión inicial. Esto debe probarse en el emulador real antes de prometer una lectura sin pausas. Las lecturas se limitan a la RAM principal de DS, 0x02000000–0x023FFFFF. El cliente solo se conecta a 127.0.0.1.

## Preparación y primera lectura

Desde PowerShell, en la raíz del proyecto:

```powershell
Set-Location experiments/melonds-live
# Solo si todavía no tienes configuración local:
Copy-Item config.example.json config.local.json
```

En melonDS busca la configuración de GDB en los ajustes de emulación. Activa el servidor; usa ARM9 con puerto **3333** y, si exige un puerto ARM7, usa **3334**. Desmarca las opciones de detenerse al iniciar (`Break on startup`). Guarda primero tu partida dentro del juego antes de reiniciar el emulador si la configuración lo requiere. No conectes otro cliente GDB al mismo tiempo.

```powershell
npm run probe
```

El puerto se puede cambiar temporalmente con la variable `MELONDS_GDB_PORT`. El ejemplo usa 3333 (ARM9); la sesión real de seguimiento funcionó con 3334 (ARM7). Esto no cambia `config.local.json`.

Debe mostrar la conexión y 16 bytes de RAM. Mientras se ejecuta, comprueba si el juego sigue avanzando. Si el servidor no arranca, revisa `melonDS.toml` y los puertos: hay un problema documentado de activación de GDB en compilaciones de esa época. No copies una configuración completa de otro emulador.

**Particularidad de 1.0 RC:** la versión estable 1.0 documenta una corrección del servidor GDB que no se activaba hasta reiniciar la consola emulada. Si `probe` devuelve `ECONNREFUSED` aunque `Enable GDB stub` esté marcado, guarda dentro del juego y usa **Reset** en melonDS, luego entra otra vez a la partida. Reabrir la aplicación no confirma por sí solo que el puerto esté escuchando. [Corrección oficial en 1.0](https://github.com/melonDS-emu/melonDS/releases/tag/1.0).

## Localizar el equipo

En `config.local.json`, configura `savePath` con la ruta absoluta de tu `.sav`; en JSON Windows usa `D:/carpeta/partida.sav` o barras invertidas dobles. Se abre exclusivamente para lectura. Conviene que el save represente los mismos ejemplares que llevas ahora en el equipo.

```powershell
npm run locate
```

En las pruebas con 1.0 RC, `probe` funcionó después de Reset pero una segunda conexión agotó el timeout, incluso con desconexión GDB explícita. Para investigar el equipo, realiza Reset y ejecuta **directamente `locate`**, sin ejecutar antes `probe`: `locate` comprueba la lectura y vuelca RAM en una misma conexión. La causa de la reconexión fallida sigue sin confirmarse.

Lee la RAM en bloques y guarda un volcado local. Un volcado completo son miles de peticiones y puede afectar a la fluidez; no es una instantánea atómica. Imprime candidatos por identidad (PID, entrenador y especie), validados con el checksum PK5 y nivel. Los candidatos pueden ser buffers del save o copias antiguas: **encontrarlos no confirma que sean el equipo actual**. La búsqueda cubre PK5 cifrados de 220 bytes alineados a cuatro bytes; si la representación en RAM es distinta, hay que investigarla.

`locate` también guarda un informe de estructuras completas. Para comparar esas copias mientras cambias el orden en el juego sin guardar:

```powershell
npm run track
```

Registra los cambios en `artifacts/observations-*.jsonl`. En la prueba real se encontraron cinco copias: una cambió con el equipo, otra conservó el orden del save y las restantes dejaron de ser válidas. Solo la primera se eligió para seguimiento. La reconexión ARM9 también agotó el timeout en 1.1; no se considera resuelto ese problema.

Para analizar la RAM sin buscar ejemplares:

```powershell
npm run dump
```

No se deduce el contador ni el stride a partir de un candidato aislado. Hay que confirmar el inicio del equipo, el contador de 32 bits y la separación entre miembros. Configura `partyAddress`, `partyCountAddress` y `partyStride` solo después de hacerlo; los valores nulos son intencionales.

```powershell
npm run watch
```

Emite JSON al cambiar el equipo. Cada muestra verifica contador antes/después, dos lecturas idénticas y PK5 válidos. Una lectura estable no descarta por sí sola una dirección obsoleta. Ante desconexión termina con diagnóstico; reinicia el comando después de recuperar melonDS. Ctrl+C cierra el cliente.

## Validación necesaria con tu ROM

1. Confirmar lectura y fluidez con `probe`.
2. Confirmar especies, orden, niveles y motes del equipo actual.
3. Cambiar orden o subir de nivel **sin guardar** y verificar el cambio en `watch`.
4. Capturar o retirar un Pokémon para comprobar el contador y slots.
5. Probar reinicio y carga de savestate: las direcciones pueden quedar obsoletas.

La configuración definitiva debería identificar la revisión exacta de ROM, no solo su idioma. No se da por compatible cualquier ROM traducida, modificada o de otra revisión.

## Pruebas

### Investigación de cajas y Pokédex

`node --experimental-strip-types analyze-storage.mjs` analiza el último volcado de RAM existente contra el save actual, sin conectar al emulador. Es una búsqueda de candidatos, no una confirmación de datos activos. Las cajas se prueban como 24 bloques con 30 PK5 de 136 bytes; la búsqueda contempla separaciones de 4080 y 4096 bytes. La Pokédex se busca por su bitset de capturas; coincidencias o lecturas estables no garantizan por sí solas que el bloque esté activo.

`node --experimental-strip-types track-storage.mjs` observa los candidatos y registra muestras en `artifacts/storage-observations-*.jsonl`. Admite `MELONDS_GDB_PORT`. Lee cada región dos veces y descarta cambios durante la lectura. La prueba real debe mostrar depósitos, movimientos entre cajas y cambios de Pokédex sin guardar, antes de añadir estas direcciones a la configuración definitiva. El sondeo de todas las cajas lee unos 200 KiB por muestra y puede tener impacto en el juego; su rendimiento aún no está medido. No ejecutar dos clientes sobre el mismo puerto GDB.

```powershell
npm test
```

Las pruebas utilizan un servidor GDB simulado y Pokémon sintéticos. No prueban la conexión real a melonDS ni las direcciones de Pokémon Negro español.

## Referencias

- [Configuración de compilación de melonDS 1.0 RC](https://github.com/melonDS-emu/melonDS/blob/1.0rc/CMakeLists.txt).
- [GDB stub oficial](https://github.com/melonDS-emu/melonDS/blob/master/src/debug/GdbStub.cpp): ACK inicial y control de ejecución.
- [Lectura de memoria GDB](https://github.com/melonDS-emu/melonDS/blob/master/src/debug/GdbCmds.cpp).
- [Problema de activación GDB #2144](https://github.com/melonDS-emu/melonDS/issues/2144).
- [Parser y documentación de PokéChose](../../docs/save-format.md): se reutiliza el parser existente; sus offsets de save no se tratan como direcciones RAM.
