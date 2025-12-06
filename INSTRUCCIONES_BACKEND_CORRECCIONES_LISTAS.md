# Instrucciones para Corregir Problemas en Listas Comparativas

Este documento contiene las correcciones específicas que el backend debe implementar para resolver los problemas reportados.

## 🔴 Problemas Identificados

1. **El nombre del proveedor no se muestra correctamente**
2. **La existencia del Excel no se está trayendo**
3. **El filtro de búsqueda por nombre no funciona correctamente**
4. **Falta una opción para borrar lista de precios por proveedor**

---

## ✅ Corrección 1: Asegurar que el Proveedor se Devuelva Correctamente

### Problema
El campo `proveedor` puede ser `undefined` o no incluir `nombreJuridico` en las respuestas.

### Solución
En TODOS los endpoints GET (obtener listas, buscar, etc.), asegurar que se incluya el proveedor completo:

**Ejemplo para GET `/listas-comparativas`:**

```python
@router.get("", response_model=List[dict])
async def obtener_listas_comparativas(
    codigo: Optional[str] = None,
    nombre: Optional[str] = None,
    laboratorio: Optional[str] = None,
    proveedorId: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # ... validaciones ...
    
    db = get_database()
    
    # Construir filtro
    filtro = {}
    if codigo:
        filtro["codigo"] = {"$regex": codigo, "$options": "i"}
    if nombre:
        filtro["descripcion"] = {"$regex": nombre, "$options": "i"}
    if laboratorio:
        filtro["laboratorio"] = {"$regex": laboratorio, "$options": "i"}
    if proveedorId:
        filtro["proveedorId"] = ObjectId(proveedorId)
    
    # Obtener todas las listas primero
    listas_precios = []
    proveedores_ids = set()
    async for lista_precio in db.listas_precios_proveedores.find(filtro):
        listas_precios.append(lista_precio)
        proveedores_ids.add(lista_precio["proveedorId"])
    
    # ⚠️ IMPORTANTE: Obtener TODOS los proveedores en una sola consulta
    proveedores_map = {}
    async for proveedor in db.proveedores.find({"_id": {"$in": list(proveedores_ids)}}):
        proveedores_map[str(proveedor["_id"])] = {
            "_id": str(proveedor["_id"]),
            "nombreJuridico": proveedor.get("nombreJuridico", ""),
            "descuentosComerciales": proveedor.get("descuentosComerciales", 0) or 0
        }
    
    # Obtener información del inventario en paralelo
    import asyncio
    
    async def obtener_lista_con_inventario(lista_precio):
        proveedor = proveedores_map.get(str(lista_precio["proveedorId"]))
        
        # ⚠️ CRÍTICO: Si no se encuentra el proveedor, crear uno por defecto
        if not proveedor:
            proveedor = {
                "_id": str(lista_precio["proveedorId"]),
                "nombreJuridico": "Proveedor no encontrado",
                "descuentosComerciales": 0
            }
        
        costo, existencias = await obtener_info_inventario(db, lista_precio["codigo"])
        return lista_precio_helper(lista_precio, proveedor, costo, existencias)
    
    tasks = [obtener_lista_con_inventario(lista_precio) for lista_precio in listas_precios]
    listas = await asyncio.gather(*tasks)
    
    return listas
```

**Función helper actualizada:**

```python
def lista_precio_helper(lista_precio, proveedor=None, costo=None, existencias=None) -> dict:
    """Helper para formatear lista de precios con proveedor e inventario"""
    
    # ⚠️ CRÍTICO: Asegurar que proveedor siempre tenga los campos necesarios
    if not proveedor:
        proveedor = {
            "_id": str(lista_precio.get("proveedorId", "")),
            "nombreJuridico": "Proveedor no encontrado",
            "descuentosComerciales": 0
        }
    
    return {
        "_id": str(lista_precio["_id"]),
        "proveedorId": str(lista_precio["proveedorId"]),
        "proveedor": {
            "_id": proveedor.get("_id", str(lista_precio.get("proveedorId", ""))),
            "nombreJuridico": proveedor.get("nombreJuridico", "Proveedor no encontrado"),
            "descuentosComerciales": proveedor.get("descuentosComerciales", 0) or 0
        },
        "codigo": lista_precio.get("codigo", ""),
        "descripcion": lista_precio.get("descripcion", ""),
        "laboratorio": lista_precio.get("laboratorio", ""),
        "precio": lista_precio.get("precio", 0),
        "descuento": lista_precio.get("descuento", 0),
        "precioNeto": lista_precio.get("precioNeto", 0),
        "fechaVencimiento": lista_precio.get("fechaVencimiento").isoformat() if lista_precio.get("fechaVencimiento") else None,
        "existencia": lista_precio.get("existencia", 0),  # ⚠️ IMPORTANTE: Incluir existencia del Excel
        "miCosto": round(costo, 2) if costo is not None else None,
        "existencias": existencias or [],
        "fechaCreacion": lista_precio.get("fechaCreacion").isoformat() if lista_precio.get("fechaCreacion") else None,
        "fechaActualizacion": lista_precio.get("fechaActualizacion").isoformat() if lista_precio.get("fechaActualizacion") else None,
    }
```

---

## ✅ Corrección 2: Asegurar que la Existencia del Excel se Devuelva

### Problema
El campo `existencia` (del Excel) no se está devolviendo en las respuestas.

### Solución
Asegurar que el campo `existencia` se guarde y se devuelva:

**En el POST (carga del Excel):**
```python
item_data = {
    "proveedorId": ObjectId(proveedorId),
    "codigo": codigo,
    "descripcion": descripcion,
    "laboratorio": laboratorio,
    "precio": precio_float,
    "descuento": descuento_float,
    "precioNeto": round(precio_neto, 2),
    "fechaVencimiento": fecha_venc_parsed,
    "existencia": existencia_int,  # ⚠️ IMPORTANTE: Guardar existencia del Excel
    "fechaCreacion": fecha_actual,
    "fechaActualizacion": fecha_actual,
    "usuarioCorreo": usuarioCorreo
}
```

**En el helper (respuestas GET):**
```python
"existencia": lista_precio.get("existencia", 0),  # ⚠️ Incluir siempre
```

**Verificar en MongoDB:**
```javascript
// Verificar que el campo existencia existe en los documentos
db.listas_precios_proveedores.find({}, {codigo: 1, existencia: 1}).limit(5)
```

---

## ✅ Corrección 3: Arreglar Búsqueda por Nombre

### Problema
El filtro de búsqueda por nombre no funciona correctamente.

### Solución
Asegurar que la búsqueda por `q` (término general) busque en `descripcion`:

**Endpoint GET `/listas-comparativas/buscar`:**

```python
@router.get("/buscar", response_model=List[dict])
async def buscar_listas_comparativas(
    q: Optional[str] = None,
    codigo: Optional[str] = None,
    nombre: Optional[str] = None,
    laboratorio: Optional[str] = None,
    proveedorId: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # ... validaciones ...
    
    db = get_database()
    
    # Construir filtro
    filtro = {}
    
    # ⚠️ IMPORTANTE: Si hay término general (q), buscar en código, descripción y laboratorio
    if q:
        filtro["$or"] = [
            {"codigo": {"$regex": q, "$options": "i"}},
            {"descripcion": {"$regex": q, "$options": "i"}},
            {"laboratorio": {"$regex": q, "$options": "i"}}
        ]
    
    # Filtros específicos (se aplican además del q si existe)
    if codigo:
        filtro["codigo"] = {"$regex": codigo, "$options": "i"}
    
    # ⚠️ CRÍTICO: nombre debe buscar en descripcion
    if nombre:
        filtro["descripcion"] = {"$regex": nombre, "$options": "i"}
    
    if laboratorio:
        filtro["laboratorio"] = {"$regex": laboratorio, "$options": "i"}
    
    if proveedorId:
        filtro["proveedorId"] = ObjectId(proveedorId)
    
    # Obtener listas (mismo código que GET /listas-comparativas)
    listas_precios = []
    proveedores_ids = set()
    async for lista_precio in db.listas_precios_proveedores.find(filtro):
        listas_precios.append(lista_precio)
        proveedores_ids.add(lista_precio["proveedorId"])
    
    # Obtener proveedores
    proveedores_map = {}
    async for proveedor in db.proveedores.find({"_id": {"$in": list(proveedores_ids)}}):
        proveedores_map[str(proveedor["_id"])] = {
            "_id": str(proveedor["_id"]),
            "nombreJuridico": proveedor.get("nombreJuridico", ""),
            "descuentosComerciales": proveedor.get("descuentosComerciales", 0) or 0
        }
    
    # Obtener inventario en paralelo
    import asyncio
    
    async def obtener_lista_con_inventario(lista_precio):
        proveedor = proveedores_map.get(str(lista_precio["proveedorId"]))
        if not proveedor:
            proveedor = {
                "_id": str(lista_precio["proveedorId"]),
                "nombreJuridico": "Proveedor no encontrado",
                "descuentosComerciales": 0
            }
        costo, existencias = await obtener_info_inventario(db, lista_precio["codigo"])
        return lista_precio_helper(lista_precio, proveedor, costo, existencias)
    
    tasks = [obtener_lista_con_inventario(lista_precio) for lista_precio in listas_precios]
    listas = await asyncio.gather(*tasks)
    
    return listas
```

**Notas importantes:**
- `q` busca en código, descripción Y laboratorio (usando `$or`)
- `nombre` busca específicamente en `descripcion`
- Los filtros se pueden combinar (AND)

---

## ✅ Corrección 4: Endpoint para Borrar Lista por Proveedor

### Problema
Falta una opción clara para borrar todas las listas de un proveedor.

### Solución
El endpoint ya existe, pero asegurar que funcione correctamente:

**Endpoint DELETE `/listas-comparativas/proveedor/{proveedorId}`:**

```python
@router.delete("/proveedor/{proveedorId}")
async def eliminar_listas_por_proveedor(
    proveedorId: str,
    current_user: dict = Depends(get_current_user)
):
    """Eliminar todas las listas de precios de un proveedor específico"""
    
    # Verificar permiso
    if "listas_comparativas" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para acceder a este recurso")
    
    db = get_database()
    
    # Validar que el proveedor existe
    proveedor = await db.proveedores.find_one({"_id": ObjectId(proveedorId)})
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    # Contar items antes de eliminar
    count_before = await db.listas_precios_proveedores.count_documents({"proveedorId": ObjectId(proveedorId)})
    
    # Eliminar todas las listas del proveedor
    result = await db.listas_precios_proveedores.delete_many({"proveedorId": ObjectId(proveedorId)})
    
    return {
        "message": "Listas de precios eliminadas exitosamente",
        "itemsEliminados": result.deleted_count,
        "proveedorId": proveedorId,
        "proveedorNombre": proveedor.get("nombreJuridico", "N/A")
    }
```

**Verificar que el endpoint esté registrado en el router:**
```python
# En el archivo de rutas
router.delete("/proveedor/{proveedorId}", eliminar_listas_por_proveedor)
```

---

## 📋 Checklist de Verificación

### Para el Proveedor:
- [ ] El endpoint GET devuelve `proveedor` con `nombreJuridico` siempre
- [ ] Si el proveedor no existe, se devuelve un objeto por defecto
- [ ] Se obtienen todos los proveedores en una sola consulta (no uno por uno)

### Para la Existencia:
- [ ] El campo `existencia` se guarda en el POST
- [ ] El campo `existencia` se devuelve en todos los GET
- [ ] Verificar en MongoDB que los documentos tienen el campo `existencia`

### Para la Búsqueda:
- [ ] El parámetro `q` busca en código, descripción y laboratorio
- [ ] El parámetro `nombre` busca específicamente en `descripcion`
- [ ] La búsqueda es case-insensitive (`$options: "i"`)
- [ ] Los filtros se pueden combinar correctamente

### Para Borrar por Proveedor:
- [ ] El endpoint DELETE `/listas-comparativas/proveedor/{proveedorId}` existe
- [ ] El endpoint valida que el proveedor existe
- [ ] El endpoint devuelve el número de items eliminados
- [ ] El endpoint está registrado en el router

---

## 🧪 Pruebas Recomendadas

### Prueba 1: Verificar Proveedor
```bash
# GET /listas-comparativas
# Verificar que cada item tenga:
{
  "proveedor": {
    "_id": "...",
    "nombreJuridico": "...",
    "descuentosComerciales": ...
  }
}
```

### Prueba 2: Verificar Existencia
```bash
# GET /listas-comparativas
# Verificar que cada item tenga:
{
  "existencia": 100  # Número del Excel
}
```

### Prueba 3: Verificar Búsqueda
```bash
# GET /listas-comparativas/buscar?q=paracetamol
# Debe encontrar productos con "paracetamol" en código, descripción o laboratorio

# GET /listas-comparativas/buscar?nombre=ibuprofeno
# Debe encontrar productos con "ibuprofeno" en descripción
```

### Prueba 4: Verificar Borrar
```bash
# DELETE /listas-comparativas/proveedor/{proveedorId}
# Debe eliminar todas las listas del proveedor y devolver:
{
  "message": "Listas de precios eliminadas exitosamente",
  "itemsEliminados": 150,
  "proveedorId": "...",
  "proveedorNombre": "..."
}
```

---

## ⚠️ Notas Importantes

1. **El campo `existencia` del Excel es diferente de `existencias` del inventario:**
   - `existencia`: Cantidad disponible en el proveedor (del Excel)
   - `existencias`: Array con existencias por farmacia (del inventario del usuario)

2. **Siempre devolver el proveedor completo:**
   - Incluso si no se encuentra, devolver un objeto con valores por defecto
   - Esto evita errores en el frontend

3. **Optimizar consultas:**
   - Obtener todos los proveedores en una sola consulta
   - No hacer una consulta por cada lista de precios

4. **Búsqueda case-insensitive:**
   - Usar `$options: "i"` en todas las búsquedas con regex
   - Esto permite buscar sin importar mayúsculas/minúsculas

