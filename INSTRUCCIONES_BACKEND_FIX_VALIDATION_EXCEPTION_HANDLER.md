# Instrucciones Backend: Corregir validation_exception_handler

## Error Específico

El error ocurre en `main.py` línea 128, en el `validation_exception_handler`. El problema es que está intentando serializar un objeto `ValueError` directamente a JSON, lo cual no es posible.

```
File "/opt/render/project/src/app/main.py", line 128, in validation_exception_handler
    return JSONResponse(
        ...
TypeError: Object of type ValueError is not JSON serializable
```

## Problema

El `validation_exception_handler` está recibiendo una excepción que contiene un objeto `ValueError` y está intentando serializarlo directamente en el JSON de respuesta.

## Solución

### 1. Localizar el validation_exception_handler

Buscar en `app/main.py` (o donde esté definido) el handler de excepciones de validación:

```python
@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    # Código actual que está causando el error
```

### 2. Corregir el Handler

**❌ Código Incorrecto (causa el error):**
```python
@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": exc.errors(),  # Esto puede contener ValueError
            "body": exc.body  # Esto también puede causar problemas
        }
    )
```

**✅ Código Correcto:**
```python
from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Maneja errores de validación de Pydantic y los convierte en respuestas JSON.
    """
    errors = exc.errors()
    
    # Convertir todos los errores a formato serializable
    serializable_errors = []
    for error in errors:
        error_dict = {
            "loc": list(error.get("loc", [])),
            "msg": str(error.get("msg", "Validation error")),
            "type": str(error.get("type", "validation_error"))
        }
        # Si hay input, intentar convertirlo a string si no es serializable
        if "input" in error:
            try:
                # Intentar serializar el input
                import json
                json.dumps(error["input"])
                error_dict["input"] = error["input"]
            except (TypeError, ValueError):
                # Si no es serializable, convertirlo a string
                error_dict["input"] = str(error["input"])
        
        serializable_errors.append(error_dict)
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": serializable_errors
        }
    )
```

### 3. Manejar ValueError Específicamente

Si el problema persiste, agregar un handler específico para `ValueError`:

```python
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """
    Convierte ValueError en HTTPException 422.
    """
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": str(exc)  # Convertir ValueError a string
        }
    )
```

### 4. Solución Completa Recomendada

La mejor solución es asegurarse de que **nunca se lance `ValueError` directamente** en los endpoints. En su lugar, usar `HTTPException`:

```python
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, validator
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

class BancoCreate(BaseModel):
    numeroCuenta: str
    nombreTitular: str | None = None
    nombreBanco: str
    cedulaRif: str | None = None
    tipoMoneda: str
    disponible: float = 0
    farmacias: list[str] = []
    tasa: float | None = None

    @validator('tipoMoneda')
    def validate_tipo_moneda(cls, v):
        if v not in ['USD', 'Bs']:
            # ❌ NO hacer esto:
            # raise ValueError(f"tipoMoneda debe ser 'USD' o 'Bs'")
            
            # ✅ En su lugar, lanzar HTTPException en el endpoint
            # O usar un mensaje que Pydantic pueda manejar
            from pydantic import ValidationError
            raise ValueError(f"tipoMoneda debe ser 'USD' o 'Bs', recibido: {v}")
        return v

    @validator('farmacias')
    def validate_farmacias(cls, v):
        if not v or len(v) == 0:
            raise ValueError("Debe seleccionar al menos una farmacia")
        return v

@router.post("/bancos", status_code=status.HTTP_201_CREATED)
async def crear_banco(banco: BancoCreate, db: AsyncIOMotorClient = Depends(get_database)):
    try:
        # Validaciones adicionales aquí
        # ...
        
    except ValueError as e:
        # Convertir ValueError en HTTPException
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        # Otros errores
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno del servidor: {str(e)}"
        )
```

### 5. Handler Universal para Errores No Manejados

Agregar un handler para cualquier excepción no manejada:

```python
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Maneja cualquier excepción no manejada y la convierte en respuesta JSON.
    """
    # Log del error para debugging
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"Error no manejado: {type(exc).__name__}: {str(exc)}", exc_info=True)
    
    # Convertir cualquier excepción a string para serialización
    error_message = str(exc)
    
    # Si es ValueError, usar código 422
    if isinstance(exc, ValueError):
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    else:
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    
    return JSONResponse(
        status_code=status_code,
        content={
            "detail": error_message
        }
    )
```

## Orden de Handlers

El orden de los exception handlers es importante. FastAPI usa el primer handler que coincida:

```python
# 1. Handler específico para RequestValidationError (Pydantic)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # ...

# 2. Handler específico para ValueError
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    # ...

# 3. Handler general (debe ir al final)
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    # ...
```

## Verificación

Después de aplicar los cambios, verificar que:

1. ✅ Los errores de validación retornan código 422
2. ✅ El contenido de la respuesta es JSON válido
3. ✅ Los mensajes de error son claros y descriptivos
4. ✅ No hay errores de serialización JSON

## Ejemplo de Respuesta Esperada

**Error de validación (422):**
```json
{
  "detail": [
    {
      "loc": ["body", "tipoMoneda"],
      "msg": "tipoMoneda debe ser 'USD' o 'Bs', recibido: 'EUR'",
      "type": "value_error"
    }
  ]
}
```

**Error de ValueError convertido (422):**
```json
{
  "detail": "Debe seleccionar al menos una farmacia"
}
```

## Notas Importantes

1. **Nunca serializar objetos de excepción directamente**: Siempre convertir a string con `str(exc)`

2. **Usar HTTPException en endpoints**: En lugar de lanzar `ValueError`, usar `HTTPException` directamente en los endpoints

3. **Validadores de Pydantic**: Los validadores pueden lanzar `ValueError`, pero deben ser capturados y convertidos en el handler

4. **Logging**: Siempre registrar errores para debugging, pero no exponer detalles internos al cliente

