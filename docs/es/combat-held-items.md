# Objetos equipados en combate

El contrato compartido `CombatParticipant.heldItemId` lleva un índice de objeto del adaptador: cero confirma ausencia; null o campo ausente significa lectura desconocida. `CombatService.resolveHeldItem` convierte un índice confirmado en `{ name, icon }` para el idioma solicitado. La presentación no interpreta índices ni selecciona juegos. El servicio es opcional para consumidores anteriores.

Black obtiene el índice del PK5 confirmado del rival y exige concordancia entre lecturas y copias. X lo obtiene del PK6 vinculado a cada posición y lo transporta en el campo y en el contrato anterior de combate. No se infiere un objeto por especie ni por probabilidades de encuentro.

La tarjeta compartida muestra un icono en su esquina superior derecha en sus tres densidades. El nombre se consulta al enfocar o señalar el indicador; si falta imagen, conserva un marcador accesible. Cero o desconocido no muestran un objeto. Las respuestas de resolución anteriores no sustituyen el objeto o idioma actual. Las fichas públicas de objetos y sus sprites se consultan mediante el servicio del adaptador y se cachean por idioma.

Esta lectura procede de las copias PK5/PK6; no se ha validado todavía en una partida real si dichas copias reflejan inmediatamente consumo, robo o intercambio durante el turno. No se garantiza seguimiento del objeto efectivo tras esos cambios hasta contrastarlo con memoria real. No se escribe en memoria ni en el save. Reiniciar el lector de batalla Black y el servicio live de X para cargar los nuevos campos.

## Validación del 3 de noviembre de 2026

512 pruebas correctas, ESLint y build correctos. La suite se ejecutó fuera del aislamiento por sus servidores locales y reemplazos de archivos sintéticos. Vista temporal sobre Vite existente: icono y nombre accesible confirmados en tarjetas detallada, semicompacta y compacta, incluida revisión a 390×844. Datos sintéticos de Trubbish con Baya Aranja; no se usó un encuentro real. Vista temporal eliminada tras comprobarla.

El indicador también se alimenta para el Pokémon activo del jugador. Black transporta el objeto de las copias PK5 confirmadas del campo, con concordancia independiente del objeto; X conserva el campo tanto en su protocolo de posiciones como en la lectura anterior. Se añadieron pruebas del lector propio de Black y de la normalización propia de ambos adaptadores: 515 pruebas correctas. La presentación compartida no cambia.
