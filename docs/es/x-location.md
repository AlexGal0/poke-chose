# Seguimiento de ubicación de Pokémon X

Decisiones generales y responsabilidades compartidas: [arquitectura de PokéChose](architecture.md).

El origen Citra en vivo ofrece ubicación al motor compartido de Capturas. Manual y Save mantienen la selección manual: un guardado no representa la ubicación actual del personaje.

## Lectura y correspondencia

El perfil local de Pokémon X en Citra Nightly 2104 utiliza el mapa de 16 bits en `0x08C67180` y una copia independiente en `0x08C6709E`. El lector exige que ambas copias coincidan en dos muestras consecutivas. Comprueba además dirección y coordenadas finitas dentro de límites; solo publica el ID del mapa. Una discrepancia o lectura incompleta publica posición no confirmada sin bloquear equipo, cajas o combate. La comprobación del perfil del ejecutable sigue siendo obligatoria. Estas direcciones no se declaran compatibles con Pokémon Y ni con otras revisiones.

`map-zones.json` relaciona los 360 mapas internos con 63 zonas del atlas de X. Se genera con `scripts/update-x-map-zones.ts` a partir de la [tabla pública de mapas y ubicaciones de ROMFS](https://seatgem.com/2021/12/pokemon-x-and-y-romfs-a-folder-content-notes.html), con equivalencias explícitas para interiores, puertas y salas. Los interiores se agrupan con su zona principal; por ejemplo, el acuario pertenece a Pueblo Petroglifo. Huerto de bayas comparte mapa con Ruta 7; los encuentros errantes y hoteles itinerantes son agrupaciones, no mapas individuales. Esas tres opciones siguen disponibles mediante selección manual.

## Comportamiento compartido

- Activar «Seguir ubicación» selecciona la zona confirmada y sigue los cambios del personaje.
- Elegir otra zona manualmente pausa el seguimiento. Reactivarlo vuelve a la ubicación detectada.
- Una lectura incompleta, desconectada o un mapa desconocido conserva la última zona confirmada de esa misma fuente. No se inventan ubicaciones.
- La conversión de mapas pertenece al adaptador X. El estado, navegación y filtros utilizan el mismo motor de capturas que Black. Un cambio efectivo de zona limpia búsqueda de especie y método, conservando progreso y acceso.

## Validación real

Se contrastaron, sin guardar ni escribir memoria: acuario de Petroglifo (`48`), exterior del pueblo (`45`) y Ruta 8 (`266`). La interfaz detectó Ruta 8, la seleccionó al activar seguimiento y cambió automáticamente a Pueblo Petroglifo al regresar al acuario. Los dos mapas del pueblo resuelven la misma zona del atlas (`614`).

Las pruebas sintéticas cubren copias discrepantes, cambio durante lectura, mapas desconocidos, mapa cero válido, protocolo compatible con snapshots anteriores y posición no confirmada independiente del resto de datos. La tabla completa tiene cobertura de correspondencia con zonas registradas; no se recorrieron físicamente los 360 mapas.

También se comprobó en la interfaz que seleccionar Ruta 2 pausa el seguimiento y mantiene esa selección durante las lecturas; reactivarlo devuelve Pueblo Petroglifo. La vista de 390×844 no presenta desbordamiento horizontal. Capturas actuales: `artifacts/x-location/desktop.png` y `mobile.png`.

Validación final: 358 pruebas correctas, `npm run lint` y `npm run build` correctos. Las pruebas de servidores locales requirieron ejecutarse fuera del aislamiento de red. No se modificaron saves ni memoria y no se añadieron dependencias.
