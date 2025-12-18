# Instrucciones Backend: Existencias por Farmacia en Listas Comparativas

## Problema Reportado

El modal de "Más Detalles" en el módulo de Listas Comparativas no está mostrando las existencias por farmacia de los inventarios que se han subido.

## Verificación Requerida

El endpoint `GET /listas-comparativas` debe incluir en cada lista el campo `existencias` que es un array de objetos con la siguiente estructura:

```json
{
  "_id": "...",
  "codigo": "ABC123",
  "descripcion": "Producto X",
  "proveedor": {...},
  "existencias": [
    {
      "farmacia": "farmacia_id_1",
      "farmaciaNombre": "Sur América",
      "existencia": 50
    },
    {
      "farmacia": "farmacia_id_2",
      "farmaciaNombre": "Rapifarma",
      "existencia": 30
    }
  ]
}
```

## Estructura Esperada

Cada objeto en el array `existencias` debe tener:
- `farmacia`: ID de la farmacia (string)
- `farmaciaNombre`: Nombre de la farmacia (string)
- `existencia`: Cantidad disponible en esa farmacia (number)

## Verificación en Backend

1. **Verificar que el helper `obtener_info_inventario` esté funcionando correctamente:**
   ```python
   async def obtener_info_inventario(db, codigo: str):
       """Obtiene el costo y existencias por farmacia de un producto"""
       inventarios = await db.inventarios.find({"codigo": codigo}).to_list(length=None)
       
       if not inventarios:
           return None, []
       
       # Calcular costo promedio
       costos = [inv.get("costo", 0) for inv in inventarios if inv.get("costo", 0) > 0]
       costo_promedio = sum(costos) / len(costos) if costos else None
       
       # Obtener existencias por farmacia
       existencias = []
       farmacias_dict = {}
       
       # Obtener nombres de farmacias
       async for farmacia in db.farmacias.find():
           farmacias_dict[str(farmacia.get("_id", ""))] = farmacia.get("nombre", "")
       
       for inv in inventarios:
           farmacia_id = inv.get("farmacia", "")
           existencia = inv.get("existencia", 0)
           if existencia > 0:
               existencias.append({
                   "farmacia": farmacia_id,
                   "farmaciaNombre": farmacias_dict.get(farmacia_id, farmacia_id),
                   "existencia": existencia
               })
       
       return costo_promedio, existencias
   ```

2. **Verificar que el helper `lista_precio_helper` incluya las existencias:**
   ```python
   def lista_precio_helper(lista_precio, proveedor=None, costo=None, existencias=None) -> dict:
       # ... código existente ...
       
       # Asegurarse de incluir existencias
       resultado["existencias"] = existencias if existencias else []
       
       return resultado
   ```

3. **Verificar que el endpoint `GET /listas-comparativas` llame a estos helpers:**
   ```python
   @router.get("", response_model=List[dict])
   async def obtener_listas_comparativas(...):
       # ... código existente ...
       
       async def obtener_lista_con_inventario(lista_precio):
           proveedor = proveedores_map.get(str(lista_precio["proveedorId"]))
           costo, existencias = await obtener_info_inventario(db, lista_precio["codigo"])
           return lista_precio_helper(lista_precio, proveedor, costo, existencias)
       
       # Procesar en paralelo
       listas_con_inventario = await asyncio.gather(*[
           obtener_lista_con_inventario(lista) for lista in listas_precios
       ])
       
       return listas_con_inventario
   ```

## Verificación de Datos

1. **Verificar que existan inventarios en la base de datos:**
   ```javascript
   // En MongoDB
   db.inventarios.find({}).limit(5)
   ```

2. **Verificar que los códigos coincidan:**
   ```javascript
   // Verificar que un código de lista comparativa tenga inventarios
   db.inventarios.find({ codigo: "ABC123" })
   ```

3. **Verificar que las farmacias tengan nombres:**
   ```javascript
   db.farmacias.find({})
   ```

## Debugging

Si las existencias no aparecen, verificar:

1. ✅ ¿Los inventarios tienen el campo `codigo` que coincide con las listas?
2. ✅ ¿Los inventarios tienen el campo `farmacia` con IDs válidos?
3. ✅ ¿Los inventarios tienen el campo `existencia` con valores > 0?
4. ✅ ¿El helper `obtener_info_inventario` está siendo llamado?
5. ✅ ¿El helper `lista_precio_helper` está incluyendo las existencias en el resultado?
6. ✅ ¿El endpoint está retornando las existencias en la respuesta JSON?

## Ejemplo de Respuesta Esperada

```json
[
  {
    "_id": "60d5ec49f1b2c72b8c8e4f1a",
    "codigo": "ABC123",
    "descripcion": "Producto X",
    "proveedor": {
      "_id": "60d5ec49f1b2c72b8c8e4f1b",
      "nombreJuridico": "Proveedor Y"
    },
    "precio": 100,
    "precioNeto": 90,
    "existencias": [
      {
        "farmacia": "01",
        "farmaciaNombre": "Sur América",
        "existencia": 50
      },
      {
        "farmacia": "02",
        "farmaciaNombre": "Rapifarma",
        "existencia": 30
      }
    ]
  }
]
```

## Nota Importante

El frontend está esperando que **todas** las listas comparativas incluyan el campo `existencias`, incluso si está vacío (`[]`). Si una lista no tiene inventarios, debe retornar `existencias: []` en lugar de omitir el campo.

