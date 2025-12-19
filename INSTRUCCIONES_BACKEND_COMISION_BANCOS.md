# Instrucciones Backend: Comisión por Punto en Bancos

## 📋 Resumen

Se necesita agregar un campo `porcentajeComision` a los bancos que permita restar automáticamente un porcentaje de comisión de cada depósito realizado.

## 🔧 Cambios Requeridos en el Backend

### 1. Modelo/Schema de Banco

Agregar el campo `porcentajeComision` al modelo de Banco:

```python
# Ejemplo con Pydantic
class BancoCreate(BaseModel):
    numeroCuenta: str
    nombreTitular: Optional[str] = None
    nombreBanco: str
    cedulaRif: Optional[str] = None
    tipoMoneda: Literal["USD", "Bs"]
    tasa: Optional[float] = None  # Solo si tipoMoneda es "Bs"
    porcentajeComision: Optional[float] = None  # NUEVO CAMPO
    metodoPagoDefault: Optional[str] = None
    farmacias: List[str]
    
    @validator('porcentajeComision')
    def validate_porcentaje_comision(cls, v):
        if v is not None:
            if v < 0 or v > 100:
                raise ValueError("El porcentaje de comisión debe estar entre 0 y 100")
        return v

class BancoUpdate(BaseModel):
    numeroCuenta: Optional[str] = None
    nombreTitular: Optional[str] = None
    nombreBanco: Optional[str] = None
    cedulaRif: Optional[str] = None
    tipoMoneda: Optional[Literal["USD", "Bs"]] = None
    tasa: Optional[float] = None
    porcentajeComision: Optional[float] = None  # NUEVO CAMPO
    metodoPagoDefault: Optional[str] = None
    farmacias: Optional[List[str]] = None
    
    @validator('porcentajeComision')
    def validate_porcentaje_comision(cls, v):
        if v is not None:
            if v < 0 or v > 100:
                raise ValueError("El porcentaje de comisión debe estar entre 0 y 100")
        return v
```

### 2. Endpoint POST `/bancos` (Crear Banco)

Asegurarse de que el endpoint acepte y guarde el campo `porcentajeComision`:

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
            "porcentajeComision": banco.porcentajeComision,  # NUEVO CAMPO
            "metodoPagoDefault": banco.metodoPagoDefault,
            "farmacias": banco.farmacias,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        # ... resto del código ...
```

### 3. Endpoint PATCH `/bancos/{id}` (Actualizar Banco)

Asegurarse de que el endpoint permita actualizar el campo `porcentajeComision`:

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
        if banco_update.porcentajeComision is not None:
            update_data["porcentajeComision"] = banco_update.porcentajeComision
        
        # ... otros campos ...
        
        if update_data:
            update_data["updatedAt"] = datetime.utcnow()
            await db.bancos.update_one(
                {"_id": ObjectId(id)},
                {"$set": update_data}
            )
        
        # ... resto del código ...
```

### 4. Endpoint POST `/bancos/{id}/deposito` (Realizar Depósito) - ⚠️ IMPORTANTE

**Este es el cambio más importante**: Modificar el endpoint de depósito para aplicar automáticamente la comisión:

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
        
        monto_ingresado = deposito_data["monto"]
        
        # ⚠️ APLICAR COMISIÓN SI EXISTE
        monto_neto = monto_ingresado
        comision_aplicada = 0
        
        if banco.get("porcentajeComision") and banco["porcentajeComision"] > 0:
            comision_aplicada = monto_ingresado * (banco["porcentajeComision"] / 100)
            monto_neto = monto_ingresado - comision_aplicada
        
        # Crear movimiento con información de comisión
        movimiento = {
            "bancoId": ObjectId(id),
            "farmacia": deposito_data.get("farmacia"),
            "tipo": "deposito",
            "concepto": deposito_data.get("concepto"),
            "tipoPago": deposito_data.get("tipoPago"),
            "monto": monto_neto,  # Monto neto después de comisión
            "montoOriginal": monto_ingresado,  # Monto original ingresado
            "comisionAplicada": comision_aplicada,  # Monto de comisión
            "porcentajeComision": banco.get("porcentajeComision"),  # Porcentaje usado
            "detalles": deposito_data.get("detalles", ""),
            "fecha": datetime.utcnow().strftime("%Y-%m-%d"),
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        # Si el banco es en Bs, calcular montoUsd
        if banco["tipoMoneda"] == "Bs" and banco.get("tasa", 0) > 0:
            movimiento["montoUsd"] = monto_neto / banco["tasa"]
            movimiento["tipoMonedaBanco"] = "Bs"
            movimiento["tasaUsada"] = banco["tasa"]
        
        await db.movimientos_bancos.insert_one(movimiento)
        
        # Actualizar disponible del banco con el MONTO NETO (después de comisión)
        nuevo_disponible = banco["disponible"] + monto_neto
        nuevo_disponible_usd = nuevo_disponible
        
        if banco["tipoMoneda"] == "Bs" and banco.get("tasa", 0) > 0:
            nuevo_disponible_usd = nuevo_disponible / banco["tasa"]
        
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
            },
            "comision": {
                "montoOriginal": monto_ingresado,
                "comisionAplicada": comision_aplicada,
                "montoNeto": monto_neto,
                "porcentajeComision": banco.get("porcentajeComision")
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

## 📝 Notas Importantes

1. **Validación del Porcentaje**: El porcentaje debe estar entre 0 y 100. Ejemplo: 2.5 para 2.5%.

2. **Campo Opcional**: El campo `porcentajeComision` es opcional. Si no se proporciona o es 0, no se aplicará comisión.

3. **Aplicación de Comisión**: La comisión se aplica automáticamente en el endpoint de depósito. El monto que se suma al `disponible` del banco es el monto neto (después de restar la comisión).

4. **Registro en Movimientos**: Se recomienda guardar en el movimiento:
   - `montoOriginal`: El monto que el usuario ingresó
   - `comisionAplicada`: El monto de comisión que se restó
   - `monto`: El monto neto que se depositó (montoOriginal - comisionAplicada)
   - `porcentajeComision`: El porcentaje que se aplicó

5. **Frontend**: El frontend ya está enviando el campo `porcentajeComision` al crear/editar bancos y calculando la comisión en el modal de depósito para mostrar un preview al usuario.

## ✅ Checklist de Implementación

- [ ] Agregar campo `porcentajeComision` al modelo/schema de Banco
- [ ] Agregar validación (0-100)
- [ ] Modificar endpoint POST `/bancos` para aceptar y guardar `porcentajeComision`
- [ ] Modificar endpoint PATCH `/bancos/{id}` para permitir actualizar `porcentajeComision`
- [ ] Modificar endpoint POST `/bancos/{id}/deposito` para aplicar comisión automáticamente
- [ ] Agregar campos de comisión al movimiento (montoOriginal, comisionAplicada, etc.)
- [ ] Actualizar disponible del banco con monto neto (después de comisión)
- [ ] Probar con diferentes porcentajes (0%, 2.5%, 5%, etc.)
- [ ] Verificar que bancos sin comisión funcionen correctamente

## 🔍 Ejemplo de Uso

**Crear banco con comisión:**
```json
POST /bancos
{
  "numeroCuenta": "0102-1234-5678901234",
  "nombreBanco": "Banco de Venezuela",
  "tipoMoneda": "USD",
  "porcentajeComision": 2.5,
  "farmacias": ["01", "02"]
}
```

**Realizar depósito (se aplica comisión automáticamente):**
```json
POST /bancos/{id}/deposito
{
  "monto": 1000.00,
  "detalles": "Depósito de prueba",
  "tipoPago": "pagoMovil"
}
```

**Resultado:**
- Monto ingresado: $1000.00
- Comisión (2.5%): $25.00
- Monto neto depositado: $975.00
- Disponible del banco aumenta en: $975.00

