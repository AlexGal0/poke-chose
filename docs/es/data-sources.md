# Fuentes de datos y semántica de las lecturas

Referencia vigente: 14 de noviembre de 2026. [English](../data-sources.md) · [Índice](README.md) · [Contratos](adapter-contracts.md).

La fuente proporciona lecturas; el adaptador de juego aporta reglas y normalización. Manual, Save y Live no cambian la generación seleccionada. Las instancias deben ser estables entre renders y cerrar suscripciones/cancelar hidratación cuando se sustituyen.

## Pipelines existentes

| Fuente | Límite de integración |
| --- | --- |
| Manual | Colección/equipo independientes por edición; no inventa identidad de ejemplares ni Pokédex |
| Save/Live de Black | `PokemonDataSource` / `PokemonSnapshot`, `subscribeTeamSource` y `useTeamSource` históricos |
| Save de X/Y | `SavePokedexReader`, snapshots validados y `createPokedexSource` |
| Live de X/Y | `LivePartySnapshot`, `createLivePartySource` y adaptadores de memoria por edición |
| Combate | Lectura/servicio y capacidades del lector propios; no se deduce de un snapshot del equipo |

El pipeline de Black no es obligatorio para todo juego nuevo. La factoría Live y la validación XY también están ligadas a esas ediciones. Se elige el límite existente más pequeño que encaje y se amplía cuando los datos reales lo exigen. [Contratos](adapter-contracts.md) enlaza tipos y puntos de entrada.

## Significado de los datos

- `null` es desconocido/no disponible; `[]` confirma una lectura vacía.
- Una falla temporal conserva la última muestra confirmada y la marca desactualizada. Conexión HTTP/SSE no prueba una lectura sana del emulador.
- Equipo, cajas, Pokédex, inventario, guardería y ubicación tienen disponibilidad explícita. La fecha general no demuestra que todas las secciones retenidas se hayan vuelto a leer.
- `seen` descubre imágenes; `caught` alimenta capturas; equipo/cajas indican propiedad actual. No se sustituyen entre sí.
- Se preservan identidad, formas, duplicados y orden. No se mezclan fuentes o muestras incoherentes para construir una colección.
- PS, experiencia y objetos equipados deben venir de datos validados. PS desconocidos no equivalen a PS máximos; las cajas no proporcionan PS actuales de combate.
- Inventario declara cantidades, alcance bolsa/equipados y antigüedad. Desconocido no debe habilitar requisitos como si las cantidades estuvieran confirmadas.

Los errores de transporte y los de hidratación de metadatos son distintos. Fallar al buscar nombre o sprite no desconecta una lectura sana. Los datos retenidos de una fuente anterior no se presentan como una muestra fresca de la siguiente.

## Ciclo Live y combate

Los lectores general y de combate de Black tienen conexiones y servicios independientes. X/Y usan servicios Citra RPC por edición. Los controles exponen intento, espera, pausa/desconexión y reintento explícito; aceptar una petición no garantiza la primera muestra válida. Véanse [operación](live-reading.md) y [diagnóstico](reader-connections.md).

Combate distingue campo inactivo, desconocido y activo. Los propietarios separan jugador, aliado de historia, rival y salvaje; las posiciones conservan espacios desconocidos/vacíos. Las capacidades del lector indican formatos validados, aparte de los que existen en el juego. Véase [combate](multi-battle.md).

## Persistencia local

Estado manual y marcas de objetos son datos durables por edición. Los metadatos de API son caché desechable, localizada por clave cuando corresponde. Recuperar cuota puede desalojar caché antes de reintentar; los fallos siguen notificándose. Borrar datos del sitio también elimina el estado durable. La aplicación no escribe en partidas ni RAM del emulador.
