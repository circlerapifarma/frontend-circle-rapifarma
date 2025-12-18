# Instrucciones Backend: Incluir Costos por Farmacia en Existencias

## Problema Reportado

El modal "Más Detalles" necesita mostrar:
1. ✅ **Costo promedio** (`miCosto`) - ya existe pero no se muestra
2. ✅ **Costo por cada farmacia** - NUEVO: cada farmacia debe mostrar su costo individual
3. ✅ **Existencias por farmacia** - ya existe pero no se muestra correctamente

## Cambio Requerido en la Estructura de Datos

### Estructura Actual (INCORRECTA)

```json
{
  "codigo": "7592616576619",
  "miCosto": 2.50,  // Solo costo promedio
  "existencias": [
    {
      "farmacia": "farmacia_id_1",
      "farmaciaNombre": "Las Alicias",
      "existencia": 6
      // ❌ Falta el costo individual de esta farmacia
    }
  ]
}
```

### Estructura Requerida (CORRECTA)

```json
{
  "codigo": "7592616576619",
  "miCosto": 2.50,  // Costo promedio (calculado)
  "existencias": [
    {
      "farmacia": "farmacia_id_1",
      "farmaciaNombre": "Las Alicias",
      "existencia": 6,
      "costo": 2.30  // ✅ Costo individual de esta farmacia
    },
    {
      "farmacia": "farmacia_id_2",
      "farmaciaNombre": "Sur América",
      "existencia": 10,
      "costo": 2.60  // ✅ Costo individual de esta farmacia
    },
    {
      "farmacia": "farmacia_id_3",
      "farmaciaNombre": "Rapifarma",
      "existencia": 4,
      "costo": 2.40  // ✅ Costo individual de esta farmacia
    }
  ]
}
```

## Cambios en el Helper obtener_info_inventario

### Código Actual (Solo Existencia)

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
                # ❌ Falta el costo individual
            })
    
    return costo_promedio, existencias
```

### Código Actualizado (Con Costo por Farmacia)

```python
async def obtener_info_inventario(db, codigo: str):
    """Obtiene el costo y existencias por farmacia de un producto"""
    
    # Normalizar código
    codigo_normalizado = str(codigo).strip() if codigo else ""
    if not codigo_normalizado:
        return None, []
    
    # Buscar inventarios
    inventarios = await db.inventarios.find({"codigo": codigo_normalizado}).to_list(length=None)
    
    if not inventarios:
        return None, []
    
    # Calcular costo promedio (solo de inventarios con costo > 0)
    costos = [inv.get("costo", 0) for inv in inventarios if inv.get("costo", 0) > 0]
    costo_promedio = sum(costos) / len(costos) if costos else None
    
    # Obtener nombres de farmacias
    farmacias_dict = {}
    async for farmacia in db.farmacias.find():
        farmacia_id = str(farmacia.get("_id", ""))
        farmacia_nombre = farmacia.get("nombre", "")
        farmacias_dict[farmacia_id] = farmacia_nombre
    
    # Obtener existencias por farmacia CON su costo individual
    existencias = []
    for inv in inventarios:
        farmacia_id = str(inv.get("farmacia", ""))
        existencia = inv.get("existencia", 0)
        costo_individual = inv.get("costo", None)  # ✅ Obtener costo individual
        
        if existencia > 0:
            farmacia_nombre = farmacias_dict.get(farmacia_id, farmacia_id)
            existencias.append({
                "farmacia": farmacia_id,
                "farmaciaNombre": farmacia_nombre,
                "existencia": int(existencia),
                "costo": float(costo_individual) if costo_individual is not None and costo_individual > 0 else None  # ✅ Incluir costo individual
            })
    
    return costo_promedio, existencias
```

## Cálculo del Costo Promedio

El campo `miCosto` debe ser el **costo promedio ponderado** o **costo promedio simple**:

### Opción 1: Costo Promedio Simple (Recomendado)

```python
# Promedio simple de todos los costos (sin considerar existencias)
costos = [inv.get("costo", 0) for inv in inventarios if inv.get("costo", 0) > 0]
costo_promedio = sum(costos) / len(costos) if costos else None
```

### Opción 2: Costo Promedio Ponderado (Más Preciso)

```python
# Promedio ponderado por existencias (considera cuántas unidades hay en cada farmacia)
total_costo_ponderado = 0
total_existencias = 0

for inv in inventarios:
    costo = inv.get("costo", 0)
    existencia = inv.get("existencia", 0)
    if costo > 0 and existencia > 0:
        total_costo_ponderado += costo * existencia
        total_existencias += existencia

costo_promedio = total_costo_ponderado / total_existencias if total_existencias > 0 else None
```

**Recomendación:** Usar **Opción 1** (promedio simple) para `miCosto`, y el frontend calculará el promedio ponderado si es necesario.

## Ejemplo Completo de Respuesta

```json
{
  "_id": "60d5ec49f1b2c72b8c8e4f1a",
  "codigo": "7592616576619",
  "descripcion": "CARVEDILOL COMP 625 MG X 20 KIMICEG",
  "laboratorio": "KIMICEG",
  "precio": 2.99,
  "precioNeto": 2.99,
  "miCosto": 2.45,  // Costo promedio de las 3 farmacias
  "existencias": [
    {
      "farmacia": "farmacia_id_las_alicias",
      "farmaciaNombre": "Las Alicias",
      "existencia": 6,
      "costo": 2.30
    },
    {
      "farmacia": "farmacia_id_sur_america",
      "farmaciaNombre": "Sur América",
      "existencia": 10,
      "costo": 2.60
    },
    {
      "farmacia": "farmacia_id_rapifarma",
      "farmaciaNombre": "Rapifarma",
      "existencia": 4,
      "costo": 2.40
    }
  ]
}
```

## Verificación

### 1. Verificar que el campo `costo` existe en inventarios

```javascript
// En MongoDB
db.inventarios.find({ codigo: "7592616576619" }, { costo: 1, existencia: 1, farmacia: 1 })
```

### 2. Verificar que el helper retorna costos

Agregar logs temporales:

```python
async def obtener_info_inventario(db, codigo: str):
    # ... código ...
    
    for inv in inventarios:
        costo_individual = inv.get("costo", None)
        print(f"  📍 Farmacia: {farmacia_nombre}, Existencia: {existencia}, Costo: {costo_individual}")
    
    print(f"📊 Costo promedio: {costo_promedio}")
    print(f"📦 Total existencias: {len(existencias)}")
    
    return costo_promedio, existencias
```

### 3. Verificar respuesta del endpoint

Llamar al endpoint y verificar que cada existencia tenga el campo `costo`:

```bash
GET /listas-comparativas?codigo=7592616576619
```

Verificar en la respuesta:
```json
{
  "existencias": [
    {
      "farmacia": "...",
      "farmaciaNombre": "Las Alicias",
      "existencia": 6,
      "costo": 2.30  // ✅ Debe existir este campo
    }
  ]
}
```

## Checklist de Implementación

- [ ] Actualizar `obtener_info_inventario` para incluir `costo` en cada existencia
- [ ] Verificar que el campo `costo` existe en la colección `inventarios`
- [ ] Calcular `miCosto` como promedio simple de todos los costos
- [ ] Incluir `costo` en cada objeto del array `existencias`
- [ ] Probar con el código `7592616576619` específicamente
- [ ] Verificar que el endpoint retorna la estructura correcta

## Notas Importantes

1. **Si un inventario no tiene costo** (`costo` es `null`, `0`, o no existe), el campo `costo` en la existencia debe ser `null`, no `0`.

2. **El costo promedio (`miCosto`)** debe calcularse solo de inventarios con costo > 0.

3. **Normalización de códigos**: Asegurarse de que los códigos se normalicen (sin espacios, como string) para que coincidan correctamente.

4. **Tipos de datos**: 
   - `costo` debe ser `float` o `null`
   - `existencia` debe ser `int`
   - `farmacia` debe ser `string`

## Código Completo Optimizado

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
    
    # Calcular costo promedio (solo de inventarios con costo > 0)
    costos = [inv.get("costo", 0) for inv in inventarios if inv.get("costo", 0) > 0]
    costo_promedio = sum(costos) / len(costos) if costos else None
    
    # Obtener nombres de farmacias (una sola consulta)
    farmacias_dict = {}
    async for farmacia in db.farmacias.find():
        farmacia_id = str(farmacia.get("_id", ""))
        farmacia_nombre = farmacia.get("nombre", "")
        farmacias_dict[farmacia_id] = farmacia_nombre
    
    # Obtener existencias por farmacia CON su costo individual
    existencias = []
    for inv in inventarios:
        farmacia_id = str(inv.get("farmacia", ""))
        existencia = inv.get("existencia", 0)
        costo_individual = inv.get("costo", None)
        
        if existencia > 0:
            farmacia_nombre = farmacias_dict.get(farmacia_id, farmacia_id)
            existencias.append({
                "farmacia": farmacia_id,
                "farmaciaNombre": farmacia_nombre,
                "existencia": int(existencia),
                "costo": float(costo_individual) if costo_individual is not None and costo_individual > 0 else None
            })
    
    return costo_promedio, existencias
```

