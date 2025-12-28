# Optimizaciones para Carga Rápida de Excel en Backend

Este documento contiene recomendaciones para optimizar la velocidad de procesamiento de archivos Excel en el backend, mejorando la experiencia del usuario con la barra de progreso.

## 🚀 Optimizaciones Recomendadas

### 1. Procesamiento en Chunks (Lotes)

En lugar de procesar todo el archivo de una vez, procesar en lotes pequeños permite:
- Mejor feedback al usuario
- Menor uso de memoria
- Procesamiento más rápido

**Ejemplo (Python/FastAPI):**

```python
@router.post("/excel")
async def subir_lista_excel(
    archivo: UploadFile = File(...),
    proveedorId: str = Form(...),
    usuarioCorreo: EmailStr = Form(...),
    current_user: dict = Depends(get_current_user)
):
    # ... validaciones ...
    
    CHUNK_SIZE = 100  # Procesar 100 filas a la vez
    
    try:
        contents = await archivo.read()
        workbook = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
        sheet = workbook.active
        
        # Obtener total de filas
        total_rows = sheet.max_row - 1  # Excluir header
        processed = 0
        
        # Procesar en chunks
        rows_to_process = list(sheet.iter_rows(min_row=2, values_only=True))
        
        for i in range(0, len(rows_to_process), CHUNK_SIZE):
            chunk = rows_to_process[i:i + CHUNK_SIZE]
            
            # Procesar chunk
            items_to_insert = []
            for row in chunk:
                # ... procesar fila ...
                items_to_insert.append(item_data)
            
            # Insertar chunk en MongoDB (bulk insert)
            if items_to_insert:
                await db.listas_precios_proveedores.insert_many(items_to_insert)
            
            processed += len(chunk)
            # Aquí podrías enviar progreso via WebSocket o Server-Sent Events
        
        workbook.close()
        return {"message": f"Procesadas {processed} filas exitosamente"}
    except Exception as e:
        # ... manejo de errores ...
```

### 2. Bulk Operations en MongoDB

Usar operaciones en lote en lugar de insertar uno por uno:

```python
# ❌ LENTO: Insertar uno por uno
for item in items:
    await db.listas_precios_proveedores.insert_one(item)

# ✅ RÁPIDO: Insertar en lote
await db.listas_precios_proveedores.insert_many(items)
```

### 3. Índices Optimizados

Asegurar que los índices estén creados antes de insertar:

```javascript
// Crear índices antes de procesar
db.listas_precios_proveedores.createIndex({ "codigo": 1, "proveedorId": 1 });
db.listas_precios_proveedores.createIndex({ "proveedorId": 1 });
```

### 4. Procesamiento Asíncrono (Opcional)

Para archivos muy grandes, considerar procesamiento en background:

```python
from celery import Celery

celery_app = Celery('tasks', broker='redis://localhost:6379')

@celery_app.task
def procesar_excel_async(archivo_path: str, proveedor_id: str, usuario_correo: str):
    # Procesar archivo en background
    # Notificar al usuario cuando termine (via WebSocket o polling)
    pass

@router.post("/excel")
async def subir_lista_excel(...):
    # Guardar archivo temporalmente
    file_path = f"/tmp/{archivo.filename}"
    with open(file_path, "wb") as f:
        f.write(await archivo.read())
    
    # Procesar en background
    task = procesar_excel_async.delay(file_path, proveedorId, usuarioCorreo)
    
    return {"task_id": task.id, "status": "processing"}
```

### 5. Validación Temprana

Validar el archivo antes de procesar todo:

```python
# Validar headers primero
headers = [cell.value for cell in sheet[1]]
required_headers = ['CODIGO', 'DESCRIPCION', 'PRECIO', ...]
if not all(h in headers for h in required_headers):
    raise ValueError("Faltan columnas requeridas")

# Validar formato de archivo
if sheet.max_row < 2:
    raise ValueError("El archivo está vacío")
```

### 6. Streaming para Archivos Grandes

Para archivos muy grandes, usar streaming:

```python
import csv
from io import StringIO

# Convertir Excel a CSV en memoria y procesar línea por línea
csv_data = StringIO()
# ... convertir Excel a CSV ...
reader = csv.DictReader(csv_data)

for row in reader:
    # Procesar fila
    pass
```

### 7. Usar `update_one` con `upsert=True` en lugar de `insert_one`

Si necesitas actualizar registros existentes, usa `upsert`:

```python
# ✅ Más eficiente: upsert
await db.listas_precios_proveedores.update_one(
    {"codigo": codigo, "proveedorId": proveedorId},
    {"$set": item_data},
    upsert=True
)

# ❌ Menos eficiente: buscar y luego insertar/actualizar
existing = await db.listas_precios_proveedores.find_one({...})
if existing:
    await db.listas_precios_proveedores.update_one({...}, {...})
else:
    await db.listas_precios_proveedores.insert_one({...})
```

### 8. Deshabilitar Validación de Schema (Solo si es seguro)

Si confías en los datos, puedes deshabilitar validación temporalmente:

```python
# Solo si es seguro y necesario para velocidad
# MongoDB puede validar más rápido si deshabilitas validación de schema
```

### 9. Procesamiento Paralelo (Para múltiples proveedores)

Si procesas múltiples archivos, usar procesamiento paralelo:

```python
import asyncio

async def procesar_archivo(archivo_path, proveedor_id):
    # Procesar archivo
    pass

# Procesar múltiples archivos en paralelo
tasks = [procesar_archivo(path, prov_id) for path, prov_id in archivos]
await asyncio.gather(*tasks)
```

### 10. Limpiar Memoria

Cerrar archivos y limpiar memoria después de procesar:

```python
try:
    workbook = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
    # ... procesar ...
finally:
    workbook.close()
    del workbook
    gc.collect()  # Forzar garbage collection si es necesario
```

## 📊 Métricas de Rendimiento Esperadas

Con estas optimizaciones, deberías lograr:

- **Archivos pequeños (< 1000 filas)**: < 5 segundos
- **Archivos medianos (1000-10000 filas)**: < 30 segundos
- **Archivos grandes (> 10000 filas)**: < 2 minutos

## 🔍 Monitoreo

Agregar logging para monitorear el rendimiento:

```python
import time
import logging

logger = logging.getLogger(__name__)

start_time = time.time()
# ... procesar archivo ...
elapsed = time.time() - start_time
logger.info(f"Archivo procesado en {elapsed:.2f} segundos ({total_rows} filas)")
```

## ⚠️ Notas Importantes

1. **La barra de progreso del frontend muestra el progreso de UPLOAD**, no el procesamiento del backend
2. Para mostrar progreso de procesamiento, necesitarías WebSockets o Server-Sent Events
3. El procesamiento en chunks puede mejorar la percepción de velocidad del usuario
4. Siempre validar datos antes de insertar en la base de datos

## 🎯 Prioridad de Implementación

1. **Alta**: Bulk operations, índices optimizados
2. **Media**: Procesamiento en chunks, validación temprana
3. **Baja**: Procesamiento asíncrono, streaming (solo para archivos muy grandes)

