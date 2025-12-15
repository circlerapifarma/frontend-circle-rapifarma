# Instrucciones Backend - Módulo de Bancos

## 🎯 Objetivo

Implementar un sistema completo de gestión de bancos que permita:
- Crear, editar y eliminar bancos
- Realizar depósitos (aumenta el disponible)
- Realizar transferencias (disminuye el disponible)
- Emitir cheques (disminuye el disponible)
- Ver historial de movimientos por banco

---

## 📋 Estructura de Datos

### 1. Colección `bancos`

```javascript
{
  _id: ObjectId,
  numeroCuenta: String,        // Ej: "0102-1234-5678901234"
  nombreTitular: String,        // Ej: "Juan Pérez"
  nombreBanco: String,          // Ej: "Banco de Venezuela"
  cedulaRif: String,            // Ej: "V-12345678" o "J-123456789"
  tipoMoneda: String,           // "USD" o "Bs"
  disponible: Number,          // Saldo disponible en la moneda del banco (inicia en 0)
  tasa: Number,                 // Tasa de cambio del día (solo si tipoMoneda es "Bs")
  disponibleUsd: Number,        // Saldo disponible en USD (calculado: disponible / tasa si tipoMoneda es "Bs")
  farmacias: [String],          // Array de IDs de farmacias que utilizan este banco (ej: ["01", "02"])
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Colección `movimientos_bancos`

```javascript
{
  _id: ObjectId,
  bancoId: ObjectId,            // Referencia al banco
  farmacia: String,              // Opcional: ID de la farmacia (ej: "01", "02")
  tipo: String,                  // "deposito" | "transferencia" | "cheque" | "retiro"
  concepto: String,               // Opcional: "cuentas_pagadas" | "transferencia" | "retiro_efectivo" | "ingreso_venta" | "gasto_tarjeta_debito" | "cheque"
  tipoPago: String,              // Opcional: "efectivoBs" | "efectivoUsd" | "debito" | "credito" | "zelle" | "pagoMovil" (solo para depósitos)
  monto: Number,                 // Monto de la operación
  detalles: String,              // Descripción de la operación
  nombreTitular: String,          // Opcional: para transferencias y cheques
  fecha: String,                 // Fecha en formato YYYY-MM-DD
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔌 Endpoints Requeridos

### 1. GET `/bancos`

**Propósito:** Obtener todos los bancos registrados.

**Autenticación:** Requerida (Bearer token)

**Respuesta:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "numeroCuenta": "0102-1234-5678901234",
    "nombreTitular": "Juan Pérez",
    "nombreBanco": "Banco de Venezuela",
    "cedulaRif": "V-12345678",
    "disponible": 5000.50,
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
]
```

---

### 2. POST `/bancos`

**Propósito:** Crear un nuevo banco.

**Autenticación:** Requerida (Bearer token)

**Body:**
```json
{
  "numeroCuenta": "0102-1234-5678901234",
  "nombreTitular": "Juan Pérez",
  "nombreBanco": "Banco de Venezuela",
  "cedulaRif": "V-12345678",
  "tipoMoneda": "Bs",
  "tasa": 40.50,
  "farmacias": ["01", "02", "03"]
}
```

**Validaciones:**
- Todos los campos son requeridos (excepto `farmacias` que puede ser array vacío)
- `numeroCuenta` debe ser único
- `tipoMoneda` debe ser "USD" o "Bs"
- Si `tipoMoneda` es "Bs", `tasa` es requerido y debe ser > 0
- Si `tipoMoneda` es "USD", `tasa` no se envía o se ignora
- `disponible` se inicializa en 0
- `disponibleUsd` se calcula automáticamente: si `tipoMoneda` es "Bs", `disponibleUsd = disponible / tasa`
- `farmacias` debe ser un array de strings (IDs de farmacias)
- Al menos una farmacia debe ser seleccionada (validación en frontend)

**Respuesta:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "numeroCuenta": "0102-1234-5678901234",
  "nombreTitular": "Juan Pérez",
  "nombreBanco": "Banco de Venezuela",
  "cedulaRif": "V-12345678",
  "disponible": 0,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

---

### 3. PATCH `/bancos/:id`

**Propósito:** Actualizar un banco existente.

**Autenticación:** Requerida (Bearer token)

**Body (parcial):**
```json
{
  "nombreTitular": "Juan Carlos Pérez",
  "nombreBanco": "Banco Mercantil"
}
```

**Nota:** No se puede actualizar `disponible` directamente (solo mediante movimientos).

**Respuesta:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "numeroCuenta": "0102-1234-5678901234",
  "nombreTitular": "Juan Carlos Pérez",
  "nombreBanco": "Banco Mercantil",
  "cedulaRif": "V-12345678",
  "disponible": 5000.50,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T11:00:00Z"
}
```

---

### 4. DELETE `/bancos/:id`

**Propósito:** Eliminar un banco.

**Autenticación:** Requerida (Bearer token)

**Respuesta:** 204 No Content

**Nota:** Considerar si se deben eliminar también los movimientos asociados o solo el banco.

---

### 5. POST `/bancos/:id/deposito`

**Propósito:** Realizar un depósito en un banco (aumenta el disponible).

**Autenticación:** Requerida (Bearer token)

**Body:**
```json
{
  "monto": 1000.00,
  "detalles": "Depósito por venta del día",
  "farmacia": "01",
  "tipoPago": "efectivoUsd"
}
```

**Campos:**
- `monto` (requerido): Monto del depósito
- `detalles` (requerido): Descripción del depósito
- `farmacia` (opcional): ID de la farmacia (ej: "01", "02")
- `tipoPago` (requerido): Tipo de pago - "efectivoBs" | "efectivoUsd" | "debito" | "credito" | "zelle" | "pagoMovil"

**Lógica:**
1. Validar que el banco existe
2. Validar que `monto > 0`
3. Crear movimiento con `tipo: "deposito"`
4. Actualizar `banco.disponible += monto`
5. Guardar movimiento y actualizar banco

**Respuesta:**
```json
{
  "success": true,
  "banco": {
    "_id": "507f1f77bcf86cd799439011",
    "disponible": 6000.50
  },
  "movimiento": {
    "_id": "507f1f77bcf86cd799439012",
    "bancoId": "507f1f77bcf86cd799439011",
    "tipo": "deposito",
    "monto": 1000.00,
    "detalles": "Depósito por venta del día",
    "fecha": "2025-01-15"
  }
}
```

---

### 6. POST `/bancos/:id/transferencia`

**Propósito:** Realizar una transferencia desde un banco (disminuye el disponible).

**Autenticación:** Requerida (Bearer token)

**Body:**
```json
{
  "monto": 500.00,
  "detalles": "Transferencia a proveedor XYZ",
  "nombreTitular": "Proveedor XYZ S.A."
}
```

**Lógica:**
1. Validar que el banco existe
2. Validar que `monto > 0`
3. Validar que `banco.disponible >= monto`
4. Crear movimiento con `tipo: "transferencia"`
5. Actualizar `banco.disponible -= monto`
6. Guardar movimiento y actualizar banco

**Respuesta:**
```json
{
  "success": true,
  "banco": {
    "_id": "507f1f77bcf86cd799439011",
    "disponible": 5500.50
  },
  "movimiento": {
    "_id": "507f1f77bcf86cd799439013",
    "bancoId": "507f1f77bcf86cd799439011",
    "tipo": "transferencia",
    "monto": 500.00,
    "detalles": "Transferencia a proveedor XYZ",
    "nombreTitular": "Proveedor XYZ S.A.",
    "fecha": "2025-01-15"
  }
}
```

---

### 7. POST `/bancos/:id/cheque`

**Propósito:** Emitir un cheque desde un banco (disminuye el disponible).

**Autenticación:** Requerida (Bearer token)

**Body:**
```json
{
  "monto": 750.00,
  "detalles": "Cheque #12345 para pago de factura",
  "nombreTitular": "Proveedor ABC C.A."
}
```

**Lógica:**
1. Validar que el banco existe
2. Validar que `monto > 0`
3. Validar que `banco.disponible >= monto`
4. Crear movimiento con `tipo: "cheque"`
5. Actualizar `banco.disponible -= monto`
6. Guardar movimiento y actualizar banco

**Respuesta:**
```json
{
  "success": true,
  "banco": {
    "_id": "507f1f77bcf86cd799439011",
    "disponible": 4750.50
  },
  "movimiento": {
    "_id": "507f1f77bcf86cd799439014",
    "bancoId": "507f1f77bcf86cd799439011",
    "tipo": "cheque",
    "monto": 750.00,
    "detalles": "Cheque #12345 para pago de factura",
    "nombreTitular": "Proveedor ABC C.A.",
    "fecha": "2025-01-15"
  }
}
```

---

### 8. GET `/bancos/movimientos`

**Propósito:** Obtener el historial de movimientos (puede filtrar por banco y/o farmacia).

**Autenticación:** Requerida (Bearer token)

**Query Parameters (opcionales):**
- `bancoId`: Filtrar por ID de banco
- `farmaciaId`: Filtrar por ID de farmacia
- `tipo`: Filtrar por tipo ("deposito", "transferencia", "cheque", "retiro")
- `tipoPago`: Filtrar por tipo de pago ("efectivoBs", "efectivoUsd", "debito", "credito", "zelle", "pagoMovil")
- `concepto`: Filtrar por concepto ("cuentas_pagadas", "transferencia", "retiro_efectivo", "ingreso_venta", "gasto_tarjeta_debito", "cheque")
- `fecha_inicio`: Fecha de inicio (YYYY-MM-DD)
- `fecha_fin`: Fecha fin (YYYY-MM-DD)

**Ejemplo:**
```
GET /bancos/movimientos?bancoId=507f1f77bcf86cd799439011&farmaciaId=01
```

**Respuesta:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "bancoId": "507f1f77bcf86cd799439011",
    "tipo": "deposito",
    "monto": 1000.00,
    "detalles": "Depósito por venta del día",
    "fecha": "2025-01-15",
    "createdAt": "2025-01-15T10:30:00Z"
  },
  {
    "_id": "507f1f77bcf86cd799439013",
    "bancoId": "507f1f77bcf86cd799439011",
    "tipo": "transferencia",
    "monto": 500.00,
    "detalles": "Transferencia a proveedor XYZ",
    "nombreTitular": "Proveedor XYZ S.A.",
    "fecha": "2025-01-15",
    "createdAt": "2025-01-15T11:00:00Z"
  }
]
```

**Orden:** Por fecha descendente (más recientes primero)

---

## ✅ Validaciones Requeridas

### Crear/Actualizar Banco
- ✅ `numeroCuenta`: Requerido, único
- ✅ `nombreTitular`: Requerido
- ✅ `nombreBanco`: Requerido
- ✅ `cedulaRif`: Requerido

### Depósito
- ✅ `monto`: Requerido, > 0
- ✅ `detalles`: Requerido

### Transferencia/Cheque
- ✅ `monto`: Requerido, > 0
- ✅ `detalles`: Requerido
- ✅ `nombreTitular`: Requerido
- ✅ `banco.disponible >= monto` (validar saldo suficiente)

---

## 🔧 Ejemplo de Implementación (FastAPI/Python)

```python
from fastapi import APIRouter, HTTPException, Depends
from pymongo import MongoClient
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/bancos", tags=["bancos"])

@router.post("/")
async def crear_banco(banco_data: dict, db: MongoClient = Depends(get_db)):
    # Validar campos requeridos
    required_fields = ["numeroCuenta", "nombreTitular", "nombreBanco", "cedulaRif"]
    for field in required_fields:
        if field not in banco_data:
            raise HTTPException(400, f"Campo requerido: {field}")
    
    # Verificar que numeroCuenta sea único
    existing = db.bancos.find_one({"numeroCuenta": banco_data["numeroCuenta"]})
    if existing:
        raise HTTPException(409, "El número de cuenta ya existe")
    
    # Crear banco
    banco = {
        **banco_data,
        "disponible": 0,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    result = db.bancos.insert_one(banco)
    banco["_id"] = str(result.inserted_id)
    return banco

@router.post("/{banco_id}/deposito")
async def realizar_deposito(
    banco_id: str,
    deposito_data: dict,
    db: MongoClient = Depends(get_db)
):
    # Validar campos
    if "monto" not in deposito_data or deposito_data["monto"] <= 0:
        raise HTTPException(400, "Monto inválido")
    if "detalles" not in deposito_data:
        raise HTTPException(400, "Detalles requeridos")
    
    # Obtener banco
    banco = db.bancos.find_one({"_id": ObjectId(banco_id)})
    if not banco:
        raise HTTPException(404, "Banco no encontrado")
    
    monto = deposito_data["monto"]
    
    # Crear movimiento
    movimiento = {
        "bancoId": ObjectId(banco_id),
        "tipo": "deposito",
        "monto": monto,
        "detalles": deposito_data["detalles"],
        "fecha": datetime.utcnow().strftime("%Y-%m-%d"),
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    db.movimientos_bancos.insert_one(movimiento)
    
    # Actualizar disponible
    nuevo_disponible = banco["disponible"] + monto
    db.bancos.update_one(
        {"_id": ObjectId(banco_id)},
        {"$set": {"disponible": nuevo_disponible, "updatedAt": datetime.utcnow()}}
    )
    
    return {
        "success": True,
        "banco": {"_id": banco_id, "disponible": nuevo_disponible},
        "movimiento": {**movimiento, "_id": str(movimiento["_id"])}
    }
```

---

## 📝 Notas Importantes

1. **Transacciones:** Considerar usar transacciones de MongoDB para asegurar consistencia entre movimientos y actualización de disponible.

2. **Índices:** Agregar índices para mejorar rendimiento:
   ```javascript
   db.bancos.createIndex({ "numeroCuenta": 1 }, { unique: true });
   db.movimientos_bancos.createIndex({ "bancoId": 1, "fecha": -1 });
   ```

3. **Validación de Saldo:** Siempre validar que el disponible sea suficiente antes de realizar transferencias o cheques.

4. **Fechas:** Usar formato `YYYY-MM-DD` para el campo `fecha` en movimientos.

5. **Autenticación:** Todos los endpoints requieren autenticación con Bearer token.

---

## ✅ Checklist de Implementación

- [ ] Endpoint `GET /bancos` implementado
- [ ] Endpoint `POST /bancos` implementado
- [ ] Endpoint `PATCH /bancos/:id` implementado
- [ ] Endpoint `DELETE /bancos/:id` implementado
- [ ] Endpoint `POST /bancos/:id/deposito` implementado
- [ ] Endpoint `POST /bancos/:id/transferencia` implementado
- [ ] Endpoint `POST /bancos/:id/cheque` implementado
- [ ] Endpoint `GET /bancos/:id/movimientos` implementado
- [ ] Validaciones implementadas
- [ ] Índices de MongoDB creados
- [ ] Autenticación requerida en todos los endpoints

---

**Una vez implementado, el frontend podrá gestionar bancos completamente.**

