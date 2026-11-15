# Revisión de documentación: 14 de noviembre de 2026

[English](../documentation-review-2026-11-14.md) · [Índice](README.md).

## Alcance

Se actualizaron README en ambos idiomas, arquitectura, fuentes, operación Live, diagnóstico de conexiones y combate para Black/X/Y. Se añadieron estado actual, referencia de contratos y guía por etapas para un adaptador nuevo, con dependencias mínimas, servicios opcionales, capacidades y semántica de datos desconocidos/vacíos/desactualizados. `AGENTS.md` corrigió su descripción inicial y reglas por generación sin cambiar la política de trabajo.

Los índices inventarían todas las páginas de `docs/`. Los registros técnicos y de implementación mantienen sus resultados originales y añaden alcance/fecha y enlaces al estado vigente. Las notas de megas, objetos, aliados y contratos antiguos incluyen una aclaración actual antes de la entrega original. No se reescribieron offsets binarios ni se repitió evidencia real para aparentar compatibilidad ampliada.

## Comprobaciones realizadas

- Auditoría de 98 páginas Markdown: 671 enlaces locales y sus anclas, sin destinos faltantes. Incluye README, AGENTS, documentación y retención de artefactos; no verifica disponibilidad de enlaces web externos ni archivos citados como texto histórico.
- El ejemplo TSX de composición de la guía de nuevo adaptador compila con TypeScript y las opciones del proyecto, sustituyendo únicamente la ruta de importación por la ubicación temporal de comprobación.
- `npm test`: 573/573 correctas con sockets locales permitidos. El intento restringido dio 550 correctas y 23 fallos HTTP/UDP; la repetición fuera de esa restricción pasó completa.
- `npm run lint`: correcto.
- `npm run build`: correcto; permanece el aviso de chunks mayores de 500 kB.
- `git diff --check`: revisado al cerrar la actualización.

Solo documentación: no hubo cambios de aplicación, partidas, configuración privada ni nuevas pruebas visuales o de emulador. Las referencias a lecturas reales y montajes sintéticos anteriores siguen perteneciendo a sus propios registros.
