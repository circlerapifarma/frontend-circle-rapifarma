# Instrucciones Backend: Optimizar Datos para Modal "Más Detalles"

## Problema Reportado

El modal "Más Detalles" en Listas Comparativas se está abriendo muy lento (1-2 segundos de delay). El problema puede estar en:

1. **Frontend**: Procesamiento de demasiados datos al abrir el modal
2. **Backend**: Enviando demasiados datos o datos no optimizados

## Optimizaciones Requeridas en el Backend

### 1. Limitar Datos Enviados en `existencias`

El backend está enviando **todas** las existencias por farmacia para cada lista. Si un producto tiene muchas farmacias, esto puede ser lento.

**Optimización:** Limitar o optimizar el array de existencias:

```python
# En obtener_info_inventario o _procesar_inventarios_con_costos
# Limitar a solo farmacias con existencia > 0 y costo válido
existencias = []
for inv in inventarios:
    farmacia_id = str(inv.get("farmacia", ""))
    existencia = inv.get("existencia", 0)
    costo_individual = inv.get("costo", None)
    
    # Solo incluir si tiene existencia > 0
    if existencia > 0:
        farmacia_nombre = farmacias_dict.get(farmacia_id, farmacia_id)
        existencias.append({
            "farmacia": farmacia_id,
            "farmaciaNombre": farmacia_nombre,
            "existencia": int(existencia),
            "costo": float(costo_individual) if costo_individual is not None and costo_individual > 0 else None
        })
    
    # ⚠️ OPCIONAL: Limitar a máximo 20 farmacias por producto
    if len(existencias) >= 20:
        break
```

### 2. Optimizar Estructura de Datos

**Problema actual:** Cada lista incluye un objeto `proveedor` completo y un array `existencias` que puede ser grande.

**Solución:** Enviar solo los datos necesarios:

```python
# En lugar de enviar el objeto proveedor completo:
{
    "proveedor": {
        "_id": "...",
        "nombreJuridico": "...",
        "descuentosComerciales": 0,
        # ... muchos otros campos innecesarios
    }
}

# Enviar solo lo necesario:
{
    "proveedor": {
        "_id": "...",
        "nombreJuridico": "..."  # Solo el nombre
    }
}
```

### 3. Proyección de Campos en MongoDB

Usar proyección para obtener solo los campos necesarios:

```python
# En el endpoint obtener_listas_comparativas
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
    # No incluir campos innecesarios
}

async for lista_precio in db.listas_precios_proveedores.find(filtro, projection):
    # ...
```

### 4. Limitar Tamaño de Respuesta

Si un producto tiene **muchos proveedores** (más de 10-20), considerar:

**Opción A:** Limitar número de proveedores por producto
```python
# En el agrupamiento, limitar a los 10 mejores precios
todos_los_precios = sorted[:10]  # Solo los 10 mejores
```

**Opción B:** Paginación en el modal (frontend)
- El frontend puede implementar paginación si hay más de 10 proveedores

### 5. Cachear Datos de Farmacias

Los nombres de farmacias se consultan repetidamente. Cachearlos:

```python
# Cache global de farmacias (en memoria)
_farmacias_cache = {}
_farmacias_cache_timestamp = None
CACHE_DURATION = 5 * 60  # 5 minutos

async def obtener_farmacias_cache(db):
    global _farmacias_cache, _farmacias_cache_timestamp
    
    now = datetime.now()
    if (_farmacias_cache_timestamp is None or 
        (now - _farmacias_cache_timestamp).seconds > CACHE_DURATION):
        _farmacias_cache = {}
        async for farmacia in db.farmacias.find():
            farmacia_id = str(farmacia.get("_id", ""))
            _farmacias_cache[farmacia_id] = farmacia.get("nombre", "")
        _farmacias_cache_timestamp = now
    
    return _farmacias_cache
```

### 6. Optimizar Consultas de Inventarios

Si un producto tiene muchas farmacias, la consulta de inventarios puede ser lenta:

```python
# Usar índices (ya debería estar implementado)
# Asegurarse de que existe:
# db.inventarios.create_index([("codigo", 1), ("farmacia", 1)])

# Limitar resultados si hay muchos
inventarios = await db.inventarios.find({
    "codigo": codigo_normalizado
}).limit(50).to_list(length=None)  # Máximo 50 inventarios por código
```

## Verificación de Rendimiento

### 1. Medir Tiempo de Respuesta

Agregar logs temporales para medir el tiempo:

```python
import time

@router.get("", response_model=List[dict])
async def obtener_listas_comparativas(...):
    start_time = time.time()
    
    # ... código existente ...
    
    elapsed_time = time.time() - start_time
    print(f"⏱️ Tiempo de respuesta: {elapsed_time:.2f} segundos")
    print(f"📦 Listas retornadas: {len(listas_con_inventario)}")
    
    return listas_con_inventario
```

### 2. Verificar Tamaño de Respuesta

```python
import json

# Al final del endpoint, antes de retornar
response_size = len(json.dumps(listas_con_inventario))
print(f"📊 Tamaño de respuesta: {response_size / 1024:.2f} KB")

# Si es mayor a 500 KB, considerar optimizaciones
if response_size > 500 * 1024:
    print("⚠️ Respuesta muy grande, considerar paginación o limitar datos")
```

### 3. Verificar Número de Existencias

```python
# En _procesar_inventarios_con_costos
total_existencias = sum(len(lista.get("existencias", [])) for lista in listas_con_inventario)
print(f"📦 Total existencias en respuesta: {total_existencias}")

# Si es mayor a 1000, considerar limitar
if total_existencias > 1000:
    print("⚠️ Muchas existencias, considerar limitar por producto")
```

## Checklist de Optimización

- [ ] **Limitar existencias**: Solo incluir farmacias con existencia > 0
- [ ] **Proyección MongoDB**: Usar projection para obtener solo campos necesarios
- [ ] **Cachear farmacias**: Evitar consultas repetidas de nombres de farmacias
- [ ] **Limitar inventarios**: Máximo 50 inventarios por código
- [ ] **Optimizar proveedor**: Enviar solo `_id` y `nombreJuridico`
- [ ] **Índices MongoDB**: Verificar que existen índices en `codigo` y `farmacia`
- [ ] **Medir rendimiento**: Agregar logs para medir tiempo de respuesta
- [ ] **Verificar tamaño**: Si la respuesta es > 500 KB, optimizar más

## Resultados Esperados

Después de implementar estas optimizaciones:

- ✅ **Tiempo de respuesta del endpoint**: < 1 segundo (en lugar de varios segundos)
- ✅ **Tamaño de respuesta**: < 500 KB (si es posible)
- ✅ **Número de existencias por lista**: Máximo 20-30 (solo las relevantes)
- ✅ **Apertura del modal**: < 200ms (en lugar de 1-2 segundos)

## Notas Importantes

1. **No eliminar datos necesarios**: Asegurarse de que todas las existencias relevantes se incluyan, solo optimizar la estructura.

2. **Mantener compatibilidad**: Los cambios no deben romper el frontend. El frontend espera:
   - `existencias`: Array de objetos con `farmacia`, `farmaciaNombre`, `existencia`, `costo`
   - `miCosto`: Número o null
   - `proveedor`: Objeto con al menos `_id` y `nombreJuridico`

3. **Testing**: Probar con productos que tengan:
   - Muchas farmacias (10+)
   - Muchos proveedores (5+)
   - Muchas existencias (50+)

## Soporte

Si después de implementar estas optimizaciones el modal sigue siendo lento, verificar:
- Tamaño total de la respuesta JSON
- Número de listas retornadas
- Tiempo de consulta a MongoDB
- Uso de CPU y memoria del servidor

