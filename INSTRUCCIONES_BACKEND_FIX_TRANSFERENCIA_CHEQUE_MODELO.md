# Instrucciones Backend - Fix Modelo de Transferencia y Cheque

## 🐛 Error Actual

El backend está rechazando las transferencias con error 422:

```
Field required: bancoDestinoId
Extra inputs are not permitted: detalles
Extra inputs are not permitted: nombreTitular
```

**Body recibido por el backend:**
```json
{
  "monto": 339.9992599340618,
  "detalles": "prueba",
  "nombreTitular": "prueeba",
  "montoOriginal": 100000,
  "tasa": 294.1182872556653
}
```

---

## 🔧 Solución: Actualizar Modelos Pydantic

### 1. Modelo para Transferencia

El modelo debe aceptar los siguientes campos:

```python
from pydantic import BaseModel, Field
from typing import Optional

class TransferenciaCreate(BaseModel):
    monto: float = Field(..., gt=0, description="Monto en USD (convertido)")
    detalles: str = Field(..., min_length=1, description="Detalles de la transferencia")
    nombreTitular: str = Field(..., min_length=1, description="Nombre del titular/beneficiario")
    montoOriginal: Optional[float] = Field(None, gt=0, description="Monto original en Bs (solo si banco es en Bs)")
    tasa: Optional[float] = Field(None, gt=0, description="Tasa promedio usada (solo si banco es en Bs)")
    # bancoDestinoId: Optional[str] = None  # Si necesitas transferencias entre bancos, hazlo opcional
```

### 2. Modelo para Cheque

```python
class ChequeCreate(BaseModel):
    monto: float = Field(..., gt=0, description="Monto en USD (convertido)")
    detalles: str = Field(..., min_length=1, description="Detalles del cheque")
    nombreTitular: str = Field(..., min_length=1, description="Nombre del beneficiario del cheque")
    montoOriginal: Optional[float] = Field(None, gt=0, description="Monto original en Bs (solo si banco es en Bs)")
    tasa: Optional[float] = Field(None, gt=0, description="Tasa promedio usada (solo si banco es en Bs)")
```

---

## 📝 Endpoint: `POST /bancos/{id}/transferencia`

### Código Completo Actualizado

```python
@router.post("/bancos/{id}/transferencia", status_code=status.HTTP_200_OK)
async def realizar_transferencia(
    id: str,
    transferencia_data: TransferenciaCreate,  # ✅ Usar el nuevo modelo
    db: AsyncIOMotorClient = Depends(get_database),
    current_user = Depends(verificar_permiso_bancos)
):
    try:
        # Validar campos
        if transferencia_data.monto <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Monto inválido"
            )
        
        # Obtener banco
        banco = await db.bancos.find_one({"_id": ObjectId(id)})
        if not banco:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Banco no encontrado"
            )
        
        # El monto ya viene en USD (convertido por el frontend usando tasa promedio)
        monto_usd = transferencia_data.monto
        
        # Obtener monto original y tasa
        monto_original_bs = transferencia_data.montoOriginal
        tasa_usada = transferencia_data.tasa
        
        # Si el banco es en Bs, validar que se envió montoOriginal y tasa
        if banco["tipoMoneda"] == "Bs":
            if not monto_original_bs or monto_original_bs <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Monto original en Bs requerido para bancos en Bs"
                )
            if not tasa_usada or tasa_usada <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tasa requerida para bancos en Bs"
                )
        
        # Validar saldo suficiente
        if banco["tipoMoneda"] == "Bs":
            # Validar contra el disponible en Bs
            if monto_original_bs > banco["disponible"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El monto excede el disponible del banco"
                )
        else:
            # Para bancos en USD, validar contra disponible en USD
            if monto_usd > banco["disponible"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El monto excede el disponible del banco"
                )
        
        # Crear movimiento
        movimiento = {
            "bancoId": ObjectId(id),
            "tipo": "transferencia",
            "concepto": "transferencia",
            "monto": monto_usd,  # Monto en USD
            "montoUsd": monto_usd,  # Monto en USD
            "montoOriginal": monto_original_bs,  # Monto original en Bs (solo si banco es Bs)
            "tipoMonedaBanco": banco["tipoMoneda"],  # "USD" o "Bs"
            "tasaUsada": tasa_usada,  # Tasa promedio usada (solo si banco es Bs)
            "nombreTitular": transferencia_data.nombreTitular,
            "detalles": transferencia_data.detalles,
            "fecha": datetime.utcnow().strftime("%Y-%m-%d"),
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        await db.movimientos_bancos.insert_one(movimiento)
        
        # Actualizar disponible (RESTAR)
        if banco["tipoMoneda"] == "Bs":
            # Restar el monto original en Bs
            nuevo_disponible = banco["disponible"] - monto_original_bs
            # Recalcular disponibleUsd usando la tasa promedio recibida
            nuevo_disponible_usd = nuevo_disponible / tasa_usada if tasa_usada > 0 else 0
        else:
            # Para bancos en USD, restar directamente
            nuevo_disponible = banco["disponible"] - monto_usd
            nuevo_disponible_usd = nuevo_disponible
        
        await db.bancos.update_one(
            {"_id": ObjectId(id)},
            {
                "$set": {
                    "disponible": nuevo_disponible,
                    "disponibleUsd": nuevo_disponible_usd,
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        
        # Obtener banco actualizado
        banco_actualizado = await db.bancos.find_one({"_id": ObjectId(id)})
        banco_actualizado["_id"] = str(banco_actualizado["_id"])
        
        return {
            "success": True,
            "message": "Transferencia realizada exitosamente",
            "banco": banco_actualizado,
            "movimiento": {
                **movimiento,
                "bancoId": str(movimiento["bancoId"]),
                "_id": str(movimiento.get("_id", ""))
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al realizar transferencia: {str(e)}"
        )
```

---

## 📝 Endpoint: `POST /bancos/{id}/cheque`

### Código Completo Actualizado

```python
@router.post("/bancos/{id}/cheque", status_code=status.HTTP_200_OK)
async def emitir_cheque(
    id: str,
    cheque_data: ChequeCreate,  # ✅ Usar el nuevo modelo
    db: AsyncIOMotorClient = Depends(get_database),
    current_user = Depends(verificar_permiso_bancos)
):
    try:
        # Validar campos
        if cheque_data.monto <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Monto inválido"
            )
        
        # Obtener banco
        banco = await db.bancos.find_one({"_id": ObjectId(id)})
        if not banco:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Banco no encontrado"
            )
        
        # El monto ya viene en USD (convertido por el frontend usando tasa promedio)
        monto_usd = cheque_data.monto
        
        # Obtener monto original y tasa
        monto_original_bs = cheque_data.montoOriginal
        tasa_usada = cheque_data.tasa
        
        # Si el banco es en Bs, validar que se envió montoOriginal y tasa
        if banco["tipoMoneda"] == "Bs":
            if not monto_original_bs or monto_original_bs <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Monto original en Bs requerido para bancos en Bs"
                )
            if not tasa_usada or tasa_usada <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tasa requerida para bancos en Bs"
                )
        
        # Validar saldo suficiente
        if banco["tipoMoneda"] == "Bs":
            # Validar contra el disponible en Bs
            if monto_original_bs > banco["disponible"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El monto excede el disponible del banco"
                )
        else:
            # Para bancos en USD, validar contra disponible en USD
            if monto_usd > banco["disponible"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El monto excede el disponible del banco"
                )
        
        # Crear movimiento
        movimiento = {
            "bancoId": ObjectId(id),
            "tipo": "cheque",
            "concepto": "cheque",
            "monto": monto_usd,  # Monto en USD
            "montoUsd": monto_usd,  # Monto en USD
            "montoOriginal": monto_original_bs,  # Monto original en Bs (solo si banco es Bs)
            "tipoMonedaBanco": banco["tipoMoneda"],  # "USD" o "Bs"
            "tasaUsada": tasa_usada,  # Tasa promedio usada (solo si banco es Bs)
            "nombreTitular": cheque_data.nombreTitular,
            "detalles": cheque_data.detalles,
            "fecha": datetime.utcnow().strftime("%Y-%m-%d"),
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        await db.movimientos_bancos.insert_one(movimiento)
        
        # Actualizar disponible (RESTAR)
        if banco["tipoMoneda"] == "Bs":
            # Restar el monto original en Bs
            nuevo_disponible = banco["disponible"] - monto_original_bs
            # Recalcular disponibleUsd usando la tasa promedio recibida
            nuevo_disponible_usd = nuevo_disponible / tasa_usada if tasa_usada > 0 else 0
        else:
            # Para bancos en USD, restar directamente
            nuevo_disponible = banco["disponible"] - monto_usd
            nuevo_disponible_usd = nuevo_disponible
        
        await db.bancos.update_one(
            {"_id": ObjectId(id)},
            {
                "$set": {
                    "disponible": nuevo_disponible,
                    "disponibleUsd": nuevo_disponible_usd,
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        
        # Obtener banco actualizado
        banco_actualizado = await db.bancos.find_one({"_id": ObjectId(id)})
        banco_actualizado["_id"] = str(banco_actualizado["_id"])
        
        return {
            "success": True,
            "message": "Cheque emitido exitosamente",
            "banco": banco_actualizado,
            "movimiento": {
                **movimiento,
                "bancoId": str(movimiento["bancoId"]),
                "_id": str(movimiento.get("_id", ""))
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al emitir cheque: {str(e)}"
        )
```

---

## ✅ Checklist de Verificación

- [ ] **Modelo TransferenciaCreate** actualizado con:
  - [ ] `monto`: float (requerido)
  - [ ] `detalles`: str (requerido)
  - [ ] `nombreTitular`: str (requerido)
  - [ ] `montoOriginal`: Optional[float] (opcional, solo para bancos Bs)
  - [ ] `tasa`: Optional[float] (opcional, solo para bancos Bs)
  - [ ] **NO incluir** `bancoDestinoId` (o hacerlo opcional si se necesita)

- [ ] **Modelo ChequeCreate** actualizado con los mismos campos

- [ ] **Endpoint transferencia**:
  - [ ] Acepta `detalles` y `nombreTitular`
  - [ ] Valida `montoOriginal` y `tasa` cuando banco es en Bs
  - [ ] Resta correctamente del disponible (en Bs si banco es Bs)
  - [ ] Guarda el movimiento con todos los campos

- [ ] **Endpoint cheque**:
  - [ ] Acepta `detalles` y `nombreTitular`
  - [ ] Valida `montoOriginal` y `tasa` cuando banco es en Bs
  - [ ] Resta correctamente del disponible (en Bs si banco es Bs)
  - [ ] Guarda el movimiento con todos los campos

---

## 📊 Estructura del Payload que Envía el Frontend

### Transferencia
```json
{
  "monto": 339.9992599340618,      // Monto en USD (convertido con tasa promedio)
  "detalles": "prueba",             // ✅ REQUERIDO
  "nombreTitular": "prueeba",       // ✅ REQUERIDO
  "montoOriginal": 100000,          // Monto original en Bs (solo si banco es Bs)
  "tasa": 294.1182872556653         // Tasa promedio usada (solo si banco es Bs)
}
```

### Cheque
```json
{
  "monto": 339.9992599340618,      // Monto en USD (convertido con tasa promedio)
  "detalles": "prueba",             // ✅ REQUERIDO
  "nombreTitular": "prueeba",       // ✅ REQUERIDO
  "montoOriginal": 100000,          // Monto original en Bs (solo si banco es Bs)
  "tasa": 294.1182872556653         // Tasa promedio usada (solo si banco es Bs)
}
```

---

## ⚠️ Importante

1. **NO se requiere `bancoDestinoId`**: Las transferencias son salidas de dinero del banco, no transferencias entre bancos. Si necesitas transferencias entre bancos, hazlo en un endpoint separado.

2. **Validación del disponible**: 
   - Para bancos en Bs: validar contra `montoOriginal` (en Bs)
   - Para bancos en USD: validar contra `monto` (en USD)

3. **Resta del disponible**:
   - Para bancos en Bs: restar `montoOriginal` del `disponible` (en Bs)
   - Para bancos en USD: restar `monto` del `disponible` (en USD)

4. **Actualización de disponibleUsd**:
   - Para bancos en Bs: usar la `tasa` recibida para recalcular: `disponibleUsd = disponible / tasa`
   - Para bancos en USD: `disponibleUsd = disponible`

---

## 🧪 Testing

Prueba los siguientes casos:

1. ✅ Transferencia en banco Bs con todos los campos
2. ✅ Transferencia en banco USD (sin montoOriginal ni tasa)
3. ✅ Cheque en banco Bs con todos los campos
4. ✅ Cheque en banco USD (sin montoOriginal ni tasa)
5. ✅ Validar que se resta correctamente del disponible
6. ✅ Verificar que el movimiento se guarda con todos los campos

