# Instrucciones Backend - Módulo de Bancos (Completo)

## 🎯 Objetivo

Implementar un sistema completo de gestión de bancos que permita:
- Crear, editar y eliminar bancos con tipo de moneda (USD o Bs)
- Asociar múltiples farmacias a cada banco
- Realizar depósitos, transferencias, cheques y retiros
- Filtrar movimientos por banco, farmacia y concepto
- Mostrar dos saldos cuando el banco es en Bs (Bs y USD equivalente)

---

## 🔐 Permisos

### Agregar Permiso "bancos" al Sistema

**IMPORTANTE:** El frontend requiere el permiso `"bancos"` para acceder al módulo.

**Pasos:**
1. Agregar `"bancos"` a la lista de permisos disponibles en el sistema
2. El permiso debe estar disponible en el endpoint de gestión de usuarios
3. Los usuarios con este permiso podrán:
   - Ver el módulo "Bancos" en el menú
   - Crear, editar y eliminar bancos
   - Realizar operaciones (depósitos, transferencias, cheques)
   - Ver movimientos y filtros

**Ejemplo de estructura de permisos:**
```javascript
const PERMISOS_DISPONIBLES = [
  "ver_inicio",
  "agregar_cuadre",
  "proveedores",
  "bancos",  // <-- Agregar este permiso
  // ... otros permisos
];
```

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
  tipoMoneda: String,           // "USD" o "Bs" (REQUERIDO)
  disponible: Number,           // Saldo disponible en la moneda del banco (inicia en 0)
  tasa: Number,                 // Tasa de cambio del día (solo si tipoMoneda es "Bs", REQUERIDO si es Bs)
  disponibleUsd: Number,        // Saldo disponible en USD (calculado: disponible / tasa si tipoMoneda es "Bs")
  farmacias: [String],          // Array de IDs de farmacias que utilizan este banco (ej: ["01", "02"])
  createdAt: Date,
  updatedAt: Date
}
```

**Validaciones:**
- `tipoMoneda` debe ser "USD" o "Bs"
- Si `tipoMoneda === "Bs"`, `tasa` es REQUERIDO y debe ser > 0
- Si `tipoMoneda === "USD"`, `tasa` no se envía o se ignora
- `farmacias` debe ser un array de strings (IDs de farmacias)
- Al menos una farmacia debe ser seleccionada

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

**Conceptos disponibles:**
- `"cuentas_pagadas"`: Pago de cuentas por pagar
- `"transferencia"`: Transferencia bancaria
- `"retiro_efectivo"`: Retiro de efectivo
- `"ingreso_venta"`: Ingreso por venta (depósito con efectivo)
- `"gasto_tarjeta_debito"`: Gasto pagado con tarjeta débito
- `"cheque"`: Cheque emitido

---

## 🔌 Endpoints Requeridos

### 1. GET `/bancos`

**Propósito:** Obtener todos los bancos registrados.

**Autenticación:** Requerida (Bearer token)

**Permiso:** `bancos`

**Respuesta:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "numeroCuenta": "0102-1234-5678901234",
    "nombreTitular": "Juan Pérez",
    "nombreBanco": "Banco de Venezuela",
    "cedulaRif": "V-12345678",
    "tipoMoneda": "Bs",
    "disponible": 1000000.00,
    "tasa": 40.50,
    "disponibleUsd": 24691.36,
    "farmacias": ["01", "02", "03"],
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
]
```

---

### 2. POST `/bancos`

**Propósito:** Crear un nuevo banco.

**Autenticación:** Requerida (Bearer token)

**Permiso:** `bancos`

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
- Todos los campos son requeridos (excepto `tasa` si `tipoMoneda` es "USD")
- `numeroCuenta` debe ser único
- `tipoMoneda` debe ser "USD" o "Bs"
- Si `tipoMoneda === "Bs"`, `tasa` es REQUERIDO y debe ser > 0
- `farmacias` debe ser un array con al menos un elemento
- `disponible` se inicializa en 0
- `disponibleUsd` se calcula automáticamente: si `tipoMoneda === "Bs"`, `disponibleUsd = 0 / tasa = 0`

**Respuesta:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "numeroCuenta": "0102-1234-5678901234",
  "nombreTitular": "Juan Pérez",
  "nombreBanco": "Banco de Venezuela",
  "cedulaRif": "V-12345678",
  "tipoMoneda": "Bs",
  "disponible": 0,
  "tasa": 40.50,
  "disponibleUsd": 0,
  "farmacias": ["01", "02", "03"],
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

---

### 3. PATCH `/bancos/:id`

**Propósito:** Actualizar un banco existente.

**Autenticación:** Requerida (Bearer token)

**Permiso:** `bancos`

**Body (parcial):**
```json
{
  "nombreTitular": "Juan Carlos Pérez",
  "tipoMoneda": "Bs",
  "tasa": 42.00,
  "farmacias": ["01", "02"]
}
```

**Nota:** 
- No se puede actualizar `disponible` directamente (solo mediante movimientos)
- Si se cambia `tipoMoneda` de "USD" a "Bs", se requiere `tasa`
- Si se cambia `tasa`, recalcular `disponibleUsd = disponible / tasa`

**Respuesta:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "numeroCuenta": "0102-1234-5678901234",
  "nombreTitular": "Juan Carlos Pérez",
  "nombreBanco": "Banco Mercantil",
  "cedulaRif": "V-12345678",
  "tipoMoneda": "Bs",
  "disponible": 1000000.00,
  "tasa": 42.00,
  "disponibleUsd": 23809.52,
  "farmacias": ["01", "02"],
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T11:00:00Z"
}
```

---

### 4. DELETE `/bancos/:id`

**Propósito:** Eliminar un banco.

**Autenticación:** Requerida (Bearer token)

**Permiso:** `bancos`

**Respuesta:** 204 No Content

**Nota:** Considerar si se deben eliminar también los movimientos asociados o solo el banco.

---

### 5. POST `/bancos/:id/deposito`

**Propósito:** Realizar un depósito en un banco (aumenta el disponible).

**Autenticación:** Requerida (Bearer token)

**Permiso:** `bancos`

**Body:**
```json
{
  "monto": 1000.00,
  "detalles": "Depósito por venta del día",
  "farmacia": "01",
  "tipoPago": "efectivoUsd",
  "concepto": "ingreso_venta"
}
```

**Lógica:**
1. Validar que el banco existe
2. Validar que `monto > 0`
3. Crear movimiento con `tipo: "deposito"`
4. Actualizar `banco.disponible += monto`
5. Si `banco.tipoMoneda === "Bs"` y `banco.tasa > 0`:
   - Recalcular `banco.disponibleUsd = banco.disponible / banco.tasa`
6. Guardar movimiento y actualizar banco

**Respuesta:**
```json
{
  "success": true,
  "banco": {
    "_id": "507f1f77bcf86cd799439011",
    "disponible": 1010000.00,
    "disponibleUsd": 24938.27
  },
  "movimiento": {
    "_id": "507f1f77bcf86cd799439012",
    "bancoId": "507f1f77bcf86cd799439011",
    "tipo": "deposito",
    "concepto": "ingreso_venta",
    "tipoPago": "efectivoUsd",
    "farmacia": "01",
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

**Permiso:** `bancos`

**Body:**
```json
{
  "monto": 500.00,
  "detalles": "Transferencia a proveedor XYZ",
  "nombreTitular": "Proveedor XYZ S.A.",
  "concepto": "transferencia"
}
```

**Lógica:**
1. Validar que el banco existe
2. Validar que `monto > 0`
3. Validar que `banco.disponible >= monto` (o `banco.disponibleUsd >= monto` si el banco es en Bs)
4. Crear movimiento con `tipo: "transferencia"` y `concepto: "transferencia"`
5. Actualizar `banco.disponible -= monto`
6. Si `banco.tipoMoneda === "Bs"` y `banco.tasa > 0`:
   - Recalcular `banco.disponibleUsd = banco.disponible / banco.tasa`
7. Guardar movimiento y actualizar banco

**Respuesta:**
```json
{
  "success": true,
  "banco": {
    "_id": "507f1f77bcf86cd799439011",
    "disponible": 995000.00,
    "disponibleUsd": 24567.90
  },
  "movimiento": {
    "_id": "507f1f77bcf86cd799439013",
    "bancoId": "507f1f77bcf86cd799439011",
    "tipo": "transferencia",
    "concepto": "transferencia",
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

**Permiso:** `bancos`

**Body:**
```json
{
  "monto": 750.00,
  "detalles": "Cheque #12345 para pago de factura",
  "nombreTitular": "Proveedor ABC C.A.",
  "concepto": "cheque"
}
```

**Lógica:**
1. Validar que el banco existe
2. Validar que `monto > 0`
3. Validar que `banco.disponible >= monto` (o `banco.disponibleUsd >= monto` si el banco es en Bs)
4. Crear movimiento con `tipo: "cheque"` y `concepto: "cheque"`
5. Actualizar `banco.disponible -= monto`
6. Si `banco.tipoMoneda === "Bs"` y `banco.tasa > 0`:
   - Recalcular `banco.disponibleUsd = banco.disponible / banco.tasa`
7. Guardar movimiento y actualizar banco

**Respuesta:**
```json
{
  "success": true,
  "banco": {
    "_id": "507f1f77bcf86cd799439011",
    "disponible": 994250.00,
    "disponibleUsd": 24549.38
  },
  "movimiento": {
    "_id": "507f1f77bcf86cd799439014",
    "bancoId": "507f1f77bcf86cd799439011",
    "tipo": "cheque",
    "concepto": "cheque",
    "monto": 750.00,
    "detalles": "Cheque #12345 para pago de factura",
    "nombreTitular": "Proveedor ABC C.A.",
    "fecha": "2025-01-15"
  }
}
```

---

### 8. POST `/bancos/:id/retiro`

**Propósito:** Realizar un retiro de efectivo desde un banco (disminuye el disponible).

**Autenticación:** Requerida (Bearer token)

**Permiso:** `bancos`

**Body:**
```json
{
  "monto": 200.00,
  "detalles": "Retiro de efectivo para caja",
  "concepto": "retiro_efectivo"
}
```

**Lógica:**
1. Validar que el banco existe
2. Validar que `monto > 0`
3. Validar que `banco.disponible >= monto`
4. Crear movimiento con `tipo: "retiro"` y `concepto: "retiro_efectivo"`
5. Actualizar `banco.disponible -= monto`
6. Si `banco.tipoMoneda === "Bs"` y `banco.tasa > 0`:
   - Recalcular `banco.disponibleUsd = banco.disponible / banco.tasa`
7. Guardar movimiento y actualizar banco

---

### 9. GET `/bancos/movimientos`

**Propósito:** Obtener el historial de movimientos (puede filtrar por banco, farmacia y concepto).

**Autenticación:** Requerida (Bearer token)

**Permiso:** `bancos`

**Query Parameters (opcionales):**
- `bancoId`: Filtrar por ID de banco
- `farmaciaId`: Filtrar por ID de farmacia
- `concepto`: Filtrar por concepto ("cuentas_pagadas", "transferencia", "retiro_efectivo", "ingreso_venta", "gasto_tarjeta_debito", "cheque")
- `tipo`: Filtrar por tipo ("deposito", "transferencia", "cheque", "retiro")
- `tipoPago`: Filtrar por tipo de pago ("efectivoBs", "efectivoUsd", "debito", "credito", "zelle", "pagoMovil")
- `fecha_inicio`: Fecha de inicio (YYYY-MM-DD)
- `fecha_fin`: Fecha fin (YYYY-MM-DD)

**Ejemplo:**
```
GET /bancos/movimientos?bancoId=507f1f77bcf86cd799439011&farmaciaId=01&concepto=ingreso_venta
```

**Respuesta:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "bancoId": "507f1f77bcf86cd799439011",
    "farmacia": "01",
    "tipo": "deposito",
    "concepto": "ingreso_venta",
    "tipoPago": "efectivoUsd",
    "monto": 1000.00,
    "detalles": "Depósito por venta del día",
    "fecha": "2025-01-15",
    "createdAt": "2025-01-15T10:30:00Z"
  },
  {
    "_id": "507f1f77bcf86cd799439013",
    "bancoId": "507f1f77bcf86cd799439011",
    "tipo": "transferencia",
    "concepto": "transferencia",
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
- ✅ `tipoMoneda`: Requerido, debe ser "USD" o "Bs"
- ✅ `tasa`: Requerido si `tipoMoneda === "Bs"`, debe ser > 0
- ✅ `farmacias`: Requerido, array con al menos un elemento

### Depósito
- ✅ `monto`: Requerido, > 0
- ✅ `detalles`: Requerido
- ✅ `tipoPago`: Requerido (para depósitos)
- ✅ `farmacia`: Opcional
- ✅ `concepto`: Opcional (se puede inferir del tipoPago)

### Transferencia/Cheque/Retiro
- ✅ `monto`: Requerido, > 0
- ✅ `detalles`: Requerido
- ✅ `nombreTitular`: Requerido (para transferencias y cheques)
- ✅ `concepto`: Opcional
- ✅ `banco.disponible >= monto` (validar saldo suficiente)

---

## 🔧 Ejemplo de Implementación (FastAPI/Python)

```python
from fastapi import APIRouter, HTTPException, Depends
from pymongo import MongoClient
from datetime import datetime
from typing import Optional
from bson import ObjectId

router = APIRouter(prefix="/bancos", tags=["bancos"])

def verificar_permiso_bancos(current_user):
    """Verificar que el usuario tenga permiso 'bancos'"""
    if "bancos" not in current_user.get("permisos", []):
        raise HTTPException(403, "No tiene permiso para acceder a este módulo")
    return current_user

@router.post("/")
async def crear_banco(
    banco_data: dict,
    db: MongoClient = Depends(get_db),
    current_user = Depends(verificar_permiso_bancos)
):
    # Validar campos requeridos
    required_fields = ["numeroCuenta", "nombreTitular", "nombreBanco", "cedulaRif", "tipoMoneda", "farmacias"]
    for field in required_fields:
        if field not in banco_data:
            raise HTTPException(400, f"Campo requerido: {field}")
    
    # Validar tipoMoneda
    if banco_data["tipoMoneda"] not in ["USD", "Bs"]:
        raise HTTPException(400, "tipoMoneda debe ser 'USD' o 'Bs'")
    
    # Validar tasa si es Bs
    if banco_data["tipoMoneda"] == "Bs":
        if "tasa" not in banco_data or banco_data["tasa"] <= 0:
            raise HTTPException(400, "tasa es requerida y debe ser > 0 cuando tipoMoneda es 'Bs'")
    
    # Validar farmacias
    if not isinstance(banco_data["farmacias"], list) or len(banco_data["farmacias"]) == 0:
        raise HTTPException(400, "farmacias debe ser un array con al menos un elemento")
    
    # Verificar que numeroCuenta sea único
    existing = db.bancos.find_one({"numeroCuenta": banco_data["numeroCuenta"]})
    if existing:
        raise HTTPException(409, "El número de cuenta ya existe")
    
    # Calcular disponibleUsd
    disponible = 0
    disponible_usd = 0
    if banco_data["tipoMoneda"] == "Bs" and banco_data.get("tasa", 0) > 0:
        disponible_usd = disponible / banco_data["tasa"]
    
    # Crear banco
    banco = {
        "numeroCuenta": banco_data["numeroCuenta"],
        "nombreTitular": banco_data["nombreTitular"],
        "nombreBanco": banco_data["nombreBanco"],
        "cedulaRif": banco_data["cedulaRif"],
        "tipoMoneda": banco_data["tipoMoneda"],
        "disponible": disponible,
        "tasa": banco_data.get("tasa") if banco_data["tipoMoneda"] == "Bs" else None,
        "disponibleUsd": disponible_usd,
        "farmacias": banco_data["farmacias"],
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
    db: MongoClient = Depends(get_db),
    current_user = Depends(verificar_permiso_bancos)
):
    # Validar campos
    if "monto" not in deposito_data or deposito_data["monto"] <= 0:
        raise HTTPException(400, "Monto inválido")
    if "detalles" not in deposito_data:
        raise HTTPException(400, "Detalles requeridos")
    if "tipoPago" not in deposito_data:
        raise HTTPException(400, "Tipo de pago requerido")
    
    # Obtener banco
    banco = db.bancos.find_one({"_id": ObjectId(banco_id)})
    if not banco:
        raise HTTPException(404, "Banco no encontrado")
    
    monto = deposito_data["monto"]
    
    # Determinar concepto si no se proporciona
    concepto = deposito_data.get("concepto")
    if not concepto:
        if deposito_data["tipoPago"] == "debito":
            concepto = "gasto_tarjeta_debito"
        elif deposito_data["tipoPago"] in ["efectivoUsd", "efectivoBs"]:
            concepto = "ingreso_venta"
    
    # Crear movimiento
    movimiento = {
        "bancoId": ObjectId(banco_id),
        "farmacia": deposito_data.get("farmacia"),
        "tipo": "deposito",
        "concepto": concepto,
        "tipoPago": deposito_data["tipoPago"],
        "monto": monto,
        "detalles": deposito_data["detalles"],
        "fecha": datetime.utcnow().strftime("%Y-%m-%d"),
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    db.movimientos_bancos.insert_one(movimiento)
    
    # Actualizar disponible
    nuevo_disponible = banco["disponible"] + monto
    nuevo_disponible_usd = nuevo_disponible
    if banco["tipoMoneda"] == "Bs" and banco.get("tasa", 0) > 0:
        nuevo_disponible_usd = nuevo_disponible / banco["tasa"]
    
    db.bancos.update_one(
        {"_id": ObjectId(banco_id)},
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
        "banco": {"_id": banco_id, "disponible": nuevo_disponible, "disponibleUsd": nuevo_disponible_usd},
        "movimiento": {**movimiento, "_id": str(movimiento["_id"])}
    }

@router.get("/movimientos")
async def obtener_movimientos(
    bancoId: Optional[str] = None,
    farmaciaId: Optional[str] = None,
    concepto: Optional[str] = None,
    tipo: Optional[str] = None,
    tipoPago: Optional[str] = None,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    db: MongoClient = Depends(get_db),
    current_user = Depends(verificar_permiso_bancos)
):
    # Construir query
    query = {}
    if bancoId:
        query["bancoId"] = ObjectId(bancoId)
    if farmaciaId:
        query["farmacia"] = farmaciaId
    if concepto:
        query["concepto"] = concepto
    if tipo:
        query["tipo"] = tipo
    if tipoPago:
        query["tipoPago"] = tipoPago
    if fecha_inicio or fecha_fin:
        query["fecha"] = {}
        if fecha_inicio:
            query["fecha"]["$gte"] = fecha_inicio
        if fecha_fin:
            query["fecha"]["$lte"] = fecha_fin
    
    # Obtener movimientos
    movimientos = list(db.movimientos_bancos.find(query).sort("fecha", -1))
    
    # Convertir ObjectId a string
    for movimiento in movimientos:
        movimiento["_id"] = str(movimiento["_id"])
        if isinstance(movimiento.get("bancoId"), ObjectId):
            movimiento["bancoId"] = str(movimiento["bancoId"])
    
    return movimientos
```

---

## 📝 Notas Importantes

1. **Transacciones:** Considerar usar transacciones de MongoDB para asegurar consistencia entre movimientos y actualización de disponible.

2. **Índices:** Agregar índices para mejorar rendimiento:
   ```javascript
   db.bancos.createIndex({ "numeroCuenta": 1 }, { unique: true });
   db.bancos.createIndex({ "farmacias": 1 });
   db.movimientos_bancos.createIndex({ "bancoId": 1, "fecha": -1 });
   db.movimientos_bancos.createIndex({ "farmacia": 1, "fecha": -1 });
   db.movimientos_bancos.createIndex({ "concepto": 1 });
   ```

3. **Validación de Saldo:** Siempre validar que el disponible sea suficiente antes de realizar transferencias, cheques o retiros.

4. **Cálculo de disponibleUsd:** Si `tipoMoneda === "Bs"` y `tasa > 0`, siempre recalcular `disponibleUsd = disponible / tasa` después de cada movimiento.

5. **Fechas:** Usar formato `YYYY-MM-DD` para el campo `fecha` en movimientos.

6. **Autenticación y Permisos:** Todos los endpoints requieren autenticación con Bearer token y permiso `bancos`.

7. **Concepto:** Si no se proporciona el campo `concepto` en un movimiento, se puede inferir:
   - `tipo === "cheque"` → `concepto = "cheque"`
   - `tipo === "transferencia"` → `concepto = "transferencia"`
   - `tipo === "retiro"` → `concepto = "retiro_efectivo"`
   - `tipo === "deposito"` + `tipoPago === "debito"` → `concepto = "gasto_tarjeta_debito"`
   - `tipo === "deposito"` + `tipoPago === "efectivoUsd/efectivoBs"` → `concepto = "ingreso_venta"`

---

## ✅ Checklist de Implementación

- [ ] **Permiso "bancos" agregado** al sistema de permisos
- [ ] **Endpoint `GET /bancos`** implementado
- [ ] **Endpoint `POST /bancos`** implementado (con validación de tipoMoneda y tasa)
- [ ] **Endpoint `PATCH /bancos/:id`** implementado
- [ ] **Endpoint `DELETE /bancos/:id`** implementado
- [ ] **Endpoint `POST /bancos/:id/deposito`** implementado (con concepto y tipoPago)
- [ ] **Endpoint `POST /bancos/:id/transferencia`** implementado
- [ ] **Endpoint `POST /bancos/:id/cheque`** implementado
- [ ] **Endpoint `POST /bancos/:id/retiro`** implementado
- [ ] **Endpoint `GET /bancos/movimientos`** implementado (con filtros por concepto)
- [ ] **Validaciones implementadas** (tipoMoneda, tasa, saldo suficiente)
- [ ] **Cálculo de disponibleUsd** implementado para bancos en Bs
- [ ] **Índices de MongoDB** creados
- [ ] **Autenticación y permisos** requeridos en todos los endpoints

---

## 🔐 Configuración del Permiso en AdminUsuarios

**Para que el módulo aparezca en el menú:**

1. El permiso `"bancos"` debe estar disponible en el sistema de permisos
2. Los usuarios deben tener el permiso `"bancos"` asignado en su perfil
3. El frontend verificará el permiso antes de mostrar el módulo en el menú

**Ejemplo de verificación en el backend:**
```python
def verificar_permiso_bancos(current_user):
    permisos = current_user.get("permisos", [])
    if "bancos" not in permisos:
        raise HTTPException(
            status_code=403,
            detail="No tiene permiso para acceder al módulo de Bancos"
        )
    return current_user
```

---

**Una vez implementado, el módulo de Bancos estará completamente funcional con todas las características solicitadas.**

