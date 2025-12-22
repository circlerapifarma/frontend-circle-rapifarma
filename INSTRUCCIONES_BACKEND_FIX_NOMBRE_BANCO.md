# Instrucciones Backend - Fix: Actualización de nombreBanco

## 🐛 Problema Reportado

El usuario reporta que al editar un banco y cambiar el `nombreBanco`, el sistema muestra un mensaje de éxito pero el nombre no se guarda en la base de datos.

## 📋 Verificaciones Necesarias en el Backend

### 1. Verificar el Modelo BancoUpdate

El modelo `BancoUpdate` debe incluir `nombreBanco` como campo opcional:

```python
from pydantic import BaseModel, Field
from typing import Optional, List

class BancoUpdate(BaseModel):
    numeroCuenta: Optional[str] = None
    nombreBanco: Optional[str] = None  # ✅ DEBE ESTAR INCLUIDO
    nombreTitular: Optional[str] = None
    cedulaRif: Optional[str] = None
    tipoMoneda: Optional[str] = None
    tasa: Optional[float] = None
    porcentajeComision: Optional[float] = None
    metodoPagoDefault: Optional[List[str]] = None
    farmacias: Optional[List[str]] = None
```

### 2. Verificar el Endpoint PATCH `/bancos/{id}`

El endpoint debe procesar y actualizar el campo `nombreBanco`:

```python
@router.patch("/bancos/{id}", status_code=status.HTTP_200_OK)
async def actualizar_banco(
    id: str,
    banco_update: BancoUpdate,
    db: AsyncIOMotorClient = Depends(get_database),
    current_user = Depends(verificar_permiso_bancos)
):
    try:
        # Validar que el banco existe
        banco_existente = await db.bancos.find_one({"_id": ObjectId(id)})
        if not banco_existente:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Banco no encontrado"
            )
        
        # Construir update_data con TODOS los campos que vienen en banco_update
        update_data = {}
        
        # ✅ IMPORTANTE: Incluir nombreBanco si viene en el request
        if banco_update.nombreBanco is not None:
            update_data["nombreBanco"] = banco_update.nombreBanco.strip()
        
        if banco_update.numeroCuenta is not None:
            update_data["numeroCuenta"] = banco_update.numeroCuenta.strip()
        
        if banco_update.nombreTitular is not None:
            update_data["nombreTitular"] = banco_update.nombreTitular.strip()
        
        if banco_update.cedulaRif is not None:
            update_data["cedulaRif"] = banco_update.cedulaRif.strip()
        
        if banco_update.tipoMoneda is not None:
            update_data["tipoMoneda"] = banco_update.tipoMoneda
        
        if banco_update.tasa is not None:
            update_data["tasa"] = banco_update.tasa
            # Si hay tasa, recalcular disponibleUsd
            if banco_existente.get("disponible") and banco_update.tasa > 0:
                update_data["disponibleUsd"] = banco_existente["disponible"] / banco_update.tasa
        
        if banco_update.porcentajeComision is not None:
            update_data["porcentajeComision"] = banco_update.porcentajeComision
        
        if banco_update.metodoPagoDefault is not None:
            # Asegurar que sea un array
            if isinstance(banco_update.metodoPagoDefault, str):
                update_data["metodoPagoDefault"] = [banco_update.metodoPagoDefault]
            else:
                update_data["metodoPagoDefault"] = banco_update.metodoPagoDefault
        
        if banco_update.farmacias is not None:
            if len(banco_update.farmacias) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Debe seleccionar al menos una farmacia"
                )
            update_data["farmacias"] = banco_update.farmacias
        
        # Solo actualizar si hay datos para actualizar
        if update_data:
            update_data["updatedAt"] = datetime.utcnow()
            await db.bancos.update_one(
                {"_id": ObjectId(id)},
                {"$set": update_data}
            )
        
        # Obtener y retornar el banco actualizado
        banco_actualizado = await db.bancos.find_one({"_id": ObjectId(id)})
        
        # Convertir ObjectId a string para la respuesta
        banco_actualizado["_id"] = str(banco_actualizado["_id"])
        
        return banco_actualizado
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar banco: {str(e)}"
        )
```

### 3. Verificar que el Frontend Está Enviando los Datos

El frontend envía los siguientes datos cuando se edita un banco:

```json
{
  "numeroCuenta": "01340073310731071093",
  "nombreBanco": "Nuevo Nombre del Banco",  // ✅ Este campo se envía
  "nombreTitular": "DIST. MERALEN A.C.A.",
  "cedulaRif": "...",
  "tipoMoneda": "Bs",
  "metodoPagoDefault": ["pagoMovil"],
  "farmacias": ["01", "02"],
  "tasa": 1,
  "porcentajeComision": null
}
```

### 4. Debugging - Agregar Logs

Agregar logs temporales para verificar qué está recibiendo el backend:

```python
@router.patch("/bancos/{id}", status_code=status.HTTP_200_OK)
async def actualizar_banco(
    id: str,
    banco_update: BancoUpdate,
    db: AsyncIOMotorClient = Depends(get_database),
    current_user = Depends(verificar_permiso_bancos)
):
    try:
        # 🔍 DEBUG: Ver qué está recibiendo
        print(f"🔍 DEBUG - Datos recibidos para actualizar banco {id}:")
        print(f"  - nombreBanco: {banco_update.nombreBanco}")
        print(f"  - banco_update completo: {banco_update.dict()}")
        
        # ... resto del código ...
        
        # 🔍 DEBUG: Ver qué se va a actualizar
        print(f"🔍 DEBUG - update_data que se enviará a MongoDB:")
        print(f"  - update_data: {update_data}")
        
        # ... resto del código ...
```

### 5. Verificar la Respuesta del Backend

El backend debe retornar el banco actualizado con el `nombreBanco` actualizado:

```python
# Después de actualizar
banco_actualizado = await db.bancos.find_one({"_id": ObjectId(id)})

# Verificar que nombreBanco se actualizó
print(f"🔍 DEBUG - Banco después de actualizar:")
print(f"  - nombreBanco en BD: {banco_actualizado.get('nombreBanco')}")

# Retornar el banco actualizado
banco_actualizado["_id"] = str(banco_actualizado["_id"])
return banco_actualizado
```

## ✅ Checklist de Verificación

- [ ] El modelo `BancoUpdate` incluye `nombreBanco: Optional[str] = None`
- [ ] El endpoint PATCH verifica `if banco_update.nombreBanco is not None:`
- [ ] El endpoint incluye `nombreBanco` en `update_data`
- [ ] El endpoint ejecuta `db.bancos.update_one()` con el `update_data`
- [ ] El endpoint retorna el banco actualizado después de la actualización
- [ ] Se agregaron logs temporales para debugging
- [ ] Se probó actualizar solo el `nombreBanco` y verificar que se guarda

## 🔍 Posibles Causas del Problema

1. **El modelo `BancoUpdate` no incluye `nombreBanco`**
   - Solución: Agregar `nombreBanco: Optional[str] = None` al modelo

2. **El endpoint no procesa `nombreBanco`**
   - Solución: Agregar la verificación `if banco_update.nombreBanco is not None:`

3. **El `update_data` no incluye `nombreBanco`**
   - Solución: Asegurar que se agregue a `update_data` antes de hacer `update_one()`

4. **El backend retorna el banco antes de actualizarlo**
   - Solución: Obtener el banco actualizado después de `update_one()` y antes de retornar

5. **Problema con la validación de Pydantic**
   - Solución: Verificar que el modelo acepta `nombreBanco` como opcional

## 📝 Ejemplo de Request que Debe Funcionar

```bash
PATCH /bancos/507f1f77bcf86cd799439011
Content-Type: application/json
Authorization: Bearer <token>

{
  "nombreBanco": "Banco de Venezuela Actualizado"
}
```

**Respuesta esperada:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "numeroCuenta": "01340073310731071093",
  "nombreBanco": "Banco de Venezuela Actualizado",  // ✅ Debe estar actualizado
  "nombreTitular": "DIST. MERALEN A.C.A.",
  "tipoMoneda": "Bs",
  "disponible": 14420.26,
  "tasa": 1,
  "farmacias": ["01", "02"],
  "updatedAt": "2025-12-19T19:45:00Z"
}
```

## 🚨 Importante

Si después de verificar todo lo anterior el problema persiste, verificar:

1. **Cache del frontend**: El frontend hace `fetchBancos()` después de actualizar, pero puede haber un problema de cache
2. **Validación en el modelo**: Verificar que no hay validaciones que rechacen el `nombreBanco`
3. **Permisos**: Verificar que el usuario tiene permisos para actualizar bancos
4. **Base de datos**: Verificar directamente en MongoDB que el campo se actualizó

