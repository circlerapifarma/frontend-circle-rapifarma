# Instrucciones Frontend - Movimientos de Bancos

## 📋 Estructura de Respuesta de Movimientos

### Respuesta del Backend

Cuando el backend retorna un movimiento (especialmente depósitos), incluye información adicional sobre la conversión de moneda:

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "bancoId": "693f9ae18e1f47e09891af04",
  "tipo": "deposito",
  "monto": 40000,
  "montoOriginal": 40000,
  "montoUsd": 1000,
  "tipoMonedaBanco": "Bs",
  "tasaUsada": 40,
  "tipoPago": "efectivoBs",
  "fecha": "2025-12-15T05:22:00Z",
  "detalles": "Depósito por venta",
  "farmacia": "01",
  "concepto": "ingreso_venta"
}
```

### Campos Adicionales

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `monto` | Number | Monto en la moneda del banco (Bs o USD) |
| `montoOriginal` | Number | Monto original antes de conversión (solo si banco es en Bs) |
| `montoUsd` | Number | Monto convertido a USD (solo si banco es en Bs) |
| `tipoMonedaBanco` | String | "USD" o "Bs" - Tipo de moneda del banco |
| `tasaUsada` | Number | Tasa de cambio usada para la conversión |

---

## 💰 Mostrar Ambos Montos

### Cuando el Banco es en Bs

Si `tipoMonedaBanco === "Bs"` y existe `montoOriginal`, mostrar ambos montos:

```typescript
// Ejemplo de visualización
{movimiento.tipoMonedaBanco === "Bs" && movimiento.montoOriginal ? (
  <div className="flex flex-col">
    <span className="text-lg font-bold">
      {movimiento.montoOriginal.toLocaleString("es-VE", { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })} Bs
    </span>
    {movimiento.montoUsd && (
      <span className="text-sm text-gray-500">
        ({formatCurrency(movimiento.montoUsd)})
      </span>
    )}
  </div>
) : (
  formatCurrency(movimiento.monto)
)}
```

### Cuando el Banco es en USD

Si `tipoMonedaBanco === "USD"`, mostrar solo el monto en USD:

```typescript
formatCurrency(movimiento.monto)
```

---

## 📤 Ejemplos de Payloads por Tipo de Movimiento

### 1. Depósito

```typescript
// ✅ CORRECTO
const payloadDeposito = {
  monto: 40000,                    // Monto en la moneda del banco
  detalles: "Depósito por venta del día",
  farmacia: "01",                  // Opcional
  tipoPago: "efectivoBs",          // REQUERIDO: "efectivoBs" | "efectivoUsd" | "debito" | "credito" | "zelle" | "pagoMovil"
  concepto: "ingreso_venta"        // Opcional
};

// Respuesta del backend (si banco es en Bs):
{
  "monto": 40000,
  "montoOriginal": 40000,
  "montoUsd": 1000,
  "tipoMonedaBanco": "Bs",
  "tasaUsada": 40,
  "tipoPago": "efectivoBs",
  // ... otros campos
}
```

**Validaciones:**
- ✅ `monto`: Requerido, > 0
- ✅ `detalles`: Requerido
- ✅ `tipoPago`: Requerido
- ⚠️ `farmacia`: Opcional
- ⚠️ `concepto`: Opcional (se puede inferir del tipoPago)

---

### 2. Transferencia

```typescript
// ✅ CORRECTO
const payloadTransferencia = {
  monto: 500.00,
  detalles: "Transferencia a proveedor XYZ",
  nombreTitular: "Proveedor XYZ S.A.",  // REQUERIDO
  concepto: "transferencia"            // Opcional
};

// Respuesta del backend:
{
  "monto": 500.00,
  "tipoMonedaBanco": "USD",
  // ... otros campos
}
```

**Validaciones:**
- ✅ `monto`: Requerido, > 0, debe ser <= disponible del banco
- ✅ `detalles`: Requerido
- ✅ `nombreTitular`: Requerido
- ⚠️ `concepto`: Opcional

---

### 3. Cheque

```typescript
// ✅ CORRECTO
const payloadCheque = {
  monto: 750.00,
  detalles: "Cheque #12345 para pago de factura",
  nombreTitular: "Proveedor ABC C.A.",  // REQUERIDO
  concepto: "cheque"                     // Opcional
};

// Respuesta del backend:
{
  "monto": 750.00,
  "tipoMonedaBanco": "USD",
  // ... otros campos
}
```

**Validaciones:**
- ✅ `monto`: Requerido, > 0, debe ser <= disponible del banco
- ✅ `detalles`: Requerido
- ✅ `nombreTitular`: Requerido
- ⚠️ `concepto`: Opcional

---

### 4. Retiro

```typescript
// ✅ CORRECTO
const payloadRetiro = {
  monto: 200.00,
  detalles: "Retiro de efectivo para caja",
  concepto: "retiro_efectivo"  // Opcional
};

// Respuesta del backend:
{
  "monto": 200.00,
  "tipoMonedaBanco": "USD",
  // ... otros campos
}
```

**Validaciones:**
- ✅ `monto`: Requerido, > 0, debe ser <= disponible del banco
- ✅ `detalles`: Requerido
- ⚠️ `concepto`: Opcional

---

## 🔄 Conversión de Moneda

### Lógica de Conversión

**Cuando el banco es en Bs:**
- El frontend envía el monto en Bs
- El backend calcula el equivalente en USD usando la tasa: `montoUsd = monto / tasa`
- El backend retorna ambos montos: `montoOriginal` (Bs) y `montoUsd` (USD)

**Cuando el banco es en USD:**
- El frontend envía el monto en USD
- El backend retorna solo el monto en USD

### Ejemplo de Conversión

```typescript
// Usuario ingresa depósito de 40,000 Bs en banco con tasa 40
const payload = {
  monto: 40000,
  tipoPago: "efectivoBs",
  detalles: "Depósito por venta"
};

// Backend retorna:
{
  monto: 40000,              // Monto en Bs (moneda del banco)
  montoOriginal: 40000,     // Monto original ingresado
  montoUsd: 1000,           // 40000 / 40 = 1000 USD
  tipoMonedaBanco: "Bs",
  tasaUsada: 40
}

// Frontend muestra:
// 40,000.00 Bs
// ($1,000.00)
```

---

## ✅ Validaciones por Tipo de Movimiento

### Depósito

```typescript
function validarDeposito(deposito: Partial<DepositoData>): { valido: boolean; error?: string } {
  if (!deposito.monto || deposito.monto <= 0) {
    return { valido: false, error: "El monto debe ser mayor a 0" };
  }
  
  if (!deposito.detalles?.trim()) {
    return { valido: false, error: "Los detalles son requeridos" };
  }
  
  if (!deposito.tipoPago) {
    return { valido: false, error: "El tipo de pago es requerido" };
  }
  
  const tiposPagoValidos = ["efectivoBs", "efectivoUsd", "debito", "credito", "zelle", "pagoMovil"];
  if (!tiposPagoValidos.includes(deposito.tipoPago)) {
    return { valido: false, error: "Tipo de pago inválido" };
  }
  
  return { valido: true };
}
```

### Transferencia/Cheque

```typescript
function validarTransferenciaOCheque(
  data: Partial<TransferenciaData>,
  disponibleBanco: number
): { valido: boolean; error?: string } {
  if (!data.monto || data.monto <= 0) {
    return { valido: false, error: "El monto debe ser mayor a 0" };
  }
  
  if (data.monto > disponibleBanco) {
    return { valido: false, error: "El monto excede el disponible del banco" };
  }
  
  if (!data.detalles?.trim()) {
    return { valido: false, error: "Los detalles son requeridos" };
  }
  
  if (!data.nombreTitular?.trim()) {
    return { valido: false, error: "El nombre del titular es requerido" };
  }
  
  return { valido: true };
}
```

---

## ⚠️ Errores Comunes y Soluciones

### Error: "El monto excede el disponible del banco"

**Problema:**
```typescript
// ❌ INCORRECTO
const monto = 10000;
const disponibleBanco = 5000;  // Menor que el monto
```

**Solución:**
```typescript
// ✅ CORRECTO
if (monto > disponibleBanco) {
  alert("El monto excede el disponible del banco");
  return;
}
```

### Error: "Tipo de pago requerido"

**Problema:**
```typescript
// ❌ INCORRECTO
const deposito = {
  monto: 1000,
  detalles: "Depósito"
  // Falta tipoPago
};
```

**Solución:**
```typescript
// ✅ CORRECTO
const deposito = {
  monto: 1000,
  detalles: "Depósito",
  tipoPago: "efectivoUsd"  // ✅ Incluir tipoPago
};
```

### Error: No se muestran ambos montos

**Problema:** No verificar `tipoMonedaBanco` y `montoOriginal`.

**Solución:**
```typescript
// ✅ CORRECTO
{movimiento.tipoMonedaBanco === "Bs" && movimiento.montoOriginal ? (
  <div>
    <span>{movimiento.montoOriginal} Bs</span>
    {movimiento.montoUsd && (
      <span>({formatCurrency(movimiento.montoUsd)})</span>
    )}
  </div>
) : (
  formatCurrency(movimiento.monto)
)}
```

---

## 📊 Ejemplo de Visualización Completa

### Tabla de Movimientos

```typescript
{movimientos.map((movimiento) => (
  <tr key={movimiento._id}>
    <td>{formatDate(movimiento.fecha)}</td>
    <td>{getConceptoLabel(movimiento.concepto, movimiento.tipo, movimiento.tipoPago)}</td>
    <td>
      {movimiento.tipoMonedaBanco === "Bs" && movimiento.montoOriginal ? (
        <div className="flex flex-col">
          <span className="font-bold text-yellow-600">
            {movimiento.montoOriginal.toLocaleString("es-VE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })} Bs
          </span>
          {movimiento.montoUsd && (
            <span className="text-xs text-gray-500">
              {formatCurrency(movimiento.montoUsd)}
            </span>
          )}
          {movimiento.tasaUsada && (
            <span className="text-xs text-gray-400">
              Tasa: {movimiento.tasaUsada}
            </span>
          )}
        </div>
      ) : (
        <span className="font-bold text-green-600">
          {formatCurrency(movimiento.monto)}
        </span>
      )}
    </td>
    <td>{movimiento.detalles}</td>
  </tr>
))}
```

---

## ✅ Checklist de Implementación

- [ ] **Interfaz Movimiento** actualizada con campos adicionales (`montoOriginal`, `montoUsd`, `tipoMonedaBanco`, `tasaUsada`)
- [ ] **Visualización de ambos montos** implementada para bancos en Bs
- [ ] **Validaciones por tipo** de movimiento implementadas
- [ ] **Manejo de errores** implementado
- [ ] **Formato de moneda** correcto (Bs con separadores, USD con símbolo)
- [ ] **Tasa mostrada** cuando está disponible (opcional)

---

## 📝 Puntos Importantes

1. **Depósitos:** El backend retorna ambos montos (Bs y USD) cuando el banco es en Bs
2. **Validaciones:** Cada tipo de movimiento tiene sus propios campos requeridos
3. **No enviar campos de otros tipos:** El backend valida y rechaza campos incorrectos
4. **Tipo de moneda:** Al crear el banco, asegurarse de enviar `tipoMoneda` ("USD" o "Bs")
5. **Mostrar ambos montos:** Cuando `tipoMonedaBanco === "Bs"` y existe `montoOriginal`, mostrar ambos

---

**El frontend ya está actualizado para manejar estos campos y mostrar ambos montos correctamente.**

