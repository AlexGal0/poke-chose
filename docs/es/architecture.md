# Arquitectura y límites de integración

Referencia vigente: 14 de noviembre de 2026. [English](../architecture.md) · [Índice](README.md) · [Contratos](adapter-contracts.md).

Black, X y Y componen el mismo `GameWorkspace` con datos, servicios, fuentes y reglas de cada edición. Manual, Save y Live son fuentes de datos: cambiar de fuente no cambia las reglas del juego seleccionado.

## Composición y responsabilidades

| Límite | Responsabilidad |
| --- | --- |
| `src/App.tsx`, perfiles y workspaces | Selección, carga diferida, composición y disponibilidad de módulos |
| `src/games/core/` | Workspace compartido, servicios, reglas y contratos normalizados |
| Adaptadores de juego | Versiones, especies/formas, índices de inventario, mapas, orden de encuentros y normalización |
| `src/components/` | Presentación e interacción compartidas, sin elegir emulador o ROM |
| `src/domain/` | Colección, efectividad, obtención y evoluciones sin idioma |
| `src/sources/` y hooks | Suscripción, validación de transporte, hidratación y retención de estado |
| `bridge/` | Lectura de partidas/memoria y servicios HTTP/SSE locales |
| `src/storage/` | Estado manual y preferencias durables; cachés desechables |
| `src/i18n/` | Recursos ES/EN y traducción de identificadores de dominio/mensajes |

Black usa Gen V; X/Y, Gen VI. Las resistencias de Acero a Fantasma/Siniestro y el tipo Hada dependen del juego. Límites de especies, formas y estadísticas históricas pertenecen al adaptador. El análisis describe tipos defensivos y cobertura STAB potencial, excluyendo huevos; no simula daño.

## Composición de funciones

El mínimo del workspace recibe perfil, catálogo, almacenamiento manual, reglas de tipos, conocimiento, servicio de movimientos de campo y callback de cambio de juego. Encuentros, obtención, evoluciones pendientes, objetos de zona, megapiedras, guardería, álbum y fuentes sincronizadas son integraciones opcionales. Un servicio puede ser obligatorio para una pantalla sin ser obligatorio para todo juego.

El perfil declara módulos; los servicios proporcionan comportamiento y las capacidades de la fuente declaran lecturas disponibles. Son comprobaciones distintas. Megapiedras se habilita por servicio opcional, sin añadir una obligación a `GameModule`. Un renderer de combate especial no habilita su detección en el lector.

Las firmas están en [contratos](adapter-contracts.md); el orden de implementación, en [nuevo adaptador](new-game-adapter.md). No se debe reconstruir el antiguo `ManualWorkspace` ni duplicar un workspace completo para añadir una pantalla compartida.

## Ciclo de datos

La colección y el equipo manuales permanecen separados de ejemplares sincronizados. Save/Live conservan identidad, especies duplicadas, orden, Pokédex y procedencia de la lectura. `null` significa desconocido/no disponible; una lista vacía representa una lectura vacía confirmada. `seen`, `caught` y propiedad actual son hechos distintos.

Los lectores validan muestras antes de publicarlas. Una lectura parcial conserva el último estado confirmado y expone su antigüedad; no vacía el equipo ni inventa datos sanos. Cajas y equipo pueden tener distinta frescura. El campo de combate identifica propietarios y posiciones: un aliado de historia no pasa a formar parte del equipo persistente del jugador.

Black conserva su pipeline histórico detrás del workspace. X/Y tienen modelos y validadores Save/Live propios. El transporte Live de XY sigue ligado a esas ediciones y no constituye un protocolo genérico para otra generación. Parte de los datos XY reside bajo X. Son límites existentes, no requisitos para adaptadores nuevos.

## Presentación y persistencia

El equipo compacto es flotante solo en la columna derecha. El modo amplio aprovecha ancho y altura, usa motivos por tipo, gris al debilitarse y animación propia del juego. Combate se adapta al ancho real de su contenedor, con densidades para individual, doble y horda. Se respetan movimiento reducido y respaldo estático.

Idioma y tema cambian inmediatamente y se guardan. Los identificadores de dominio y códigos del bridge no se traducen; los recursos ES/EN permanecen reflejados. Las cachés de contenido localizado incluyen el idioma en su clave.

Si falla la cuota, una escritura durable puede desalojar entradas desechables `poke-chose:cache:` y reintentar. Esto reduce la competencia con cachés, pero no garantiza espacio ilimitado ni sobrevive a borrar datos del sitio. Los fallos de guardado deben seguir siendo visibles.

## Operación y evidencia

Los bridges son locales y de solo lectura. Puertos, configuración y comandos por edición: [README](../../README.es.md), [Live](live-reading.md) y [conexiones](reader-connections.md). No se versionan configuraciones privadas, partidas, ROM ni volcados.

[Estado actual](project-status.md) resume soporte y límites. Los registros anteriores mantienen fechas y conteos originales, están clasificados aparte y no sustituyen contratos vigentes. No se exige un framework universal ni migrar código ajeno a la función que se modifica.
