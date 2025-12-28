# ⚠️ URGENTE: Configurar CORS en el Backend

**NOTA ADICIONAL:** Si recibes error 502 Bad Gateway al subir archivos grandes, ver también `INSTRUCCIONES_BACKEND_ARCHIVOS_GRANDES.md`

## 🔴 Error Actual

El frontend está recibiendo errores de CORS en TODOS los endpoints:
- `/farmacias`
- `/proveedores`
- `/listas-comparativas`
- `/listas-comparativas/excel`

```
Access to fetch at 'https://backend-circle-rapifarma.onrender.com/...' 
from origin 'https://rapifarma-administrativo.vercel.app' 
has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## ✅ Solución INMEDIATA

### Paso 1: Abrir el archivo principal de FastAPI

Busca el archivo donde defines la aplicación FastAPI (probablemente `main.py`, `app.py`, o `app/main.py`).

### Paso 2: Agregar CORS ANTES de cualquier ruta

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# ⚠️ CRÍTICO: Esto DEBE ir ANTES de app.include_router() o cualquier ruta
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://rapifarma-administrativo.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Permite GET, POST, PUT, DELETE, OPTIONS, etc.
    allow_headers=["*"],  # Permite todos los headers incluyendo Authorization
)

# DESPUÉS de CORS, agregar tus routers
# app.include_router(...)
```

### Paso 3: Verificar el orden

El orden correcto es:

```python
# ✅ CORRECTO
app = FastAPI()
app.add_middleware(CORSMiddleware, ...)  # 1. CORS primero
app.include_router(router)               # 2. Rutas después

# ❌ INCORRECTO (NO FUNCIONA)
app = FastAPI()
app.include_router(router)               # Rutas primero
app.add_middleware(CORSMiddleware, ...)  # CORS después
```

## 📋 Ejemplo Completo

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import listas_comparativas, proveedores, farmacias, usuarios

app = FastAPI(
    title="Circle Rapifarma API",
    version="1.0.0"
)

# ⚠️ CORS DEBE IR PRIMERO
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

# Ahora sí, agregar routers
app.include_router(listas_comparativas.router, prefix="/listas-comparativas", tags=["listas-comparativas"])
app.include_router(proveedores.router, prefix="/proveedores", tags=["proveedores"])
app.include_router(farmacias.router, prefix="/farmacias", tags=["farmacias"])
app.include_router(usuarios.router, prefix="/usuarios", tags=["usuarios"])

@app.get("/")
async def root():
    return {"message": "API Circle Rapifarma"}

@app.get("/health")
async def health():
    return {"status": "ok"}
```

## 🧪 Verificar que Funciona

Después de hacer el cambio, reinicia el servidor y prueba:

```bash
# Probar con curl
curl -X OPTIONS \
  https://backend-circle-rapifarma.onrender.com/proveedores \
  -H "Origin: https://rapifarma-administrativo.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

Debe devolver:
```
< HTTP/1.1 200 OK
< Access-Control-Allow-Origin: https://rapifarma-administrativo.vercel.app
< Access-Control-Allow-Methods: *
< Access-Control-Allow-Headers: *
```

## ⚠️ Si Aún No Funciona

1. **Verifica que el middleware esté ANTES de los routers**
2. **Reinicia el servidor completamente** (no solo recarga)
3. **Verifica los logs** - deberías ver respuestas 200 para OPTIONS
4. **Asegúrate de que `allow_origins` incluya exactamente** `https://rapifarma-administrativo.vercel.app` (sin trailing slash)

## 🚀 Después de Configurar

Una vez configurado, el frontend debería poder:
- ✅ Cargar listas de precios
- ✅ Cargar proveedores
- ✅ Cargar farmacias
- ✅ Subir archivos Excel

## 📞 Si Necesitas Ayuda

Si después de seguir estos pasos aún hay errores, verifica:
1. Que el servidor se haya reiniciado
2. Que no haya otro middleware bloqueando CORS
3. Que los logs muestren respuestas 200 para OPTIONS

