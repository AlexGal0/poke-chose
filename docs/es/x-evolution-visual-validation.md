# Vista de evoluciones de X

La ficha compartida usa tarjetas por etapa, tipos, especie consultada resaltada,
requisitos junto a flechas y ramas independientes. En pantallas estrechas el árbol
se organiza verticalmente. La información evolutiva y sus reglas no cambian.

El contrato de conocimiento admite un mapa opcional de apariencias normalizadas.
El adaptador X proporciona solo las especies de la familia con sprites locales y
tipos Gen VI. La presentación no importa APIs ni direcciones propias de X y sigue
DiscoveryContext: visto o capturado permite imagen; una especie desconocida muestra
un signo de interrogación. Black mantiene su proveedor existente, cuya extracción
no es necesaria para este cambio visual.

Validación de esta sesión: 310 pruebas correctas, incluidas apariencias locales de
Ralts/Kirlia/Gardevoir/Gallade y tipos Psíquico/Hada frente a Psíquico/Lucha. Lint y
build correctos. Verificación UI con datos reales de Pokédex de Citra y familias
públicas de PokéAPI: Ralts descubierto con imagen; sus evoluciones desconocidas
sin imagen; dos ramas con nivel 30 o Piedra Alba y macho. Farfetchd presenta una
sola tarjeta y aviso de ausencia de ramas compatibles. Inglés y español, cierre
con Escape y retorno del foco comprobados. A 390 × 844, el diálogo tiene ancho y
scrollWidth de 320 px: sin desbordamiento horizontal.

Evidencias locales ignoradas: artifacts/x-evolution/ralts-desktop.png y
artifacts/x-evolution/ralts-mobile.png. No se escribieron saves ni memoria.
