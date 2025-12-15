# Instrucciones Backend: Error 500 al Crear Banco

## Error Reportado

```
Error interno del servidor: Object of type ValueError is not JSON serializable
Status Code: 500 Internal Server Error
Endpoint: POST /bancos
```

## Problema

El backend está lanzando una excepción `ValueError` de Python que no se está manejando correctamente. Las excepciones de validación deben convertirse en respuestas HTTP 422 (Unprocessable Entity) con un mensaje JSON claro, no en errores 500.

## Datos que Envía el Frontend

El frontend envía el siguiente payload al crear un banco:

```json
{
  "numeroCuenta": "0102-1234-5678901234",
  "nombreTitular": "Juan Pérez",
  "nombreBanco": "Banco de Venezuela",
  "cedulaRif": "V-12345678",
  "tipoMoneda": "USD" | "Bs",
  "disponible": 0,
  "farmacias": ["01", "02", "03"]
}
```

### Campos Importantes:

- **`tipoMoneda`**: Puede ser `"USD"` o `"Bs"` (string)
- **`disponible`**: Siempre `0` al crear (number)
- **`farmacias`**: Array de strings (IDs de farmacias)
- **`tasa`**: NO se envía al crear banco (solo se solicita en operaciones)
- **`disponibleUsd`**: NO se envía (se calcula en el backend si `tipoMoneda === "Bs"`)

## Solución: Manejo Correcto de Excepciones

### 1. Usar HTTPException en lugar de ValueError directo

**❌ Incorrecto:**
```python
if not numero_cuenta:
    raise ValueError("El número de cuenta es requerido")
```

**✅ Correcto:**
```python
from fastapi import HTTPException, status

if not numero_cuenta:
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="El número de cuenta es requerido"
    )
```

### 2. Validar Campos Requeridos

```python
from fastapi import HTTPException, status
from pydantic import BaseModel, validator

class BancoCreate(BaseModel):
    numeroCuenta: str
    nombreTitular: str | None = None
    nombreBanco: str
    cedulaRif: str | None = None
    tipoMoneda: str  # "USD" o "Bs"
    disponible: float = 0
    farmacias: list[str] = []
    tasa: float | None = None  # Opcional, no se envía al crear

    @validator('tipoMoneda')
    def validate_tipo_moneda(cls, v):
        if v not in ['USD', 'Bs']:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"tipoMoneda debe ser 'USD' o 'Bs', recibido: {v}"
            )
        return v

    @validator('farmacias')
    def validate_farmacias(cls, v):
        if not v or len(v) == 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Debe seleccionar al menos una farmacia"
            )
        return v

    @validator('numeroCuenta')
    def validate_numero_cuenta(cls, v):
        if not v or not v.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="El número de cuenta es requerido"
            )
        return v.strip()

    @validator('nombreBanco')
    def validate_nombre_banco(cls, v):
        if not v or not v.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="El nombre del banco es requerido"
            )
        return v.strip()
```

### 3. Validar Unicidad del Número de Cuenta

```python
# Verificar que el número de cuenta no exista
banco_existente = await db.bancos.find_one({"numeroCuenta": banco.numeroCuenta})
if banco_existente:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=f"Ya existe un banco con el número de cuenta {banco.numeroCuenta}"
    )
```

### 4. Validar IDs de Farmacias

```python
# Verificar que todas las farmacias existan
for farmacia_id in banco.farmacias:
    farmacia = await db.farmacias.find_one({"_id": farmacia_id})
    if not farmacia:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"La farmacia con ID {farmacia_id} no existe"
        )
```

### 5. Calcular disponibleUsd si tipoMoneda es "Bs"

```python
banco_data = {
    "numeroCuenta": banco.numeroCuenta,
    "nombreTitular": banco.nombreTitular,
    "nombreBanco": banco.nombreBanco,
    "cedulaRif": banco.cedulaRif,
    "tipoMoneda": banco.tipoMoneda,
    "disponible": banco.disponible,
    "farmacias": banco.farmacias,
    "createdAt": datetime.utcnow(),
    "updatedAt": datetime.utcnow()
}

# Si es banco en Bs, calcular disponibleUsd (aunque disponible sea 0)
if banco.tipoMoneda == "Bs":
    # Si hay tasa, usarla; si no, disponibleUsd será 0
    if banco.tasa and banco.tasa > 0:
        banco_data["tasa"] = banco.tasa
        banco_data["disponibleUsd"] = banco.disponible / banco.tasa
    else:
        banco_data["disponibleUsd"] = 0
else:
    # Si es USD, disponibleUsd es igual a disponible
    banco_data["disponibleUsd"] = banco.disponible
```

## Ejemplo Completo de Endpoint

```python
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, validator
from datetime import datetime
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
            raise ValueError(f"tipoMoneda debe ser 'USD' o 'Bs'")
        return v

    @validator('farmacias')
    def validate_farmacias(cls, v):
        if not v or len(v) == 0:
            raise ValueError("Debe seleccionar al menos una farmacia")
        return v

@router.post("/bancos", status_code=status.HTTP_201_CREATED)
async def crear_banco(banco: BancoCreate, db: AsyncIOMotorClient = Depends(get_database)):
    try:
        # Validar unicidad del número de cuenta
        banco_existente = await db.bancos.find_one({"numeroCuenta": banco.numeroCuenta})
        if banco_existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un banco con el número de cuenta {banco.numeroCuenta}"
            )

        # Validar farmacias
        for farmacia_id in banco.farmacias:
            farmacia = await db.farmacias.find_one({"_id": farmacia_id})
            if not farmacia:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"La farmacia con ID {farmacia_id} no existe"
                )

        # Preparar datos para insertar
        banco_data = {
            "numeroCuenta": banco.numeroCuenta.strip(),
            "nombreTitular": banco.nombreTitular.strip() if banco.nombreTitular else None,
            "nombreBanco": banco.nombreBanco.strip(),
            "cedulaRif": banco.cedulaRif.strip() if banco.cedulaRif else None,
            "tipoMoneda": banco.tipoMoneda,
            "disponible": banco.disponible,
            "farmacias": banco.farmacias,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }

        # Calcular disponibleUsd
        if banco.tipoMoneda == "Bs":
            if banco.tasa and banco.tasa > 0:
                banco_data["tasa"] = banco.tasa
                banco_data["disponibleUsd"] = banco.disponible / banco.tasa
            else:
                banco_data["disponibleUsd"] = 0
        else:
            banco_data["disponibleUsd"] = banco.disponible

        # Insertar en la base de datos
        result = await db.bancos.insert_one(banco_data)
        banco_creado = await db.bancos.find_one({"_id": result.inserted_id})

        return banco_creado

    except HTTPException:
        # Re-lanzar HTTPException tal cual
        raise
    except ValueError as e:
        # Convertir ValueError en HTTPException
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        # Cualquier otro error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno del servidor: {str(e)}"
        )
```

## Checklist de Validaciones

- [ ] `numeroCuenta` es requerido y no está vacío
- [ ] `nombreBanco` es requerido y no está vacío
- [ ] `tipoMoneda` es `"USD"` o `"Bs"`
- [ ] `farmacias` tiene al menos un elemento
- [ ] Todos los IDs en `farmacias` existen en la colección `farmacias`
- [ ] El `numeroCuenta` no existe ya en la base de datos
- [ ] `disponibleUsd` se calcula correctamente según `tipoMoneda`
- [ ] Todas las excepciones se convierten en `HTTPException` con códigos de estado apropiados

## Códigos de Estado HTTP

- **201 Created**: Banco creado exitosamente
- **422 Unprocessable Entity**: Error de validación (campos faltantes, valores inválidos)
- **409 Conflict**: El número de cuenta ya existe
- **500 Internal Server Error**: Solo para errores inesperados del servidor

## Notas Importantes

1. **NO lanzar `ValueError` directamente**: Siempre usar `HTTPException` con el código de estado apropiado.

2. **Mensajes de error claros**: Los mensajes deben ser descriptivos y ayudar al usuario a corregir el problema.

3. **Validación con Pydantic**: Usar validadores de Pydantic para validaciones simples, pero convertir `ValueError` en `HTTPException` en el endpoint.

4. **`tasa` no se envía al crear**: El campo `tasa` solo se usa en operaciones (depósitos, transferencias, cheques), no al crear el banco.

5. **`disponibleUsd` se calcula automáticamente**: No debe enviarse desde el frontend, se calcula en el backend según `tipoMoneda` y `tasa` (si aplica).

