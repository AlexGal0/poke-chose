# Añadir un adaptador de juego desde cero

Actualizado: 14 de noviembre de 2026. [English](../new-game-adapter.md) · [Contratos](adapter-contracts.md) · [Arquitectura](architecture.md).

El primer entregable es un workspace manual con reglas correctas y estado aislado. No necesita lector de save, memoria, guardería, megas ni un atlas incompleto presentado como terminado. Antes de crear código, declara qué edición, revisión y fuentes se pretende soportar.

## 1. Definir el alcance

Anota generación, límite de especies, Pokédex regional, formas válidas, tabla de tipos, grupo de versión, procedencia de datos y recursos visuales. Decide qué sistemas no existen en el juego y cuáles existen pero todavía no se implementan. No son la misma situación.

| Etapa | Crear o conectar | Condición de salida |
| --- | --- | --- |
| A · Manual | Perfil, registro lazy, catálogo, reglas, almacenamiento, conocimiento, movimientos de campo | Catálogo, colección/equipo y fichas con datos históricos correctos; edición y persistencia aisladas. |
| B · Guías | Atlas, obtención, evoluciones pendientes, objetos, álbum o megas según alcance | Cada servicio opcional tiene datos verificables, idioma y estados desconocidos definidos. |
| C · Save | Parser validado, transporte y resolución de ejemplares | Lectura estable de las capacidades anunciadas; cero escrituras a la partida. |
| D · Live y combate | Perfil de memoria, normalización y capacidades por lector | Edición/revisión confirmadas, recuperación y formatos validados; separar pruebas sintéticas de reales. |

No es obligatorio entregar las etapas B–D para considerar útil el modo manual.

## 2. Registrar el juego sin duplicar pantallas

1. Amplía `GameId` y añade `GameProfile` en [profiles.ts](../../src/games/profiles.ts). Incluye todas las claves de `modules`. Usa `unplannedModules` para sistemas que no se van a implementar; no para ocultar fallos de una función anunciada.
2. Añade nombres de juego y región en ambos JSON de `src/i18n/locales/`. Los identificadores técnicos son estables.
3. Añade un workspace por importación `lazy` en [App.tsx](../../src/App.tsx). El selector usa `GamePreparation` si no hay implementación; un flag por sí solo no crea una pantalla.
4. Si hay portada, impórtala en [GameSelection.tsx](../../src/components/GameSelection.tsx) y colócala en `src/assets/games/`. Sin portada se puede usar el símbolo del perfil.

Estructura sugerida, no una obligación de nombres:

```text
src/games/<juego>/
  NewGameWorkspace.tsx       # composición; no lógica binaria en componentes
  catalog.ts                # CatalogRules + CatalogService
  knowledge.ts              # KnowledgeRules + KnowledgeService
  collection-service.ts     # FieldMoveService
  rules.ts                  # TypeRules si no coincide una tabla existente
  # después, solo si se implementan:
  saved-roster.ts
  encounters.ts
  acquisition.ts
  battle-source.ts
  combat-capabilities.ts
```

Almacenamiento manual puede componerse con `createManualStorage(catalog.rules)` sin otro archivo. Una función de `src/games/xy/` solo es reutilizable si las reglas y formatos coinciden; no es el punto de partida de una generación distinta.

## 3. Implementar las dependencias iniciales

Consulta la [matriz de props obligatorias](adapter-contracts.md#lo-obligatorio-para-montar-gameworkspace).

- `CatalogService.list/get`: especies del catálogo, tipos y variedad correctos. Prueba al menos una especie antigua regional, una forma y una especie fuera de alcance.
- `KnowledgeService.stats/moves/evolution`: no reutilizar potencia moderna o métodos añadidos después de la edición. Mantener `locale` y cancelación.
- `TypeRules`: verificar un cruce que diferencie la generación; por ejemplo Acero frente a Fantasma/Siniestro en V y VI.
- `FieldMoveService`: declarar la lista real o una lista legítimamente vacía. No confundir MT compatible con movimiento aprendido.
- `ManualCollectionStorage`: clave por juego y retorno booleano de escritura. No cambiar la clave histórica de otro adaptador.

Esqueleto **de composición**, para un archivo bajo `src/games/<juego>/`. No es un proveedor de datos ni un nuevo contrato público; `adapter` agrupa las implementaciones que acabas de crear:

```tsx
import type { ComponentProps } from 'react'
import { GameWorkspace } from '../core/GameWorkspace'

type InitialAdapter = Pick<ComponentProps<typeof GameWorkspace>,
  'game' | 'catalog' | 'storage' | 'typeRules' | 'knowledge' | 'fieldMoveService'>

export function InitialWorkspace({ adapter, onChangeGame }: {
  adapter: InitialAdapter
  onChangeGame: () => void
}) {
  return <GameWorkspace {...adapter} onChangeGame={onChangeGame} />
}
```

En el workspace registrado normalmente importarás esos servicios locales y los pasarás directamente, como hacen Black, X e Y. No añadas una factoría universal para envolver esta agrupación ilustrativa.

## 4. Habilitar opciones por contrato

No montes servicios no implementados. `evolutionRequirements` es distinto de la evolución individual. `zoneItems` requiere un atlas con zonas compatibles. `megaEvolutions` no pertenece a `GameModule`: se habilita solo al inyectar su servicio. Guardería requiere lectura y servicio, además de la disponibilidad de módulo.

Capturas manuales requieren `browseEncountersInManual`; esa prop solo habilita la consulta de la guía, nunca fabrica una Pokédex. `CatalogService.animation` es opcional; debe conservar sprites de la edición y sus formas. Las preferencias visuales no deben introducir reglas de juego dentro de la UI.

## 5. Añadir una fuente de save

- Detectar tamaño, edición y estructura; validar integridad antes de publicar. Usar fixtures sintéticos para datos corruptos, copia de respaldo y escritura parcial.
- Implementar las partes necesarias de `SavePokedexReader` o una frontera equivalente si el formato lo requiere. Su contrato requiere Pokédex; no es un parser universal de cualquier juego.
- Resolver especie y forma con `SavedRosterService`; mantener duplicados e identidad. No transformar la colección manual en una lista de ejemplares ficticios.
- Declarar capacidades reales: equipo sin cajas no es colección completa; `null` no es `[]`.
- Crear fuente estable con cleanup, enganchar hooks solo para el modo seleccionado y pasar el resultado a `GameWorkspace.captureSource`.
- Si hay nuevo servicio local: añadir comando a `package.json`, proxy de desarrollo **y preview** en `vite.config.ts`, integración intencional con `scripts/start-save.mjs`, configuración de ejemplo y claves de mensajes ES/EN. No versionar configuraciones privadas, partidas ni dumps.

[Fuentes y transporte](data-sources.md) describe las implementaciones actuales y sus límites. `createLivePartySource` no es un helper genérico para un juego nuevo: su unión de IDs y validadores siguen ligados a X/Y.

## 6. Añadir Live o combate solo con evidencia

Separar capacidades del juego y del lector. Confirmar edición/revisión mediante el perfil correspondiente; leer memoria válida de otro juego no es una conexión válida. Las fuentes deben informar fecha y vigencia por capacidad cuando sus cadencias difieran.

Para un lector nuevo, preferir `FieldCombatReading` con `CombatField` cuando encaje. Mantener formato, propietarios y puestos estables. Un compañero no pertenece a tu equipo. Salud/etapas desconocidas no son cero. Un cambio de forma activo debe conservar la identidad del ejemplar y validarse contra reglas/datos del juego. Un formato especial puede requerir una presentación opcional; no anunciar lectura solo por registrar un renderizador.

Conectar el callback de `battlePanel` con `BattleScreen`/`FieldBattleScreen` para conservar entrada automática, aviso flotante, retención de sesiones y retorno a la vista previa. Los endpoints siguen fuera de componentes compartidos.

## 7. Comprobar aislamiento, idioma y límites

- Cambiar entre juegos y Manual/Save/Live sin reutilizar colección, fecha o estado de otro ámbito.
- Diferenciar visto, capturado y poseído actualmente; huevos fuera de análisis.
- Verificar faltante, vacío confirmado, desactualizado, error y recuperación de cada capacidad activada.
- Cancelar suscripciones/resoluciones al salir; una respuesta tardía no debe poblar otro workspace.
- Probar español/inglés y cacheado traducido; fallos de localStorage deben mostrar avisos.
- Probar modos compacto/amplio, ancho intermedio y móvil; animación ausente, reducido movimiento y debilitado si se usan sprites animados.

## 8. Documentar y cerrar el bloque

Ejecutar `npm test`, `npm run lint` y `npm run build`. Añadir pruebas focalizadas de reglas, parsers y contratos tocados, incluyendo diferencias con adaptadores existentes. Registrar revisión visual y procedencia de fixtures. Un lector experimental sigue siéndolo aunque el build pase.

Actualizar [estado actual](project-status.md), matriz de soporte de README, [fuentes](data-sources.md), configuración y [catálogo de contratos](adapter-contracts.md) si cambió una frontera. Crear una nota específica del adaptador para procedencia y validación real, enlazada desde el [índice](README.md). Los registros históricos no sustituyen instrucciones actuales de instalación.
