# Bolsa para evoluciones (Pokémon Black)

Implementación original de solo lectura. Referencias del formato, sin copiar código de PKHeX:
- https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Access/SaveBlockAccessor5BW.cs
- https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Items/Bags/PlayerBag5BW.cs
- https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Substructures/Inventory/Pouch/InventoryPouch4.cs

Bloque 25: 0x18400, longitud 0x9c0; CRC local 0x18dc2 y espejo 0x23f32. Entrada backup +0x24000. Bolsillo Objetos: primeros 0x4d8 bytes, pares u16 little-endian identificador/cantidad (máximo 999). Solo se publica este bolsillo, que contiene los objetos evolutivos; no incluye medicinas, bayas, MT/MO u objetos clave. Vacío confirmado es []; error/corrupción es null. Un fallo de bolsa no descarta equipo, cajas o Pokédex ni mezcla la bolsa de otra entrada.

El watcher detecta cambios exclusivos de inventario. El contrato admite snapshots anteriores sin bolsa. La vista conserva el último inventario marcado como desactualizado ante errores y suma los objetos equipados del mismo save, no los de una captura live diferente.

Validación real: CRC principal y espejo válidos, sin backup. El usuario confirmó Piedra Fuego ×2 y Piedra Agua ×1 frente al juego. No se escribió en el save ni RAM. Tests sintéticos: tamaño, cantidades inválidas, corrupción aislada, vacío y contrato legado.
