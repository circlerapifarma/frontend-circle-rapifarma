# Instrucciones Frontend - Módulo de Bancos

## 📋 Estructura de Datos

### Interfaz Banco (Frontend)

```typescript
interface Banco {
  _id?: string;
  numeroCuenta: string;        // REQUERIDO
  nombreTitular?: string;       // OPCIONAL
  nombreBanco: string;         // REQUERIDO (el backend acepta "nombreBanco" o "nombre")
  cedulaRif?: string;          // OPCIONAL
  tipoMoneda: "USD" | "Bs";    // REQUERIDO
  disponible: number;           // Se inicializa en 0
  tasa?: number;               // REQUERIDO si tipoMoneda === "Bs", debe ser > 0
  disponibleUsd?: number;       // NO ENVIAR - Se calcula automáticamente en el backend
  farmacias: string[];          // REQUERIDO, mínimo 1 elemento
  createdAt?: string;
  updatedAt?: string;
}
```

### Interfaz Movimiento (Frontend)

```typescript
interface Movimiento {
  _id?: string;
  bancoId: string;
  farmacia?: string;            // ID de la farmacia
  tipo: "deposito" | "transferencia" | "cheque" | "retiro";
  concepto?: string;            // "cuentas_pagadas" | "transferencia" | "retiro_efectivo" | "ingreso_venta" | "gasto_tarjeta_debito" | "cheque"
  tipoPago?: string;           // "efectivoBs" | "efectivoUsd" | "debito" | "credito" | "zelle" | "pagoMovil"
  monto: number;
  detalles: string;
  nombreTitular?: string;       // Para transferencias y cheques
  fecha: string;
  createdAt?: string;
}
```

---

## 🔄 Mapeo Frontend → Backend

| Campo Frontend | Campo Backend | Requerido | Notas |
|----------------|---------------|-----------|-------|
| `numeroCuenta` | `numeroCuenta` | ✅ Sí | Debe ser único |
| `nombreBanco` | `nombreBanco` o `nombre` | ✅ Sí | El backend acepta ambos nombres |
| `nombreTitular` | `nombreTitular` | ❌ No | Opcional |
| `cedulaRif` | `cedulaRif` | ❌ No | Opcional |
| `tipoMoneda` | `tipoMoneda` | ✅ Sí | "USD" o "Bs" |
| `tasa` | `tasa` | ⚠️ Condicional | Requerido si `tipoMoneda === "Bs"`, debe ser > 0 |
| `disponible` | `disponible` | ✅ Sí | Se inicializa en 0 |
| `disponibleUsd` | `disponibleUsd` | ❌ NO ENVIAR | Se calcula automáticamente en el backend |
| `farmacias` | `farmacias` | ✅ Sí | Array con mínimo 1 elemento |

---

## ✅ Validaciones Frontend

### Función validarBanco()

```typescript
function validarBanco(banco: Partial<Banco>): { valido: boolean; error?: string } {
  // Validar campos requeridos
  if (!banco.numeroCuenta?.trim()) {
    return { valido: false, error: "El número de cuenta es requerido" };
  }
  
  if (!banco.nombreBanco?.trim()) {
    return { valido: false, error: "El nombre del banco es requerido" };
  }
  
  if (!banco.tipoMoneda || !["USD", "Bs"].includes(banco.tipoMoneda)) {
    return { valido: false, error: "El tipo de moneda debe ser 'USD' o 'Bs'" };
  }
  
  // Validar tasa si es Bs
  if (banco.tipoMoneda === "Bs") {
    if (!banco.tasa || banco.tasa <= 0) {
      return { valido: false, error: "La tasa de cambio es requerida y debe ser mayor a 0" };
    }
  }
  
  // Validar farmacias
  if (!banco.farmacias || banco.farmacias.length === 0) {
    return { valido: false, error: "Debe seleccionar al menos una farmacia" };
  }
  
  return { valido: true };
}
```

---

## 📤 Formato del Payload

### Crear Banco

```typescript
// ✅ CORRECTO
const payload = {
  numeroCuenta: "0102-1234-5678901234",
  nombreBanco: "Banco de Venezuela",  // ✅ El backend acepta "nombreBanco" o "nombre"
  nombreTitular: "Juan Pérez",        // ✅ Opcional
  cedulaRif: "V-12345678",            // ✅ Opcional
  tipoMoneda: "Bs",
  tasa: 40.5,                         // ⚠️ Obligatorio si tipoMoneda es "Bs"
  disponible: 0,                      // ✅ Se inicializa en 0
  farmacias: ["01", "02", "03"]       // ✅ Mínimo 1 elemento
  // ❌ NO incluir disponibleUsd - se calcula en el backend
};

// ❌ INCORRECTO
const payloadIncorrecto = {
  nombre: "Banco de Venezuela",       // ❌ Usar "nombreBanco" en lugar de "nombre"
  tipoMoneda: "Bs",
  // ❌ Falta tasa cuando tipoMoneda es "Bs"
  farmacias: [],                      // ❌ Debe tener al menos 1 elemento
  disponibleUsd: 0                   // ❌ NO enviar, se calcula automáticamente
};
```

### Actualizar Banco

```typescript
// ✅ CORRECTO - Solo enviar campos a actualizar
const payload = {
  nombreBanco: "Banco Mercantil",
  tasa: 42.0,  // Si se actualiza la tasa, el backend recalcula disponibleUsd
  farmacias: ["01", "02"]
};

// ❌ INCORRECTO
const payloadIncorrecto = {
  disponible: 5000,      // ❌ No se puede actualizar directamente
  disponibleUsd: 123.45  // ❌ NO enviar, se calcula automáticamente
};
```

---

## 🔧 Funciones de Ejemplo

### Función crearBanco() Completa

```typescript
async function crearBanco(banco: Partial<Banco>): Promise<Banco> {
  // 1. Validar antes de enviar
  const validacion = validarBanco(banco);
  if (!validacion.valido) {
    throw new Error(validacion.error);
  }
  
  // 2. Preparar payload (no incluir disponibleUsd)
  const payload = {
    numeroCuenta: banco.numeroCuenta!,
    nombreBanco: banco.nombreBanco!,  // ✅ Usar nombreBanco
    nombreTitular: banco.nombreTitular || undefined,  // Opcional
    cedulaRif: banco.cedulaRif || undefined,          // Opcional
    tipoMoneda: banco.tipoMoneda!,
    tasa: banco.tipoMoneda === "Bs" ? banco.tasa : undefined,
    disponible: 0,
    farmacias: banco.farmacias!
  };
  
  // 3. Enviar petición
  const token = localStorage.getItem("token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  try {
    const res = await fetch(`${API_BASE_URL}/bancos`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error ${res.status}: ${res.statusText}`);
    }
    
    const nuevoBanco = await res.json();
    return nuevoBanco;
  } catch (error: any) {
    console.error("Error al crear banco:", error);
    throw error;
  }
}
```

### Función actualizarBanco()

```typescript
async function actualizarBanco(
  id: string,
  cambios: Partial<Banco>
): Promise<Banco> {
  // Preparar payload solo con campos a actualizar
  const payload: any = {};
  
  if (cambios.nombreBanco !== undefined) {
    payload.nombreBanco = cambios.nombreBanco;
  }
  if (cambios.nombreTitular !== undefined) {
    payload.nombreTitular = cambios.nombreTitular;
  }
  if (cambios.cedulaRif !== undefined) {
    payload.cedulaRif = cambios.cedulaRif;
  }
  if (cambios.tipoMoneda !== undefined) {
    payload.tipoMoneda = cambios.tipoMoneda;
    // Si cambia a Bs, requerir tasa
    if (cambios.tipoMoneda === "Bs" && cambios.tasa) {
      payload.tasa = cambios.tasa;
    }
  }
  if (cambios.tasa !== undefined && cambios.tipoMoneda === "Bs") {
    payload.tasa = cambios.tasa;
  }
  if (cambios.farmacias !== undefined) {
    if (cambios.farmacias.length === 0) {
      throw new Error("Debe seleccionar al menos una farmacia");
    }
    payload.farmacias = cambios.farmacias;
  }
  
  // ❌ NO incluir disponible ni disponibleUsd
  
  const token = localStorage.getItem("token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  try {
    const res = await fetch(`${API_BASE_URL}/bancos/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error ${res.status}: ${res.statusText}`);
    }
    
    const bancoActualizado = await res.json();
    return bancoActualizado;
  } catch (error: any) {
    console.error("Error al actualizar banco:", error);
    throw error;
  }
}
```

---

## ⚠️ Errores Comunes y Soluciones

### Error 422: "tasa es requerida cuando tipoMoneda es 'Bs'"

**Problema:**
```typescript
// ❌ INCORRECTO
const banco = {
  tipoMoneda: "Bs",
  // Falta tasa
};
```

**Solución:**
```typescript
// ✅ CORRECTO
const banco = {
  tipoMoneda: "Bs",
  tasa: 40.5,  // ✅ Incluir tasa
};
```

### Error 422: "farmacias debe tener al menos un elemento"

**Problema:**
```typescript
// ❌ INCORRECTO
const banco = {
  farmacias: [],  // Array vacío
};
```

**Solución:**
```typescript
// ✅ CORRECTO
const banco = {
  farmacias: ["01"],  // ✅ Al menos un elemento
};
```

### Error 400: "Campo requerido: nombreBanco"

**Problema:**
```typescript
// ❌ INCORRECTO
const banco = {
  nombre: "Banco de Venezuela",  // ❌ Usar "nombreBanco"
};
```

**Solución:**
```typescript
// ✅ CORRECTO
const banco = {
  nombreBanco: "Banco de Venezuela",  // ✅ Usar nombreBanco
};
```

### Error: disponibleUsd no se actualiza

**Problema:** Enviar `disponibleUsd` en el payload.

**Solución:** NO enviar `disponibleUsd`. El backend lo calcula automáticamente:
```typescript
// ✅ CORRECTO
const payload = {
  tipoMoneda: "Bs",
  tasa: 40.5,
  disponible: 1000000
  // ❌ NO incluir disponibleUsd
};
```

---

## ✅ Checklist de Implementación Frontend

- [ ] **Interfaz Banco** definida correctamente
- [ ] **Validación de campos** implementada (validarBanco)
- [ ] **Campo nombreBanco** usado (no "nombre")
- [ ] **Campo tasa** validado cuando tipoMoneda === "Bs"
- [ ] **Campo farmacias** validado (mínimo 1 elemento)
- [ ] **NO enviar disponibleUsd** en payloads
- [ ] **Manejo de errores** implementado
- [ ] **Autenticación** (Bearer token) en todas las peticiones
- [ ] **Permiso "bancos"** verificado antes de mostrar módulo

---

## 📝 Puntos Clave para el Frontend

1. **Campo nombre:** El frontend debe enviar `nombreBanco` (el backend acepta `nombreBanco` o `nombre`, pero es mejor usar `nombreBanco`)

2. **Campo tasa:** Obligatorio solo si `tipoMoneda === "Bs"` y debe ser > 0

3. **Campo farmacias:** Debe ser un array con al menos 1 elemento

4. **NO enviar disponibleUsd:** Se calcula automáticamente en el backend como `disponible / tasa` si `tipoMoneda === "Bs"`

5. **Campos opcionales:** `nombreTitular` y `cedulaRif` son opcionales

6. **Validación de saldo:** El backend valida que haya saldo suficiente antes de transferencias, cheques o retiros

---

## 🔄 Flujo de Trabajo Recomendado

1. **Validar** datos antes de enviar (usar `validarBanco()`)
2. **Preparar payload** sin `disponibleUsd`
3. **Enviar petición** con autenticación
4. **Manejar errores** apropiadamente
5. **Actualizar estado** local después de éxito
6. **Refrescar lista** de bancos si es necesario

---

**El frontend ya está implementado siguiendo estas especificaciones.**

