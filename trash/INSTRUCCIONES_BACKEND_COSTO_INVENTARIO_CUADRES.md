# Instrucciones Backend - Costo de Inventario de Cuadres

## 🎯 Objetivo

Implementar endpoints que calculen el costo de inventario de los cuadres verificados, filtrados por rango de fechas, para mostrar:

1. **ResumenFarmacias**: Costo total de cuadres por cada farmacia (filtrado por fecha)
2. **VentaTotal**: Costo total de cuadres de todas las farmacias (filtrado por fecha)

---

## 📋 Requisitos

### 1. Estructura de Datos de Cuadres

**Cada cuadre debe tener:**
- `_id`: ID del cuadre
- `farmacia`: ID de la farmacia
- `dia`: Fecha del cuadre (formato `YYYY-MM-DD`)
- `estado`: Estado del cuadre (`"verified"`, `"wait"`, `"denied"`)
- `costoInventario`: Costo de inventario del cuadre (número, en USD)

**Ejemplo de cuadre:**
```json
{
  "_id": "cuadre_id_1",
  "farmacia": "farmacia_id_1",
  "dia": "2025-12-01",
  "estado": "verified",
  "costoInventario": 100.50,
  "efectivoUsd": 500,
  "zelleUsd": 200,
  "totalGeneralUsd": 700
}
```

---

## 🔌 Endpoints Requeridos

### 1. GET `/cuadres/costo-inventario/por-farmacia`

**Propósito:** Obtener el costo total de inventario de cuadres verificados por farmacia, filtrado por rango de fechas.

**Parámetros de Query:**
- `fecha_inicio` (requerido): Fecha de inicio del rango (formato `YYYY-MM-DD`)
- `fecha_fin` (requerido): Fecha fin del rango (formato `YYYY-MM-DD`)

**Ejemplo de petición:**
```
GET /cuadres/costo-inventario/por-farmacia?fecha_inicio=2025-12-01&fecha_fin=2025-12-14
```

**Respuesta esperada:**
```json
{
  "farmacia_id_1": 400.50,
  "farmacia_id_2": 750.25,
  "farmacia_id_3": 1200.00
}
```

**Lógica de cálculo:**
1. Filtrar cuadres donde:
   - `estado === "verified"`
   - `dia >= fecha_inicio`
   - `dia <= fecha_fin`
2. Agrupar por `farmacia`
3. Para cada cuadre:
   - Si `tasa` existe y es > 0: `costoEnUsd = costoInventario / tasa`
   - Si no: `costoEnUsd = costoInventario` (asumir que ya está en USD)
4. Sumar `costoEnUsd` de cada cuadre por farmacia
5. Retornar objeto con `{ farmacia_id: total_costo }` (en USD)

**Ejemplo de consulta MongoDB:**
```javascript
db.cuadres.aggregate([
  {
    $match: {
      estado: "verified",
      dia: {
        $gte: "2025-12-01",
        $lte: "2025-12-14"
      }
    }
  },
  {
    $project: {
      farmacia: 1,
      costoInventario: { $ifNull: ["$costoInventario", 0] },
      tasa: { $ifNull: ["$tasa", 0] }
    }
  },
  {
    $project: {
      farmacia: 1,
      costoEnUsd: {
        $cond: [
          { $and: [{ $gt: ["$tasa", 0] }, { $ne: ["$tasa", null] }] },
          { $divide: ["$costoInventario", "$tasa"] },
          "$costoInventario"
        ]
      }
    }
  },
  {
    $group: {
      _id: "$farmacia",
      totalCostoInventario: {
        $sum: "$costoEnUsd"
      }
    }
  },
  {
    $project: {
      _id: 0,
      farmacia: "$_id",
      totalCostoInventario: { $round: ["$totalCostoInventario", 2] }
    }
  }
])
```

**Ejemplo de respuesta transformada:**
```javascript
// Transformar el resultado de la agregación a:
{
  "farmacia_id_1": 400.50,
  "farmacia_id_2": 750.25,
  "farmacia_id_3": 1200.00
}
```

---

### 2. GET `/cuadres/costo-inventario/total`

**Propósito:** Obtener el costo total de inventario de cuadres verificados de todas las farmacias, filtrado por rango de fechas.

**Parámetros de Query:**
- `fecha_inicio` (requerido): Fecha de inicio del rango (formato `YYYY-MM-DD`)
- `fecha_fin` (requerido): Fecha fin del rango (formato `YYYY-MM-DD`)

**Ejemplo de petición:**
```
GET /cuadres/costo-inventario/total?fecha_inicio=2025-12-01&fecha_fin=2025-12-14
```

**Respuesta esperada:**
```json
{
  "totalCostoInventario": 2350.75
}
```

**Lógica de cálculo:**
1. Filtrar cuadres donde:
   - `estado === "verified"`
   - `dia >= fecha_inicio`
   - `dia <= fecha_fin`
2. Para cada cuadre:
   - Si `tasa` existe y es > 0: `costoEnUsd = costoInventario / tasa`
   - Si no: `costoEnUsd = costoInventario` (asumir que ya está en USD)
3. Sumar `costoEnUsd` de todos los cuadres filtrados
4. Retornar objeto con `{ totalCostoInventario: suma_total }` (en USD)

**Ejemplo de consulta MongoDB:**
```javascript
db.cuadres.aggregate([
  {
    $match: {
      estado: "verified",
      dia: {
        $gte: "2025-12-01",
        $lte: "2025-12-14"
      }
    }
  },
  {
    $project: {
      costoInventario: { $ifNull: ["$costoInventario", 0] },
      tasa: { $ifNull: ["$tasa", 0] }
    }
  },
  {
    $project: {
      costoEnUsd: {
        $cond: [
          { $and: [{ $gt: ["$tasa", 0] }, { $ne: ["$tasa", null] }] },
          { $divide: ["$costoInventario", "$tasa"] },
          "$costoInventario"
        ]
      }
    }
  },
  {
    $group: {
      _id: null,
      totalCostoInventario: {
        $sum: "$costoEnUsd"
      }
    }
  },
  {
    $project: {
      _id: 0,
      totalCostoInventario: { $round: ["$totalCostoInventario", 2] }
    }
  }
])
```

---

## ✅ Validaciones Requeridas

### 1. Validación de Parámetros

**`fecha_inicio` y `fecha_fin`:**
- ✅ Deben estar en formato `YYYY-MM-DD`
- ✅ `fecha_inicio` debe ser anterior o igual a `fecha_fin`
- ✅ Si no se proporcionan, retornar error 400

**Ejemplo de validación:**
```python
# FastAPI
from datetime import datetime
from fastapi import HTTPException

def validate_fechas(fecha_inicio: str, fecha_fin: str):
    try:
        fecha_inicio_obj = datetime.strptime(fecha_inicio, "%Y-%m-%d")
        fecha_fin_obj = datetime.strptime(fecha_fin, "%Y-%m-%d")
        
        if fecha_inicio_obj > fecha_fin_obj:
            raise HTTPException(
                status_code=400,
                detail="fecha_inicio debe ser anterior o igual a fecha_fin"
            )
        
        return fecha_inicio_obj, fecha_fin_obj
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Formato de fecha inválido. Use YYYY-MM-DD"
        )
```

### 2. Validación de Campo `costoInventario` y `tasa`

**`costoInventario`:**
- ✅ Si `costoInventario` es `null` o `undefined`, tratarlo como `0`
- ✅ Si `costoInventario` es negativo, tratarlo como `0` (o validar según reglas de negocio)
- ✅ Solo sumar cuadres con `estado === "verified"`

**`tasa`:**
- ✅ Si `tasa` existe y es > 0: `costoEnUsd = costoInventario / tasa`
- ✅ Si `tasa` es `null`, `undefined`, o `0`: `costoEnUsd = costoInventario` (asumir que ya está en USD)
- ✅ **CRÍTICO**: Siempre dividir `costoInventario` por `tasa` si la tasa existe y es > 0

---

## 📊 Ejemplo de Cálculo

### Escenario:
- **Farmacia A**: 
  - Día 01/12: 4 cuadres verificados
    - Cuadre 1: `costoInventario: 4000` (Bs), `tasa: 40` → 4000 / 40 = 100 USD
    - Cuadre 2: `costoInventario: 4000` (Bs), `tasa: 40` → 4000 / 40 = 100 USD
    - Cuadre 3: `costoInventario: 4000` (Bs), `tasa: 40` → 4000 / 40 = 100 USD
    - Cuadre 4: `costoInventario: 4000` (Bs), `tasa: 40` → 4000 / 40 = 100 USD
    - **Total día 01/12**: 400 USD
  - Día 02/12: 2 cuadres verificados
    - Cuadre 1: `costoInventario: 6000` (Bs), `tasa: 40` → 6000 / 40 = 150 USD
    - Cuadre 2: `costoInventario: 6000` (Bs), `tasa: 40` → 6000 / 40 = 150 USD
    - **Total día 02/12**: 300 USD
  - **Total Farmacia A**: 700 USD

- **Farmacia B**:
  - Día 01/12: 3 cuadres verificados
    - Cuadre 1: `costoInventario: 8000` (Bs), `tasa: 40` → 8000 / 40 = 200 USD
    - Cuadre 2: `costoInventario: 8000` (Bs), `tasa: 40` → 8000 / 40 = 200 USD
    - Cuadre 3: `costoInventario: 8000` (Bs), `tasa: 40` → 8000 / 40 = 200 USD
    - **Total día 01/12**: 600 USD
  - Día 03/12: 1 cuadre verificado
    - Cuadre 1: `costoInventario: 10000` (Bs), `tasa: 40` → 10000 / 40 = 250 USD
    - **Total día 03/12**: 250 USD
  - **Total Farmacia B**: 850 USD

- **Filtro de fechas**: 2025-12-01 a 2025-12-14

### Respuesta `/cuadres/costo-inventario/por-farmacia`:
```json
{
  "farmacia_id_A": 700.00,
  "farmacia_id_B": 850.00
}
```

### Respuesta `/cuadres/costo-inventario/total`:
```json
{
  "totalCostoInventario": 1550.00
}
```

**Nota importante:** Los valores están en USD después de dividir por la tasa.

---

## 🔧 Implementación Sugerida

### FastAPI (Python)

```python
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import Dict
from pymongo import MongoClient

router = APIRouter()

@router.get("/cuadres/costo-inventario/por-farmacia")
async def get_costo_inventario_por_farmacia(
    fecha_inicio: str = Query(..., description="Fecha inicio (YYYY-MM-DD)"),
    fecha_fin: str = Query(..., description="Fecha fin (YYYY-MM-DD)")
):
    # Validar fechas
    try:
        fecha_inicio_obj = datetime.strptime(fecha_inicio, "%Y-%m-%d")
        fecha_fin_obj = datetime.strptime(fecha_fin, "%Y-%m-%d")
        
        if fecha_inicio_obj > fecha_fin_obj:
            raise HTTPException(400, "fecha_inicio debe ser anterior a fecha_fin")
    except ValueError:
        raise HTTPException(400, "Formato de fecha inválido. Use YYYY-MM-DD")
    
    # Agregación MongoDB con conversión por tasa
    pipeline = [
        {
            "$match": {
                "estado": "verified",
                "dia": {
                    "$gte": fecha_inicio,
                    "$lte": fecha_fin
                }
            }
        },
        {
            "$project": {
                "farmacia": 1,
                "costoInventario": {"$ifNull": ["$costoInventario", 0]},
                "tasa": {"$ifNull": ["$tasa", 0]}
            }
        },
        {
            "$project": {
                "farmacia": 1,
                "costoEnUsd": {
                    "$cond": [
                        {"$and": [{"$gt": ["$tasa", 0]}, {"$ne": ["$tasa", None]}]},
                        {"$divide": ["$costoInventario", "$tasa"]},
                        "$costoInventario"
                    ]
                }
            }
        },
        {
            "$group": {
                "_id": "$farmacia",
                "totalCostoInventario": {
                    "$sum": "$costoEnUsd"
                }
            }
        }
    ]
    
    resultados = db.cuadres.aggregate(pipeline)
    
    # Transformar a formato esperado
    respuesta = {}
    for resultado in resultados:
        farmacia_id = str(resultado["_id"])
        respuesta[farmacia_id] = round(resultado["totalCostoInventario"], 2)
    
    return respuesta

@router.get("/cuadres/costo-inventario/total")
async def get_costo_inventario_total(
    fecha_inicio: str = Query(..., description="Fecha inicio (YYYY-MM-DD)"),
    fecha_fin: str = Query(..., description="Fecha fin (YYYY-MM-DD)")
):
    # Validar fechas (mismo código que arriba)
    try:
        fecha_inicio_obj = datetime.strptime(fecha_inicio, "%Y-%m-%d")
        fecha_fin_obj = datetime.strptime(fecha_fin, "%Y-%m-%d")
        
        if fecha_inicio_obj > fecha_fin_obj:
            raise HTTPException(400, "fecha_inicio debe ser anterior a fecha_fin")
    except ValueError:
        raise HTTPException(400, "Formato de fecha inválido. Use YYYY-MM-DD")
    
    # Agregación MongoDB con conversión por tasa
    pipeline = [
        {
            "$match": {
                "estado": "verified",
                "dia": {
                    "$gte": fecha_inicio,
                    "$lte": fecha_fin
                }
            }
        },
        {
            "$project": {
                "costoInventario": {"$ifNull": ["$costoInventario", 0]},
                "tasa": {"$ifNull": ["$tasa", 0]}
            }
        },
        {
            "$project": {
                "costoEnUsd": {
                    "$cond": [
                        {"$and": [{"$gt": ["$tasa", 0]}, {"$ne": ["$tasa", None]}]},
                        {"$divide": ["$costoInventario", "$tasa"]},
                        "$costoInventario"
                    ]
                }
            }
        },
        {
            "$group": {
                "_id": None,
                "totalCostoInventario": {
                    "$sum": "$costoEnUsd"
                }
            }
        }
    ]
    
    resultado = db.cuadres.aggregate(pipeline).next()
    total = round(resultado["totalCostoInventario"], 2) if resultado else 0
    
    return {"totalCostoInventario": total}
```

---

## ⚠️ Puntos Críticos

### 1. **Filtrado por Fecha**
- ✅ **CRÍTICO**: El filtro de fechas debe coincidir exactamente con el filtro de ventas
- ✅ Si el frontend filtra ventas del 01/12 al 14/12, el costo de inventario debe ser de los cuadres del 01/12 al 14/12
- ✅ No debe incluir cuadres fuera del rango de fechas

### 2. **Solo Cuadres Verificados**
- ✅ **CRÍTICO**: Solo sumar cuadres con `estado === "verified"`
- ✅ No incluir cuadres con `estado === "wait"` o `estado === "denied"`

### 3. **Campo `costoInventario` y Conversión por Tasa**
- ✅ **CRÍTICO**: Usar el campo `costoInventario` del cuadre (no `costo`)
- ✅ Si el campo no existe o es null, tratarlo como `0`
- ✅ **CRÍTICO**: Si `tasa` existe y es > 0, dividir `costoInventario / tasa` para convertir a USD
- ✅ Si `tasa` es null, undefined, o 0, asumir que `costoInventario` ya está en USD
- ✅ El resultado final debe estar siempre en USD

### 4. **Formato de Respuesta**
- ✅ `/por-farmacia`: Debe retornar objeto con `{ farmacia_id: total }`
- ✅ `/total`: Debe retornar objeto con `{ totalCostoInventario: total }`
- ✅ Los valores deben estar redondeados a 2 decimales

---

## 🧪 Pruebas Recomendadas

### Prueba 1: Verificar filtrado por fecha
```bash
# Obtener costo de cuadres del 01/12 al 14/12
GET /cuadres/costo-inventario/por-farmacia?fecha_inicio=2025-12-01&fecha_fin=2025-12-14

# Verificar que solo incluya cuadres de esas fechas
# Verificar que no incluya cuadres de noviembre o después del 14/12
```

### Prueba 2: Verificar solo cuadres verificados
```bash
# Crear cuadres con diferentes estados
# Verificar que solo se sumen los cuadres con estado "verified"
```

### Prueba 3: Verificar cálculo correcto
```bash
# Crear cuadres de prueba con costoInventario conocido
# Verificar que la suma sea correcta
```

### Prueba 4: Verificar manejo de null/undefined
```bash
# Crear cuadres sin costoInventario
# Verificar que se traten como 0
```

---

## 📝 Checklist de Implementación

- [ ] **Endpoint `/cuadres/costo-inventario/por-farmacia` implementado**
  - [ ] Acepta parámetros `fecha_inicio` y `fecha_fin`
  - [ ] Filtra por `estado === "verified"`
  - [ ] Filtra por rango de fechas
  - [ ] Agrupa por `farmacia`
  - [ ] Suma `costoInventario` por farmacia
  - [ ] Retorna formato `{ farmacia_id: total }`

- [ ] **Endpoint `/cuadres/costo-inventario/total` implementado**
  - [ ] Acepta parámetros `fecha_inicio` y `fecha_fin`
  - [ ] Filtra por `estado === "verified"`
  - [ ] Filtra por rango de fechas
  - [ ] Suma `costoInventario` de todos los cuadres
  - [ ] Retorna formato `{ totalCostoInventario: total }`

- [ ] **Validaciones implementadas**
  - [ ] Validación de formato de fechas
  - [ ] Validación de rango de fechas
  - [ ] Manejo de `costoInventario` null/undefined

- [ ] **Autenticación**
  - [ ] Endpoints aceptan autenticación opcional
  - [ ] No devuelven error 401 si no hay token

- [ ] **Optimización**
  - [ ] Usa agregaciones de MongoDB (no trae todos los cuadres)
  - [ ] Índices agregados: `{ estado: 1, dia: 1, farmacia: 1 }`

---

## 🔄 Sincronización con Frontend

**El frontend:**
- ✅ Usa `fechaInicio` y `fechaFin` del filtro de ventas
- ✅ Llama a `/cuadres/costo-inventario/por-farmacia` con esas fechas
- ✅ Llama a `/cuadres/costo-inventario/total` con esas fechas
- ✅ Actualiza automáticamente cuando cambia el filtro de fechas

**El backend debe:**
- ✅ Aceptar las mismas fechas que el frontend envía
- ✅ Filtrar cuadres en ese rango exacto
- ✅ Retornar solo cuadres verificados

---

## ✅ Resultado Esperado

**ResumenFarmacias:**
- Muestra "Costo de Cuadres: $X.XX" por cada farmacia
- El valor corresponde a la suma de `costoInventario` de los cuadres verificados de esa farmacia
- Filtrado por el mismo rango de fechas que las ventas

**VentaTotal:**
- Muestra "Inventario Costo Venta: $X.XX"
- El valor corresponde a la suma de `costoInventario` de todos los cuadres verificados de todas las farmacias
- Filtrado por el mismo rango de fechas que las ventas

---

## 📝 Notas Finales

- **El campo es `costoInventario`**, no `costo`
- **Solo cuadres verificados** (`estado === "verified"`)
- **Filtrado por fecha** debe coincidir exactamente con el filtro de ventas
- **Formato de respuesta** debe ser exactamente como se especifica
- **Conversión por tasa**: Si `tasa > 0`, dividir `costoInventario / tasa` para obtener USD
- **Valores finales en USD**: El resultado siempre debe estar en USD después de la conversión

**Una vez implementado, el frontend mostrará automáticamente los costos correctos filtrados por fecha.**

