# Recomendaciones Backend - Errores ERR_CONNECTION_CLOSED

## 🔍 Análisis del Problema

### Errores Observados
Los siguientes endpoints están presentando errores `ERR_CONNECTION_CLOSED`:

1. ❌ `GET /farmacias` - Error intermitente
2. ❌ `GET /gastos` - Error intermitente
3. ❌ `GET /gastos/verified/por-farmacia` - Error intermitente
4. ❌ `GET /cuadres/costo-inventario/por-farmacia` - Error intermitente
5. ❌ `GET /pagoscpp/rango-fechas` - Error intermitente

### Endpoints que Funcionan Correctamente
1. ✅ `GET /gastos/verified/total` - Funciona correctamente
2. ✅ `GET /cuadres/costo-inventario/total` - Funciona correctamente

## 🎯 Posibles Causas

### 1. **Timeouts del Servidor**
- **Problema:** El servidor está tardando demasiado en responder y cierra la conexión
- **Solución:** Aumentar el timeout del servidor o optimizar las consultas

### 2. **Límites de Conexiones Concurrentes**
- **Problema:** El servidor está rechazando conexiones cuando hay muchas peticiones simultáneas
- **Solución:** Aumentar el límite de conexiones o implementar un sistema de cola

### 3. **Problemas de Memoria**
- **Problema:** El servidor se queda sin memoria al procesar grandes consultas
- **Solución:** Optimizar consultas, usar paginación, o aumentar memoria del servidor

### 4. **Configuración de Render.com**
- **Problema:** Render.com tiene límites de timeout y recursos
- **Solución:** Verificar configuración de Render.com y considerar upgrade de plan

### 5. **Consultas Ineficientes**
- **Problema:** Las consultas a la base de datos están tardando demasiado
- **Solución:** Optimizar consultas, agregar índices, usar agregaciones eficientes

## ✅ Recomendaciones para el Backend

### 1. **Aumentar Timeouts del Servidor**

**Si usas Express/FastAPI:**
```python
# FastAPI
from fastapi import FastAPI
import uvicorn

app = FastAPI()

# Aumentar timeout
if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        timeout_keep_alive=75,  # Aumentar timeout
        timeout_graceful_shutdown=30
    )
```

```javascript
// Express
const express = require('express');
const app = express();

// Aumentar timeout del servidor
app.timeout = 120000; // 2 minutos

// O en el servidor HTTP
const server = app.listen(port, () => {
  server.timeout = 120000;
});
```

### 2. **Optimizar Consultas a la Base de Datos**

**Para endpoints que procesan muchos datos:**

```python
# Ejemplo: Optimizar /gastos/verified/por-farmacia
# En lugar de traer todos los gastos y filtrar en Python:
gastos = db.gastos.find({"estado": "verified"})  # ❌ Ineficiente

# Usar agregación de MongoDB:
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
        "$group": {
            "_id": "$localidad",
            "total": {
                "$sum": {
                    "$cond": [
                        {"$eq": ["$divisa", "Bs"]},
                        {"$divide": ["$monto", "$tasa"]},
                        "$monto"
                    ]
                }
            }
        }
    }
]
resultado = db.gastos.aggregate(pipeline)  # ✅ Eficiente
```

### 3. **Implementar Caché**

**Para endpoints que se consultan frecuentemente:**

```python
from functools import lru_cache
from datetime import datetime, timedelta

# Caché en memoria (útil para datos que no cambian frecuentemente)
@lru_cache(maxsize=128)
def get_farmacias_cached():
    return list(db.farmacias.find({}))

# O usar Redis para caché distribuido
import redis
redis_client = redis.Redis(host='localhost', port=6379, db=0)

def get_farmacias_with_cache():
    cache_key = "farmacias:all"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    farmacias = list(db.farmacias.find({}))
    redis_client.setex(cache_key, 300, json.dumps(farmacias))  # Cache por 5 minutos
    return farmacias
```

### 4. **Implementar Paginación**

**Para endpoints que devuelven muchos datos:**

```python
# En lugar de devolver todos los gastos:
@app.get("/gastos")
async def get_gastos(skip: int = 0, limit: int = 100):
    gastos = db.gastos.find({}).skip(skip).limit(limit)
    total = db.gastos.count_documents({})
    return {
        "data": list(gastos),
        "total": total,
        "skip": skip,
        "limit": limit
    }
```

### 5. **Agregar Índices en MongoDB**

**Índices recomendados para mejorar el rendimiento:**

```javascript
// MongoDB - Agregar índices
db.gastos.createIndex({ "estado": 1, "fecha": 1, "localidad": 1 });
db.gastos.createIndex({ "estado": 1, "fecha": 1 });
db.cuadres.createIndex({ "estado": 1, "dia": 1, "farmacia": 1 });
db.cuadres.createIndex({ "estado": 1, "dia": 1 });
db.pagoscpp.createIndex({ "fecha": 1 });
```

### 6. **Configurar CORS Correctamente**

**Asegurar que CORS esté configurado para permitir todas las peticiones:**

```python
# FastAPI
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # O especificar dominios específicos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 7. **Implementar Rate Limiting**

**Para evitar sobrecarga del servidor:**

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.get("/gastos")
@limiter.limit("100/minute")  # Máximo 100 peticiones por minuto
async def get_gastos(request: Request):
    # ...
```

### 8. **Monitorear y Logging**

**Agregar logging para identificar endpoints problemáticos:**

```python
import logging
import time

logger = logging.getLogger(__name__)

@app.get("/gastos")
async def get_gastos():
    start_time = time.time()
    try:
        # ... código del endpoint
        elapsed = time.time() - start_time
        logger.info(f"GET /gastos completed in {elapsed:.2f}s")
        return resultado
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"GET /gastos failed after {elapsed:.2f}s: {str(e)}")
        raise
```

### 9. **Configurar Render.com Correctamente**

**Verificar configuración en Render.com:**

1. **Aumentar timeout:**
   - En el dashboard de Render.com, ir a Settings
   - Aumentar "Request Timeout" a 120 segundos o más

2. **Verificar recursos:**
   - Asegurar que el plan tenga suficiente memoria y CPU
   - Considerar upgrade si el servidor está sobrecargado

3. **Health Checks:**
   - Configurar un endpoint de health check simple
   - Render.com lo usará para verificar que el servidor está funcionando

```python
@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}
```

### 10. **Usar Connection Pooling**

**Para MongoDB:**

```python
from pymongo import MongoClient
from pymongo.pool import PoolOptions

# Configurar connection pool
client = MongoClient(
    connection_string,
    maxPoolSize=50,  # Aumentar tamaño del pool
    minPoolSize=10,
    maxIdleTimeMS=45000,
    serverSelectionTimeoutMS=5000
)
```

## 🔧 Soluciones Específicas por Endpoint

### `/farmacias`
- **Problema:** Probablemente se consulta muy frecuentemente
- **Solución:** Implementar caché (5-10 minutos)

### `/gastos`
- **Problema:** Puede devolver muchos datos
- **Solución:** 
  - Usar agregaciones de MongoDB en lugar de traer todos los datos
  - Implementar paginación
  - Agregar índices

### `/gastos/verified/por-farmacia`
- **Problema:** Consulta compleja que agrupa por farmacia
- **Solución:** 
  - Usar agregación de MongoDB (ya implementado, pero verificar optimización)
  - Agregar índices: `{estado: 1, fecha: 1, localidad: 1}`

### `/cuadres/costo-inventario/por-farmacia`
- **Problema:** Consulta compleja que procesa muchos cuadres
- **Solución:**
  - Usar agregación de MongoDB
  - Agregar índices: `{estado: 1, dia: 1, farmacia: 1}`

### `/pagoscpp/rango-fechas`
- **Problema:** Consulta por rango de fechas puede ser lenta
- **Solución:**
  - Agregar índice: `{fecha: 1}`
  - Optimizar consulta de rango

## 📋 Checklist de Verificación

- [ ] **Timeouts del servidor aumentados** (mínimo 120 segundos)
- [ ] **Índices agregados en MongoDB** para consultas frecuentes
- [ ] **Consultas optimizadas** usando agregaciones de MongoDB
- [ ] **Caché implementado** para endpoints que se consultan frecuentemente
- [ ] **CORS configurado correctamente**
- [ ] **Connection pooling configurado** para MongoDB
- [ ] **Logging implementado** para monitorear tiempos de respuesta
- [ ] **Render.com configurado** con timeouts adecuados
- [ ] **Health check endpoint** implementado
- [ ] **Rate limiting** implementado (opcional, pero recomendado)

## 🚨 Prioridades

### Alta Prioridad
1. ✅ Agregar índices en MongoDB
2. ✅ Aumentar timeouts del servidor
3. ✅ Optimizar consultas usando agregaciones

### Media Prioridad
4. ✅ Implementar caché para `/farmacias`
5. ✅ Configurar Render.com correctamente
6. ✅ Agregar logging

### Baja Prioridad
7. ✅ Implementar rate limiting
8. ✅ Implementar paginación (si es necesario)

## 📝 Notas Finales

- **El frontend ya maneja estos errores** con reintentos automáticos
- **Los endpoints optimizados funcionan correctamente** (`/gastos/verified/total`, `/cuadres/costo-inventario/total`)
- **El problema parece ser intermitente**, lo que sugiere problemas de timeout o sobrecarga
- **La solución más efectiva será optimizar las consultas y agregar índices**

---

**Una vez implementadas estas mejoras, los errores `ERR_CONNECTION_CLOSED` deberían reducirse significativamente.**

