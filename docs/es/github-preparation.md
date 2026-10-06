# Preparar el repositorio para GitHub

## Archivos incluidos y excluidos

Se mantienen el código, los tests y generadores de fixtures sintéticos, `package-lock.json`, configuraciones `*.example.json`, documentación y capturas/scripts de comprobación en el nivel superior de `artifacts/`.

`.gitignore` excluye dependencias, builds, cobertura, cachés, logs, archivos temporales, configuraciones `*.local.json`, variables de entorno privadas, claves, ROMs, partidas, savestates, volcados binarios, perfiles de navegador dentro de `artifacts/` y resultados de investigación de `experiments/melonds-live/artifacts/`.

`.gitattributes` normaliza finales de línea de código y documentación a LF y del lanzador `.cmd` a CRLF. Las imágenes se tratan como archivos binarios.

## Limpiar archivos ya versionados

Un `.gitignore` no retira archivos que ya están en el índice. En este checkout se detectó Git en la carpeta superior y 1.523 archivos de un perfil de Chrome ya versionados. No se pudieron retirar desde el entorno de edición porque no permite escribir en ese índice Git.

Desde una terminal propia, situada en la carpeta que contiene `package.json`, revisa primero:

```powershell
git rev-parse --show-toplevel
node scripts/prepare-git.mjs --dry-run
```

Para retirar del índice únicamente los archivos versionados que coinciden con las exclusiones actuales:

```powershell
node scripts/prepare-git.mjs --apply
git status --short
```

El script conserva los archivos locales y no crea commits ni cambia remotos. Actúa solo dentro de la carpeta de este proyecto. Si Git indica propiedad dudosa, usa tu terminal con el usuario propietario del repositorio.

Después, revisa y prepara los cambios de este proyecto:

```powershell
git add -- .
git diff --cached --stat
git diff --cached --check
```

Comprueba también cualquier cambio previamente preparado en otras carpetas si el repositorio está en la carpeta superior. Decide si quieres publicar ese repositorio completo o alojar PokéChose en uno independiente antes de configurar el remoto.

## Historial existente

Retirar un archivo del índice evita incluirlo en el próximo commit, pero no lo elimina de commits anteriores. El commit inicial existente contiene el perfil de Chrome mencionado. Para una primera publicación limpia, utiliza una copia nueva con solo los archivos que deban publicarse e inicia allí un repositorio nuevo, o depura el historial antes de subirlo. No copies `.git`, perfiles de navegador ni archivos locales a esa copia.

No se modificó el historial, no se creó un remoto y no se realizó un push durante esta preparación. Las reglas se verificaron con `git check-ignore --no-index`; las plantillas, el código y el lockfile permanecen fuera de las exclusiones.
