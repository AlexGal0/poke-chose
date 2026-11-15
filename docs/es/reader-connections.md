# Conexiones de lectores y diagnóstico

Referencia vigente: 14 de noviembre de 2026. [English](../reader-connections.md) · [Índice](README.md) · [Configuración Live](live-reading.md).

Que responda el bridge no equivale a tener emulador conectado ni muestra válida. La interfaz sigue cada lector por separado y puede indicar conexión parcial. Black general/combate usa GDB independiente; X/Y usa Citra RPC por edición. Un lector puede estar conectado sin combate activo.

## Diagnóstico en orden

1. Selecciona edición y fuente correctas. X/Y validan el juego leído; cambiar de edición requiere su conexión correspondiente.
2. Confirma que corre el servicio HTTP del [README](../../README.es.md). Esos puertos no son el RPC de Citra ni el GDB de melonDS.
3. En Citra, activa RPC y haz coincidir `CITRA_X_RPC_PORT` / `CITRA_Y_RPC_PORT` con el emulador. Ambos usan 45987 por defecto. Dos instancias simultáneas requieren RPC distintos. La segunda puede fallar al enlazar mientras la primera ocupa el puerto; cerrar la primera no garantiza un reintento. Guarda el progreso y reinicia la instancia afectada si hace falta.
4. En Black, revisa configuración GDB privada y perfil/ROM validados. ARM7 general y ARM9 combate son lectores distintos; pausar el general no es un endpoint universal para pausar combate.
5. Conecta/reconecta explícitamente y espera una muestra validada. Una petición aceptada no basta. Consulta el mensaje de cada lector, sin inferir salud por ver un equipo retenido.
6. Tras actualizar el bridge, reinicia el conjunto. El lanzador puede reutilizar un servicio HTTP anterior; recargar el frontend no actualiza ese proceso.

El aviso de lectura temporalmente incompleta conserva sesión e información confirmada. Si persiste, revisa estado y perfil. Un error de sprite, traducción o PokéAPI es de metadatos y no debe confundirse con desconexión del emulador. Véanse [semántica de fuentes](data-sources.md) y [combate](multi-battle.md).

No se solucionan conexiones escribiendo en partidas o memoria. Configuraciones privadas, volcados y juegos no se versionan. El [registro original de controles Black](../reader-connections.md#historical-black-connection-control-delivery) conserva evidencia histórica en inglés; sus resultados no se repitieron en esta actualización.
