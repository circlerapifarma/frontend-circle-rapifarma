# Instrucciones Backend: Bancos - Múltiples Métodos de Pago y Conversión de Montos

## 📋 Resumen de Cambios

Se han realizado cambios importantes en el módulo de bancos:

1. **Múltiples métodos de pago**: Los bancos ahora pueden tener múltiples métodos de pago (array en lugar de string único)
2. **Conversión automática Bs a USD**: Los montos en Bs se convierten automáticamente a USD dividiendo por la tasa
3. **Comisión por punto**: Se aplica automáticamente en depósitos

---

## 🔧 Cambio 1: Múltiples Métodos de Pago

### Modelo/Schema de Banco

El campo `metodoPagoDefault` debe cambiar de un string único a un array de strings:

```python
# ❌ ANTES (incorrecto)
class BancoCreate(BaseModel):
    metodoPagoDefault: Optional[str] = None  # String único

# ✅ DESPUÉS (correcto)
class BancoCreate(BaseModel):
    metodoPagoDefault: Optional[List[str]] = None  # Array de strings
    
    @validator('metodoPagoDefault')
    def validate_metodo_pago_default(cls, v):
        if v is not None:
            if not isinstance(v, list):
                raise ValueError("metodoPagoDefault debe ser un array")
            if len(v) == 0:
                raise ValueError("Debe seleccionar al menos un método de pago")
            validos = ["pagoMovil", "debito", "credito", "transferencia", "efectivoBs", "efectivoUsd", "zelle"]
            for metodo in v:
                if metodo not in validos:
                    raise ValueError(f"Método de pago inválido: {metodo}")
        return v
```

### Endpoint POST `/bancos` (Crear Banco)

```python
@router.post("/bancos", status_code=status.HTTP_201_CREATED)
async def crear_banco(banco: BancoCreate, db: AsyncIOMotorClient = Depends(get_database)):
    try:
        # ... validaciones existentes ...
        
        banco_data = {
            "numeroCuenta": banco.numeroCuenta.strip(),
            "nombreTitular": banco.nombreTitular.strip() if banco.nombreTitular else None,
            "nombreBanco": banco.nombreBanco.strip(),
            "cedulaRif": banco.cedulaRif.strip() if banco.cedulaRif else None,
            "tipoMoneda": banco.tipoMoneda,
            "disponible": 0,
            "tasa": banco.tasa if banco.tipoMoneda == "Bs" else None,
            "porcentajeComision": banco.porcentajeComision,
            "metodoPagoDefault": banco.metodoPagoDefault or ["pagoMovil"],  # Array
            "farmacias": banco.farmacias,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        # ... resto del código ...
```

### Endpoint PATCH `/bancos/{id}` (Actualizar Banco)

```python
@router.patch("/bancos/{id}", status_code=status.HTTP_200_OK)
async def actualizar_banco(
    id: str,
    banco_update: BancoUpdate,
    db: AsyncIOMotorClient = Depends(get_database)
):
    try:
        # ... validaciones existentes ...
        
        update_data = {}
        if banco_update.metodoPagoDefault is not None:
            # Asegurar que sea un array
            if isinstance(banco_update.metodoPagoDefault, str):
                update_data["metodoPagoDefault"] = [banco_update.metodoPagoDefault]
            else:
                update_data["metodoPagoDefault"] = banco_update.metodoPagoDefault
        
        # ... otros campos ...
        
        if update_data:
            update_data["updatedAt"] = datetime.utcnow()
            await db.bancos.update_one(
                {"_id": ObjectId(id)},
                {"$set": update_data}
            )
        
        # ... resto del código ...
```

### Migración de Datos Existentes

Si ya tienes bancos con `metodoPagoDefault` como string, necesitas migrarlos:

```python
# Script de migración (ejecutar una vez)
async def migrar_metodos_pago():
    async for banco in db.bancos.find({}):
        if isinstance(banco.get("metodoPagoDefault"), str):
            await db.bancos.update_one(
                {"_id": banco["_id"]},
                {"$set": {"metodoPagoDefault": [banco["metodoPagoDefault"]]}}
            )
```

---

## 🔧 Cambio 2: Conversión Automática Bs a USD

### ⚠️ IMPORTANTE: Cambio en el Comportamiento

**El frontend ahora envía montos en USD cuando el banco es en Bs.**

Cuando el banco es en Bs:
- El usuario ingresa el monto en Bs
- El frontend divide por la tasa: `monto_usd = monto_bs / tasa`
- El frontend envía `monto_usd` al backend
- El backend recibe el monto **ya convertido a USD**

### Endpoint POST `/bancos/{id}/deposito`

```python
@router.post("/bancos/{id}/deposito", status_code=status.HTTP_200_OK)
async def realizar_deposito(
    id: str,
    deposito_data: dict,
    db: AsyncIOMotorClient = Depends(get_database)
):
    try:
        # Validar campos
        if "monto" not in deposito_data or deposito_data["monto"] <= 0:
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
        
        # ⚠️ IMPORTANTE: El monto ya viene en USD (convertido por el frontend si el banco es en Bs)
        monto_usd = deposito_data["monto"]
        
        # Si el banco es en Bs, necesitamos el monto original en Bs para guardarlo
        monto_original_bs = None
        if banco["tipoMoneda"] == "Bs":
            tasa = deposito_data.get("tasa") or banco.get("tasa")
            if not tasa or tasa <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tasa de cambio requerida para bancos en Bs"
                )
            # Calcular monto original en Bs (monto_usd * tasa)
            monto_original_bs = monto_usd * tasa
        
        # Aplicar comisión si existe
        monto_neto_usd = monto_usd
        comision_aplicada_usd = 0
        
        if banco.get("porcentajeComision") and banco["porcentajeComision"] > 0:
            comision_aplicada_usd = monto_usd * (banco["porcentajeComision"] / 100)
            monto_neto_usd = monto_usd - comision_aplicada_usd
        
        # Crear movimiento
        movimiento = {
            "bancoId": ObjectId(id),
            "farmacia": deposito_data.get("farmacia"),
            "tipo": "deposito",
            "concepto": deposito_data.get("concepto"),
            "tipoPago": deposito_data.get("tipoPago"),
            "monto": monto_neto_usd,  # Monto neto en USD (después de comisión)
            "montoUsd": monto_neto_usd,  # Monto neto en USD
            "montoOriginal": monto_original_bs,  # Monto original en Bs (si aplica)
            "comisionAplicada": comision_aplicada_usd,  # Comisión en USD
            "porcentajeComision": banco.get("porcentajeComision"),  # Porcentaje usado
            "tipoMonedaBanco": banco["tipoMoneda"],  # "USD" o "Bs"
            "tasaUsada": deposito_data.get("tasa") or banco.get("tasa"),  # Tasa usada para conversión
            "detalles": deposito_data.get("detalles", ""),
            "fecha": datetime.utcnow().strftime("%Y-%m-%d"),
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        await db.movimientos_bancos.insert_one(movimiento)
        
        # Actualizar disponible del banco
        # Si el banco es en Bs, convertir el monto neto USD a Bs
        if banco["tipoMoneda"] == "Bs":
            tasa_banco = banco.get("tasa", 0)
            if tasa_banco > 0:
                # El disponible se guarda en Bs, así que convertimos de vuelta
                monto_neto_bs = monto_neto_usd * tasa_banco
                nuevo_disponible = banco["disponible"] + monto_neto_bs
                nuevo_disponible_usd = nuevo_disponible / tasa_banco
            else:
                nuevo_disponible = banco["disponible"]
                nuevo_disponible_usd = banco.get("disponibleUsd", 0)
        else:
            # Si el banco es en USD, simplemente sumar
            nuevo_disponible = banco["disponible"] + monto_neto_usd
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
        
        return {
            "success": True,
            "banco": {
                "_id": str(banco["_id"]),
                "disponible": nuevo_disponible,
                "disponibleUsd": nuevo_disponible_usd
            },
            "movimiento": {
                **movimiento,
                "_id": str(movimiento["_id"]),
                "bancoId": str(movimiento["bancoId"])
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al realizar depósito: {str(e)}"
        )
```

### Endpoint POST `/bancos/{id}/transferencia`

```python
@router.post("/bancos/{id}/transferencia", status_code=status.HTTP_200_OK)
async def realizar_transferencia(
    id: str,
    transferencia_data: dict,
    db: AsyncIOMotorClient = Depends(get_database)
):
    try:
        # Validar campos
        if "monto" not in transferencia_data or transferencia_data["monto"] <= 0:
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
        
        # ⚠️ IMPORTANTE: El monto ya viene en USD (convertido por el frontend si el banco es en Bs)
        monto_usd = transferencia_data["monto"]
        
        # Si el banco es en Bs, calcular monto original
        monto_original_bs = None
        if banco["tipoMoneda"] == "Bs":
            tasa = transferencia_data.get("tasa") or banco.get("tasa")
            if not tasa or tasa <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tasa de cambio requerida para bancos en Bs"
                )
            monto_original_bs = monto_usd * tasa
        
        # Validar saldo suficiente
        if banco["tipoMoneda"] == "Bs":
            disponible_usd = banco.get("disponibleUsd", 0)
            if monto_usd > disponible_usd:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Saldo insuficiente"
                )
        else:
            if monto_usd > banco["disponible"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Saldo insuficiente"
                )
        
        # Crear movimiento
        movimiento = {
            "bancoId": ObjectId(id),
            "tipo": "transferencia",
            "concepto": "transferencia",
            "monto": monto_usd,  # Monto en USD
            "montoUsd": monto_usd,
            "montoOriginal": monto_original_bs,  # Monto original en Bs (si aplica)
            "tipoMonedaBanco": banco["tipoMoneda"],
            "tasaUsada": transferencia_data.get("tasa") or banco.get("tasa"),
            "nombreTitular": transferencia_data.get("nombreTitular", ""),
            "detalles": transferencia_data.get("detalles", ""),
            "fecha": datetime.utcnow().strftime("%Y-%m-%d"),
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        await db.movimientos_bancos.insert_one(movimiento)
        
        # Actualizar disponible (restar)
        if banco["tipoMoneda"] == "Bs":
            tasa_banco = banco.get("tasa", 0)
            if tasa_banco > 0:
                monto_bs = monto_usd * tasa_banco
                nuevo_disponible = banco["disponible"] - monto_bs
                nuevo_disponible_usd = nuevo_disponible / tasa_banco
            else:
                nuevo_disponible = banco["disponible"]
                nuevo_disponible_usd = banco.get("disponibleUsd", 0)
        else:
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
        
        return {
            "success": True,
            "banco": {
                "_id": str(banco["_id"]),
                "disponible": nuevo_disponible,
                "disponibleUsd": nuevo_disponible_usd
            },
            "movimiento": {
                **movimiento,
                "_id": str(movimiento["_id"]),
                "bancoId": str(movimiento["bancoId"])
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

### Endpoint POST `/bancos/{id}/cheque`

```python
@router.post("/bancos/{id}/cheque", status_code=status.HTTP_200_OK)
async def emitir_cheque(
    id: str,
    cheque_data: dict,
    db: AsyncIOMotorClient = Depends(get_database)
):
    try:
        # Validar campos
        if "monto" not in cheque_data or cheque_data["monto"] <= 0:
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
        
        # ⚠️ IMPORTANTE: El monto ya viene en USD (convertido por el frontend si el banco es en Bs)
        monto_usd = cheque_data["monto"]
        
        # Si el banco es en Bs, calcular monto original
        monto_original_bs = None
        if banco["tipoMoneda"] == "Bs":
            tasa = cheque_data.get("tasa") or banco.get("tasa")
            if not tasa or tasa <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tasa de cambio requerida para bancos en Bs"
                )
            monto_original_bs = monto_usd * tasa
        
        # Validar saldo suficiente
        if banco["tipoMoneda"] == "Bs":
            disponible_usd = banco.get("disponibleUsd", 0)
            if monto_usd > disponible_usd:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Saldo insuficiente"
                )
        else:
            if monto_usd > banco["disponible"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Saldo insuficiente"
                )
        
        # Crear movimiento
        movimiento = {
            "bancoId": ObjectId(id),
            "tipo": "cheque",
            "concepto": "cheque",
            "monto": monto_usd,  # Monto en USD
            "montoUsd": monto_usd,
            "montoOriginal": monto_original_bs,  # Monto original en Bs (si aplica)
            "tipoMonedaBanco": banco["tipoMoneda"],
            "tasaUsada": cheque_data.get("tasa") or banco.get("tasa"),
            "nombreTitular": cheque_data.get("nombreTitular", ""),
            "detalles": cheque_data.get("detalles", ""),
            "fecha": datetime.utcnow().strftime("%Y-%m-%d"),
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        await db.movimientos_bancos.insert_one(movimiento)
        
        # Actualizar disponible (restar)
        if banco["tipoMoneda"] == "Bs":
            tasa_banco = banco.get("tasa", 0)
            if tasa_banco > 0:
                monto_bs = monto_usd * tasa_banco
                nuevo_disponible = banco["disponible"] - monto_bs
                nuevo_disponible_usd = nuevo_disponible / tasa_banco
            else:
                nuevo_disponible = banco["disponible"]
                nuevo_disponible_usd = banco.get("disponibleUsd", 0)
        else:
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
        
        return {
            "success": True,
            "banco": {
                "_id": str(banco["_id"]),
                "disponible": nuevo_disponible,
                "disponibleUsd": nuevo_disponible_usd
            },
            "movimiento": {
                **movimiento,
                "_id": str(movimiento["_id"]),
                "bancoId": str(movimiento["bancoId"])
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

## 📝 Resumen de Cambios Clave

### 1. **Métodos de Pago**
- ✅ Cambiar `metodoPagoDefault` de `str` a `List[str]`
- ✅ Validar que el array tenga al menos un elemento
- ✅ Migrar datos existentes de string a array

### 2. **Conversión de Montos**
- ⚠️ **El frontend envía montos en USD** cuando el banco es en Bs
- El backend recibe `monto` en USD (ya convertido)
- Si el banco es en Bs, calcular `monto_original_bs = monto_usd * tasa`
- Guardar tanto `monto` (USD) como `montoOriginal` (Bs) en el movimiento

### 3. **Actualización de Disponible**
- Si banco es en **Bs**: convertir monto USD a Bs para actualizar `disponible`
- Si banco es en **USD**: usar el monto directamente
- Siempre actualizar `disponibleUsd` para consistencia

### 4. **Comisión**
- La comisión se aplica sobre el monto en USD
- Se guarda `comisionAplicada` en USD en el movimiento
- El `monto` del movimiento es el monto neto (después de comisión)

---

## ✅ Checklist de Implementación

- [ ] Cambiar `metodoPagoDefault` a `List[str]` en el modelo
- [ ] Agregar validación para array de métodos de pago
- [ ] Migrar datos existentes (string → array)
- [ ] Actualizar endpoint POST `/bancos` para aceptar array
- [ ] Actualizar endpoint PATCH `/bancos/{id}` para aceptar array
- [ ] Modificar endpoint POST `/bancos/{id}/deposito` para recibir monto en USD
- [ ] Modificar endpoint POST `/bancos/{id}/transferencia` para recibir monto en USD
- [ ] Modificar endpoint POST `/bancos/{id}/cheque` para recibir monto en USD
- [ ] Calcular `montoOriginal` en Bs cuando el banco es en Bs
- [ ] Actualizar `disponible` correctamente según tipo de moneda
- [ ] Probar con bancos en USD
- [ ] Probar con bancos en Bs
- [ ] Verificar que la comisión se aplica correctamente

---

## 🔍 Ejemplo de Flujo Completo

**Depósito en banco en Bs:**
1. Usuario ingresa: `monto_bs = 1000 Bs`, `tasa = 40 Bs/USD`
2. Frontend calcula: `monto_usd = 1000 / 40 = 25 USD`
3. Frontend aplica comisión (2.5%): `monto_neto = 25 * 0.975 = 24.375 USD`
4. Frontend envía al backend: `{ monto: 24.375, tasa: 40 }`
5. Backend recibe: `monto = 24.375 USD` (ya convertido)
6. Backend calcula: `monto_original_bs = 24.375 * 40 = 975 Bs`
7. Backend guarda movimiento: `{ monto: 24.375, montoOriginal: 975, ... }`
8. Backend actualiza banco: `disponible += 975 Bs`, `disponibleUsd += 24.375 USD`

