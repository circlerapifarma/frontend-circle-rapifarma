# INSTRUCCIONES BACKEND - CORRECCIÓN DE INSERCIÓN DE LISTAS COMPARATIVAS

## 🚨 PROBLEMA CRÍTICO IDENTIFICADO

El endpoint `POST /listas-comparativas/excel` está procesando correctamente los archivos Excel (extrayendo los items), pero **NO está guardando los items en la base de datos**.

### Evidencia del problema:

```
[EXCEL] Items extraídos del Excel: 2035
[EXCEL] Procesamiento completado: 0 items insertados, 0 actualizados
```

El backend procesa los items pero reporta **0 items insertados, 0 actualizados**, lo que significa que los datos no se están persistiendo en MongoDB.

---

## 📋 REQUISITOS DE CORRECCIÓN

### 1. Verificar la lógica de inserción/actualización

El código debe:

1. **Insertar items nuevos** que no existen en la base de datos
2. **Actualizar items existentes** si ya existen (mismo `proveedorId`, `codigo`, `descripcion`, `laboratorio`)
3. **Reportar correctamente** cuántos items se insertaron y cuántos se actualizaron

### 2. Criterio de "item existente"

Un item se considera **existente** si tiene:
- Mismo `proveedorId`
- Mismo `codigo`
- Misma `descripcion`
- Mismo `laboratorio`

Si estos 4 campos coinciden, debe **actualizar** el item existente.
Si no existe, debe **insertar** un nuevo item.

### 3. Operaciones en batch (recomendado)

Para mejorar el rendimiento, usar operaciones en batch:
- `bulk_write()` de MongoDB con `UpdateOne` y `InsertOne`
- O `insert_many()` con `ordered=False` y manejo de duplicados

---

## 🔧 IMPLEMENTACIÓN SUGERIDA

### Opción 1: Usando `bulk_write()` (RECOMENDADO)

```python
from pymongo import UpdateOne
from datetime import datetime

async def procesar_items_excel(items: List[Dict], proveedor_id: str, usuario_correo: str):
    """
    Procesa items del Excel e inserta/actualiza en la base de datos.
    
    Returns:
        dict: {
            "items_insertados": int,
            "items_actualizados": int,
            "items_procesados": int
        }
    """
    if not items:
        return {
            "items_insertados": 0,
            "items_actualizados": 0,
            "items_procesados": 0
        }
    
    # Preparar operaciones bulk
    operaciones = []
    items_insertados = 0
    items_actualizados = 0
    
    for item in items:
        # Validar campos requeridos
        if not all([
            item.get("codigo"),
            item.get("descripcion"),
            item.get("laboratorio"),
            item.get("precio") is not None
        ]):
            continue  # Saltar items inválidos
        
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
            # ACTUALIZAR item existente
            operaciones.append(
                UpdateOne(
                    filtro,
                    {
                        "$set": {
                            "precio": item_data["precio"],
                            "descuento": item_data["descuento"],
                            "precioNeto": item_data["precioNeto"],
                            "fechaVencimiento": item_data["fechaVencimiento"],
                            "existencia": item_data["existencia"],
                            "fechaActualizacion": item_data["fechaActualizacion"],
                        }
                    },
                    upsert=False  # No crear si no existe
                )
            )
            items_actualizados += 1
        else:
            # INSERTAR nuevo item
            item_data["fechaCreacion"] = datetime.utcnow()
            operaciones.append(
                UpdateOne(
                    filtro,
                    {"$setOnInsert": item_data},
                    upsert=True  # Crear si no existe
                )
            )
            items_insertados += 1
    
    # Ejecutar operaciones bulk
    if operaciones:
        resultado = await db.listas_comparativas.bulk_write(operaciones, ordered=False)
        
        # Verificar resultados reales
        items_insertados_reales = resultado.upserted_count if hasattr(resultado, 'upserted_count') else items_insertados
        items_actualizados_reales = resultado.modified_count if hasattr(resultado, 'modified_count') else items_actualizados
        
        return {
            "items_insertados": items_insertados_reales,
            "items_actualizados": items_actualizados_reales,
            "items_procesados": len(items)
        }
    else:
        return {
            "items_insertados": 0,
            "items_actualizados": 0,
            "items_procesados": 0
        }
```

### Opción 2: Usando `insert_many()` con manejo de duplicados

```python
async def procesar_items_excel_v2(items: List[Dict], proveedor_id: str, usuario_correo: str):
    """
    Versión alternativa usando insert_many con manejo de duplicados.
    """
    items_para_insertar = []
    items_para_actualizar = []
    
    for item in items:
        # Validar campos requeridos
        if not all([
            item.get("codigo"),
            item.get("descripcion"),
            item.get("laboratorio"),
            item.get("precio") is not None
        ]):
            continue
        
        # Preparar datos
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
        
        # Verificar si existe
        filtro = {
            "proveedorId": proveedor_id,
            "codigo": item_data["codigo"],
            "descripcion": item_data["descripcion"],
            "laboratorio": item_data["laboratorio"],
        }
        
        item_existente = await db.listas_comparativas.find_one(filtro)
        
        if item_existente:
            items_para_actualizar.append((filtro, item_data))
        else:
            item_data["fechaCreacion"] = datetime.utcnow()
            items_para_insertar.append(item_data)
    
    # Insertar nuevos items
    items_insertados = 0
    if items_para_insertar:
        try:
            resultado = await db.listas_comparativas.insert_many(items_para_insertar, ordered=False)
            items_insertados = len(resultado.inserted_ids)
        except Exception as e:
            # Manejar errores de duplicados (puede ocurrir en concurrencia)
            print(f"Error al insertar items: {e}")
            items_insertados = 0
    
    # Actualizar items existentes
    items_actualizados = 0
    for filtro, item_data in items_para_actualizar:
        try:
            await db.listas_comparativas.update_one(
                filtro,
                {"$set": {
                    "precio": item_data["precio"],
                    "descuento": item_data["descuento"],
                    "precioNeto": item_data["precioNeto"],
                    "fechaVencimiento": item_data["fechaVencimiento"],
                    "existencia": item_data["existencia"],
                    "fechaActualizacion": item_data["fechaActualizacion"],
                }}
            )
            items_actualizados += 1
        except Exception as e:
            print(f"Error al actualizar item: {e}")
    
    return {
        "items_insertados": items_insertados,
        "items_actualizados": items_actualizados,
        "items_procesados": len(items)
    }
```

---

## 📝 ENDPOINT CORREGIDO

### `POST /listas-comparativas/excel`

```python
@router.post("/excel")
async def subir_lista_excel(
    archivo: UploadFile = File(...),
    proveedorId: str = Form(...),
    usuarioCorreo: str = Form(...),
    current_user: dict = Depends(verificar_permiso_listas_comparativas)
):
    """
    Sube una lista de precios desde un archivo Excel.
    
    El archivo debe tener las columnas:
    - CODIGO
    - DESCRIPCION
    - LABORATORIO
    - PRECIO
    - DESCUENTO (opcional, en %)
    - FECHA DE VENCIMIENTO (opcional)
    - EXISTENCIA (opcional)
    """
    try:
        # 1. Validar proveedor
        proveedor = await db.proveedores.find_one({"_id": ObjectId(proveedorId)})
        if not proveedor:
            raise HTTPException(status_code=404, detail="Proveedor no encontrado")
        
        # 2. Leer y procesar Excel
        contenido = await archivo.read()
        workbook = openpyxl.load_workbook(io.BytesIO(contenido), data_only=True)
        sheet = workbook.active
        
        # 3. Extraer items del Excel
        items = []
        headers = [cell.value for cell in sheet[1]]
        
        # Mapear índices de columnas
        codigo_idx = next((i for i, h in enumerate(headers) if h and "codigo" in str(h).lower()), None)
        descripcion_idx = next((i for i, h in enumerate(headers) if h and "descripcion" in str(h).lower()), None)
        laboratorio_idx = next((i for i, h in enumerate(headers) if h and "laboratorio" in str(h).lower()), None)
        precio_idx = next((i for i, h in enumerate(headers) if h and "precio" in str(h).lower()), None)
        descuento_idx = next((i for i, h in enumerate(headers) if h and "descuento" in str(h).lower()), None)
        fecha_venc_idx = next((i for i, h in enumerate(headers) if h and ("vencimiento" in str(h).lower() or "venc" in str(h).lower())), None)
        existencia_idx = next((i for i, h in enumerate(headers) if h and "existencia" in str(h).lower()), None)
        
        if None in [codigo_idx, descripcion_idx, laboratorio_idx, precio_idx]:
            raise HTTPException(status_code=400, detail="Faltan columnas requeridas en el Excel")
        
        # Obtener descuento comercial del proveedor
        descuento_comercial = float(proveedor.get("descuentosComerciales", {}).get("porcentaje", 0) or 0)
        
        # Procesar filas
        for row in sheet.iter_rows(min_row=2, values_only=True):
            if not row[codigo_idx] or not row[descripcion_idx]:
                continue  # Saltar filas vacías
            
            precio = float(row[precio_idx] or 0)
            descuento_excel = float(row[descuento_idx] or 0) if descuento_idx is not None else 0
            
            # Calcular precio neto: aplicar descuento del Excel primero, luego descuento comercial
            precio_con_descuento_excel = precio * (1 - descuento_excel / 100)
            precio_neto = precio_con_descuento_excel * (1 - descuento_comercial / 100)
            
            # Procesar fecha de vencimiento
            fecha_vencimiento = None
            if fecha_venc_idx is not None and row[fecha_venc_idx]:
                fecha_val = row[fecha_venc_idx]
                if isinstance(fecha_val, datetime):
                    fecha_vencimiento = fecha_val.isoformat()
                elif isinstance(fecha_val, str):
                    fecha_vencimiento = fecha_val
            
            item = {
                "codigo": str(row[codigo_idx]).strip(),
                "descripcion": str(row[descripcion_idx]).strip(),
                "laboratorio": str(row[laboratorio_idx] or "").strip(),
                "precio": precio,
                "descuento": descuento_excel,
                "precioNeto": precio_neto,
                "fechaVencimiento": fecha_vencimiento,
                "existencia": int(row[existencia_idx] or 0) if existencia_idx is not None else 0,
            }
            
            items.append(item)
        
        # 4. Insertar/Actualizar items en la base de datos
        resultado = await procesar_items_excel(items, proveedorId, usuarioCorreo)
        
        # 5. Retornar respuesta
        return {
            "message": "Lista de precios procesada correctamente",
            "items_procesados": resultado["items_procesados"],
            "items_insertados": resultado["items_insertados"],
            "items_actualizados": resultado["items_actualizados"],
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error al procesar Excel: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al procesar archivo Excel: {str(e)}")
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

Antes de considerar el problema resuelto, verificar:

- [ ] El endpoint `POST /listas-comparativas/excel` retorna `items_insertados > 0` o `items_actualizados > 0` cuando hay items válidos
- [ ] Los items se guardan correctamente en la colección `listas_comparativas` de MongoDB
- [ ] El endpoint `GET /listas-comparativas` devuelve los items recién insertados
- [ ] Los items duplicados (mismo proveedor, código, descripción, laboratorio) se actualizan en lugar de crear duplicados
- [ ] Los logs muestran números correctos de items insertados/actualizados
- [ ] Se manejan correctamente los errores de validación (items inválidos se saltan sin romper el proceso)

---

## 🐛 DEBUGGING

Si el problema persiste, verificar:

1. **Conexión a MongoDB**: ¿Está funcionando la conexión?
   ```python
   # Agregar al inicio del endpoint
   try:
       await db.listas_comparativas.find_one({})
   except Exception as e:
       print(f"Error de conexión a MongoDB: {e}")
   ```

2. **Permisos de escritura**: ¿La base de datos permite escritura?
   ```python
   # Probar inserción simple
   test_item = {
       "proveedorId": proveedorId,
       "codigo": "TEST",
       "descripcion": "Test",
       "laboratorio": "Test",
       "precio": 0,
       "descuento": 0,
       "precioNeto": 0,
       "fechaCreacion": datetime.utcnow(),
   }
   resultado = await db.listas_comparativas.insert_one(test_item)
   print(f"Test insertado con ID: {resultado.inserted_id}")
   ```

3. **Validación de datos**: ¿Los items tienen todos los campos requeridos?
   ```python
   # Agregar logs detallados
   for item in items[:5]:  # Primeros 5 items
       print(f"Item a procesar: {item}")
   ```

4. **Errores silenciosos**: ¿Hay excepciones que se están capturando sin loguear?
   ```python
   try:
       # código de inserción
   except Exception as e:
       print(f"ERROR CRÍTICO: {e}")
       import traceback
       traceback.print_exc()
       raise  # Re-lanzar para ver el error completo
   ```

---

## 📊 RESPUESTA ESPERADA

El endpoint debe retornar:

```json
{
  "message": "Lista de precios procesada correctamente",
  "items_procesados": 2035,
  "items_insertados": 1500,
  "items_actualizados": 535
}
```

**NO debe retornar:**
```json
{
  "items_insertados": 0,
  "items_actualizados": 0
}
```

---

## 🔗 ENDPOINTS RELACIONADOS

- `GET /listas-comparativas`: Debe devolver todos los items guardados
- `POST /listas-comparativas/batch`: Similar a `/excel` pero para archivos grandes (procesa en lotes)
- `DELETE /listas-comparativas/proveedor/{proveedorId}`: Elimina todas las listas de un proveedor

---

## 📝 NOTAS IMPORTANTES

1. **Índices de MongoDB**: Asegurar que exista un índice compuesto en `(proveedorId, codigo, descripcion, laboratorio)` para mejorar el rendimiento de búsquedas:
   ```python
   await db.listas_comparativas.create_index([
       ("proveedorId", 1),
       ("codigo", 1),
       ("descripcion", 1),
       ("laboratorio", 1)
   ], unique=True)
   ```

2. **Manejo de errores**: No debe fallar todo el proceso si un item es inválido. Continuar con los demás items.

3. **Logs**: Agregar logs detallados para debugging:
   ```python
   print(f"[EXCEL] Items a procesar: {len(items)}")
   print(f"[EXCEL] Items válidos: {len([i for i in items if all([i.get('codigo'), i.get('descripcion')])])}")
   print(f"[EXCEL] Iniciando inserción/actualización...")
   ```

---

**Fecha de creación**: 2025-12-07
**Prioridad**: 🔴 CRÍTICA
**Estado**: ⚠️ PENDIENTE DE CORRECCIÓN

