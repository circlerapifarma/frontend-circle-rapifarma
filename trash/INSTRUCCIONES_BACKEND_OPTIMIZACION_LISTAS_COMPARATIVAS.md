# Instrucciones Backend: Optimización Completa de Listas Comparativas

## Problema Reportado

El módulo de Listas Comparativas tarda aproximadamente **1 minuto** en cargar cuando se entra al módulo. El objetivo es que:
- ✅ Al entrar al módulo, las listas se carguen **inmediatamente**
- ✅ Cualquier solicitud o acción en el módulo debe ser **rápida** (< 2 segundos)

## Optimizaciones Requeridas

### 1. Índices de MongoDB (CRÍTICO)

Los índices son fundamentales para mejorar el rendimiento de las consultas. Agregar los siguientes índices:

```python
# En el script de inicialización o en una migración
async def crear_indices_listas_comparativas(db):
    """Crear índices para optimizar consultas de listas comparativas"""
    
    # Índice compuesto para búsquedas por código
    await db.listas_precios_proveedores.create_index([("codigo", 1)])
    
    # Índice compuesto para búsquedas por descripción (texto)
    await db.listas_precios_proveedores.create_index([("descripcion", "text")])
    
    # Índice para búsquedas por laboratorio
    await db.listas_precios_proveedores.create_index([("laboratorio", 1)])
    
    # Índice para filtros por proveedor
    await db.listas_precios_proveedores.create_index([("proveedorId", 1)])
    
    # Índice compuesto para búsquedas combinadas
    await db.listas_precios_proveedores.create_index([
        ("codigo", 1),
        ("proveedorId", 1),
        ("descripcion", "text")
    ])
    
    # Índice para inventarios (usado en obtener_info_inventario)
    await db.inventarios.create_index([("codigo", 1)])
    await db.inventarios.create_index([("farmacia", 1)])
    await db.inventarios.create_index([("codigo", 1), ("farmacia", 1)])
    
    # Índice para farmacias
    await db.farmacias.create_index([("_id", 1)])
    
    print("✅ Índices creados correctamente")
```

**Ejecutar este script una vez** para crear los índices. Esto mejorará significativamente el rendimiento.

### 2. Caché en el Backend (RECOMENDADO)

Implementar caché en memoria o Redis para evitar consultas repetidas a la base de datos:

```python
from functools import lru_cache
from datetime import datetime, timedelta
import hashlib
import json

# Caché simple en memoria (para desarrollo)
# Para producción, usar Redis
_cache_listas = {}
_cache_timestamp = {}
CACHE_DURATION = 5 * 60  # 5 minutos

def get_cache_key(filtros: dict) -> str:
    """Generar clave única para el caché basada en los filtros"""
    filtros_str = json.dumps(filtros, sort_keys=True)
    return hashlib.md5(filtros_str.encode()).hexdigest()

def get_cached_listas(filtros: dict):
    """Obtener listas del caché si están disponibles"""
    cache_key = get_cache_key(filtros)
    if cache_key in _cache_listas:
        timestamp = _cache_timestamp.get(cache_key)
        if timestamp and (datetime.now() - timestamp).seconds < CACHE_DURATION:
            return _cache_listas[cache_key]
    return None

def set_cached_listas(filtros: dict, data: list):
    """Guardar listas en el caché"""
    cache_key = get_cache_key(filtros)
    _cache_listas[cache_key] = data
    _cache_timestamp[cache_key] = datetime.now()

def invalidar_cache_listas():
    """Invalidar todo el caché de listas"""
    _cache_listas.clear()
    _cache_timestamp.clear()
```

### 3. Optimización del Endpoint Principal

El endpoint `GET /listas-comparativas` debe ser optimizado:

```python
@router.get("", response_model=List[dict])
async def obtener_listas_comparativas(
    codigo: Optional[str] = None,
    nombre: Optional[str] = None,
    laboratorio: Optional[str] = None,
    proveedorId: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Obtener todas las listas comparativas (OPTIMIZADO)"""
    
    # Verificar permiso
    if "listas_comparativas" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para acceder a este recurso")
    
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
    
    # Verificar caché
    filtros_dict = {"codigo": codigo, "nombre": nombre, "laboratorio": laboratorio, "proveedorId": proveedorId}
    cached_data = get_cached_listas(filtros_dict)
    if cached_data:
        return cached_data
    
    # OPTIMIZACIÓN 1: Obtener todas las listas con proyección (solo campos necesarios)
    listas_precios = []
    proveedores_ids = set()
    
    # Usar proyección para reducir el tamaño de los datos transferidos
    projection = {
        "_id": 1,
        "proveedorId": 1,
        "codigo": 1,
        "descripcion": 1,
        "laboratorio": 1,
        "precio": 1,
        "descuento": 1,
        "fechaVencimiento": 1,
        "existencia": 1,
        "fechaCreacion": 1,
        "fechaActualizacion": 1
    }
    
    async for lista_precio in db.listas_precios_proveedores.find(filtro, projection):
        listas_precios.append(lista_precio)
        proveedores_ids.add(lista_precio["proveedorId"])
    
    # OPTIMIZACIÓN 2: Obtener todos los proveedores en una sola consulta
    proveedores_map = {}
    if proveedores_ids:
        async for proveedor in db.farmacias.find({"_id": {"$in": list(proveedores_ids)}}):
            proveedores_map[str(proveedor["_id"])] = proveedor
    
    # OPTIMIZACIÓN 3: Obtener todos los códigos únicos para consultar inventarios en batch
    codigos_unicos = list(set([lista["codigo"] for lista in listas_precios if lista.get("codigo")]))
    
    # OPTIMIZACIÓN 4: Obtener todos los inventarios en una sola consulta (en lugar de una por código)
    inventarios_map = {}
    if codigos_unicos:
        async for inventario in db.inventarios.find({"codigo": {"$in": codigos_unicos}}):
            codigo = inventario.get("codigo")
            if codigo not in inventarios_map:
                inventarios_map[codigo] = []
            inventarios_map[codigo].append(inventario)
    
    # OPTIMIZACIÓN 5: Obtener nombres de farmacias en una sola consulta
    farmacias_dict = {}
    async for farmacia in db.farmacias.find():
        farmacias_dict[str(farmacia.get("_id", ""))] = farmacia.get("nombre", "")
    
    # OPTIMIZACIÓN 6: Procesar en paralelo usando asyncio.gather
    import asyncio
    
    async def procesar_lista(lista_precio):
        """Procesar una lista con su inventario"""
        proveedor = proveedores_map.get(str(lista_precio["proveedorId"]))
        
        # Obtener inventarios para este código
        inventarios = inventarios_map.get(lista_precio.get("codigo", ""), [])
        
        # Calcular costo promedio y existencias
        costo_promedio = None
        existencias = []
        
        if inventarios:
            costos = [inv.get("costo", 0) for inv in inventarios if inv.get("costo", 0) > 0]
            costo_promedio = sum(costos) / len(costos) if costos else None
            
            for inv in inventarios:
                farmacia_id = str(inv.get("farmacia", ""))
                existencia = inv.get("existencia", 0)
                if existencia > 0:
                    existencias.append({
                        "farmacia": farmacia_id,
                        "farmaciaNombre": farmacias_dict.get(farmacia_id, farmacia_id),
                        "existencia": existencia
                    })
        
        return lista_precio_helper(lista_precio, proveedor, costo_promedio, existencias)
    
    # Procesar todas las listas en paralelo (hasta 50 a la vez para no sobrecargar)
    listas_con_inventario = []
    batch_size = 50
    for i in range(0, len(listas_precios), batch_size):
        batch = listas_precios[i:i + batch_size]
        resultados = await asyncio.gather(*[procesar_lista(lista) for lista in batch])
        listas_con_inventario.extend(resultados)
    
    # Guardar en caché
    set_cached_listas(filtros_dict, listas_con_inventario)
    
    return listas_con_inventario
```

### 4. Optimización de obtener_info_inventario

El helper actual hace una consulta por cada código. Optimizarlo para consultas en batch:

```python
async def obtener_info_inventario_batch(db, codigos: list) -> dict:
    """
    Obtener información de inventario para múltiples códigos en una sola consulta
    Retorna un diccionario: {codigo: (costo_promedio, existencias)}
    """
    if not codigos:
        return {}
    
    # Obtener todos los inventarios en una sola consulta
    inventarios = await db.inventarios.find({"codigo": {"$in": codigos}}).to_list(length=None)
    
    # Obtener nombres de farmacias
    farmacias_dict = {}
    async for farmacia in db.farmacias.find():
        farmacias_dict[str(farmacia.get("_id", ""))] = farmacia.get("nombre", "")
    
    # Agrupar por código
    inventarios_por_codigo = {}
    for inv in inventarios:
        codigo = inv.get("codigo")
        if codigo not in inventarios_por_codigo:
            inventarios_por_codigo[codigo] = []
        inventarios_por_codigo[codigo].append(inv)
    
    # Calcular para cada código
    resultado = {}
    for codigo, inventarios_codigo in inventarios_por_codigo.items():
        costos = [inv.get("costo", 0) for inv in inventarios_codigo if inv.get("costo", 0) > 0]
        costo_promedio = sum(costos) / len(costos) if costos else None
        
        existencias = []
        for inv in inventarios_codigo:
            farmacia_id = str(inv.get("farmacia", ""))
            existencia = inv.get("existencia", 0)
            if existencia > 0:
                existencias.append({
                    "farmacia": farmacia_id,
                    "farmaciaNombre": farmacias_dict.get(farmacia_id, farmacia_id),
                    "existencia": existencia
                })
        
        resultado[codigo] = (costo_promedio, existencias)
    
    return resultado
```

### 5. Endpoint de Búsqueda Optimizado

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
    """Buscar listas comparativas (OPTIMIZADO)"""
    
    # Verificar permiso
    if "listas_comparativas" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para acceder a este recurso")
    
    db = get_database()
    
    # Construir filtro
    filtro = {}
    if q:
        # Búsqueda en múltiples campos
        filtro["$or"] = [
            {"codigo": {"$regex": q, "$options": "i"}},
            {"descripcion": {"$regex": q, "$options": "i"}},
            {"laboratorio": {"$regex": q, "$options": "i"}}
        ]
    if codigo:
        filtro["codigo"] = {"$regex": codigo, "$options": "i"}
    if nombre:
        filtro["descripcion"] = {"$regex": nombre, "$options": "i"}
    if laboratorio:
        filtro["laboratorio"] = {"$regex": laboratorio, "$options": "i"}
    if proveedorId:
        filtro["proveedorId"] = ObjectId(proveedorId)
    
    # Verificar caché
    filtros_dict = {"q": q, "codigo": codigo, "nombre": nombre, "laboratorio": laboratorio, "proveedorId": proveedorId}
    cached_data = get_cached_listas(filtros_dict)
    if cached_data:
        return cached_data
    
    # Usar el mismo código optimizado del endpoint principal
    # ... (código similar al endpoint principal)
```

### 6. Invalidar Caché al Modificar Datos

Cuando se suban, actualicen o eliminen listas, invalidar el caché:

```python
@router.post("", response_model=dict)
async def crear_lista_comparativa(...):
    # ... código existente ...
    
    # Invalidar caché después de crear
    invalidar_cache_listas()
    
    return resultado

@router.delete("/{lista_id}", response_model=dict)
async def eliminar_lista_comparativa(...):
    # ... código existente ...
    
    # Invalidar caché después de eliminar
    invalidar_cache_listas()
    
    return {"message": "Lista eliminada correctamente"}

@router.post("/batch", response_model=dict)
async def subir_listas_por_lotes(...):
    # ... código existente ...
    
    # Invalidar caché después de subir
    invalidar_cache_listas()
    
    return resultado
```

### 7. Paginación (OPCIONAL pero RECOMENDADO)

Para listas muy grandes, implementar paginación:

```python
@router.get("", response_model=dict)
async def obtener_listas_comparativas(
    codigo: Optional[str] = None,
    nombre: Optional[str] = None,
    laboratorio: Optional[str] = None,
    proveedorId: Optional[str] = None,
    page: int = 1,
    limit: int = 100,  # Por defecto 100 items por página
    current_user: dict = Depends(get_current_user)
):
    """Obtener listas comparativas con paginación"""
    
    # ... código de filtros ...
    
    # Calcular skip
    skip = (page - 1) * limit
    
    # Obtener total de documentos
    total = await db.listas_precios_proveedores.count_documents(filtro)
    
    # Obtener listas con límite y skip
    listas_precios = []
    async for lista_precio in db.listas_precios_proveedores.find(filtro).skip(skip).limit(limit):
        listas_precios.append(lista_precio)
    
    # ... procesar listas ...
    
    return {
        "listas": listas_con_inventario,
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": (total + limit - 1) // limit
    }
```

## Checklist de Implementación

- [ ] **Crear índices de MongoDB** (ejecutar script una vez)
- [ ] **Implementar caché en memoria** (o Redis para producción)
- [ ] **Optimizar endpoint principal** con consultas en batch
- [ ] **Optimizar obtener_info_inventario** para consultas en batch
- [ ] **Invalidar caché** al modificar datos
- [ ] **Agregar proyecciones** en consultas MongoDB
- [ ] **Procesar en paralelo** con asyncio.gather
- [ ] **Limitar resultados** si es necesario (paginación)

## Resultados Esperados

Después de implementar estas optimizaciones:

- ✅ **Tiempo de carga inicial**: < 2 segundos (en lugar de 1 minuto)
- ✅ **Búsquedas**: < 1 segundo
- ✅ **Carga desde caché**: < 100ms
- ✅ **Escalabilidad**: Soporta miles de listas sin problemas

## Notas Importantes

1. **Índices**: Los índices son críticos. Sin ellos, las consultas serán lentas sin importar las otras optimizaciones.

2. **Caché**: Para producción, usar Redis en lugar de caché en memoria. El caché en memoria se pierde al reiniciar el servidor.

3. **Monitoreo**: Agregar logs para medir el tiempo de respuesta de cada endpoint:
   ```python
   import time
   start_time = time.time()
   # ... código del endpoint ...
   elapsed_time = time.time() - start_time
   print(f"Tiempo de respuesta: {elapsed_time:.2f} segundos")
   ```

4. **Testing**: Probar con datos reales para verificar que las optimizaciones funcionan correctamente.

## Soporte

Si después de implementar estas optimizaciones el módulo sigue siendo lento, verificar:
- Tiempo de respuesta del servidor (latencia de red)
- Tamaño de los datos transferidos
- Número de consultas a la base de datos
- Uso de CPU y memoria del servidor

