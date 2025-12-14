# Instrucciones Backend - Verificar IDs de Farmacias en Gastos Verificados

## 🎯 Problema Identificado

En `ResumenFarmacias`, algunos gastos verificados no se están mostrando correctamente. Algunas farmacias muestran $0.00 cuando deberían mostrar el total correcto.

**Ejemplo del problema:**
- **Santa Elena**: Muestra $1,192.27 (debería mostrar $2,473.05)
- **San Carlos**: Muestra $0.00 (debería mostrar $1,347.04)
- **Las Alicias**: Muestra $0.00 (debería mostrar $2,060.10)
- **San Martín**: Muestra $0.00 (debería mostrar $3,394.70)
- **Milagro Norte**: Muestra $0.00 (debería mostrar $2,702.39)
- **Virginia**: Muestra $0.00 (debería mostrar $1,410.29)
- **Santo Tomás**: Muestra $0.00 (debería mostrar $1.00)

---

## 🔍 Causa Probable

El problema más probable es que el campo `localidad` en los gastos **no coincide exactamente** con los IDs de las farmacias que el frontend está usando.

---

## ✅ Verificaciones Requeridas

### 1. **Verificar IDs de Farmacias**

**Paso 1:** Obtener la lista de farmacias desde el endpoint `/farmacias`:

```bash
GET /farmacias
```

**Respuesta esperada:**
```json
{
  "farmacias": {
    "01": "Santa Elena",
    "02": "Sur América",
    "03": "Rapifarma",
    "04": "San Carlos",
    "05": "Las Alicias",
    "06": "San Martín",
    "07": "Milagro Norte",
    "08": "Virginia",
    "09": "Santo Tomás"
  }
}
```

**⚠️ CRÍTICO:** Los IDs deben ser exactamente como aparecen aquí (ej: `"01"`, `"02"`, etc.)

---

### 2. **Verificar Campo `localidad` en Gastos**

**Paso 2:** Verificar que los gastos usen exactamente los mismos IDs:

```javascript
// MongoDB
db.gastos.find({ estado: "verified" }).forEach(function(gasto) {
  print("Gasto ID: " + gasto._id);
  print("Localidad: " + gasto.localidad);
  print("Tipo de localidad: " + typeof gasto.localidad);
  print("---");
});
```

**Verificar:**
- ✅ `localidad` debe ser un **string** (no número)
- ✅ `localidad` debe coincidir **exactamente** con los IDs de farmacias (ej: `"01"`, `"02"`, etc.)
- ❌ NO debe ser el nombre de la farmacia (ej: `"Santa Elena"`)
- ❌ NO debe ser un número sin comillas (ej: `1` en lugar de `"01"`)

---

### 3. **Verificar Endpoint `/gastos/verified/por-farmacia`**

**Paso 3:** Probar el endpoint con fechas de noviembre 2025:

```bash
GET /gastos/verified/por-farmacia?fecha_inicio=2025-11-01&fecha_fin=2025-11-30
```

**Respuesta esperada:**
```json
{
  "01": 2473.05,
  "02": 3580.27,
  "03": 1722.99,
  "04": 1347.04,
  "05": 2060.10,
  "06": 3394.70,
  "07": 2702.39,
  "08": 1410.29,
  "09": 1.00
}
```

**⚠️ CRÍTICO:** 
- Los **keys** del objeto deben ser los **IDs de farmacia** (ej: `"01"`, `"02"`, etc.)
- Los **valores** deben estar en **USD** (después de convertir Bs a USD si es necesario)
- Todos los IDs de farmacia deben estar presentes, incluso si el valor es `0`

---

### 4. **Verificar Conversión de Moneda**

**Paso 4:** Verificar que la conversión de Bs a USD sea correcta:

```javascript
// MongoDB - Verificar gastos en Bs
db.gastos.find({ 
  estado: "verified", 
  divisa: "Bs",
  localidad: "01" // Santa Elena
}).forEach(function(gasto) {
  const montoUsd = gasto.tasa > 0 ? gasto.monto / gasto.tasa : gasto.monto;
  print("Gasto ID: " + gasto._id);
  print("Monto Bs: " + gasto.monto);
  print("Tasa: " + gasto.tasa);
  print("Monto USD: " + montoUsd);
  print("---");
});
```

**Verificar:**
- ✅ Si `divisa === "Bs"` y `tasa > 0`: `montoUsd = monto / tasa`
- ✅ Si `divisa === "USD"`: `montoUsd = monto`
- ✅ Si `tasa === 0` o `tasa === null`: tratar como USD

---

## 🔧 Soluciones Posibles

### Solución 1: Normalizar Campo `localidad`

Si los gastos tienen `localidad` como número o con formato diferente, normalizarlos:

```javascript
// MongoDB - Script para normalizar localidad
db.gastos.find({ estado: "verified" }).forEach(function(gasto) {
  let localidadNormalizada = gasto.localidad;
  
  // Si es número, convertir a string con padding
  if (typeof gasto.localidad === "number") {
    localidadNormalizada = String(gasto.localidad).padStart(2, "0");
  }
  
  // Si es string pero sin padding, agregarlo
  if (typeof gasto.localidad === "string" && gasto.localidad.length === 1) {
    localidadNormalizada = gasto.localidad.padStart(2, "0");
  }
  
  // Actualizar el gasto
  db.gastos.updateOne(
    { _id: gasto._id },
    { $set: { localidad: localidadNormalizada } }
  );
});
```

---

### Solución 2: Actualizar Endpoint para Normalizar IDs

En el endpoint `/gastos/verified/por-farmacia`, normalizar los IDs antes de agrupar:

```python
# FastAPI
@router.get("/gastos/verified/por-farmacia")
async def get_gastos_verified_por_farmacia(
    fecha_inicio: str = Query(...),
    fecha_fin: str = Query(...)
):
    # Obtener farmacias para mapear IDs
    farmacias = db.farmacias.find({})
    farmacia_ids = {str(f["_id"]): str(f["_id"]) for f in farmacias}
    
    # Agregación con normalización
    pipeline = [
        {
            "$match": {
                "estado": "verified",
                "fecha": {
                    "$gte": fecha_inicio,
                    "$lte": fecha_fin
                }
            }
        },
        {
            "$project": {
                "localidad": {
                    "$cond": [
                        {"$type": "$localidad", "$eq": "number"},
                        {"$toString": {"$padLeft": [{"$toString": "$localidad"}, 2, "0"]}},
                        {
                            "$cond": [
                                {"$eq": [{"$strLenCP": "$localidad"}, 1]},
                                {"$concat": ["0", "$localidad"]},
                                "$localidad"
                            ]
                        }
                    ]
                },
                "monto": 1,
                "divisa": 1,
                "tasa": 1
            }
        },
        {
            "$project": {
                "localidad": 1,
                "montoUsd": {
                    "$cond": [
                        {
                            "$and": [
                                {"$eq": ["$divisa", "Bs"]},
                                {"$gt": ["$tasa", 0]}
                            ]
                        },
                        {"$divide": ["$monto", "$tasa"]},
                        "$monto"
                    ]
                }
            }
        },
        {
            "$group": {
                "_id": "$localidad",
                "totalGastos": {"$sum": "$montoUsd"}
            }
        }
    ]
    
    resultados = db.gastos.aggregate(pipeline)
    
    # Transformar a formato esperado
    respuesta = {}
    for resultado in resultados:
        farmacia_id = str(resultado["_id"])
        # Verificar que el ID existe en las farmacias
        if farmacia_id in farmacia_ids:
            respuesta[farmacia_id] = round(resultado["totalGastos"], 2)
        else:
            print(f"⚠️ Advertencia: ID de farmacia no encontrado: {farmacia_id}")
    
    # Asegurar que todas las farmacias estén presentes (incluso con 0)
    for farmacia_id in farmacia_ids.keys():
        if farmacia_id not in respuesta:
            respuesta[farmacia_id] = 0.0
    
    return respuesta
```

---

### Solución 3: Verificar Mapeo de IDs en el Frontend

El frontend está usando `farm.id` para mapear los gastos. Verificar que los IDs coincidan:

```typescript
// Frontend - useResumenData.tsx
farmacias.forEach(farm => {
  console.log(`Farmacia: ${farm.nombre}, ID: ${farm.id}, Tipo: ${typeof farm.id}`);
  console.log(`Gastos para esta farmacia:`, gastosPorFarmaciaData[farm.id]);
});
```

---

## 📊 Ejemplo de Consulta MongoDB Completa

```javascript
// Consulta para verificar gastos por farmacia en noviembre 2025
db.gastos.aggregate([
  {
    $match: {
      estado: "verified",
      fecha: {
        $gte: "2025-11-01",
        $lte: "2025-11-30"
      }
    }
  },
  {
    $project: {
      localidad: 1,
      monto: 1,
      divisa: 1,
      tasa: 1,
      fecha: 1
    }
  },
  {
    $group: {
      _id: "$localidad",
      totalGastos: {
        $sum: {
          $cond: [
            {
              $and: [
                { $eq: ["$divisa", "Bs"] },
                { $gt: ["$tasa", 0] }
              ]
            },
            { $divide: ["$monto", "$tasa"] },
            "$monto"
          ]
        }
      },
      cantidadGastos: { $sum: 1 }
    }
  },
  {
    $sort: { _id: 1 }
  }
])
```

**Resultado esperado:**
```json
[
  { "_id": "01", "totalGastos": 2473.05, "cantidadGastos": 15 },
  { "_id": "02", "totalGastos": 3580.27, "cantidadGastos": 20 },
  { "_id": "03", "totalGastos": 1722.99, "cantidadGastos": 12 },
  { "_id": "04", "totalGastos": 1347.04, "cantidadGastos": 8 },
  { "_id": "05", "totalGastos": 2060.10, "cantidadGastos": 10 },
  { "_id": "06", "totalGastos": 3394.70, "cantidadGastos": 18 },
  { "_id": "07", "totalGastos": 2702.39, "cantidadGastos": 14 },
  { "_id": "08", "totalGastos": 1410.29, "cantidadGastos": 9 },
  { "_id": "09", "totalGastos": 1.00, "cantidadGastos": 1 }
]
```

---

## ✅ Checklist de Verificación

- [ ] **IDs de farmacias verificados** desde `/farmacias`
- [ ] **Campo `localidad` en gastos** coincide exactamente con los IDs
- [ ] **Endpoint `/gastos/verified/por-farmacia`** retorna todos los IDs de farmacia
- [ ] **Conversión de moneda** (Bs a USD) es correcta
- [ ] **Filtrado por fecha** funciona correctamente
- [ ] **Todos los IDs de farmacia** están presentes en la respuesta (incluso con valor 0)

---

## 🚨 Problemas Comunes

### Problema 1: `localidad` es número en lugar de string
**Solución:** Convertir a string con padding: `1` → `"01"`

### Problema 2: `localidad` es nombre de farmacia
**Solución:** Mapear nombres a IDs usando la colección de farmacias

### Problema 3: IDs no coinciden (ej: `"1"` vs `"01"`)
**Solución:** Normalizar todos los IDs a formato con padding de 2 dígitos

### Problema 4: Faltan IDs en la respuesta
**Solución:** Asegurar que todos los IDs de farmacia estén presentes, incluso con valor 0

---

## 📝 Notas Finales

- **Los IDs deben coincidir exactamente** entre `/farmacias` y el campo `localidad` de los gastos
- **El endpoint debe retornar todos los IDs de farmacia**, incluso si el valor es 0
- **La conversión de moneda debe ser correcta** (Bs / tasa = USD)
- **El filtrado por fecha debe coincidir** con el filtro del frontend

**Una vez corregido, los gastos verificados deberían aparecer correctamente en ResumenFarmacias.**

