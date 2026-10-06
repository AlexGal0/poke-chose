*English version: [../data-sources.md](../data-sources.md)*

# Fuentes de datos

El modo manual mantiene su colección, edición y persistencia local. `manualTeam` sigue adaptando sus selecciones; no se inventan identidades de ejemplares ni registros de Pokédex para convertir datos manuales en una partida.

Para fuentes externas, implementar `PokemonDataSource` en `src/sources/data-source.ts`. Cada instancia declara un identificador, etiqueta, capacidades de equipo/cajas/Pokédex y una suscripción que devuelve su función de limpieza. Puede ofrecer `reconnect`, utilizado por el botón del lector en vivo. Las instancias deben ser estables entre renders.

Emitir eventos de conexión y snapshots con equipo, cajas, Pokédex, estado, mensaje y fecha. `PokemonSnapshot` reutiliza el formato validado del bridge existente. `null` indica que los datos no están disponibles; una lista vacía indica una lectura válida sin ejemplares. `backup` indica uso de una copia de respaldo; para lectores sin ese concepto, usar `false`.

`subscribeTeamSource` valida los snapshots, resuelve especies y formas con PokéAPI, conserva el último dato válido ante errores y cancela solicitudes al cerrar la suscripción. Una colección requiere equipo y cajas disponibles en la misma muestra; no mezcla fuentes. La Pokédex es independiente: no se deduce del contenido del equipo o PC.

`saveDataSource` contiene exclusivamente el transporte SSE del save. `subscribeSaveTeam` y `useSaveTeam` se conservan como interfaces compatibles. `useTeamSource` permite elegir otro proveedor y mantiene los datos previos separados por instancia; al cambiar de proveedor no presenta el estado del anterior como perteneciente al nuevo.

`liveDataSource` ofrece equipo, cajas y Pokédex por SSE desde el servicio local `bridge/live-server.mjs`. `reconnect` solicita una conexión GDB explícita o reanuda la existente. La interfaz permite pausar el sondeo conservando TCP para evitar el fallo de reconexión del stub observado en melonDS. El servicio conserva la última muestra ante errores y no reconecta GDB automáticamente. Los módulos de lectura compartidos están en `bridge/live`; los comandos de investigación de `experiments/melonds-live` los reutilizan. Manual y save permanecen disponibles.

El servicio consulta equipo y Pokédex cada `fastPollMs` (3000 ms por defecto), y reutiliza las cajas hasta `boxesPollMs` (30000 ms). Los snapshots rápidos incluyen las cajas almacenadas: la fecha del snapshot no indica una nueva lectura del PC. Si cambia la identidad de los integrantes del equipo o los flags de especies capturadas, se exige una nueva lectura de cajas antes de publicar. La primera conexión y cada reanudación también revisan las cajas. Las operaciones GDB son secuenciales; una revisión del PC puede retrasar el siguiente ciclo rápido. `pollMs` conserva compatibilidad como valor común cuando no se especifican los nuevos intervalos.

Los eventos snapshot pueden indicar `connected: false` cuando los datos transportados son la última muestra retenida y el lector está parado. El adaptador distingue la disponibilidad del canal HTTP de la lectura real; no utiliza nombres de proveedores para determinar esta condición.

`SavedPartyMember` admite `currentHp`, `maxHp` y `experience` como campos opcionales para conservar compatibilidad con proveedores antiguos. Si hay PS, ambos campos deben ser enteros entre 0 y 65535 y los actuales no pueden superar el máximo; la experiencia es uint32. `partiesEqual` compara estos campos para que los cambios se propaguen a la interfaz. Los PS no se inventan a partir de las estadísticas base ni se extraen de cajas. La interfaz de equipo resuelve el avance de experiencia con la tabla de crecimiento de la especie; este metadato no bloquea la recepción del equipo.

Los nombres de objetos se resuelven en la interfaz con `getHeldItemName`: índice del juego Gen V → ID de PokéAPI → nombre español, con nombre de recurso como alternativa si falta traducción. Se conserva caché y se comparten consultas simultáneas del mismo objeto. Un fallo permite reintentar sin desconectar el lector. Habilidad y movimientos siguen en los datos, aunque ya no se muestran como IDs en las tarjetas.

La capacidad de combate todavía no existe en el contrato. Su posible incorporación se describe en [viabilidad de combate](battle-feasibility.md); el funcionamiento actual y los límites de los intervalos se detallan en [lectura en vivo](live-reading.md).
