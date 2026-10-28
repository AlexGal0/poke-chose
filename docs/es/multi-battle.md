# Combates sencillos, dobles y hordas

[English](../multi-battle.md)

Estado de la entrega: 28 de octubre de 2026. El soporte de lectura depende del
juego y del lector; cambiar entre Manual, Save y En vivo no cambia sus reglas.

## Soporte actual

| Formato | Pokémon X · Citra en vivo, perfil local | Pokémon Black · lector de combate |
| --- | --- | --- |
| Sencillo | Implementado y comprobado en Citra | Implementado; regresión sintética en esta entrega |
| Doble | Implementado y comprobado en Citra | Declarado por el juego; lector pendiente |
| Horda | Implementado y comprobado en Citra | No disponible en el adaptador de Black |
| Triple y rotatorio | Declarados; sin lector ni vista específica | Declarados; sin lector ni vista específica |

Manual y Save no leen combates en curso. X usa reglas VI, incluido Hada; Black
conserva reglas V, sin Hada y con resistencia de Acero a Fantasma y Siniestro.
El análisis usa tipos y STAB potencial, sin simular movimientos, habilidades,
objetos ni daño exacto. Los huevos se excluyen del análisis.

## Iniciar y conectar X

Requiere Node.js 22.15 o posterior y el perfil de Pokémon X validado localmente
en Citra Nightly 2104. El lector comprueba la huella del juego y utiliza solo
lecturas RPC en `127.0.0.1:45987`. Otras revisiones no se consideran compatibles
por tener direcciones parecidas. Véase el [perfil de Citra](citra-2104-memory.md).

Desde la carpeta del proyecto, con dependencias instaladas (`npm ci`), abre dos
terminales y deja cada proceso funcionando:

```powershell
# Terminal 1: puente X, sin configurar los lectores de Black
npm run bridge:x-live
```

```powershell
# Terminal 2: interfaz
npm run dev
```

Abre `http://127.0.0.1:15300`, elige Pokémon X, selecciona **Citra en vivo
(experimental)** y pulsa **Conectar** en los controles de origen. La pestaña
**Combate** usa el formato confirmado por el lector y permite volver a la vista
anterior. El puente escucha en `127.0.0.1:15305`; Vite lo conecta mediante
`/x-live-api`. No se necesita una configuración de save para esta lectura.

El iniciador habitual también arranca los servicios. Después de actualizar el
lector, cierra el lanzador completo y vuelve a iniciarlo. Si se vuelve a lanzar
sin cerrar los servicios, puede reutilizarse un puente antiguo. Reiniciar solo
un proceso hijo puede detener los otros servicios administrados por ese lanzador.

## Leer la pantalla

- **Sencillo:** tarjeta detallada con tipos, nivel, PS, etapas y acceso a
  estadísticas, junto con debilidades y resistencias.
- **Doble:** dos tarjetas semicompactas por lado, con debilidades y solo las
  etapas modificadas. «Sin cambios» y «Sin datos confirmados» son estados distintos.
- **Horda:** un puesto propio y cinco rivales con tarjetas muy compactas:
  identidad, nivel y PS. La densidad se elige automáticamente según el formato.
- **Equipo:** conserva salud, reservas y todos los activos propios. En dobles y
  hordas no se elige un rival ni se muestran indicadores de comparación.
- **Poké Balls rivales:** representan el total inicial, incluidas las reservas,
  sin revelar sus especies. No disminuyen al debilitarse un rival. Si no se conoce
  el total se muestra como no confirmado.

Los puestos son estables tras un KO. Su numeración usa el orden normalizado de
la tabla de batalla; no equivale a las coordenadas visuales de la horda del juego.
Las columnas se reducen en pantallas estrechas. La interfaz está en español e inglés.

## Lecturas incompletas y límites

Un hueco temporal o desconexión conserva la última sesión y muestra un aviso.
Un puesto desconocido no significa vacío; un reemplazo confirmado no hereda los
PS ni las etapas del ocupante anterior. Solo una salida confirmada limpia la
pelea. El formato no se deduce del número de supervivientes.

Si aparece «Formato de combate por confirmar», espera al menú de turno. Un
selector desconocido permanece sin confirmar, sin representarse como sencillo.
Si solo aparece la interfaz individual después de actualizar, reinicia los
servicios completos. Si falla la huella, no cambies direcciones al azar: el perfil
requiere investigación para esa revisión.

Siguen pendientes aliados de otro entrenador, transformaciones, formatos
especiales y otras revisiones. Las sustituciones rivales con reservas tienen
cobertura sintética y necesitan contraste real adicional. Esta entrega no
implementa triples o rotatorios, aunque permite añadir su presentación después.

## Validación y desarrollo

Última validación del código, paso 9: **481 pruebas**, lint y build correctos.
La [matriz de validación](multi-battle-validation.md) distingue las pruebas
sintéticas, las comprobaciones de interfaz y la lectura real fuera de combate.
En el paso 8 se comprobaron en Citra sencillo, doble y horda tras un KO;
el [registro de X](x-battle.md) conserva esas observaciones y capturas. No se
validó una pelea real de Black durante esta entrega.

- [Contrato y evolución de la implementación](combat-contract.md).
- [Investigación de formatos e identidades de X](x-multi-battle-research.md).
- [Arquitectura vigente](architecture.md).
- [Capturas y procedencia](../../artifacts/README.md).

Los contratos están en `src/games/core/combat.ts`. Las reglas y fuentes entran
por la composición de cada juego; las vistas compartidas no leen memoria ni
importan un adaptador concreto. `FieldBattleScreen` consume el campo normalizado
y `advanceFieldCombatSession` gestiona su continuidad. Black mantiene la ruta
individual anterior durante la migración incremental.

Para añadir un formato especial, declara su capacidad en el juego y registra
por `gameId` e `id` una `SpecialCombatPresentation` con campo, controles y detalles
en la frontera de composición. Esto no habilita el lector: este debe investigarse,
normalizarse y declarar soporte por separado. No hace falta modificar la pantalla
general para registrar la presentación.

El cierre del paso 10 consolida documentación y enlaces. No repite una instalación,
una prueba de emulador ni la suite del paso 9, y no añade dependencias.
