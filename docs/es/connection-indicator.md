# Indicador compartido de conexión

El botón flotante de estado funciona en Black y X mediante `ConnectionStatus` (`src/models/connection-status.ts`). Recibe modo manual, una lista de lecturas declaradas, sus etiquetas/mensajes localizados, estado y fecha de última lectura. La acción para abrir controles se inyecta como callback.

`ConnectionIndicator` no recibe snapshots, IDs de juego, fuentes ni endpoints. No consulta lectores ni presupone un número fijo de conexiones. El color se deriva mediante `connectionStatusColor`: manual, conectado, parcial, esperando o desconectado. El panel usa IDs propios por instancia y conserva apertura/cierre nativos de popover, Escape y acceso por teclado.

Cada lectura puede declarar `affectsSummary: false`. Sigue visible con su mensaje y fecha, pero no modifica el color global. El adaptador X aplica esto a las cajas: su lectura periódica, actualización o antigüedad no convierten una conexión principal correcta en amarilla o roja.

## Adaptadores

- Black normaliza sus fuentes manual/save/live desde su workspace. En vivo conserva los lectores general y de combate independientes; ambos contribuyen al color. El lector histórico y sus hooks permanecen específicos de Black, fuera del componente compartido.
- X normaliza los estados de sus snapshots actuales. Manual no hereda datos de otras fuentes; Save muestra una lectura de guardado; En vivo muestra conexión principal y cajas con fechas independientes. No se inventa un segundo transporte para combate, que comparte la conexión Citra.

El botón «Ir a controles de conexión» abre todos los `details` ancestros del contenedor y enfoca el selector de origen. Esto cubre los controles anidados del workspace X, incluso si estaban plegados. El componente solo ejecuta el callback recibido; esa navegación DOM queda en la integración de la aplicación.

No se añadieron sondeos, conexiones, protocolos ni acciones de emulador. El indicador consume las suscripciones existentes y se actualiza con el idioma de la interfaz.

## Validación del 25 de octubre de 2026

- 394 pruebas, lint y build correctos. Las pruebas nuevas cubren agregación de lecturas arbitrarias, exclusión de lecturas informativas, diferencias Black/X, separación de Manual/Save/Live, conexión en curso, desconexión, recuperación y fechas independientes.
- Fixtures UI: manual, conectando, conectado con cajas antiguas, parcial con dos lectores independientes y desconectado. Cierre con Escape y navegación a controles con dos `details` inicialmente cerrados; ambos se abren y el selector recibe foco.
- Español e inglés y viewport 390×844 verificados. El panel de 340 px cabe dentro del viewport; la interfaz real de X no presenta desbordamiento horizontal (documento/scrollWidth 375 px).
- Fuente real X: botón verde con lector en vivo conectado y cajas sin lectura actual, mostrando cada fecha por separado. Se comprobó también Save conectado, modo manual y restauración de En vivo. No se modificó la partida ni se simuló un fallo de Citra real.

Evidencias: `artifacts/x-connection-indicator.png` y `artifacts/x-connection-indicator-mobile.png`. La regresión de los dos lectores Black se cubrió con pruebas y fixtures del contrato, sin una nueva sesión real de melonDS en esta entrega.
