# INSTRUCCIONES BACKEND - CORRECCIÓN DEL ENDPOINT /excel

## 🚨 PROBLEMA IDENTIFICADO

El backend corrigió el endpoint `/batch` correctamente, pero **el endpoint `/excel` también necesita la misma corrección**.

### Situación actual:

- ✅ `/batch` - **YA CORREGIDO** (usa `bulk_write()` con `InsertOne` y `UpdateOne`)
- ❌ `/excel` - **PENDIENTE DE CORRECCIÓN** (aún reporta "0 insertados, 0 actualizados")

### Por qué ambos endpoints necesitan corrección:

El frontend usa **dos endpoints diferentes** según el tamaño del archivo:

1. **Archivos pequeños (< 10MB)**: Usa `POST /listas-comparativas/excel`
   - Este es el que está fallando actualmente
   - El archivo del usuario (0.13 MB) usa este endpoint

2. **Archivos grandes (> 10MB)**: Usa `POST /listas-comparativas/batch`
   - Este ya está corregido según el backend

---

## 📋 REQUISITOS

El endpoint `POST /listas-comparativas/excel` debe:

1. **Procesar el archivo Excel** (ya lo hace correctamente)
2. **Insertar items nuevos** en MongoDB usando la misma lógica que `/batch`
3. **Actualizar items existentes** si ya existen (mismo `proveedorId`, `codigo`, `descripcion`, `laboratorio`)
4. **Reportar correctamente** cuántos items se insertaron y cuántos se actualizaron

---

## 🔧 SOLUCIÓN

Aplicar la **misma corrección** que se hizo en `/batch` al endpoint `/excel`.

### Opción 1: Reutilizar la función de `/batch`

Si el endpoint `/excel` ya llama a una función compartida (como `crear_items_desde_batch()`), solo necesita asegurarse de que esa función esté usando `bulk_write()` correctamente.

### Opción 2: Aplicar la misma lógica directamente

Si `/excel` tiene su propia lógica de inserción, aplicar la misma corrección:

```python
from pymongo import UpdateOne, InsertOne

# Después de procesar el Excel y tener la lista de items:
items_para_insertar = []
items_para_actualizar = []

for item in items_procesados:
    # Validar campos requeridos
    if not all([
        item.get("codigo"),
        item.get("descripcion"),
        item.get("laboratorio"),
        item.get("precio") is not None
    ]):
        continue
    
    # Preparar datos del item
    item_data = {
        "proveedorId": proveedor_id,
        "codigo": str(item.get("codigo", "")).strip(),
        "descripcion": str(item.get("descripcion", "")).strip(),
        "laboratorio": str(item.get("laboratorio", "")).strip(),
        "precio": float(item.get("precio", 0)),
        "descuento": float(item.get("descuento", 0)),
        "precioNeto": float(item.get("precioNeto", 0)),
        "fechaVencimiento": item.get("fechaVencimiento"),
        "existencia": int(item.get("existencia", 0)),
        "usuarioCorreo": usuario_correo,
        "fechaActualizacion": datetime.utcnow(),
    }
    
    # Criterio de búsqueda para items existentes
    filtro = {
        "proveedorId": proveedor_id,
        "codigo": item_data["codigo"],
        "descripcion": item_data["descripcion"],
        "laboratorio": item_data["laboratorio"],
    }
    
    # Verificar si el item ya existe
    item_existente = await db.listas_comparativas.find_one(filtro)
    
    if item_existente:
        # Preparar para actualizar
        items_para_actualizar.append(
            UpdateOne(
                {"_id": item_existente["_id"]},  # Usar _id para actualización precisa
                {
                    "$set": {
                        "precio": item_data["precio"],
                        "descuento": item_data["descuento"],
                        "precioNeto": item_data["precioNeto"],
                        "fechaVencimiento": item_data["fechaVencimiento"],
                        "existencia": item_data["existencia"],
                        "fechaActualizacion": item_data["fechaActualizacion"],
                    }
                }
            )
        )
    else:
        # Preparar para insertar
        item_data["fechaCreacion"] = datetime.utcnow()
        items_para_insertar.append(InsertOne(item_data))

# Ejecutar operaciones bulk
operaciones = items_para_insertar + items_para_actualizar

if operaciones:
    resultado = await db.listas_comparativas.bulk_write(operaciones, ordered=False)
    
    items_insertados = resultado.inserted_count
    items_actualizados = resultado.modified_count
    
    return {
        "message": "Lista de precios procesada correctamente",
        "items_procesados": len(items_procesados),
        "items_insertados": items_insertados,
        "items_actualizados": items_actualizados,
    }
else:
    return {
        "message": "No se procesaron items válidos",
        "items_procesados": 0,
        "items_insertados": 0,
        "items_actualizados": 0,
    }
```

---

## ✅ VERIFICACIÓN

Después de aplicar la corrección, verificar que:

1. El endpoint `/excel` retorna `items_insertados > 0` o `items_actualizados > 0` cuando hay items válidos
2. Los logs muestran:
   ```
   [EXCEL] Items para insertar: X
   [EXCEL] Items para actualizar: Y
   [EXCEL] ✅ bulk_write completado:
   [EXCEL] - Insertados: X
   [EXCEL] - Actualizados: Y
   ```
3. El endpoint `GET /listas-comparativas` devuelve los items recién insertados
4. No se crean duplicados (items con mismo proveedor, código, descripción, laboratorio se actualizan)

---

## 📝 NOTAS

- El endpoint `/excel` recibe el archivo Excel directamente (FormData)
- El endpoint `/batch` recibe los items ya procesados (JSON)
- Ambos deben usar la misma lógica de inserción/actualización
- La diferencia es solo en cómo reciben los datos (archivo vs JSON)

---

## 🔗 REFERENCIA

- Endpoint corregido: `/batch` (usar como referencia)
- Función: `crear_items_desde_batch()` en `app/services/listas_comparativas_service.py`
- Commits de referencia: `429aa89`, `b45da73`

---

**Fecha**: 2025-12-07
**Prioridad**: 🔴 CRÍTICA
**Estado**: ⚠️ PENDIENTE DE CORRECCIÓN

