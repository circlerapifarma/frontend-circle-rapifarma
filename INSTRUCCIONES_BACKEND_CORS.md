# Instrucciones para Configurar CORS en el Backend

## 🔴 Problema

El frontend está recibiendo este error:
```
Access to XMLHttpRequest at 'https://backend-circle-rapifarma.onrender.com/listas-comparativas/excel' 
from origin 'https://rapifarma-administrativo.vercel.app' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## ✅ Solución: Configurar CORS en FastAPI

### Opción 1: Configuración Básica (Recomendada)

En el archivo principal de FastAPI (probablemente `main.py` o `app.py`):

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# ⚠️ IMPORTANTE: Configurar CORS ANTES de cualquier otra ruta
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://rapifarma-administrativo.vercel.app",
        "http://localhost:5173",  # Para desarrollo local
        "http://localhost:3000",  # Para desarrollo local alternativo
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos los métodos (GET, POST, PUT, DELETE, OPTIONS, etc.)
    allow_headers=["*"],  # Permite todos los headers
)
```

### Opción 2: Configuración con Variables de Entorno (Más Flexible)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# Obtener orígenes permitidos de variables de entorno
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "https://rapifarma-administrativo.vercel.app,http://localhost:5173,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Opción 3: Configuración Completa con Validación

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List

app = FastAPI()

# Lista de orígenes permitidos
ALLOWED_ORIGINS: List[str] = [
    "https://rapifarma-administrativo.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
        "X-Requested-With",
    ],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)
```

## 📋 Verificación

### 1. Verificar que el middleware esté configurado ANTES de las rutas

```python
# ✅ CORRECTO
app = FastAPI()
app.add_middleware(CORSMiddleware, ...)  # Primero CORS
app.include_router(router)  # Luego las rutas

# ❌ INCORRECTO
app = FastAPI()
app.include_router(router)  # Rutas primero
app.add_middleware(CORSMiddleware, ...)  # CORS después (NO FUNCIONA)
```

### 2. Verificar que OPTIONS esté permitido

El navegador envía una petición OPTIONS (preflight) antes de POST/PUT/DELETE. Asegúrate de que:

- `allow_methods` incluya `"OPTIONS"` o use `["*"]`
- El middleware responda correctamente a OPTIONS

### 3. Verificar headers en la respuesta

El backend debe incluir estos headers en las respuestas:

```
Access-Control-Allow-Origin: https://rapifarma-administrativo.vercel.app
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## 🔍 Debugging

### Probar con curl

```bash
# Probar preflight (OPTIONS)
curl -X OPTIONS \
  https://backend-circle-rapifarma.onrender.com/listas-comparativas/excel \
  -H "Origin: https://rapifarma-administrativo.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v

# Debe devolver:
# < HTTP/1.1 200 OK
# < Access-Control-Allow-Origin: https://rapifarma-administrativo.vercel.app
# < Access-Control-Allow-Methods: POST
# < Access-Control-Allow-Headers: Content-Type,Authorization
```

### Verificar en los logs

Los logs muestran que OPTIONS funciona para algunos endpoints:
```
INFO: "OPTIONS /proveedores HTTP/1.1" 200 OK
INFO: "OPTIONS /listas-comparativas HTTP/1.1" 200 OK
```

Pero falta para `/listas-comparativas/excel`. Esto puede significar:
1. El middleware CORS no está configurado globalmente
2. El endpoint tiene un middleware diferente que bloquea CORS
3. El endpoint no está manejando OPTIONS correctamente

## 🛠️ Solución Específica para `/listas-comparativas/excel`

Si el problema es solo con este endpoint, verifica:

### 1. Que el router incluya CORS

```python
from fastapi import APIRouter
from fastapi.middleware.cors import CORSMiddleware

router = APIRouter()

# Si el router tiene su propio middleware, asegúrate de que permita CORS
@router.post("/excel")
async def subir_lista_excel(...):
    # Tu código aquí
    pass
```

### 2. Que el endpoint permita OPTIONS explícitamente

```python
@router.options("/excel")
async def options_excel():
    return {"message": "OK"}
```

### 3. Verificar que no haya middleware que bloquee CORS

Asegúrate de que no haya middleware personalizado que esté bloqueando las peticiones CORS antes de que lleguen al middleware de CORS.

## 📝 Ejemplo Completo de main.py

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import listas_comparativas, proveedores, usuarios

app = FastAPI(
    title="Circle Rapifarma API",
    description="API para gestión de farmacias",
    version="1.0.0"
)

# ⚠️ CRÍTICO: Configurar CORS ANTES de incluir routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://rapifarma-administrativo.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers DESPUÉS de CORS
app.include_router(listas_comparativas.router, prefix="/listas-comparativas", tags=["listas-comparativas"])
app.include_router(proveedores.router, prefix="/proveedores", tags=["proveedores"])
app.include_router(usuarios.router, prefix="/usuarios", tags=["usuarios"])

@app.get("/")
async def root():
    return {"message": "API Circle Rapifarma"}

@app.get("/health")
async def health():
    return {"status": "ok"}
```

## ⚠️ Notas Importantes

1. **Orden es crítico**: El middleware CORS debe agregarse ANTES de incluir los routers
2. **allow_credentials=True**: Necesario si usas cookies o tokens en headers
3. **allow_methods=["*"]**: Permite todos los métodos HTTP (GET, POST, PUT, DELETE, OPTIONS, etc.)
4. **allow_headers=["*"]**: Permite todos los headers (incluyendo Authorization para Bearer tokens)

## 🚀 Despliegue

Si usas variables de entorno en Render.com:

1. Ve a tu servicio en Render
2. Settings → Environment Variables
3. Agrega:
   ```
   ALLOWED_ORIGINS=https://rapifarma-administrativo.vercel.app,http://localhost:5173
   ```

Luego usa la Opción 2 en tu código.

## ✅ Checklist

- [ ] Middleware CORS configurado ANTES de los routers
- [ ] `allow_origins` incluye `https://rapifarma-administrativo.vercel.app`
- [ ] `allow_credentials=True` si usas autenticación
- [ ] `allow_methods` incluye `OPTIONS` o usa `["*"]`
- [ ] `allow_headers` incluye `Authorization` o usa `["*"]`
- [ ] Probar con curl que OPTIONS funciona
- [ ] Verificar en los logs que OPTIONS devuelve 200 OK
- [ ] Probar subir un archivo Excel desde el frontend

## 🔗 Referencias

- [FastAPI CORS Documentation](https://fastapi.tiangolo.com/tutorial/cors/)
- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

