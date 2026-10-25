# Preparación de la guardería compartida

Registro de la preparación inicial. La implementación posterior habilitó la guardería de X y añadió géneros, avisos de huevo y eclosión. Para el estado actual, consulta el [resumen consolidado](changes-2026-10-25.md) y la [guardería de X](x-daycare.md). La disponibilidad y el recuento de pruebas descritos debajo corresponden a esta primera etapa.

La pantalla `Daycare`, el indicador de evolución y el acceso flotante consumen ahora `DaycareReading` y `DaycareService` (`src/games/core/daycare.ts`). La presentación no importa APIs de Black, fuentes de equipo ni el contexto de evolución histórico. El workspace elige el adaptador y la acción para abrir evoluciones.

El contrato distingue capacidad disponible, dato desconocido, espacios libres confirmados y última lectura desactualizada. Los ejemplares llevan experiencia total actual; el adaptador Black suma experiencia original y ganada sin modificar el snapshot. Resolución de nombre/forma/sprite, tabla de experiencia y siguiente evolución por nivel simple pertenecen al servicio del juego. Las respuestas asíncronas se acotan al servicio y especie para no mostrar datos de otro adaptador durante su cambio.

Black conecta su servicio y normalizador desde `src/games/black/daycare.ts`; `BlackDaycare` conserva la integración con EvolutionProvider dentro de ese proveedor. No cambia el protocolo de save/live ni su validación Gen V. En esta etapa inicial X todavía tenía la guardería deshabilitada: la preparación no añadió sus lectores ni direcciones de memoria; la entrega posterior se documenta en [guardería de X](x-daycare.md).

La pantalla conserva dos espacios, huevo pendiente, progreso y aproximación de un paso por punto de EXP, nivel máximo y alertas de evolución simple. No se pretende cubrir aquí juegos con otras mecánicas de depósito. Se reutiliza el tipo de tabla ExperienceLevel existente; su ubicación histórica en api/experience.ts es una dependencia solo de tipos, sin llamadas de red desde la pantalla. Los modelos y validadores del transporte histórico de Black permanecen específicos de ese juego.

## Validación de esta entrega

- 369 pruebas correctas, incluidas dos nuevas sobre normalización sin mutación y estados de disponibilidad. La suite completa requirió ejecución fuera del sandbox por sus pruebas de HTTP/UDP y archivos temporales.
- `npm run lint` y `npm run build` correctos.
- Navegador: integración de Black en modo manual; fixtures sintéticos con ocupado, espacio libre, huevo pendiente, EXP 75/100, 25 pasos, aviso de evolución y acción de apertura; vacío confirmado, lectura desconocida y conservación desactualizada sin acceso flotante.
- Revisión visual en escritorio y en iframe de 390 px. Captura de escritorio: `artifacts/daycare-preparation-desktop.png`. No se validó con un save real ni una sesión real de emulador en esta entrega.
