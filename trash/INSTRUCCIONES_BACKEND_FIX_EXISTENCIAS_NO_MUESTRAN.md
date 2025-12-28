# Instrucciones Backend: Corregir Existencias que No se Muestran

## Problema Reportado

El modal "Más Detalles" en Listas Comparativas muestra:
```
No hay existencias registradas en tus farmacias para este producto.
```

Pero en el módulo "Ver Inventarios" sí hay existencias:
- **Código**: `7592616576619`
- **Producto**: CARVEDILOL 6,25MG X 20TAB KIMICEG
- **Farmacia**: Las Alicias
- **Existencia**: 6

## Causa del Problema

El backend **NO está incluyendo** el campo `existencias` en la respuesta del endpoint `GET /listas-comparativas`, o el código no coincide exactamente entre las listas y los inventarios.

## Verificación Inmediata

### 1. Verificar que el Endpoint Incluya Existencias

Abre el endpoint en el navegador o con Postman:
```
GET https://tu-backend.com/listas-comparativas
Authorization: Bearer <token>
```

**Verificar en la respuesta JSON:**
- ¿Cada lista tiene el campo `existencias`?
- ¿El campo `existencias` es un array?
- ¿El array contiene objetos con `farmacia`, `farmaciaNombre`, y `existencia`?

**Ejemplo de respuesta CORRECTA:**
```json
[
  {
    "_id": "...",
    "codigo": "7592616576619",
    "descripcion": "CARVEDILOL COMP 625 MG X 20 KIMICEG",
    "existencias": [
      {
        "farmacia": "farmacia_id_las_alicias",
        "farmaciaNombre": "Las Alicias",
        "existencia": 6
      }
    ]
  }
]
```

**Ejemplo de respuesta INCORRECTA (sin existencias):**
```json
[
  {
    "_id": "...",
    "codigo": "7592616576619",
    "descripcion": "CARVEDILOL COMP 625 MG X 20 KIMICEG"
    // ❌ Falta el campo "existencias"
  }
]
```

### 2. Verificar Coincidencia de Códigos

El problema más común es que los códigos no coinciden exactamente. Verificar en MongoDB:

```javascript
// Verificar el código en listas comparativas
db.listas_precios_proveedores.find({ 
  "codigo": { $regex: "7592616576619", $options: "i" } 
})

// Verificar el código en inventarios
db.inventarios.find({ 
  "codigo": { $regex: "7592616576619", $options: "i" } 
})
```

**Problemas comunes:**
- Espacios al inicio o final: `" 7592616576619"` vs `"7592616576619"`
- Diferentes tipos: `7592616576619` (número) vs `"7592616576619"` (string)
- Ceros a la izquierda: `"07592616576619"` vs `"7592616576619"`

### 3. Verificar el Helper obtener_info_inventario

El helper debe buscar por código **exacto** o con normalización:

```python
async def obtener_info_inventario(db, codigo: str):
    """Obtiene el costo y existencias por farmacia de un producto"""
    
    # NORMALIZAR el código: eliminar espacios y convertir a string
    codigo_normalizado = str(codigo).strip() if codigo else ""
    
    if not codigo_normalizado:
        return None, []
    
    # Buscar inventarios con el código normalizado
    inventarios = await db.inventarios.find({
        "$or": [
            {"codigo": codigo_normalizado},
            {"codigo": {"$regex": f"^{codigo_normalizado}$", "$options": "i"}}
        ]
    }).to_list(length=None)
    
    print(f"🔍 Buscando inventarios para código: {codigo_normalizado}")
    print(f"📦 Inventarios encontrados: {len(inventarios)}")
    
    if not inventarios:
        print(f"⚠️ No se encontraron inventarios para código: {codigo_normalizado}")
        return None, []
    
    # Calcular costo promedio
    costos = [inv.get("costo", 0) for inv in inventarios if inv.get("costo", 0) > 0]
    costo_promedio = sum(costos) / len(costos) if costos else None
    
    # Obtener existencias por farmacia
    existencias = []
    farmacias_dict = {}
    
    # Obtener nombres de farmacias
    async for farmacia in db.farmacias.find():
        farmacia_id = str(farmacia.get("_id", ""))
        farmacia_nombre = farmacia.get("nombre", "")
        farmacias_dict[farmacia_id] = farmacia_nombre
    
    for inv in inventarios:
        farmacia_id = str(inv.get("farmacia", ""))
        existencia = inv.get("existencia", 0)
        
        print(f"  📍 Farmacia ID: {farmacia_id}, Existencia: {existencia}")
        
        # Incluir TODAS las existencias, incluso si son 0 (opcional)
        # O solo las > 0 (recomendado)
        if existencia > 0:
            farmacia_nombre = farmacias_dict.get(farmacia_id, farmacia_id)
            existencias.append({
                "farmacia": farmacia_id,
                "farmaciaNombre": farmacia_nombre,
                "existencia": existencia
            })
            print(f"  ✅ Agregada existencia: {farmacia_nombre} = {existencia}")
    
    print(f"📊 Total existencias encontradas: {len(existencias)}")
    
    return costo_promedio, existencias
```

### 4. Verificar que lista_precio_helper Incluya Existencias

El helper debe **siempre** incluir el campo `existencias`, incluso si está vacío:

```python
def lista_precio_helper(lista_precio, proveedor=None, costo=None, existencias=None) -> dict:
    """Convierte una lista de precio a formato para el frontend"""
    
    # ... código existente para calcular precioNeto, etc. ...
    
    resultado = {
        "_id": str(lista_precio.get("_id", "")),
        "proveedorId": str(lista_precio.get("proveedorId", "")),
        "codigo": lista_precio.get("codigo", ""),
        "descripcion": lista_precio.get("descripcion", ""),
        "laboratorio": lista_precio.get("laboratorio", ""),
        "precio": lista_precio.get("precio", 0),
        "precioNeto": precio_neto,
        "miCosto": costo,
        # ⚠️ CRÍTICO: Siempre incluir existencias, incluso si está vacío
        "existencias": existencias if existencias else [],
        # ... otros campos ...
    }
    
    # Debug: verificar que existencias esté incluido
    if not resultado.get("existencias"):
        print(f"⚠️ Lista {resultado['codigo']} sin existencias")
    else:
        print(f"✅ Lista {resultado['codigo']} con {len(resultado['existencias'])} existencias")
    
    return resultado
```

### 5. Verificar el Endpoint Principal

El endpoint debe llamar a `obtener_info_inventario` para **cada** lista:

```python
@router.get("", response_model=List[dict])
async def obtener_listas_comparativas(...):
    # ... código existente ...
    
    async def obtener_lista_con_inventario(lista_precio):
        proveedor = proveedores_map.get(str(lista_precio["proveedorId"]))
        
        # ⚠️ CRÍTICO: Obtener información del inventario
        codigo = lista_precio.get("codigo", "")
        costo, existencias = await obtener_info_inventario(db, codigo)
        
        # Debug
        if existencias:
            print(f"✅ Código {codigo}: {len(existencias)} existencias encontradas")
        else:
            print(f"⚠️ Código {codigo}: Sin existencias")
        
        return lista_precio_helper(lista_precio, proveedor, costo, existencias)
    
    # Procesar en paralelo
    listas_con_inventario = await asyncio.gather(*[
        obtener_lista_con_inventario(lista) for lista in listas_precios
    ])
    
    return listas_con_inventario
```

## Solución Paso a Paso

### Paso 1: Agregar Logs de Debug

Agregar logs temporales para ver qué está pasando:

```python
async def obtener_info_inventario(db, codigo: str):
    codigo_normalizado = str(codigo).strip() if codigo else ""
    print(f"🔍 [DEBUG] Buscando inventarios para código: '{codigo_normalizado}'")
    
    inventarios = await db.inventarios.find({"codigo": codigo_normalizado}).to_list(length=None)
    print(f"📦 [DEBUG] Inventarios encontrados: {len(inventarios)}")
    
    for inv in inventarios:
        print(f"  - Farmacia: {inv.get('farmacia')}, Existencia: {inv.get('existencia')}")
    
    # ... resto del código ...
```

### Paso 2: Verificar en MongoDB Directamente

Ejecutar estas consultas en MongoDB:

```javascript
// 1. Verificar que existe el inventario
db.inventarios.find({ codigo: "7592616576619" })

// 2. Verificar que existe la lista comparativa
db.listas_precios_proveedores.find({ codigo: "7592616576619" })

// 3. Verificar que el campo farmacia existe y tiene un valor válido
db.inventarios.find({ codigo: "7592616576619" }, { farmacia: 1, existencia: 1 })

// 4. Verificar que la farmacia existe en la colección farmacias
// Primero obtener el ID de la farmacia del inventario
var inventario = db.inventarios.findOne({ codigo: "7592616576619" })
db.farmacias.find({ _id: inventario.farmacia })
```

### Paso 3: Normalizar Códigos

Si los códigos tienen espacios o diferencias, normalizarlos:

```python
def normalizar_codigo(codigo):
    """Normaliza un código eliminando espacios y convirtiendo a string"""
    if codigo is None:
        return ""
    return str(codigo).strip()
```

Usar esta función tanto al buscar en inventarios como al guardar:

```python
# Al buscar
codigo_normalizado = normalizar_codigo(codigo)
inventarios = await db.inventarios.find({"codigo": codigo_normalizado}).to_list(length=None)

# Al guardar (en el endpoint de subir Excel)
codigo_normalizado = normalizar_codigo(item.get("codigo", ""))
```

### Paso 4: Verificar Tipos de Datos

Asegurarse de que los códigos se guarden como **string** en ambas colecciones:

```python
# Al guardar inventario
inventario = {
    "codigo": str(item.get("codigo", "")).strip(),  # Asegurar que sea string
    "farmacia": str(item.get("farmacia", "")),     # Asegurar que sea string
    "existencia": int(item.get("existencia", 0)),   # Asegurar que sea número
    # ...
}

# Al guardar lista comparativa
lista_precio = {
    "codigo": str(item.get("codigo", "")).strip(),  # Asegurar que sea string
    # ...
}
```

## Checklist de Verificación

- [ ] El endpoint `GET /listas-comparativas` retorna el campo `existencias` en cada lista
- [ ] El campo `existencias` es un array (puede estar vacío `[]`)
- [ ] Los códigos en `listas_precios_proveedores` coinciden exactamente con los códigos en `inventarios`
- [ ] El helper `obtener_info_inventario` está siendo llamado para cada lista
- [ ] El helper `lista_precio_helper` siempre incluye el campo `existencias`
- [ ] Los códigos están normalizados (sin espacios, como string)
- [ ] Los IDs de farmacia en inventarios coinciden con los IDs en la colección `farmacias`
- [ ] El campo `existencia` en inventarios es un número > 0

## Test Rápido

Para probar rápidamente, crear un endpoint de prueba:

```python
@router.get("/test-existencias/{codigo}", response_model=dict)
async def test_existencias(codigo: str, current_user: dict = Depends(get_current_user)):
    """Endpoint de prueba para verificar existencias de un código específico"""
    db = get_database()
    
    # Buscar en inventarios
    inventarios = await db.inventarios.find({"codigo": codigo}).to_list(length=None)
    
    # Buscar en listas
    listas = await db.listas_precios_proveedores.find({"codigo": codigo}).to_list(length=None)
    
    # Obtener existencias usando el helper
    costo, existencias = await obtener_info_inventario(db, codigo)
    
    return {
        "codigo": codigo,
        "inventarios_encontrados": len(inventarios),
        "listas_encontradas": len(listas),
        "existencias": existencias,
        "costo_promedio": costo,
        "detalle_inventarios": [
            {
                "farmacia": str(inv.get("farmacia", "")),
                "existencia": inv.get("existencia", 0)
            }
            for inv in inventarios
        ]
    }
```

Llamar a este endpoint con el código problemático:
```
GET /listas-comparativas/test-existencias/7592616576619
```

Esto mostrará exactamente qué está pasando.

## Solución Final Recomendada

Si después de verificar todo lo anterior las existencias aún no aparecen, el problema más probable es que:

1. **Los códigos no coinciden exactamente** → Normalizar códigos
2. **El helper no está siendo llamado** → Verificar que el endpoint llame a `obtener_info_inventario`
3. **El campo existencias no se incluye en la respuesta** → Verificar que `lista_precio_helper` siempre incluya `existencias`

**Código completo optimizado:**

```python
async def obtener_info_inventario(db, codigo: str):
    """Obtiene el costo y existencias por farmacia de un producto"""
    
    # Normalizar código
    codigo_normalizado = str(codigo).strip() if codigo else ""
    if not codigo_normalizado:
        return None, []
    
    # Buscar inventarios (intentar coincidencia exacta primero)
    inventarios = await db.inventarios.find({"codigo": codigo_normalizado}).to_list(length=None)
    
    # Si no se encuentra, intentar búsqueda case-insensitive
    if not inventarios:
        inventarios = await db.inventarios.find({
            "codigo": {"$regex": f"^{codigo_normalizado}$", "$options": "i"}
        }).to_list(length=None)
    
    if not inventarios:
        return None, []
    
    # Calcular costo promedio
    costos = [inv.get("costo", 0) for inv in inventarios if inv.get("costo", 0) > 0]
    costo_promedio = sum(costos) / len(costos) if costos else None
    
    # Obtener existencias por farmacia
    existencias = []
    farmacias_dict = {}
    
    # Obtener nombres de farmacias (una sola consulta)
    async for farmacia in db.farmacias.find():
        farmacia_id = str(farmacia.get("_id", ""))
        farmacia_nombre = farmacia.get("nombre", "")
        farmacias_dict[farmacia_id] = farmacia_nombre
    
    for inv in inventarios:
        farmacia_id = str(inv.get("farmacia", ""))
        existencia = inv.get("existencia", 0)
        
        if existencia > 0:
            farmacia_nombre = farmacias_dict.get(farmacia_id, farmacia_id)
            existencias.append({
                "farmacia": farmacia_id,
                "farmaciaNombre": farmacia_nombre,
                "existencia": int(existencia)  # Asegurar que sea int
            })
    
    return costo_promedio, existencias
```

