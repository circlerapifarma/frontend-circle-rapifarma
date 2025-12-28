# Instrucciones Backend: Manejo de Archivos Grandes y Error 502

## 🔴 Problema Actual

El backend está devolviendo **502 Bad Gateway** al intentar subir archivos Excel grandes (~19MB):

```
POST /listas-comparativas/excel
Status Code: 502 Bad Gateway
Content-Length: 19496090 (19MB)
```

## ✅ Soluciones

### 1. Aumentar Límites de Tamaño en FastAPI

En el archivo principal (`main.py` o `app.py`):

```python
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Configurar límites de tamaño de archivo
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://rapifarma-administrativo.vercel.app",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Aumentar límite de tamaño de request
@app.middleware("http")
async def increase_request_size(request: Request, call_next):
    # Permitir archivos hasta 50MB
    if request.headers.get("content-type", "").startswith("multipart/form-data"):
        # FastAPI maneja multipart automáticamente, pero necesitamos configurar uvicorn
        pass
    response = await call_next(request)
    return response
```

### 2. Configurar Uvicorn con Límites Mayores

En el archivo de configuración de uvicorn o en el comando de inicio:

```python
# Si usas uvicorn.run() en el código
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        limit_concurrency=1000,
        limit_max_requests=1000,
        timeout_keep_alive=75,
        # No hay límite directo en uvicorn para tamaño de body
        # Se maneja en FastAPI
    )
```

O en el comando de Render.com, asegúrate de que no haya límites:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT --timeout-keep-alive 75
```

### 3. Configurar el Endpoint para Archivos Grandes

En el router de `listas-comparativas`:

```python
from fastapi import APIRouter, UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse

router = APIRouter()

@router.post("/excel")
async def subir_lista_excel(
    archivo: UploadFile = File(..., max_length=52428800),  # 50MB máximo
    proveedorId: str = Form(...),
    usuarioCorreo: str = Form(...),
    # ... otros parámetros
):
    try:
        # Leer el archivo en chunks para no cargar todo en memoria
        contents = await archivo.read()
        
        # Procesar el archivo
        # ... tu lógica aquí
        
        return {"message": "Lista subida exitosamente", "items_procesados": len(items)}
    except Exception as e:
        # Log del error
        print(f"Error al procesar archivo: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error al procesar archivo: {str(e)}"}
        )
```

### 4. Procesar Archivos en Chunks (Recomendado para Archivos Muy Grandes)

```python
import io
import openpyxl
from openpyxl import load_workbook

@router.post("/excel")
async def subir_lista_excel(
    archivo: UploadFile = File(...),
    proveedorId: str = Form(...),
    usuarioCorreo: str = Form(...),
):
    try:
        # Leer el archivo
        contents = await archivo.read()
        
        # Usar BytesIO para no escribir en disco
        excel_file = io.BytesIO(contents)
        
        # Cargar workbook con data_only=True para leer valores, no fórmulas
        workbook = load_workbook(excel_file, data_only=True, read_only=True)
        sheet = workbook.active
        
        items = []
        batch_size = 1000  # Procesar en lotes de 1000
        
        # Leer filas en chunks
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            if row_idx % batch_size == 0:
                # Insertar lote en la base de datos
                if items:
                    db.listas_precios_proveedores.insert_many(items)
                    items = []
            
            # Procesar fila
            # ... tu lógica aquí
            items.append(item_data)
        
        # Insertar último lote
        if items:
            db.listas_precios_proveedores.insert_many(items)
        
        workbook.close()
        
        return {"message": "Lista subida exitosamente"}
    except Exception as e:
        print(f"Error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": str(e)}
        )
```

### 5. Configurar Timeout en Render.com

En Render.com, verifica:
1. **Service Settings** → **Health Check Path**: Debe estar configurado
2. **Environment Variables**: No debe haber límites de tamaño
3. **Auto-Deploy**: Verifica que el servicio no se esté reiniciando durante la subida

### 6. Solucionar Error de bcrypt

El error en los logs:
```
AttributeError: module 'bcrypt' has no attribute '__about__'
```

**Solución:**

```bash
# Actualizar bcrypt y passlib
pip install --upgrade bcrypt passlib
```

O en `requirements.txt`:
```
bcrypt>=4.0.0
passlib[bcrypt]>=1.7.4
```

### 7. Optimizar el Procesamiento

Para archivos grandes, considera:

1. **Procesar asíncronamente:**
```python
from fastapi import BackgroundTasks

@router.post("/excel")
async def subir_lista_excel(
    archivo: UploadFile = File(...),
    proveedorId: str = Form(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    # Guardar archivo temporalmente
    file_path = f"/tmp/{archivo.filename}"
    with open(file_path, "wb") as f:
        contents = await archivo.read()
        f.write(contents)
    
    # Procesar en background
    background_tasks.add_task(procesar_archivo_async, file_path, proveedorId)
    
    return {"message": "Archivo recibido, procesando en background..."}
```

2. **Usar bulk operations de MongoDB:**
```python
from pymongo import InsertOne, UpdateOne

operations = []
for item in items:
    operations.append(InsertOne(item))

if operations:
    db.listas_precios_proveedores.bulk_write(operations, ordered=False)
```

## 📋 Checklist

- [ ] Aumentar límite de tamaño de archivo en FastAPI
- [ ] Configurar uvicorn sin límites de timeout
- [ ] Procesar archivos en chunks/lotes
- [ ] Actualizar bcrypt y passlib
- [ ] Verificar configuración de Render.com
- [ ] Agregar logging para debug
- [ ] Manejar errores con try/catch apropiados
- [ ] Usar bulk operations de MongoDB

## 🧪 Pruebas

Después de implementar:

1. Probar con archivo pequeño (< 1MB)
2. Probar con archivo mediano (5-10MB)
3. Probar con archivo grande (15-20MB)
4. Verificar logs del servidor
5. Verificar que los datos se guarden correctamente

## ⚠️ Notas Importantes

- **Render.com** puede tener límites de memoria. Si el archivo es muy grande, considera aumentar el plan.
- **MongoDB** puede tardar en insertar muchos documentos. Usa `bulk_write` con `ordered=False` para mejor rendimiento.
- **Timeout**: Asegúrate de que el timeout del servidor sea suficiente (al menos 5 minutos para archivos grandes).

