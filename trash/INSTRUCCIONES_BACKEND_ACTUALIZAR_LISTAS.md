# Instrucciones Backend: Actualizar Listas de Precios (Comparación y Detección de Cambios)

## Resumen
El sistema debe permitir **actualizar** listas de precios en lugar de eliminarlas, comparando con la lista anterior para detectar:
- Productos nuevos (no estaban en la lista anterior)
- Cambios de precio (subió, bajó, igual)
- Guardar precio anterior para comparación

## Cambios en el Modelo de Datos

### Actualizar el esquema de `ListaPrecioItem`:

```python
{
    "_id": ObjectId,
    "proveedorId": ObjectId,
    "codigo": str,
    "descripcion": str,
    "laboratorio": str,
    "precio": float,
    "descuento": float,  # Porcentaje de descuento del Excel
    "precioNeto": float,  # precio * (1 - descuento/100) * (1 - descuentosComerciales/100)
    "precioAnterior": float | None,  # NUEVO: Precio neto anterior para comparación
    "fechaVencimiento": datetime | None,
    "existencia": int,  # Existencia del proveedor (del Excel)
    "miCosto": float | None,  # Costo del producto en mi inventario
    "existencias": [  # Existencias por farmacia (del inventario)
        {
            "farmacia": str,
            "farmaciaNombre": str,
            "existencia": int
        }
    ],
    "esNuevo": bool,  # NUEVO: True si no estaba en la lista anterior
    "cambioPrecio": str | None,  # NUEVO: 'bajo', 'subio', 'igual'
    "fechaCreacion": datetime,
    "fechaActualizacion": datetime,
    "versionLista": int,  # NUEVO: Número de versión de la lista (incrementa cada actualización)
}
```

## Nuevo Endpoint: Actualizar Lista de Precios

### `POST /listas-comparativas/excel` (Modificado)

**Cambio principal:** En lugar de eliminar las listas anteriores del proveedor, comparar y actualizar.

**Lógica:**

1. **Obtener lista anterior del proveedor:**
   ```python
   lista_anterior = list(db.listas_precios_proveedores.find({
       "proveedorId": ObjectId(proveedor_id)
   }))
   ```

2. **Crear mapa de productos anteriores** (por código + descripción + laboratorio):
   ```python
   productos_anteriores = {}
   for item in lista_anterior:
       clave = f"{item['codigo'].lower().strip()}|{item['descripcion'].lower().strip()}|{item.get('laboratorio', '').lower().strip()}"
       productos_anteriores[clave] = item
   ```

3. **Procesar Excel y comparar:**
   ```python
   nuevos_items = []
   for row in excel_data:
       codigo = str(row.get('CODIGO', '')).strip()
       descripcion = str(row.get('DESCRIPCION', '')).strip()
       laboratorio = str(row.get('LABORATORIO', '')).strip()
       precio = float(row.get('PRECIO', 0))
       descuento = float(row.get('DESCUENTO', 0))
       existencia = int(row.get('EXISTENCIA', 0))
       
       # Calcular precio neto
       descuento_comercial = proveedor.get('descuentosComerciales', 0)
       precio_neto = precio * (1 - descuento / 100) * (1 - descuento_comercial / 100)
       
       clave = f"{codigo.lower()}|{descripcion.lower()}|{laboratorio.lower()}"
       
       # Buscar en lista anterior
       item_anterior = productos_anteriores.get(clave)
       
       if item_anterior:
           # Producto existente - actualizar
           precio_anterior = item_anterior.get('precioNeto')
           cambio_precio = None
           if precio_anterior:
               if precio_neto < precio_anterior:
                   cambio_precio = 'bajo'
               elif precio_neto > precio_anterior:
                   cambio_precio = 'subio'
               else:
                   cambio_precio = 'igual'
           
           nuevo_item = {
               "_id": item_anterior['_id'],  # Mantener mismo ID
               "proveedorId": ObjectId(proveedor_id),
               "codigo": codigo,
               "descripcion": descripcion,
               "laboratorio": laboratorio,
               "precio": precio,
               "descuento": descuento,
               "precioNeto": precio_neto,
               "precioAnterior": precio_anterior,  # Guardar precio anterior
               "fechaVencimiento": parsear_fecha(row.get('FECHA DE VENCIMIENTO')),
               "existencia": existencia,
               "miCosto": item_anterior.get('miCosto'),  # Mantener costo del inventario
               "existencias": item_anterior.get('existencias', []),  # Mantener existencias del inventario
               "esNuevo": False,  # No es nuevo
               "cambioPrecio": cambio_precio,
               "fechaCreacion": item_anterior.get('fechaCreacion'),  # Mantener fecha original
               "fechaActualizacion": datetime.utcnow(),
               "versionLista": item_anterior.get('versionLista', 0) + 1,  # Incrementar versión
           }
       else:
           # Producto nuevo
           nuevo_item = {
               "proveedorId": ObjectId(proveedor_id),
               "codigo": codigo,
               "descripcion": descripcion,
               "laboratorio": laboratorio,
               "precio": precio,
               "descuento": descuento,
               "precioNeto": precio_neto,
               "precioAnterior": None,
               "fechaVencimiento": parsear_fecha(row.get('FECHA DE VENCIMIENTO')),
               "existencia": existencia,
               "miCosto": None,  # Se obtendrá después del inventario
               "existencias": [],  # Se obtendrá después del inventario
               "esNuevo": True,  # Es nuevo
               "cambioPrecio": None,
               "fechaCreacion": datetime.utcnow(),
               "fechaActualizacion": datetime.utcnow(),
               "versionLista": 1,
           }
       
       nuevos_items.append(nuevo_item)
   ```

4. **Eliminar productos que ya no están en la nueva lista:**
   ```python
   # Obtener claves de productos nuevos
   claves_nuevos = set()
   for item in nuevos_items:
       clave = f"{item['codigo'].lower().strip()}|{item['descripcion'].lower().strip()}|{item.get('laboratorio', '').lower().strip()}"
       claves_nuevos.add(clave)
   
   # Eliminar productos que no están en la nueva lista
   productos_eliminados = []
   for item in lista_anterior:
       clave = f"{item['codigo'].lower().strip()}|{item['descripcion'].lower().strip()}|{item.get('laboratorio', '').lower().strip()}"
       if clave not in claves_nuevos:
           productos_eliminados.append(item['_id'])
   
   if productos_eliminados:
       db.listas_precios_proveedores.delete_many({
           "_id": {"$in": productos_eliminados},
           "proveedorId": ObjectId(proveedor_id)
       })
   ```

5. **Actualizar/Insertar productos:**
   ```python
   # Usar bulk_write para actualizar/insertar eficientemente
   operations = []
   for item in nuevos_items:
       if '_id' in item and item['_id']:
           # Actualizar existente
           operations.append(
               UpdateOne(
                   {"_id": item['_id']},
                   {"$set": item},
                   upsert=False
               )
           )
       else:
           # Insertar nuevo
           operations.append(
               InsertOne(item)
           )
   
   if operations:
       db.listas_precios_proveedores.bulk_write(operations)
   ```

6. **Obtener información de inventario** (en paralelo, después de guardar):
   ```python
   # Similar a la lógica actual, pero solo para productos nuevos
   # Los productos existentes ya tienen miCosto y existencias
   ```

## Endpoint: Obtener Estadísticas de Listas

### `GET /listas-comparativas/estadisticas` (Opcional)

```python
@router.get("/estadisticas")
async def obtener_estadisticas(
    usuario_correo: str = Depends(get_current_user),
    db: Database = Depends(get_database)
):
    # Verificar permisos
    usuario = db.usuarios.find_one({"correo": usuario_correo})
    if not usuario or "listas_comparativas" not in usuario.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permisos")
    
    # Obtener todas las listas
    listas = list(db.listas_precios_proveedores.find({}))
    
    proveedores_unicos = len(set(l["proveedorId"] for l in listas))
    sku_nuevos = sum(1 for l in listas if l.get("esNuevo", False))
    productos_oferta = sum(1 for l in listas if l.get("cambioPrecio") == "bajo")
    productos_subieron = sum(1 for l in listas if l.get("cambioPrecio") == "subio")
    
    return {
        "numeroProveedores": proveedores_unicos,
        "numeroListas": len(listas),
        "skuNuevos": sku_nuevos,
        "productosOferta": productos_oferta,
        "productosSubieron": productos_subieron,
    }
```

## Notas Importantes

1. **No eliminar listas anteriores:** El sistema debe mantener un historial y comparar con la versión anterior.

2. **Mantener datos del inventario:** Cuando se actualiza un producto existente, mantener `miCosto` y `existencias` del inventario hasta que se actualicen.

3. **Versión de lista:** El campo `versionLista` permite rastrear cuántas veces se ha actualizado una lista.

4. **Productos eliminados:** Si un producto no aparece en la nueva lista, se elimina de la base de datos (asumiendo que el proveedor ya no lo ofrece).

5. **Performance:** Usar `bulk_write()` para operaciones masivas de actualización/inserción.

## Ejemplo de Respuesta

Cuando se obtiene una lista, ahora incluye:
```json
{
  "_id": "...",
  "codigo": "ABC123",
  "descripcion": "Producto X",
  "precioNeto": 10.50,
  "precioAnterior": 12.00,
  "esNuevo": false,
  "cambioPrecio": "bajo",
  "versionLista": 3
}
```

