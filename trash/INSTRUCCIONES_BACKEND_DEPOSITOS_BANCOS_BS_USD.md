# Instrucciones Backend - Depósitos en Bancos Bs y USD

## 📋 Resumen de Cambios Frontend

El frontend ahora envía diferentes datos según el tipo de moneda del banco:

### Cuando el banco es en **Bs**:
- El usuario ingresa el monto en **Bs**
- El frontend divide por la tasa: `monto_usd = monto_bs / tasa`
- El frontend envía al backend:
  - `monto`: Monto en USD (después de conversión y comisión)
  - `montoOriginal`: Monto original en Bs (antes de conversión)
  - `tasa`: Tasa de cambio usada
  - `detalles`, `farmacia`, `tipoPago`: Campos normales

### Cuando el banco es en **USD**:
- El usuario ingresa el monto en **USD**
- El frontend NO hace conversiones
- El frontend envía al backend:
  - `monto`: Monto en USD (después de comisión, si aplica)
  - `detalles`, `farmacia`, `tipoPago`: Campos normales
  - **NO envía** `montoOriginal` ni `tasa`

---

## 🔧 Cambios Requeridos en el Backend

### Endpoint: `POST /bancos/{id}/deposito`

#### 1. Estructura del Payload Recibido

```python
{
  "monto": float,              # Monto en USD (después de conversión si banco es Bs, después de comisión)
  "detalles": str,
  "farmacia": str,             # Opcional
  "tipoPago": str,              # "efectivoBs" | "efectivoUsd" | "debito" | "credito" | "zelle" | "pagoMovil"
  "montoOriginal": float,       # OPCIONAL: Solo si banco es en Bs
  "tasa": float                 # OPCIONAL: Solo si banco es en Bs
}
```

#### 2. Lógica de Procesamiento

```python
@router.post("/bancos/{id}/deposito", status_code=status.HTTP_200_OK)
async def realizar_deposito(
    id: str,
    deposito_data: dict,
    db: AsyncIOMotorClient = Depends(get_database)
):
    try:
        # Validar campos requeridos
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
        
        # El monto ya viene en USD (convertido por el frontend si el banco es en Bs)
        monto_usd = deposito_data["monto"]
        
        # Variables para guardar en el movimiento
        monto_original_bs = None
        tasa_usada = None
        
        # Si el banco es en Bs, validar y guardar información de conversión
        if banco["tipoMoneda"] == "Bs":
            # Validar que se envió tasa y montoOriginal
            tasa_usada = deposito_data.get("tasa")
            monto_original_bs = deposito_data.get("montoOriginal")
            
            if not tasa_usada or tasa_usada <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tasa de cambio requerida para bancos en Bs"
                )
            
            if not monto_original_bs or monto_original_bs <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Monto original en Bs requerido para bancos en Bs"
                )
        
        # Aplicar comisión si existe (el monto ya viene con comisión aplicada desde el frontend)
        # Pero si quieres aplicar comisión en el backend también, puedes hacerlo aquí
        # NOTA: El frontend ya aplica la comisión, así que el monto_usd ya es el monto neto
        
        # Crear movimiento
        movimiento = {
            "bancoId": ObjectId(id),
            "farmacia": deposito_data.get("farmacia"),
            "tipo": "deposito",
            "concepto": deposito_data.get("concepto"),
            "tipoPago": deposito_data.get("tipoPago"),
            "monto": monto_usd,  # Monto neto en USD (después de comisión)
            "montoUsd": monto_usd,  # Monto neto en USD
            "montoOriginal": monto_original_bs,  # Monto original en Bs (solo si banco es Bs)
            "tipoMonedaBanco": banco["tipoMoneda"],  # "USD" o "Bs"
            "tasaUsada": tasa_usada,  # Tasa usada (solo si banco es Bs)
            "detalles": deposito_data.get("detalles", ""),
            "fecha": datetime.utcnow().strftime("%Y-%m-%d"),
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        # Si hay comisión aplicada, guardarla también
        if banco.get("porcentajeComision") and banco["porcentajeComision"] > 0:
            movimiento["comisionAplicada"] = monto_usd * (banco["porcentajeComision"] / 100) / (1 - banco["porcentajeComision"] / 100)
            movimiento["porcentajeComision"] = banco["porcentajeComision"]
        
        await db.movimientos_bancos.insert_one(movimiento)
        
        # Actualizar disponible del banco
        if banco["tipoMoneda"] == "Bs":
            # El banco guarda disponible en Bs
            # Convertir el monto neto USD a Bs usando la tasa del banco
            tasa_banco = banco.get("tasa", tasa_usada)  # Usar tasa del banco o la enviada
            if tasa_banco > 0:
                monto_neto_bs = monto_usd * tasa_banco
                nuevo_disponible = banco["disponible"] + monto_neto_bs
                nuevo_disponible_usd = nuevo_disponible / tasa_banco
            else:
                nuevo_disponible = banco["disponible"]
                nuevo_disponible_usd = banco.get("disponibleUsd", 0)
        else:
            # Si el banco es en USD, simplemente sumar
            nuevo_disponible = banco["disponible"] + monto_usd
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
        
        # Obtener banco actualizado para retornar
        banco_actualizado = await db.bancos.find_one({"_id": ObjectId(id)})
        
        return {
            "success": True,
            "message": "Depósito realizado exitosamente",
            "movimiento": movimiento,
            "banco": {
                "_id": str(banco_actualizado["_id"]),
                "disponible": banco_actualizado["disponible"],
                "disponibleUsd": banco_actualizado.get("disponibleUsd", 0)
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

---

## 📊 Estructura del Movimiento Guardado

### Para bancos en **Bs**:
```json
{
  "bancoId": "ObjectId",
  "farmacia": "string",
  "tipo": "deposito",
  "concepto": "string",
  "tipoPago": "string",
  "monto": 100.50,              // Monto neto en USD (después de conversión y comisión)
  "montoUsd": 100.50,           // Monto neto en USD
  "montoOriginal": 4020.00,     // Monto original en Bs (antes de conversión)
  "tipoMonedaBanco": "Bs",
  "tasaUsada": 40.0,            // Tasa usada para la conversión
  "detalles": "string",
  "fecha": "2025-12-19",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### Para bancos en **USD**:
```json
{
  "bancoId": "ObjectId",
  "farmacia": "string",
  "tipo": "deposito",
  "concepto": "string",
  "tipoPago": "string",
  "monto": 100.50,              // Monto neto en USD (después de comisión)
  "montoUsd": 100.50,           // Monto neto en USD
  "tipoMonedaBanco": "USD",
  "detalles": "string",
  "fecha": "2025-12-19",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

**NOTA**: Para bancos en USD, `montoOriginal` y `tasaUsada` **NO deben existir** o deben ser `null`.

---

## ✅ Validaciones Importantes

1. **Para bancos en Bs**:
   - ✅ Validar que `tasa` esté presente y sea > 0
   - ✅ Validar que `montoOriginal` esté presente y sea > 0
   - ✅ Guardar ambos valores en el movimiento

2. **Para bancos en USD**:
   - ✅ NO esperar `tasa` ni `montoOriginal`
   - ✅ NO guardar `tasaUsada` ni `montoOriginal` en el movimiento
   - ✅ Solo usar `monto` directamente

3. **Actualización de disponible**:
   - Para bancos en Bs: convertir USD a Bs usando la tasa del banco
   - Para bancos en USD: sumar directamente el monto

---

## 🔍 Endpoint de Consulta de Movimientos

Asegúrate de que el endpoint `GET /bancos/movimientos` retorne todos los campos:
- `monto`: Monto en USD
- `montoUsd`: Monto en USD (puede ser igual a `monto`)
- `montoOriginal`: Solo si `tipoMonedaBanco === "Bs"`
- `tipoMonedaBanco`: "USD" o "Bs"
- `tasaUsada`: Solo si `tipoMonedaBanco === "Bs"`

---

## 📝 Ejemplo de Flujo Completo

### Caso 1: Depósito en banco Bs
1. Usuario ingresa: `569.10 Bs`, tasa: `1`
2. Frontend calcula: `569.10 / 1 = 569.10 USD`
3. Frontend envía:
   ```json
   {
     "monto": 569.10,
     "montoOriginal": 569.10,
     "tasa": 1,
     "detalles": "Depósito",
     "tipoPago": "debito"
   }
   ```
4. Backend guarda movimiento con:
   - `monto`: 569.10 (USD)
   - `montoOriginal`: 569.10 (Bs)
   - `tasaUsada`: 1
   - `tipoMonedaBanco`: "Bs"

### Caso 2: Depósito en banco USD
1. Usuario ingresa: `100.50 USD`
2. Frontend envía:
   ```json
   {
     "monto": 100.50,
     "detalles": "Depósito",
     "tipoPago": "efectivoUsd"
   }
   ```
3. Backend guarda movimiento con:
   - `monto`: 100.50 (USD)
   - `montoUsd`: 100.50 (USD)
   - `tipoMonedaBanco`: "USD"
   - **NO incluye** `montoOriginal` ni `tasaUsada`

---

## ⚠️ Notas Importantes

1. El frontend **ya aplica la comisión** antes de enviar el monto, así que el `monto` recibido es el monto neto.

2. Si quieres aplicar comisión también en el backend, debes calcularla sobre el monto antes de la comisión. Pero es recomendable que solo se aplique en un lugar (frontend o backend) para evitar duplicación.

3. El campo `montoOriginal` solo tiene sentido para bancos en Bs, ya que representa el monto que el usuario ingresó antes de la conversión.

4. La `tasaUsada` debe ser la misma que se usó para convertir el monto, y debe guardarse para referencia histórica.

---

## 🧪 Testing

Prueba los siguientes casos:

1. ✅ Depósito en banco Bs con tasa válida
2. ✅ Depósito en banco Bs sin tasa (debe fallar)
3. ✅ Depósito en banco USD (sin tasa ni montoOriginal)
4. ✅ Verificar que los movimientos se guarden correctamente
5. ✅ Verificar que el disponible se actualice correctamente

